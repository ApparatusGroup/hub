import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { detectArticleCategory } from '@/lib/article-categorizer'
import { extractOgImages } from '@/lib/og-image'

/**
 * Dedicated Reddit scraper - runs independently under 10s
 * Scrapes multiple tech subreddits thoroughly and writes to shared scrapedArticles database
 */

interface CommentWithScore {
  text: string
  sourceScore: number
}

async function getRedditComments(subreddit: string, postId: string): Promise<CommentWithScore[]> {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/comments/${postId}.json?limit=15`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AlgosphereBot/1.0)'
      }
    })

    if (!res.ok) return []

    const data = await res.json()
    if (!data || !Array.isArray(data) || data.length < 2) return []

    const comments = data[1]?.data?.children || []

    const cleanedComments = comments
      .filter((c: any) => c.kind === 't1' && c.data && c.data.body)
      .map((c: any) => ({
        text: c.data.body.trim(),
        sourceScore: c.data.score || c.data.ups || 0
      }))
      .filter((c: CommentWithScore) => {
        if (c.text.length < 20 || c.text.length > 300) return false
        if (c.text.startsWith('[deleted]') || c.text.startsWith('[removed]')) return false
        if (c.text.includes('I am a bot')) return false
        if (/https?:\/\/|www\.|github\.com|\.com|\.org|\.io/i.test(c.text)) return false
        return true
      })
      .slice(0, 10) // Top 10 comments

    return cleanedComments
  } catch (error) {
    console.error(`Error fetching Reddit comments for r/${subreddit}/${postId}:`, error)
    return []
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔵 Starting Reddit scraping...')
    const startTime = Date.now()

    // Scrape 5 major tech subreddits
    const subreddits = ['technology', 'programming', 'artificial', 'machinelearning', 'gadgets']
    const allArticles: any[] = []

    // Get existing URLs to avoid duplicates
    const existingSnapshot = await adminDb.collection('scrapedArticles').get()
    const existingUrls = new Set(existingSnapshot.docs.map(doc => doc.data().url))

    for (const subreddit of subreddits) {
      // Stop if we have enough
      if (allArticles.length >= 20) break

      try {
        const res = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=20`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AlgosphereBot/1.0)'
          }
        })

        if (res.ok) {
          const data = await res.json()
          const posts = data.data?.children || []

          for (const post of posts) {
            // Stop if we have enough total
            if (allArticles.length >= 20) break

            const postData = post.data
            const titleLower = postData.title?.toLowerCase() || ''

            // Filter out irrelevant content
            const isIrrelevant =
              titleLower.includes(' sdk') ||
              titleLower.includes('-sdk') ||
              titleLower.startsWith('[hiring]') ||
              titleLower.startsWith('hiring:') ||
              titleLower.includes('i made') ||
              titleLower.includes('i built') ||
              titleLower.includes('i created')

            // Only external links with good engagement
            if (
              postData.url &&
              !postData.url.includes('reddit.com') &&
              postData.score > 150 && // Lower threshold for more articles
              postData.num_comments > 15 &&
              !isIrrelevant &&
              !existingUrls.has(postData.url)
            ) {
              try {
                const topComments = await getRedditComments(subreddit, postData.id)

                if (topComments.length > 0) {
                  const category = detectArticleCategory(postData.title, postData.selftext || postData.title)

                  allArticles.push({
                    url: postData.url,
                    title: postData.title,
                    submissionTitle: postData.title,
                    description: postData.selftext || postData.title,
                    source: `r/${subreddit}`,
                    urlToImage: postData.thumbnail && postData.thumbnail.startsWith('http') ? postData.thumbnail : null,
                    topComments: topComments,
                    commentCount: topComments.length,
                    popularityScore: 40 + (Math.min(topComments.length, 10) * 4), // Reddit weighted slightly lower
                    category: category,
                    scrapedAt: new Date(),
                    used: false,
                    usedAt: null,
                  })
                }

                // Delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 300))
              } catch (error) {
                console.error(`Error processing Reddit post ${postData.id}:`, error)
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error fetching r/${subreddit}:`, err)
      }
    }

    // Batch-fetch og:image for articles that don't already have a good image
    if (allArticles.length > 0) {
      const urlsNeedingImages = allArticles
        .filter(a => !a.urlToImage)
        .map(a => a.url)

      if (urlsNeedingImages.length > 0) {
        const ogImages = await extractOgImages(urlsNeedingImages, 3000)
        let imageCount = 0

        for (const article of allArticles) {
          if (!article.urlToImage) {
            const ogImage = ogImages.get(article.url)
            if (ogImage) {
              article.urlToImage = ogImage
              imageCount++
            }
          }
        }
        console.log(`🖼️  Reddit: Extracted og:image for ${imageCount}/${urlsNeedingImages.length} articles without thumbnails`)
      }
    }

    // Write to database
    const batch = adminDb.batch()
    allArticles.forEach(article => {
      const articleRef = adminDb.collection('scrapedArticles').doc()
      batch.set(articleRef, article)
    })

    if (allArticles.length > 0) {
      await batch.commit()
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log(`✅ Reddit: Added ${allArticles.length} articles in ${duration}s`)

    return NextResponse.json({
      success: true,
      source: 'Reddit',
      articlesAdded: allArticles.length,
      duration: `${duration}s`,
      message: `Scraped ${allArticles.length} Reddit articles from ${subreddits.length} subreddits`
    })
  } catch (error: any) {
    console.error('❌ Error scraping Reddit:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

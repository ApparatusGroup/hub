import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { detectArticleCategory } from '@/lib/article-categorizer'

/**
 * Dedicated Lobste.rs scraper - runs independently under 10s
 * Scrapes Lobste.rs tech community and writes to shared scrapedArticles database
 */

interface CommentWithScore {
  text: string
  sourceScore: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🟣 Starting Lobste.rs scraping...')
    const startTime = Date.now()

    // Get existing URLs to avoid duplicates
    const existingSnapshot = await adminDb.collection('scrapedArticles').get()
    const existingUrls = new Set(existingSnapshot.docs.map(doc => doc.data().url))

    const res = await fetch('https://lobste.rs/hottest.json')

    if (!res.ok) {
      console.error(`Lobste.rs API error: ${res.status}`)
      return NextResponse.json({
        success: false,
        source: 'Lobsters',
        error: 'Failed to fetch from Lobste.rs'
      }, { status: 500 })
    }

    const stories = await res.json()
    const articlesWithComments: any[] = []

    // Process top 25 stories for better selection
    for (const story of stories.slice(0, 25)) {
      // Stop if we have enough
      if (articlesWithComments.length >= 10) break

      try {
        // Only include stories with good engagement
        if (story.score < 8 || story.comment_count < 5) continue
        if (existingUrls.has(story.url)) continue

        // Fetch comments for this story
        const commentsRes = await fetch(`https://lobste.rs/s/${story.short_id}.json`)
        if (!commentsRes.ok) continue

        const storyData = await commentsRes.json()
        const topComments: CommentWithScore[] = []

        // Extract top-level comments with scores
        if (storyData.comments && Array.isArray(storyData.comments)) {
          for (const comment of storyData.comments.slice(0, 10)) {
            if (comment.comment && comment.comment.length > 20 && comment.comment.length < 300) {
              // Filter out links
              if (!/https?:\/\/|www\.|\.com|\.org|\.io/i.test(comment.comment)) {
                topComments.push({
                  text: comment.comment.trim(),
                  sourceScore: comment.score || 0
                })
              }
            }
          }
        }

        // Only add if we got comments
        if (topComments.length > 0) {
          const category = detectArticleCategory(story.title, story.description || story.title)

          articlesWithComments.push({
            url: story.url,
            title: story.title,
            submissionTitle: story.title,
            description: story.description || story.title,
            source: 'Lobsters',
            urlToImage: null,
            topComments: topComments,
            commentCount: topComments.length,
            popularityScore: 45 + (Math.min(topComments.length, 10) * 4), // Lobsters weighted between HN and Reddit
            category: category,
            scrapedAt: new Date(),
            used: false,
            usedAt: null,
          })
        }

        // Delay to be respectful
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        console.error(`Error processing Lobste.rs story:`, error)
      }
    }

    // Write to database
    const batch = adminDb.batch()
    articlesWithComments.forEach(article => {
      const articleRef = adminDb.collection('scrapedArticles').doc()
      batch.set(articleRef, article)
    })

    if (articlesWithComments.length > 0) {
      await batch.commit()
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log(`✅ Lobsters: Added ${articlesWithComments.length} articles in ${duration}s`)

    return NextResponse.json({
      success: true,
      source: 'Lobsters',
      articlesAdded: articlesWithComments.length,
      duration: `${duration}s`,
      message: `Scraped ${articlesWithComments.length} Lobste.rs articles with comments`
    })
  } catch (error: any) {
    console.error('❌ Error scraping Lobste.rs:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

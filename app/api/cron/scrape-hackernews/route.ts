import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { detectArticleCategory } from '@/lib/article-categorizer'
import { fetchArticleImage } from '@/lib/image-fetcher'

/**
 * Dedicated Hacker News scraper - runs independently under 10s
 * Scrapes HN thoroughly and writes to shared scrapedArticles database
 */

interface HNComment {
  id: number
  text?: string
  score?: number
  deleted?: boolean
  dead?: boolean
}

interface CommentWithScore {
  text: string
  sourceScore: number
}

async function getHNComments(storyId: number, limit: number = 15): Promise<CommentWithScore[]> {
  try {
    const storyRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${storyId}.json`)
    if (!storyRes.ok) return []

    const story = await storyRes.json()
    if (!story || !story.kids || story.kids.length === 0) return []

    // Fetch top comments
    const commentPromises = story.kids.slice(0, limit).map(async (commentId: number) => {
      const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${commentId}.json`)
      if (!res.ok) return null
      return res.json()
    })

    const comments = await Promise.all(commentPromises)

    // Clean comments and preserve scores
    const cleanedComments = comments
      .filter((c: HNComment | null) => c && c.text && !c.deleted && !c.dead)
      .map((c: HNComment) => {
        let text = c.text!
          .replace(/<p>/g, '\n')
          .replace(/<[^>]*>/g, '')
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/&gt;/g, '>')
          .replace(/&lt;/g, '<')
          .replace(/&#x2F;/g, '/')
          .trim()

        const sentences = text.split(/\. |\n/)
        const cleanedText = sentences.slice(0, 2).join('. ').trim()

        return {
          text: cleanedText,
          sourceScore: c.score || 0
        }
      })
      .filter((c) => {
        if (c.text.length < 20 || c.text.length > 300) return false
        if (/https?:\/\/|www\.|github\.com|\.com|\.org|\.io/i.test(c.text)) return false
        if (/[.\s]+\d+$/.test(c.text)) return false
        if (/^\d+$/.test(c.text)) return false
        if (/\[\d+\]/.test(c.text)) return false
        return true
      })
      .slice(0, 10) // Top 10 comments

    return cleanedComments
  } catch (error) {
    console.error(`Error fetching HN comments for story ${storyId}:`, error)
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

    console.log('🔶 Starting Hacker News scraping...')
    const startTime = Date.now()

    // Get top story IDs
    const topStoriesRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json')
    const topStoryIds: number[] = await topStoriesRes.json()

    // Fetch top 60 stories for more selection
    const storyPromises = topStoryIds.slice(0, 60).map(async (id) => {
      const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
      return res.json()
    })

    const stories = await Promise.all(storyPromises)

    // Filter for quality stories
    const filteredStories = stories.filter((story: any) => {
      if (!story || story.type !== 'story' || !story.url || !story.title) return false
      if (story.score <= 50 || story.descendants <= 10) return false

      const titleLower = story.title.toLowerCase()
      if (titleLower.startsWith('show hn:') || titleLower.startsWith('ask hn:')) return false
      if (titleLower.includes(' sdk') || titleLower.includes('-sdk')) return false
      if (titleLower.includes('hiring') || titleLower.includes('who is hiring')) return false

      return true
    })

    console.log(`📊 HN: Found ${filteredStories.length} quality stories from top 60`)

    // Get existing URLs to avoid duplicates
    const existingSnapshot = await adminDb.collection('scrapedArticles').get()
    const existingUrls = new Set(existingSnapshot.docs.map(doc => doc.data().url))

    // Scrape up to 20 articles with comments
    const articlesWithComments: any[] = []
    const maxStories = Math.min(filteredStories.length, 30)

    for (let i = 0; i < maxStories; i++) {
      const story = filteredStories[i]

      // Skip if already in database
      if (existingUrls.has(story.url)) continue

      try {
        const topComments = await getHNComments(story.id, 15)

        if (topComments.length > 0) {
          const category = detectArticleCategory(story.title, story.title)

          articlesWithComments.push({
            url: story.url,
            title: story.title,
            submissionTitle: story.title,
            description: story.title,
            source: 'Hacker News',
            urlToImage: null,
            topComments: topComments,
            commentCount: topComments.length,
            popularityScore: 50 + (Math.min(topComments.length, 10) * 5), // HN weighted higher
            category: category,
            scrapedAt: new Date(),
            used: false,
            usedAt: null,
          })
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 30))

        // Stop at 20 articles
        if (articlesWithComments.length >= 20) break
      } catch (error) {
        console.error(`Error processing HN story ${story.id}:`, error)
      }
    }

    // Fetch images for top 10 articles in parallel (for featured stories)
    if (articlesWithComments.length > 0) {
      console.log(`🖼️  Fetching images for top ${Math.min(articlesWithComments.length, 10)} HN articles...`)
      const imagePromises = articlesWithComments.slice(0, 10).map(async (article) => {
        try {
          const imageUrl = await fetchArticleImage(article.url)
          if (imageUrl) {
            article.urlToImage = imageUrl
          }
        } catch (error) {
          // Silent fail - images are optional
        }
      })
      await Promise.all(imagePromises)
      console.log(`✅ Image fetching complete`)
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

    console.log(`✅ HN: Added ${articlesWithComments.length} articles in ${duration}s`)

    return NextResponse.json({
      success: true,
      source: 'Hacker News',
      articlesAdded: articlesWithComments.length,
      duration: `${duration}s`,
      message: `Scraped ${articlesWithComments.length} HN articles with comments`
    })
  } catch (error: any) {
    console.error('❌ Error scraping Hacker News:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

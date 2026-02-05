import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { getTopNews } from '@/lib/news-service'

/**
 * Background article scraper - runs every 30 minutes
 * Scrapes HN/Reddit articles with comments and stores in database
 * This allows instant post creation without timeout issues
 *
 * URL: /api/cron/scrape-articles?secret=YOUR_SECRET
 */
export async function GET(request: Request) {
  try {
    // Verify secret
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Starting background article scraping...')

    // Scrape fresh articles from HN + Reddit
    const articles = await getTopNews()
    console.log(`📰 Scraped ${articles.length} articles from HN + Reddit`)

    if (articles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new articles found',
        articlesAdded: 0
      })
    }

    // Get existing articles to check for duplicates
    const existingSnapshot = await adminDb
      .collection('scrapedArticles')
      .get()

    const existingUrls = new Set(
      existingSnapshot.docs.map(doc => doc.data().url)
    )

    let articlesAdded = 0
    const batch = adminDb.batch()

    // Add new articles to database
    for (const article of articles) {
      // Skip if already in database
      if (existingUrls.has(article.url)) {
        console.log(`⏭️  Skipping duplicate: ${article.title.substring(0, 50)}...`)
        continue
      }

      // Calculate popularity score for ranking
      // Based on: source engagement, comment count, recency
      const sourceScore = article.source.name === 'Hacker News' ? 1.0 : 0.8
      const commentScore = Math.min((article.topComments?.length || 0) / 5, 1.0)
      const popularityScore = (sourceScore * 50) + (commentScore * 50)

      const articleRef = adminDb.collection('scrapedArticles').doc()
      batch.set(articleRef, {
        url: article.url,
        title: article.title,
        submissionTitle: article.submissionTitle || article.title,
        description: article.description,
        source: article.source.name,
        urlToImage: article.urlToImage,
        topComments: article.topComments || [],
        commentCount: article.topComments?.length || 0,
        popularityScore,
        scrapedAt: new Date(),
        used: false,
        usedAt: null,
      })

      articlesAdded++
      console.log(`✅ Added: ${article.title.substring(0, 50)}... (score: ${popularityScore.toFixed(1)})`)
    }

    // Commit new articles
    if (articlesAdded > 0) {
      await batch.commit()
      console.log(`💾 Committed ${articlesAdded} new articles to database`)
    }

    // Cleanup: Remove old articles (>7 days) or used articles (>3 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    const oldArticles = await adminDb
      .collection('scrapedArticles')
      .where('scrapedAt', '<', sevenDaysAgo)
      .get()

    const oldUsedArticles = await adminDb
      .collection('scrapedArticles')
      .where('used', '==', true)
      .where('usedAt', '<', threeDaysAgo)
      .get()

    const deleteBatch = adminDb.batch()
    let deletedCount = 0

    oldArticles.docs.forEach(doc => {
      deleteBatch.delete(doc.ref)
      deletedCount++
    })

    oldUsedArticles.docs.forEach(doc => {
      deleteBatch.delete(doc.ref)
      deletedCount++
    })

    if (deletedCount > 0) {
      await deleteBatch.commit()
      console.log(`🗑️  Cleaned up ${deletedCount} old articles`)
    }

    // Get current database stats
    const currentSnapshot = await adminDb.collection('scrapedArticles').get()
    const unusedCount = currentSnapshot.docs.filter(doc => !doc.data().used).length

    return NextResponse.json({
      success: true,
      articlesAdded,
      deletedCount,
      totalArticles: currentSnapshot.docs.length,
      unusedArticles: unusedCount,
      message: `Scraped ${articlesAdded} new articles, cleaned up ${deletedCount} old articles`
    })
  } catch (error: any) {
    console.error('❌ Error scraping articles:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to scrape articles' },
      { status: 500 }
    )
  }
}

// Also support POST
export async function POST(request: Request) {
  const url = new URL(request.url)
  const secret = url.searchParams.get('secret')

  if (secret !== process.env.AI_BOT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return GET(request)
}

import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

/**
 * MASTER SCRAPER - Triggers all 3 specialized scrapers + cleanup
 * Can also be used for just cleanup if scrapers run independently
 *
 * Recommended: Run the 3 scrapers independently on separate schedules:
 * - /api/cron/scrape-hackernews?secret=X (every 20 min)
 * - /api/cron/scrape-reddit?secret=X (every 25 min)
 * - /api/cron/scrape-lobsters?secret=X (every 30 min)
 *
 * This master endpoint can run less frequently (every 2 hours) for cleanup
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

    const mode = searchParams.get('mode') || 'all' // 'all', 'cleanup', or 'scrape'

    console.log(`🔄 Starting master scraper (mode: ${mode})...`)

    let totalArticlesAdded = 0

    // Optionally trigger all 3 scrapers (if mode=all or mode=scrape)
    if (mode === 'all' || mode === 'scrape') {
      console.log('📡 Triggering all 3 scrapers...')

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://hub-gray-six.vercel.app'

      try {
        const [hnRes, redditRes, lobstersRes] = await Promise.all([
          fetch(`${baseUrl}/api/cron/scrape-hackernews?secret=${secret}`),
          fetch(`${baseUrl}/api/cron/scrape-reddit?secret=${secret}`),
          fetch(`${baseUrl}/api/cron/scrape-lobsters?secret=${secret}`)
        ])

        const hnData = await hnRes.json()
        const redditData = await redditRes.json()
        const lobstersData = await lobstersRes.json()

        totalArticlesAdded =
          (hnData.articlesAdded || 0) +
          (redditData.articlesAdded || 0) +
          (lobstersData.articlesAdded || 0)

        console.log(`✅ All scrapers completed: ${totalArticlesAdded} total articles`)
      } catch (error) {
        console.error('⚠️  Error triggering scrapers:', error)
        // Continue to cleanup even if scraping fails
      }
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

    // Query used articles and filter by date in code (avoids composite index)
    const usedArticlesSnapshot = await adminDb
      .collection('scrapedArticles')
      .where('used', '==', true)
      .get()

    // Filter to only old used articles (>3 days)
    const oldUsedArticles = usedArticlesSnapshot.docs.filter(doc => {
      const usedAt = doc.data().usedAt?.toDate()
      return usedAt && usedAt < threeDaysAgo
    })

    const deleteBatch = adminDb.batch()
    let deletedCount = 0

    oldArticles.docs.forEach(doc => {
      deleteBatch.delete(doc.ref)
      deletedCount++
    })

    oldUsedArticles.forEach(doc => {
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
      mode,
      articlesAdded: totalArticlesAdded,
      deletedCount,
      totalArticles: currentSnapshot.docs.length,
      unusedArticles: unusedCount,
      message: mode === 'cleanup'
        ? `Cleaned up ${deletedCount} old articles`
        : `Scraped ${totalArticlesAdded} new articles, cleaned up ${deletedCount} old articles`,
      recommendation: 'For best performance, run the 3 scrapers independently: /api/cron/scrape-{hackernews,reddit,lobsters}'
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

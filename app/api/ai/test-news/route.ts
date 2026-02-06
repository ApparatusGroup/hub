import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(request: Request) {
  try {
    const { secret } = await request.json()
    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Read from pre-scraped articles in Firestore (fast, no external calls)
    const articlesSnapshot = await adminDb
      .collection('scrapedArticles')
      .where('used', '==', false)
      .limit(10)
      .get()

    if (articlesSnapshot.empty) {
      return NextResponse.json({
        error: 'No scraped articles found',
        hint: 'Run the scrape cron jobs first (scrape-hackernews, scrape-reddit, scrape-lobsters)',
        count: 0
      }, { status: 404 })
    }

    const sample = articlesSnapshot.docs.slice(0, 5).map(doc => {
      const data = doc.data()
      return {
        title: data.title,
        description: data.description?.substring(0, 100),
        source: data.source,
        comments: data.commentCount || 0,
        hasImage: !!data.urlToImage,
        category: data.category,
      }
    })

    // Count total available
    const totalSnapshot = await adminDb
      .collection('scrapedArticles')
      .where('used', '==', false)
      .get()

    return NextResponse.json({
      success: true,
      count: totalSnapshot.size,
      sample,
      message: `${totalSnapshot.size} fresh articles available from HN + Reddit + Lobsters`
    })
  } catch (error: any) {
    console.error('Error testing news:', error)
    return NextResponse.json(
      { error: 'Failed to check news', details: error.message },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { analyzeViralPatterns } from '@/lib/viral-scraper'

/**
 * Cron job to update viral patterns every 3 hours
 * Keeps trending topics fresh for AI bots
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Running viral patterns update via cron...')

    // Run the Node.js viral pattern analyzer
    const results = await analyzeViralPatterns()

    if (!results.success) {
      throw new Error('Analysis failed')
    }

    // Store results in Firestore
    await adminDb.collection('viralPatterns').doc('latest').set({
      ...results,
      updatedAt: new Date(),
    })

    console.log(`✅ Viral patterns updated: ${results.stats.total_articles} articles analyzed`)
    console.log(`   Keywords: ${results.patterns.top_keywords.length}, Hashtags: ${results.patterns.top_hashtags.length}, Phrases: ${results.patterns.top_phrases.length}`)

    return NextResponse.json({
      success: true,
      stats: results.stats,
      patterns: {
        keywords_count: results.patterns.top_keywords.length,
        hashtags_count: results.patterns.top_hashtags.length,
        phrases_count: results.patterns.top_phrases.length,
      },
      message: 'Viral patterns updated successfully via cron'
    })

  } catch (error: any) {
    console.error('❌ Error in viral patterns cron:', error)
    return NextResponse.json(
      {
        error: 'Failed to update viral patterns',
        details: error.message
      },
      { status: 500 }
    )
  }
}

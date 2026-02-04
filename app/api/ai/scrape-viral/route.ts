import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { analyzeViralPatterns } from '@/lib/viral-scraper'

export async function POST(request: Request) {
  try {
    // Verify request has the secret key
    const { secret } = await request.json()
    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Analyzing viral patterns from news articles...')

    // Run the Node.js viral pattern analyzer
    const results = await analyzeViralPatterns()

    if (!results.success) {
      return NextResponse.json({
        error: 'Analysis failed',
        details: 'Failed to analyze news articles'
      }, { status: 500 })
    }

    // Store results in Firestore
    const viralPatternsRef = adminDb.collection('viralPatterns').doc('latest')
    await viralPatternsRef.set({
      ...results,
      updatedAt: new Date(),
    })

    console.log(`Analyzed ${results.stats.total_articles} articles from ${results.stats.sources.length} sources`)

    return NextResponse.json({
      success: true,
      stats: results.stats,
      patterns: {
        keywords_count: results.patterns.top_keywords.length,
        hashtags_count: results.patterns.top_hashtags.length,
        phrases_count: results.patterns.top_phrases.length,
      },
      message: 'Viral patterns updated successfully from news analysis'
    })

  } catch (error: any) {
    console.error('Error analyzing viral patterns:', error)
    return NextResponse.json(
      {
        error: 'Failed to analyze viral patterns',
        details: error.message
      },
      { status: 500 }
    )
  }
}

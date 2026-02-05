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
    console.log('Top 5 keywords:', results.patterns.top_keywords.slice(0, 5).map(k => k.word).join(', '))
    console.log('Top 5 hashtags:', results.patterns.top_hashtags.slice(0, 5).map(h => h.tag).join(', '))

    return NextResponse.json({
      success: true,
      stats: results.stats,
      patterns: {
        keywords_count: results.patterns.top_keywords.length,
        hashtags_count: results.patterns.top_hashtags.length,
        phrases_count: results.patterns.top_phrases.length,
        sample_keywords: results.patterns.top_keywords.slice(0, 10).map(k => k.word),
        sample_hashtags: results.patterns.top_hashtags.slice(0, 10).map(h => h.tag),
        sample_phrases: results.patterns.top_phrases.slice(0, 10).map(p => p.phrase),
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

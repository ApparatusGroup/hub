import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { analyzeViralPatterns } from '@/lib/viral-scraper'

// This endpoint is called by Vercel Cron once per day (free tier limit)
// It updates viral patterns and triggers AI activity
export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const secret = process.env.AI_BOT_SECRET

    console.log('🔄 Running daily cron job...')

    // Step 1: Update viral patterns
    console.log('📊 Updating viral patterns...')
    try {
      const viralResults = await analyzeViralPatterns()
      if (viralResults.success) {
        await adminDb.collection('viralPatterns').doc('latest').set({
          ...viralResults,
          updatedAt: new Date(),
        })
        console.log(`✅ Viral patterns updated: ${viralResults.stats.total_articles} articles`)
      }
    } catch (error) {
      console.error('⚠️  Viral patterns update failed, continuing anyway:', error)
    }

    // Step 2: Trigger AI activity (randomly decide: 40% post, 60% comment)
    const shouldPost = Math.random() < 0.4

    let result

    if (shouldPost) {
      // Create an AI post
      console.log('📝 Creating AI post...')
      const response = await fetch(`${baseUrl}/api/ai/create-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      })
      result = await response.json()
    } else {
      // Create an AI comment
      console.log('💬 Creating AI comment...')
      const response = await fetch(`${baseUrl}/api/ai/create-comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      })
      result = await response.json()
    }

    return NextResponse.json({
      success: true,
      viralPatternsUpdated: true,
      action: shouldPost ? 'post' : 'comment',
      result,
    })
  } catch (error) {
    console.error('Error in AI cron:', error)
    return NextResponse.json(
      { error: 'Failed to execute AI cron' },
      { status: 500 }
    )
  }
}

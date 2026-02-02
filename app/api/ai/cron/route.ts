import { NextResponse } from 'next/server'

// This endpoint should be called by Vercel Cron or similar
// It randomly decides whether to create a post or comment
export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const secret = process.env.AI_BOT_SECRET

    // Randomly decide: 40% post, 60% comment
    const shouldPost = Math.random() < 0.4

    let result

    if (shouldPost) {
      // Create an AI post
      const response = await fetch(`${baseUrl}/api/ai/create-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      })
      result = await response.json()
    } else {
      // Create an AI comment
      const response = await fetch(`${baseUrl}/api/ai/create-comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      })
      result = await response.json()
    }

    return NextResponse.json({
      success: true,
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

import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Distribute AI activity realistically:
    // 35% comment on posts, 20% create posts, 15% vote on comments (expert), 15% like posts, 15% reply to comments
    const random = Math.random()
    let endpoint: string
    let action: string

    if (random < 0.35) {
      endpoint = '/api/ai/create-comment'
      action = 'comment'
    } else if (random < 0.55) {
      endpoint = '/api/ai/create-post'
      action = 'post'
    } else if (random < 0.70) {
      endpoint = '/api/ai/vote-comments'
      action = 'vote-comments'
    } else if (random < 0.85) {
      endpoint = '/api/ai/like-posts'
      action = 'like'
    } else {
      endpoint = '/api/ai/reply-to-comments'
      action = 'reply-to-comment'
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://hub-gray-six.vercel.app'

    // Call the appropriate endpoint
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: process.env.AI_BOT_SECRET }),
    })

    const data = await response.json()

    // Don't throw error for rate limits or "no posts found" - these are expected
    if (!response.ok && response.status !== 429 && response.status !== 404) {
      throw new Error(data.error || 'Failed to create AI activity')
    }

    return NextResponse.json({
      success: response.ok,
      action,
      ...data,
    })
  } catch (error: any) {
    console.error('Error in AI activity cron:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create AI activity' },
      { status: 500 }
    )
  }
}

// Also support POST for services that prefer POST
export async function POST(request: Request) {
  try {
    const { secret } = await request.json()

    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Distribute AI activity realistically:
    // 35% comment on posts, 20% create posts, 15% vote on comments (expert), 15% like posts, 15% reply to comments
    const random = Math.random()
    let endpoint: string
    let action: string

    if (random < 0.35) {
      endpoint = '/api/ai/create-comment'
      action = 'comment'
    } else if (random < 0.55) {
      endpoint = '/api/ai/create-post'
      action = 'post'
    } else if (random < 0.70) {
      endpoint = '/api/ai/vote-comments'
      action = 'vote-comments'
    } else if (random < 0.85) {
      endpoint = '/api/ai/like-posts'
      action = 'like'
    } else {
      endpoint = '/api/ai/reply-to-comments'
      action = 'reply-to-comment'
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://hub-gray-six.vercel.app'

    // Call the appropriate endpoint
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: process.env.AI_BOT_SECRET }),
    })

    const data = await response.json()

    // Don't throw error for rate limits or "no posts found" - these are expected
    if (!response.ok && response.status !== 429 && response.status !== 404) {
      throw new Error(data.error || 'Failed to create AI activity')
    }

    return NextResponse.json({
      success: response.ok,
      action,
      ...data,
    })
  } catch (error: any) {
    console.error('Error in AI activity cron:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create AI activity' },
      { status: 500 }
    )
  }
}

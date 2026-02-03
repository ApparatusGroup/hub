import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Randomly decide: 60% comment, 40% post (comments make it more lively)
    const shouldComment = Math.random() < 0.6

    const endpoint = shouldComment ? '/api/ai/create-comment' : '/api/ai/create-post'
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://hub-gray-six.vercel.app'

    // Call the appropriate endpoint
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: process.env.AI_BOT_SECRET }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create AI activity')
    }

    return NextResponse.json({
      success: true,
      action: shouldComment ? 'comment' : 'post',
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

    // Randomly decide: 60% comment, 40% post
    const shouldComment = Math.random() < 0.6

    const endpoint = shouldComment ? '/api/ai/create-comment' : '/api/ai/create-post'
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://hub-gray-six.vercel.app'

    // Call the appropriate endpoint
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: process.env.AI_BOT_SECRET }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create AI activity')
    }

    return NextResponse.json({
      success: true,
      action: shouldComment ? 'comment' : 'post',
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

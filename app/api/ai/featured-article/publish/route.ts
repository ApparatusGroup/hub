import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(request: Request) {
  try {
    const { secret, topic, articleBody, botUser, authorCredit, contributors } = await request.json()
    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!topic || !articleBody || !botUser) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Generate AI image via Pollinations - pre-warm by fetching
    const shortTitle = topic.title.substring(0, 50).replace(/[^a-zA-Z0-9 ]/g, '')
    const imagePrompt = `${shortTitle} tech editorial photo cinematic`
    const seed = Math.floor(Math.random() * 100000)
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1200&height=630&nologo=true&seed=${seed}`

    // Pre-warm: trigger image generation, but don't block on it
    let articleImage = pollinationsUrl
    try {
      const imgRes = await fetch(pollinationsUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      })
      if (!imgRes.ok) {
        // Fallback to OG image
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://hub-gray-six.vercel.app'
        articleImage = `${baseUrl}/api/og?${new URLSearchParams({ title: topic.title, category: topic.category }).toString()}`
      }
    } catch {
      // Timeout or error - still use Pollinations URL (will generate on first browser load)
      // but also set OG as backup in case Pollinations is down
    }

    // Extract summary for card
    const commentary = articleBody.split('\n').find((line: string) =>
      line.trim().length > 50 && !line.startsWith('#')
    )?.trim().substring(0, 200) || articleBody.substring(0, 200)

    // Save to Firestore
    const postRef = await adminDb.collection('posts').add({
      userId: botUser.uid,
      userName: botUser.displayName,
      userPhoto: botUser.photoURL,
      isAI: true,
      isFeaturedArticle: true,
      content: commentary,
      articleTitle: topic.title,
      articleBody: articleBody,
      articleImage: articleImage,
      articleUrl: null,
      articleDescription: commentary,
      authorCredit: authorCredit,
      contributors: contributors,
      category: topic.category,
      tags: topic.tags || [],
      upvotes: [],
      downvotes: [],
      commentCount: 0,
      createdAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      postId: postRef.id,
      title: topic.title,
      author: authorCredit,
      category: topic.category,
      wordCount: articleBody.split(/\s+/).length,
    })
  } catch (error) {
    console.error('Error publishing featured article:', error)
    return NextResponse.json({ error: 'Failed to publish featured article' }, { status: 500 })
  }
}

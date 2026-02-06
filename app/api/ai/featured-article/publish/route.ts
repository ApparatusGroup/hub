import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(request: Request) {
  try {
    const { secret, topic, articleBody, botUser, authorCredit, contributors, imagePrompt: aiImagePrompt } = await request.json()
    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!topic || !articleBody || !botUser) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Build the Pollinations image prompt
    // Use AI-generated prompt if available, otherwise build from title
    const seed = Math.floor(Math.random() * 100000)
    let imagePrompt: string

    if (aiImagePrompt && aiImagePrompt.length > 10) {
      // Use the AI-generated scene description directly
      imagePrompt = aiImagePrompt
    } else {
      // Fallback: build a more descriptive prompt from the title + category
      const cleanTitle = topic.title.substring(0, 60).replace(/[^a-zA-Z0-9 ]/g, '')
      const categoryStyles: Record<string, string> = {
        'Artificial Intelligence': 'futuristic neural network visualization, glowing circuits, dark moody lighting',
        'Computing & Hardware': 'sleek modern hardware closeup, macro photography, dramatic studio lighting',
        'Emerging Tech & Science': 'cutting edge laboratory equipment, blue scientific glow, cinematic',
        'Software & Development': 'developer workspace with multiple monitors showing code, atmospheric night lighting',
        'Big Tech & Policy': 'modern glass corporate headquarters at sunset, wide angle architectural photography',
        'Personal Tech & Gadgets': 'elegant consumer electronics product photography, minimalist white background',
      }
      const style = categoryStyles[topic.category] || 'technology editorial photography, cinematic lighting'
      imagePrompt = `${cleanTitle}, ${style}, photorealistic, editorial magazine quality`
    }

    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1200&height=630&nologo=true&seed=${seed}`

    // Pre-warm: trigger image generation
    let articleImage = pollinationsUrl
    try {
      const imgRes = await fetch(pollinationsUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(8000),
      })
      if (!imgRes.ok) {
        // Fallback to OG image with title
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://hub-gray-six.vercel.app'
        articleImage = `${baseUrl}/api/og?${new URLSearchParams({ title: topic.title, category: topic.category }).toString()}`
      }
    } catch {
      // Timeout - still use Pollinations URL (will generate on first browser load)
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
      imagePromptUsed: imagePrompt.substring(0, 80),
    })
  } catch (error) {
    console.error('Error publishing featured article:', error)
    return NextResponse.json({ error: 'Failed to publish featured article' }, { status: 500 })
  }
}

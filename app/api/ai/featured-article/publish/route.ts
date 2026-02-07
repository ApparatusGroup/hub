import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(request: Request) {
  try {
    const { secret, topic, articleBody, botUser, authorCredit, contributors, imageUrl } = await request.json()
    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!topic || !articleBody || !botUser) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const articleImage = imageUrl || ''

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

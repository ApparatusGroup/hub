import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { generateAIComment, AI_BOTS } from '@/lib/ai-service'

export async function POST(request: Request) {
  try {
    // Verify request has the secret key
    const { secret } = await request.json()
    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get recent posts (from last 24 hours)
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    const postsSnapshot = await adminDb
      .collection('posts')
      .where('createdAt', '>=', oneDayAgo)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()

    if (postsSnapshot.empty) {
      return NextResponse.json({ error: 'No recent posts found' }, { status: 404 })
    }

    // Randomly select a post
    const posts = postsSnapshot.docs
    const randomPost = posts[Math.floor(Math.random() * posts.length)]
    const postData = randomPost.data()

    // Get all AI bot users
    const botsSnapshot = await adminDb.collection('users').where('isAI', '==', true).get()

    if (botsSnapshot.empty) {
      return NextResponse.json({ error: 'No AI bots found' }, { status: 404 })
    }

    // Randomly select a bot (make sure it's not the post author if it's an AI)
    let botDocs = botsSnapshot.docs
    if (postData.isAI) {
      botDocs = botDocs.filter(doc => doc.data().uid !== postData.userId)
    }

    if (botDocs.length === 0) {
      return NextResponse.json({ error: 'No suitable bots found' }, { status: 404 })
    }

    const randomBot = botDocs[Math.floor(Math.random() * botDocs.length)]
    const botData = randomBot.data()

    // Find the personality config
    const personality = AI_BOTS.find(b => b.name === botData.displayName)
    if (!personality) {
      return NextResponse.json({ error: 'Bot personality not found' }, { status: 404 })
    }

    // Generate comment content
    const commentContent = await generateAIComment(
      personality,
      postData.content,
      postData.userName
    )

    // Create the comment
    const commentRef = await adminDb.collection('comments').add({
      postId: randomPost.id,
      userId: botData.uid,
      userName: botData.displayName,
      userPhoto: botData.photoURL,
      isAI: true,
      content: commentContent,
      createdAt: new Date(),
      likes: [],
    })

    return NextResponse.json({
      success: true,
      commentId: commentRef.id,
      botName: botData.displayName,
      postAuthor: postData.userName,
      comment: commentContent,
    })
  } catch (error) {
    console.error('Error creating AI comment:', error)
    return NextResponse.json(
      { error: 'Failed to create AI comment' },
      { status: 500 }
    )
  }
}

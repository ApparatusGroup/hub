import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { generateAIPost, AI_BOTS, AIBotPersonality } from '@/lib/ai-service'

export async function POST(request: Request) {
  try {
    // Verify request has the secret key
    const { secret } = await request.json()
    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all AI bot users from Firestore
    const botsSnapshot = await adminDb.collection('users').where('isAI', '==', true).get()

    if (botsSnapshot.empty) {
      return NextResponse.json({ error: 'No AI bots found' }, { status: 404 })
    }

    // Randomly select a bot
    const botDocs = botsSnapshot.docs
    const randomBot = botDocs[Math.floor(Math.random() * botDocs.length)]
    const botData = randomBot.data()

    // Find the personality config
    const personality = AI_BOTS.find(b => b.name === botData.displayName)
    if (!personality) {
      return NextResponse.json({ error: 'Bot personality not found' }, { status: 404 })
    }

    // Generate post content
    const content = await generateAIPost(personality)

    // Create the post
    const postRef = await adminDb.collection('posts').add({
      userId: botData.uid,
      userName: botData.displayName,
      userPhoto: botData.photoURL,
      isAI: true,
      content,
      imageUrl: null,
      articleUrl: null,
      createdAt: new Date(),
      likes: [],
    })

    return NextResponse.json({
      success: true,
      postId: postRef.id,
      botName: botData.displayName,
      content,
    })
  } catch (error) {
    console.error('Error creating AI post:', error)
    return NextResponse.json(
      { error: 'Failed to create AI post' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(request: Request) {
  try {
    // Verify request has the secret key
    const { secret } = await request.json()
    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get recent comments (from last 6 hours) that are replies to AI bot comments
    const sixHoursAgo = new Date()
    sixHoursAgo.setHours(sixHoursAgo.getHours() - 6)

    const commentsSnapshot = await adminDb
      .collection('comments')
      .where('createdAt', '>=', sixHoursAgo)
      .where('parentId', '!=', null)
      .orderBy('parentId')
      .orderBy('createdAt', 'desc')
      .limit(30)
      .get()

    if (commentsSnapshot.empty) {
      return NextResponse.json({ error: 'No recent replies found' }, { status: 404 })
    }

    const actions: any[] = []

    // Get all AI bot users
    const botsSnapshot = await adminDb.collection('users').where('isAI', '==', true).get()
    const botMap = new Map()
    botsSnapshot.docs.forEach(doc => {
      botMap.set(doc.data().uid, doc.data())
    })

    // Process each reply
    for (const commentDoc of commentsSnapshot.docs) {
      const replyData = commentDoc.data()

      // Skip if reply is from an AI bot
      if (replyData.isAI) continue

      // Get the parent comment
      const parentCommentRef = await adminDb.collection('comments').doc(replyData.parentId).get()
      if (!parentCommentRef.exists) continue

      const parentCommentData = parentCommentRef.data()

      // Only process if parent comment is from an AI bot
      if (!parentCommentData || !parentCommentData.isAI) continue

      const botData = botMap.get(parentCommentData.userId)
      if (!botData) continue

      // Check if bot has already upvoted this reply
      const replyUpvotes = replyData.upvotes || replyData.likes || []
      const alreadyUpvoted = replyUpvotes.includes(botData.uid)

      // Bots almost always upvote replies to their comments (90% chance)
      if (!alreadyUpvoted && Math.random() < 0.9) {
        await adminDb.collection('comments').doc(commentDoc.id).update({
          upvotes: require('firebase-admin').firestore.FieldValue.arrayUnion(botData.uid)
        })
        actions.push({
          type: 'like',
          botName: botData.displayName,
          replyAuthor: replyData.userName
        })
      }

      // Replies disabled - only liking replies to bot comments is active
    }

    return NextResponse.json({
      success: true,
      actionsPerformed: actions.length,
      details: actions
    })
  } catch (error) {
    console.error('Error in AI reply to comments:', error)
    return NextResponse.json(
      { error: 'Failed to process AI replies' },
      { status: 500 }
    )
  }
}

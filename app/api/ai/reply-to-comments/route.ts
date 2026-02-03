import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { generateAIComment, AI_BOTS, AIBotPersonality } from '@/lib/ai-service'
import { getAIMemory, updateAIMemoryAfterComment } from '@/lib/ai-memory'

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

      // Check if bot has already liked this reply
      const replyLikes = replyData.likes || []
      const alreadyLiked = replyLikes.includes(botData.uid)

      // Bots almost always like replies to their comments (90% chance)
      if (!alreadyLiked && Math.random() < 0.9) {
        await adminDb.collection('comments').doc(commentDoc.id).update({
          likes: require('firebase-admin').firestore.FieldValue.arrayUnion(botData.uid)
        })
        actions.push({
          type: 'like',
          botName: botData.displayName,
          replyAuthor: replyData.userName
        })
      }

      // Check reply depth to limit to 4 levels
      let depth = 1
      let currentParentId = replyData.parentId
      while (currentParentId && depth < 5) {
        const parentDoc = await adminDb.collection('comments').doc(currentParentId).get()
        if (!parentDoc.exists) break
        const parentData = parentDoc.data()
        if (parentData?.parentId) {
          currentParentId = parentData.parentId
          depth++
        } else {
          break
        }
      }

      // Don't reply if we're at max depth (4)
      if (depth >= 4) continue

      // Check if bot already replied to this comment
      const existingReplies = await adminDb
        .collection('comments')
        .where('parentId', '==', commentDoc.id)
        .where('userId', '==', botData.uid)
        .get()

      if (!existingReplies.empty) continue

      // Occasionally reply back (25% chance) if the reply asks a question or is engaging
      const shouldReply = Math.random() < 0.25
      if (!shouldReply) continue

      // Get bot personality
      let personality: AIBotPersonality

      if (botData.aiPersonality && botData.aiInterests) {
        personality = {
          name: botData.displayName,
          personality: botData.aiPersonality,
          interests: botData.aiInterests,
          bio: botData.bio || '',
          age: 30,
          occupation: 'AI Assistant',
        }
      } else {
        const hardcodedPersonality = AI_BOTS.find(b => b.name === botData.displayName)
        if (!hardcodedPersonality) continue
        personality = hardcodedPersonality
      }

      // Get AI memory for context
      const memory = await getAIMemory(botData.uid)

      // Get the original post to check for article context
      const postRef = await adminDb.collection('posts').doc(replyData.postId).get()
      const postData = postRef.exists ? postRef.data() : null

      // Prepare article context if this conversation is about a news article
      const articleContext = postData?.articleTitle && postData?.articleDescription
        ? {
            title: postData.articleTitle,
            description: postData.articleDescription
          }
        : null

      // Generate reply (bot will "read" the article if present)
      const replyContent = await generateAIComment(
        personality,
        `${parentCommentData.content}\n\nUser replied: ${replyData.content}`,
        replyData.userName,
        memory,
        articleContext,
        null // No need to check existing comments for replies
      )

      // Create the reply
      const newReplyRef = await adminDb.collection('comments').add({
        postId: replyData.postId,
        userId: botData.uid,
        userName: botData.displayName,
        userPhoto: botData.photoURL,
        isAI: true,
        content: replyContent,
        createdAt: new Date(),
        likes: [],
        parentId: commentDoc.id,
        replyCount: 0
      })

      // Increment reply count on parent (the user's reply)
      await adminDb.collection('comments').doc(commentDoc.id).update({
        replyCount: require('firebase-admin').firestore.FieldValue.increment(1)
      })

      // Increment comment count on post
      await adminDb.collection('posts').doc(replyData.postId).update({
        commentCount: require('firebase-admin').firestore.FieldValue.increment(1)
      })

      // Update AI memory
      await updateAIMemoryAfterComment(botData.uid, botData.displayName, replyContent)

      actions.push({
        type: 'reply',
        botName: botData.displayName,
        replyTo: replyData.userName,
        content: replyContent.substring(0, 50) + '...'
      })
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

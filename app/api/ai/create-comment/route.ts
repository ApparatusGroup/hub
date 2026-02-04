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

    // Get recent posts (from last 3 hours only - bots should comment on fresh content)
    const threeHoursAgo = new Date()
    threeHoursAgo.setHours(threeHoursAgo.getHours() - 3)

    const postsSnapshot = await adminDb
      .collection('posts')
      .where('createdAt', '>=', threeHoursAgo)
      .orderBy('createdAt', 'desc')
      .limit(15)
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

    // Build personality from database or fall back to hardcoded config
    let personality: AIBotPersonality

    if (botData.aiPersonality && botData.aiInterests) {
      // Use personality from database (editable by admin)
      personality = {
        name: botData.displayName,
        personality: botData.aiPersonality,
        interests: botData.aiInterests,
        bio: botData.bio || '',
        age: 30, // Default values
        occupation: 'AI Assistant',
      }
    } else {
      // Fall back to hardcoded config
      const hardcodedPersonality = AI_BOTS.find(b => b.name === botData.displayName)
      if (!hardcodedPersonality) {
        return NextResponse.json({ error: 'Bot personality not found' }, { status: 404 })
      }
      personality = hardcodedPersonality
    }

    // Get AI memory for context
    const memory = await getAIMemory(botData.uid)

    // Check if bot has already commented on this post (prevent duplicates)
    const commentedPostIds = memory?.commentedPostIds || []
    if (commentedPostIds.includes(randomPost.id)) {
      return NextResponse.json({
        error: 'Bot has already commented on this post',
        botName: botData.displayName
      }, { status: 400 })
    }

    // Check if post has enough context for meaningful comment
    if (!postData.content || postData.content.length < 10) {
      return NextResponse.json({
        error: 'Post lacks sufficient context for comment'
      }, { status: 400 })
    }

    // Get existing comments on this post to ensure uniqueness
    const existingCommentsSnapshot = await adminDb
      .collection('comments')
      .where('postId', '==', randomPost.id)
      .where('parentId', '==', null) // Only top-level comments
      .get()

    const existingComments = existingCommentsSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        userName: data.userName,
        content: data.content,
        isAI: data.isAI
      }
    })

    // Prepare article context if this post shares a news article
    const articleContext = postData.articleTitle && postData.articleDescription
      ? {
          title: postData.articleTitle,
          description: postData.articleDescription
        }
      : null

    // Get image description if post has an image (allows AI to "see" the image)
    const imageDescription = postData.imageDescription || null

    // Generate comment content with memory context, article context, and image context
    // Bot will "read" the article and "see" the image before commenting
    const commentContent = await generateAIComment(
      personality,
      postData.content,
      postData.userName,
      memory,
      articleContext,
      existingComments,
      imageDescription
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

    // Increment comment count on the post
    const postRef = adminDb.collection('posts').doc(randomPost.id)
    await postRef.update({
      commentCount: require('firebase-admin').firestore.FieldValue.increment(1)
    })

    // Almost always like the post when commenting (95% chance)
    const shouldLike = Math.random() < 0.95
    if (shouldLike && !postData.likes.includes(botData.uid)) {
      await postRef.update({
        likes: require('firebase-admin').firestore.FieldValue.arrayUnion(botData.uid)
      })
    }

    // Update AI memory after comment
    await updateAIMemoryAfterComment(botData.uid, botData.displayName, commentContent)

    // Track that this bot commented on this post
    const memoryRef = adminDb.collection('aiMemory').doc(botData.uid)
    const updatedCommentedPosts = [...commentedPostIds, randomPost.id].slice(-50) // Keep last 50
    await memoryRef.set({
      commentedPostIds: updatedCommentedPosts
    }, { merge: true })

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

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

    // Get recent posts (from last 12 hours - expanded window to include popular posts)
    const twelveHoursAgo = new Date()
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12)

    const postsSnapshot = await adminDb
      .collection('posts')
      .where('createdAt', '>=', twelveHoursAgo)
      .orderBy('createdAt', 'desc')
      .limit(30) // Fetch more posts to have better selection
      .get()

    if (postsSnapshot.empty) {
      return NextResponse.json({ error: 'No recent posts found' }, { status: 404 })
    }

    // FILTER: Only select posts that have real HN/Reddit comments
    const postsWithComments = postsSnapshot.docs.filter(doc => {
      const data = doc.data()
      return data.articleTopComments && data.articleTopComments.length > 0
    })

    console.log(`🔍 Found ${postsWithComments.length} posts with real comments out of ${postsSnapshot.docs.length} total posts`)

    if (postsWithComments.length === 0) {
      return NextResponse.json({
        error: 'No posts with real HN/Reddit comments available',
        hint: 'Need to scrape more articles with comments'
      }, { status: 404 })
    }

    // Weight post selection by popularity (likes + comments)
    // Popular posts get more AI engagement, creating viral feedback loop
    const posts = postsWithComments.map(doc => {
      const data = doc.data()
      const now = Date.now()
      const ageInHours = (now - (data.createdAt?.toMillis() || Date.now())) / (1000 * 60 * 60)

      // Calculate popularity score
      const likeCount = data.likes?.length || 0
      const commentCount = data.commentCount || 0

      // Posts with engagement get much higher weight
      // Fresh posts also get bonus to ensure they get initial engagement
      const engagementWeight = (likeCount * 3) + (commentCount * 5)
      const freshnessBonus = ageInHours < 3 ? 5 : 0
      const popularityScore = Math.max(1, engagementWeight + freshnessBonus)

      return {
        doc,
        score: popularityScore
      }
    })

    // Weighted random selection (popular posts much more likely to be chosen)
    const totalScore = posts.reduce((sum, p) => sum + p.score, 0)
    let random = Math.random() * totalScore
    let selectedPost = posts[0]

    for (const post of posts) {
      random -= post.score
      if (random <= 0) {
        selectedPost = post
        break
      }
    }

    const randomPost = selectedPost.doc
    const postData = randomPost.data()

    // Get all bots that have already commented on this post to ensure variety
    const aiCommentsSnapshot = await adminDb
      .collection('comments')
      .where('postId', '==', randomPost.id)
      .where('isAI', '==', true)
      .get()

    const botsAlreadyCommented = new Set(
      aiCommentsSnapshot.docs.map(doc => doc.data().userId)
    )

    // Get all AI bot users
    const botsSnapshot = await adminDb.collection('users').where('isAI', '==', true).get()

    if (botsSnapshot.empty) {
      return NextResponse.json({ error: 'No AI bots found' }, { status: 404 })
    }

    // Filter out lurker bots (passive likers only), bots that have already commented, and post author
    let botDocs = botsSnapshot.docs.filter(doc => {
      const data = doc.data()
      const botId = data.uid
      // Exclude lurker bots (they only like, don't create content)
      if (data.isLurker === true) return false
      // Don't let bot comment on its own post
      if (postData.isAI && botId === postData.userId) return false
      // Don't let bot comment if it already commented on this post
      if (botsAlreadyCommented.has(botId)) return false
      return true
    })

    if (botDocs.length === 0) {
      return NextResponse.json({ error: 'No suitable bots found (all bots have already commented)' }, { status: 404 })
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

    // ONLY use real HN/Reddit comments - no AI generation at all
    if (!postData.articleTopComments || postData.articleTopComments.length === 0) {
      console.log('⚠️ No real comments available for this post, skipping')
      return NextResponse.json({
        error: 'No real comments available - only using authentic HN/Reddit comments',
        postId: randomPost.id
      }, { status: 404 })
    }

    // Filter out comments already used (trim and normalize for comparison)
    const usedComments = new Set(existingComments.map(c => c.content.trim().toLowerCase()))
    const availableComments = postData.articleTopComments.filter((c: string) => {
      const normalized = c.trim().toLowerCase()
      return !usedComments.has(normalized)
    })

    if (availableComments.length === 0) {
      console.log('⚠️ All real comments already used on this post')
      return NextResponse.json({
        error: 'All real comments already used',
        postId: randomPost.id
      }, { status: 404 })
    }

    // Use a random real comment from HN/Reddit
    let commentContent = availableComments[Math.floor(Math.random() * availableComments.length)].trim()

    // CRITICAL: Strip any trailing citation numbers that slipped through scraping
    // Removes patterns like ". 1", " 1", ". 2" etc
    commentContent = commentContent.replace(/[.\s]+\d+$/, '').trim()

    console.log(`✅ Using real ${postData.source?.name || 'HN/Reddit'} comment: "${commentContent.substring(0, 50)}..."`)
    console.log(`   Available: ${availableComments.length}, Total scraped: ${postData.articleTopComments.length}`)

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

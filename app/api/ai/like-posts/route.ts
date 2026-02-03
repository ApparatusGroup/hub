import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { AIBotPersonality, AI_BOTS } from '@/lib/ai-service'

export async function POST(request: Request) {
  try {
    // Verify request has the secret key
    const { secret } = await request.json()
    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get recent posts (from last 6 hours)
    const sixHoursAgo = new Date()
    sixHoursAgo.setHours(sixHoursAgo.getHours() - 6)

    const postsSnapshot = await adminDb
      .collection('posts')
      .where('createdAt', '>=', sixHoursAgo)
      .orderBy('createdAt', 'desc')
      .limit(30)
      .get()

    if (postsSnapshot.empty) {
      return NextResponse.json({ error: 'No recent posts found' }, { status: 404 })
    }

    // Get all AI bot users
    const botsSnapshot = await adminDb.collection('users').where('isAI', '==', true).get()

    if (botsSnapshot.empty) {
      return NextResponse.json({ error: 'No AI bots found' }, { status: 404 })
    }

    const likesAdded: Array<{ botName: string; postAuthor: string; postContent: string }> = []

    // For each bot, find posts they might be interested in
    for (const botDoc of botsSnapshot.docs) {
      const botData = botDoc.data()

      // Build personality from database or fall back to hardcoded config
      let personality: AIBotPersonality | null = null

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
        if (hardcodedPersonality) {
          personality = hardcodedPersonality
        }
      }

      if (!personality) continue

      // Find posts this bot would be interested in
      for (const postDoc of postsSnapshot.docs) {
        const postData = postDoc.data()

        // Don't like own posts
        if (postData.userId === botData.uid) continue

        // Check if already liked
        if (postData.likes && postData.likes.includes(botData.uid)) continue

        // Determine if bot would be interested (based on content matching interests)
        const postContent = postData.content?.toLowerCase() || ''
        const articleTitle = postData.articleTitle?.toLowerCase() || ''
        const combinedContent = `${postContent} ${articleTitle}`

        let isInterested = false

        // Check if any of the bot's interests are mentioned in the post
        for (const interest of personality.interests) {
          const interestLower = interest.toLowerCase()
          if (combinedContent.includes(interestLower)) {
            isInterested = true
            break
          }
        }

        // Add some randomness - 30% chance to like even if not directly interested
        if (!isInterested && Math.random() < 0.3) {
          isInterested = true
        }

        // If interested, like the post
        if (isInterested) {
          try {
            const postRef = adminDb.collection('posts').doc(postDoc.id)
            await postRef.update({
              likes: require('firebase-admin').firestore.FieldValue.arrayUnion(botData.uid)
            })

            likesAdded.push({
              botName: botData.displayName,
              postAuthor: postData.userName,
              postContent: postData.content?.substring(0, 50) || 'Article',
            })
          } catch (error) {
            console.error(`Error liking post ${postDoc.id}:`, error)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      likesAdded: likesAdded.length,
      details: likesAdded,
    })
  } catch (error) {
    console.error('Error in AI like posts:', error)
    return NextResponse.json(
      { error: 'Failed to process AI likes' },
      { status: 500 }
    )
  }
}

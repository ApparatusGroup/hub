import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { generateAIPost, AI_BOTS, AIBotPersonality, generateImageDescription } from '@/lib/ai-service'
import { updateAIMemoryAfterPost, getAIMemory } from '@/lib/ai-memory'
import { getTopNews, selectRandomArticle, generatePostFromArticle } from '@/lib/news-service'
import { categorizePost } from '@/lib/categorize'
import { getViralPatterns, generateViralContext } from '@/lib/viral-patterns'

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

    // Get recent posts to check bot distribution (last 2 hours)
    const twoHoursAgo = new Date()
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2)

    const recentPostsSnapshot = await adminDb
      .collection('posts')
      .where('isAI', '==', true)
      .where('createdAt', '>=', twoHoursAgo)
      .get()

    // Count posts per bot
    const botPostCounts = new Map<string, number>()
    recentPostsSnapshot.docs.forEach(doc => {
      const postData = doc.data()
      const count = botPostCounts.get(postData.userId) || 0
      botPostCounts.set(postData.userId, count + 1)
    })

    // Calculate weights for bot selection (bots with fewer posts get higher weight)
    const botDocs = botsSnapshot.docs
    const botWeights = botDocs.map(doc => {
      const postCount = botPostCounts.get(doc.data().uid) || 0
      // Higher weight for bots that haven't posted recently
      return Math.max(1, 10 - postCount * 3)
    })

    // Weighted random selection
    const totalWeight = botWeights.reduce((sum, weight) => sum + weight, 0)
    let random = Math.random() * totalWeight
    let selectedIndex = 0

    for (let i = 0; i < botWeights.length; i++) {
      random -= botWeights[i]
      if (random <= 0) {
        selectedIndex = i
        break
      }
    }

    const randomBot = botDocs[selectedIndex]
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

    // Check posting frequency limits
    const now = Date.now()
    const lastPostTime = memory?.interactions?.lastPostTime || 0
    const postsToday = memory?.interactions?.postsToday || 0
    const dailyPostLimit = memory?.interactions?.dailyPostLimit || Math.floor(Math.random() * 10) + 1 // 1-10 posts/day

    // Check if it's a new day - reset counter
    const lastPostDate = new Date(lastPostTime).toDateString()
    const todayDate = new Date(now).toDateString()
    const isNewDay = lastPostDate !== todayDate
    const currentPostsToday = isNewDay ? 0 : postsToday

    // Check if bot has reached daily limit
    if (currentPostsToday >= dailyPostLimit) {
      return NextResponse.json({
        error: 'Daily post limit reached',
        botName: botData.displayName,
        postsToday: currentPostsToday,
        limit: dailyPostLimit
      }, { status: 429 })
    }

    // Minimum time between posts (varies by bot: 30min to 4 hours)
    const minTimeBetweenPosts = (dailyPostLimit <= 3 ? 4 : dailyPostLimit <= 6 ? 2 : 0.5) * 60 * 60 * 1000
    const timeSinceLastPost = now - lastPostTime

    if (timeSinceLastPost < minTimeBetweenPosts && lastPostTime > 0) {
      return NextResponse.json({
        error: 'Too soon since last post',
        botName: botData.displayName,
        minutesUntilNextPost: Math.ceil((minTimeBetweenPosts - timeSinceLastPost) / 60000)
      }, { status: 429 })
    }

    // Get viral patterns for inspiration (optional - doesn't block if unavailable)
    let viralContext: string | null = null
    try {
      const viralPatterns = await getViralPatterns()
      if (viralPatterns) {
        viralContext = generateViralContext(viralPatterns)
      }
    } catch (error) {
      console.log('Viral patterns unavailable, proceeding without them')
    }

    // Mostly news articles (80%), some generated thoughts (20%)
    // This is a news/tech sharing platform
    const shouldPostNews = Math.random() < 0.8

    let content = ''
    let articleUrl: string | null = null
    let articleTitle: string | null = null
    let articleImage: string | null = null
    let articleDescription: string | null = null
    let imageUrl: string | null = null

    if (shouldPostNews) {
      // Fetch news and post an article
      const news = await getTopNews()
      const article = selectRandomArticle(news)

      if (article) {
        content = await generatePostFromArticle(article, personality.personality)
        articleUrl = article.url
        articleTitle = article.title
        articleImage = article.urlToImage
        articleDescription = article.description || null
        // Don't use imageUrl for article posts - use articleImage instead
      } else {
        // Fallback to generated post if no news available
        content = await generateAIPost(personality, memory, viralContext)
      }
    } else {
      // Generate original post content with memory context and viral patterns
      content = await generateAIPost(personality, memory, viralContext)
    }

    // Generate image description for AI bots if image is present
    let imageDescription: string | null = null
    const hasImage = imageUrl || articleImage
    if (hasImage) {
      try {
        imageDescription = await generateImageDescription(hasImage)
      } catch (error) {
        console.error('Error generating image description:', error)
        // Continue without description if it fails
      }
    }

    // Auto-categorize the post
    const category = await categorizePost(content, articleTitle || undefined, articleDescription || undefined)

    // Create the post
    const postRef = await adminDb.collection('posts').add({
      userId: botData.uid,
      userName: botData.displayName,
      userPhoto: botData.photoURL,
      isAI: true,
      content,
      imageUrl,
      imageDescription,
      articleUrl,
      articleTitle,
      articleImage,
      articleDescription,
      category,
      createdAt: new Date(),
      likes: [],
      commentCount: 0,
    })

    // Update AI memory with this post and posting stats
    await updateAIMemoryAfterPost(botData.uid, botData.displayName, content)

    // Update posting frequency tracking
    const memoryRef = adminDb.collection('aiMemory').doc(botData.uid)
    await memoryRef.set({
      interactions: {
        lastPostTime: now,
        postsToday: currentPostsToday + 1,
        dailyPostLimit: dailyPostLimit,
        postCount: (memory?.interactions?.postCount || 0) + 1,
        commentCount: memory?.interactions?.commentCount || 0,
        lastActive: now,
      }
    }, { merge: true })

    return NextResponse.json({
      success: true,
      postId: postRef.id,
      botName: botData.displayName,
      content,
      articleUrl,
      articleTitle,
    })
  } catch (error) {
    console.error('Error creating AI post:', error)
    return NextResponse.json(
      { error: 'Failed to create AI post' },
      { status: 500 }
    )
  }
}

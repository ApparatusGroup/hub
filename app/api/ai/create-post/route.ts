import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { generateAIPost, AI_BOTS, AIBotPersonality, generateImageDescription, generateArticleCommentary, generateArticleDescription, DEFAULT_VOICE } from '@/lib/ai-service'
import { updateAIMemoryAfterPost, getAIMemory } from '@/lib/ai-memory'
// news-service imports removed - using scrapedArticles from Firestore instead
import { categorizePost } from '@/lib/categorize'
import { getViralPatterns, generateViralContext } from '@/lib/viral-patterns'
import { analyzeViralPatterns } from '@/lib/viral-scraper'
import {
  getBotContentProfile,
  updateBotProfile,
  getWritingStyleGuidance
} from '@/lib/bot-content-curator'

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

    // Get recent posts to check bot distribution (last 6 hours for better diversity)
    const sixHoursAgo = new Date()
    sixHoursAgo.setHours(sixHoursAgo.getHours() - 6)

    const recentPostsSnapshot = await adminDb
      .collection('posts')
      .where('isAI', '==', true)
      .where('createdAt', '>=', sixHoursAgo)
      .get()

    // Count posts per bot and track last post time
    const botPostCounts = new Map<string, number>()
    const botLastPostTime = new Map<string, Date>()

    recentPostsSnapshot.docs.forEach(doc => {
      const postData = doc.data()
      const count = botPostCounts.get(postData.userId) || 0
      botPostCounts.set(postData.userId, count + 1)

      const postTime = postData.createdAt?.toDate()
      const lastTime = botLastPostTime.get(postData.userId)
      if (!lastTime || (postTime && postTime > lastTime)) {
        botLastPostTime.set(postData.userId, postTime)
      }
    })

    // Exclude lurker bots (they only like, don't create content)
    const botDocs = botsSnapshot.docs.filter(doc => {
      const data = doc.data()
      if (data.isLurker === true) return false
      return true
    })

    if (botDocs.length === 0) {
      return NextResponse.json({ error: 'No active bots found' }, { status: 404 })
    }

    // Check recent category distribution to ensure feed diversity
    const recentCategoryCounts = new Map<string, number>()
    recentPostsSnapshot.docs.forEach(doc => {
      const category = doc.data().category
      if (category) {
        recentCategoryCounts.set(category, (recentCategoryCounts.get(category) || 0) + 1)
      }
    })

    // Calculate which categories are underrepresented
    const allCategories = ['Software & Development', 'Artificial Intelligence', 'Hardware & Devices',
                          'Cybersecurity', 'Data & Analytics', 'Gaming & Entertainment',
                          'Business & Startups', 'Personal Tech & Gadgets']
    const avgPostsPerCategory = recentPostsSnapshot.docs.length / allCategories.length
    const underrepresentedCategories = allCategories.filter(cat =>
      (recentCategoryCounts.get(cat) || 0) < avgPostsPerCategory * 0.5
    )

    console.log(`📊 Category balance: ${underrepresentedCategories.length} underrepresented categories`)
    if (underrepresentedCategories.length > 0) {
      console.log(`   Boosting: ${underrepresentedCategories.join(', ')}`)
    }

    // Mostly news articles (95%), very few generated thoughts (5%)
    // This is a news/tech sharing platform - prioritize real articles
    const shouldPostNews = Math.random() < 0.95

    let content = ''
    let articleUrl: string | null = null
    let articleTitle: string | null = null
    let articleImage: string | null = null
    let articleDescription: string | null = null
    let articleTopComments: any[] | null = null
    let articleCategory: string | null = null
    let imageUrl: string | null = null
    let articleDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null

    // ============================================================
    // STEP 1: Select article FIRST (before bot) so we know the category
    // ============================================================
    if (shouldPostNews) {
      // Read from pre-scraped articles database (FAST - no scraping needed!)
      // Query only for unused articles (avoids composite index)
      const articlesSnapshot = await adminDb
        .collection('scrapedArticles')
        .where('used', '==', false)
        .get()

      if (articlesSnapshot.empty) {
        console.log('⚠️ No pre-scraped articles available - run /api/cron/scrape-articles first')
        return NextResponse.json({
          error: 'No articles available',
          hint: 'Run the scrape-articles cron job to populate the database'
        }, { status: 404 })
      }

      // Filter for articles with comments, recent (scraped in last 7 days), and sort by popularity
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const articlesWithComments = articlesSnapshot.docs
        .filter(doc => {
          const data = doc.data()
          const scrapedAt = data.scrapedAt?.toDate()

          // Must have comments
          if ((data.commentCount || 0) === 0) return false

          // Must be scraped within last 7 days (ensures freshness)
          if (!scrapedAt || scrapedAt < sevenDaysAgo) {
            console.log(`⏭️  Skipping old article: "${data.title?.substring(0, 50)}" (scraped ${scrapedAt?.toLocaleDateString()})`)
            return false
          }

          return true
        })
        .sort((a, b) => {
          const aData = a.data()
          const bData = b.data()
          // Sort by comment count first, then popularity score
          if (bData.commentCount !== aData.commentCount) {
            return bData.commentCount - aData.commentCount
          }
          return (bData.popularityScore || 0) - (aData.popularityScore || 0)
        })
        .slice(0, 20) // Top 20 most popular

      if (articlesWithComments.length === 0) {
        console.log('⚠️ No articles with comments available')
        return NextResponse.json({
          error: 'No articles with comments available',
          hint: 'Wait for scraper to find articles with active discussions'
        }, { status: 404 })
      }

      // Check for already posted URLs in the last 30 days to prevent duplicates
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const recentPosts = await adminDb
        .collection('posts')
        .where('createdAt', '>=', thirtyDaysAgo)
        .get()

      const postedUrls = new Set(
        recentPosts.docs
          .map(doc => doc.data().articleUrl)
          .filter(url => url)
          .map(url => url.toLowerCase().trim())
      )

      console.log(`🔍 Found ${postedUrls.size} unique article URLs posted in last 30 days`)

      // Filter out already posted articles
      const unpostedArticles = articlesWithComments.filter(doc => {
        const url = doc.data().url?.toLowerCase().trim()
        return url && !postedUrls.has(url)
      })

      if (unpostedArticles.length === 0) {
        console.log('⚠️ All available articles have already been posted')
        return NextResponse.json({
          error: 'All articles already posted',
          hint: 'Wait for scraper to find new articles'
        }, { status: 404 })
      }

      console.log(`✅ Found ${unpostedArticles.length} unposted articles (filtered from ${articlesWithComments.length} total)`)

      // Check recent category distribution to ensure variety
      const recentCategories = new Map<string, number>()
      recentPosts.docs.forEach(doc => {
        const category = doc.data().category
        if (category) {
          recentCategories.set(category, (recentCategories.get(category) || 0) + 1)
        }
      })

      console.log(`📊 Recent category distribution:`, Array.from(recentCategories.entries()))

      // Weighted selection based on category diversity
      // Articles from underrepresented categories get higher weight
      const articleWeights = unpostedArticles.map(doc => {
        const category = doc.data().category || 'General Tech'
        const categoryCount = recentCategories.get(category) || 0
        // Higher weight for less-posted categories (10 - count, minimum 1)
        return Math.max(1, 10 - categoryCount)
      })

      const totalArticleWeight = articleWeights.reduce((sum, w) => sum + w, 0)
      let articleRandom = Math.random() * totalArticleWeight
      let selectedArticleIndex = 0

      for (let i = 0; i < articleWeights.length; i++) {
        articleRandom -= articleWeights[i]
        if (articleRandom <= 0) {
          selectedArticleIndex = i
          break
        }
      }

      articleDoc = unpostedArticles[selectedArticleIndex]
      const articleData = articleDoc.data()

      console.log(`🎯 Selected article category: ${articleData.category || 'General Tech'} (weight: ${articleWeights[selectedArticleIndex]})`)

      articleUrl = articleData.url
      articleTitle = articleData.title
      articleImage = articleData.urlToImage || null
      articleDescription = articleData.description || null
      articleTopComments = articleData.topComments || []
      articleCategory = articleData.category || null
    }

    // ============================================================
    // STEP 2: Select bot with category-matching weights
    // ============================================================
    // Calculate weights for bot selection (bots with fewer posts get much higher weight)
    // If we have an article category, bots specializing in that category get 5x weight
    const botWeights = botDocs.map(doc => {
      const postCount = botPostCounts.get(doc.data().uid) || 0
      // More aggressive weighting - heavily favor bots that haven't posted
      let weight = Math.max(1, 20 - postCount * 5)

      // Category matching: check if this bot specializes in the article's category
      if (articleCategory) {
        const botName = doc.data().displayName
        const hardcodedBot = AI_BOTS.find(b => b.name === botName)
        const botCategories = hardcodedBot?.categories || []

        if (botCategories.includes(articleCategory)) {
          weight *= 5 // 5x weight for category-matching bots
          console.log(`   🎯 Category match: ${botName} specializes in "${articleCategory}" (weight: ${weight})`)
        }
      }

      return weight
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

    // Try hardcoded personality first (has rich voice model), fall back to database
    const hardcodedPersonality = AI_BOTS.find(b => b.name === botData.displayName)

    if (hardcodedPersonality) {
      personality = hardcodedPersonality
    } else if (botData.aiPersonality && botData.aiInterests) {
      // Use personality from database with default voice
      personality = {
        name: botData.displayName,
        personality: botData.aiPersonality,
        interests: botData.aiInterests,
        bio: botData.bio || '',
        age: 30,
        occupation: botData.occupation || 'AI Assistant',
        voice: DEFAULT_VOICE,
      }
    } else {
      return NextResponse.json({ error: 'Bot personality not found' }, { status: 404 })
    }

    // Get AI memory for context
    const memory = await getAIMemory(botData.uid)
    const now = Date.now()
    const postsToday = memory?.interactions?.postsToday || 0
    const lastPostTime = memory?.interactions?.lastPostTime || 0
    const lastPostDate = new Date(lastPostTime).toDateString()
    const todayDate = new Date(now).toDateString()
    const isNewDay = lastPostDate !== todayDate
    const currentPostsToday = isNewDay ? 0 : postsToday

    // Get viral patterns for inspiration
    // Auto-refresh if stale (>6 hours) to keep trending topics current
    let viralContext: string | null = null
    try {
      // Check if patterns are stale
      const viralDoc = await adminDb.collection('viralPatterns').doc('latest').get()
      let needsRefresh = false

      if (viralDoc.exists) {
        const data = viralDoc.data()
        const updatedAt = data?.updatedAt?.toDate?.() || new Date(data?.stats?.scraped_at || 0)
        const hoursSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60)
        needsRefresh = hoursSinceUpdate > 6
      } else {
        needsRefresh = true
      }

      // Refresh if needed (non-blocking, happens in background)
      if (needsRefresh) {
        console.log(`🔄 Viral patterns stale, refreshing...`)
        analyzeViralPatterns()
          .then(async (results) => {
            if (results.success) {
              await adminDb.collection('viralPatterns').doc('latest').set({
                ...results,
                updatedAt: new Date(),
              })
              console.log(`✅ Viral patterns auto-refreshed`)
            }
          })
          .catch(err => console.error('⚠️  Auto-refresh failed:', err))
      }

      // Use current patterns (even if stale, refresh happens async)
      const viralPatterns = await getViralPatterns()
      if (viralPatterns) {
        viralContext = generateViralContext(viralPatterns)
        console.log(`✅ Using viral patterns for ${botData.displayName}'s post`)
      } else {
        console.log(`⚠️  No viral patterns available for ${botData.displayName}'s post`)
      }
    } catch (error) {
      console.log(`⚠️  Viral patterns unavailable for ${botData.displayName}, proceeding without them`)
    }

    // Get bot-specific content profile for personalized content
    const botProfile = await getBotContentProfile(botData.uid, botData.displayName)
    const writingStyleGuidance = getWritingStyleGuidance(botProfile)

    // ============================================================
    // STEP 3: Generate content
    // ============================================================
    if (shouldPostNews) {
      // Generate description if missing from scraped data
      if (!articleDescription && articleTitle && articleUrl) {
        articleDescription = await generateArticleDescription(articleTitle, articleUrl, personality)
        console.log(`Generated description: "${articleDescription?.substring(0, 80)}..."`)
      }

      // Generate AI-powered commentary using the bot's unique voice
      const aiCommentary = await generateArticleCommentary(
        articleTitle || 'this article',
        articleDescription,
        personality
      )

      // Use journalist-quality commentary if it's substantial (> 20 chars)
      // NEVER include the article title in the post content - the link preview shows it
      if (aiCommentary && aiCommentary.length > 20) {
        content = aiCommentary
      } else if (aiCommentary && aiCommentary.length > 0) {
        // Short but valid commentary - still use it
        content = aiCommentary
      } else {
        // Minimal fallback for articles - simple generic reaction
        content = 'worth a read'
      }

      // Mark article as used
      await articleDoc!.ref.update({
        used: true,
        usedAt: new Date(),
        usedBy: botData.uid
      })

      console.log(`📝 Post: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`)
      console.log(`   Source: ${articleDoc!.data().source}`)
      console.log(`   Comments available: ${articleTopComments?.length ?? 0}`)
      console.log(`   Popularity score: ${articleDoc!.data().popularityScore}`)
    } else {
      // Generate original post content with memory context, viral patterns, and unique style
      // The short quirk-based reactions are only for these 5% original thought posts
      const generated = await generateAIPost(personality, memory, viralContext, writingStyleGuidance)
      if (generated && generated.length > 0) {
        content = generated
      } else {
        // Minimal fallback using a personality quirk as a short reaction
        const quirks = personality.voice?.verbalQuirks || ['interesting']
        const fallbacks = [
          quirks[Math.floor(Math.random() * quirks.length)],
          'worth a read',
          'this is interesting',
          'thoughts?',
          'lol',
        ]
        content = fallbacks[Math.floor(Math.random() * fallbacks.length)]
      }
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
    // For article posts, use the category from articleData (already detected during scraping)
    // For original posts, use AI categorization
    const category = articleCategory
      ? articleCategory
      : await categorizePost(content, articleTitle || undefined, articleDescription || undefined)

    // CRITICAL VALIDATION: If this is an article post, ensure it has real comments
    // Otherwise, we can't have authentic engagement
    if (articleUrl && (!articleTopComments || articleTopComments.length === 0)) {
      console.log(`⚠️ Skipping post - article has no real comments. Cannot post without authentic engagement.`)
      return NextResponse.json({
        error: 'Article has no real comments',
        hint: 'All article posts require real HN/Reddit comments for authentic engagement',
        articleUrl
      }, { status: 400 })
    }

    // Create the post
    console.log(`📝 Creating post with ${articleTopComments?.length || 0} real comments scraped`)
    if (articleTopComments && articleTopComments.length > 0) {
      const firstComment = typeof articleTopComments[0] === 'string' ? articleTopComments[0] : articleTopComments[0].text
      console.log(`   Sample comment: "${firstComment.substring(0, 60)}..."`)
    }

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
      articleTopComments, // Real comments from HN/Reddit for this article
      category,
      createdAt: new Date(),
      upvotes: [],
      downvotes: [],
      commentCount: 0,
    })

    // Update AI memory with this post and posting stats
    await updateAIMemoryAfterPost(botData.uid, botData.displayName, content)

    // Update posting stats
    const memoryRef = adminDb.collection('aiMemory').doc(botData.uid)
    await memoryRef.set({
      interactions: {
        lastPostTime: now,
        postsToday: currentPostsToday + 1,
        postCount: (memory?.interactions?.postCount || 0) + 1,
        commentCount: memory?.interactions?.commentCount || 0,
        lastActive: now,
      }
    }, { merge: true })

    // Update bot content profile to track unique personality development
    // Extract topics from content for personalization
    const topics: string[] = []
    if (articleTitle) {
      // Extract topics from article title
      const titleWords = articleTitle.toLowerCase().split(/\s+/)
      topics.push(...titleWords.filter(w => w.length > 4))
    }
    if (category) {
      topics.push(category.toLowerCase())
    }

    await updateBotProfile(
      botData.uid,
      content,
      articleUrl || undefined,
      topics.length > 0 ? topics : undefined
    )

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

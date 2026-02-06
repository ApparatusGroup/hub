import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { scorePostForLurker, shouldLurkerLikePost, LurkerBot } from '@/lib/lurker-bots'
import { getViralPatterns } from '@/lib/viral-patterns'

/**
 * Trigger lurker bots to like posts based on content quality and viral patterns
 * Simulates organic engagement where popular content rises
 */
export async function POST(request: Request) {
  try {
    const { secret } = await request.json()
    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('👥 Triggering lurker bot activity...')

    // Get all lurker bots
    const lurkersSnapshot = await adminDb
      .collection('users')
      .where('isLurker', '==', true)
      .get()

    if (lurkersSnapshot.empty) {
      return NextResponse.json({
        error: 'No lurker bots found',
        message: 'Initialize lurker bots first using /api/ai/init-lurkers'
      }, { status: 404 })
    }

    const lurkers = lurkersSnapshot.docs.map(doc => doc.data() as LurkerBot)
    console.log(`  Found ${lurkers.length} lurker bots`)

    // Get recent posts (last 12 hours - focus on fresh content)
    const twelveHoursAgo = new Date()
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12)

    const postsSnapshot = await adminDb
      .collection('posts')
      .where('createdAt', '>=', twelveHoursAgo)
      .orderBy('createdAt', 'desc')
      .limit(50) // Focus on last 50 posts for maximum engagement velocity
      .get()

    if (postsSnapshot.empty) {
      return NextResponse.json({
        message: 'No recent posts to engage with'
      })
    }

    console.log(`  Found ${postsSnapshot.docs.length} recent posts`)

    // Get viral patterns and trending URLs for scoring
    let viralKeywords: string[] = []
    let trendingUrls: Array<{ url: string; score: number }> = []
    try {
      // Get viral patterns
      const viralPatterns = await getViralPatterns()
      if (viralPatterns) {
        viralKeywords = viralPatterns.top_keywords.slice(0, 20).map(k => k.word)
      }

      // Get REAL WORLD trending URLs (HN/Reddit engagement data)
      const viralDoc = await adminDb.collection('viralPatterns').doc('latest').get()
      if (viralDoc.exists) {
        const data = viralDoc.data()
        if (data?.trending_urls) {
          trendingUrls = data.trending_urls.map((t: any) => ({
            url: t.url,
            score: t.score
          }))
          console.log(`  Found ${trendingUrls.length} real-world trending URLs`)
        }
      }
    } catch (error) {
      console.log('  Viral patterns unavailable, continuing without them')
    }

    // Track engagement stats
    let totalLikes = 0
    let postsEngaged = 0
    let articleLikes = 0
    let textPostLikes = 0
    const postEngagement: Array<{ postId: string; likes: number; isArticle: boolean }> = []

    // Process each post
    for (const postDoc of postsSnapshot.docs) {
      const postData = postDoc.data()
      const postId = postDoc.id
      let likesForThisPost = 0
      const isArticle = !!(postData.articleUrl && postData.articleTitle)

      // Randomly sample lurkers (don't have all 200 evaluate every post)
      // Use larger sample for articles (50%) vs text posts (30%)
      const sampleRate = isArticle ? 0.5 : 0.3
      const sampleSize = Math.floor(lurkers.length * sampleRate)
      const sampledLurkers = lurkers
        .sort(() => 0.5 - Math.random())
        .slice(0, sampleSize)

      // Each sampled lurker evaluates the post
      for (const lurker of sampledLurkers) {
        // Check if already liked
        const existingUpvotes = postData.upvotes || postData.likes || []
        const alreadyLiked = existingUpvotes.includes(lurker.uid)

        // Score the post (includes real-world viral URL matching)
        const score = scorePostForLurker(
          {
            content: postData.content,
            articleTitle: postData.articleTitle,
            articleDescription: postData.articleDescription,
            articleUrl: postData.articleUrl,
            articleImage: postData.articleImage,
            category: postData.category,
            upvotes: postData.upvotes || postData.likes || [],
            createdAt: postData.createdAt
          },
          lurker,
          viralKeywords,
          trendingUrls // Pass real-world trending URLs from HN/Reddit
        )

        // Decide if should like
        if (shouldLurkerLikePost(score, lurker, alreadyLiked)) {
          try {
            // Add like to post
            await adminDb.collection('posts').doc(postId).update({
              upvotes: require('firebase-admin').firestore.FieldValue.arrayUnion(lurker.uid)
            })

            totalLikes++
            likesForThisPost++

            // Track article vs text post engagement
            if (isArticle) {
              articleLikes++
            } else {
              textPostLikes++
            }

            // Update local data to avoid duplicate likes in same batch
            if (!postData.upvotes) postData.upvotes = postData.likes || []
            postData.upvotes = [...postData.upvotes, lurker.uid]

          } catch (error) {
            console.error(`  Failed to add like from ${lurker.displayName}:`, error)
          }
        }
      }

      if (likesForThisPost > 0) {
        postsEngaged++
        postEngagement.push({ postId, likes: likesForThisPost, isArticle })
      }
    }

    console.log(`✅ Lurker activity complete:`)
    console.log(`   Total likes added: ${totalLikes}`)
    console.log(`   Article likes: ${articleLikes} (${((articleLikes/totalLikes)*100).toFixed(1)}%)`)
    console.log(`   Text post likes: ${textPostLikes} (${((textPostLikes/totalLikes)*100).toFixed(1)}%)`)
    console.log(`   Posts engaged: ${postsEngaged}/${postsSnapshot.docs.length}`)

    // Sort by engagement to show most popular
    postEngagement.sort((a, b) => b.likes - a.likes)

    return NextResponse.json({
      success: true,
      stats: {
        totalLurkers: lurkers.length,
        postsEvaluated: postsSnapshot.docs.length,
        postsEngaged,
        totalLikes,
        articleLikes,
        textPostLikes,
        articlePercentage: totalLikes > 0 ? ((articleLikes/totalLikes)*100).toFixed(1) : 0,
      },
      topPosts: postEngagement.slice(0, 10), // Top 10 most liked posts
      message: `Lurker bots added ${totalLikes} likes (${articleLikes} to articles, ${textPostLikes} to text posts)`
    })

  } catch (error: any) {
    console.error('Error in lurker activity:', error)
    return NextResponse.json(
      { error: 'Failed to trigger lurker activity', details: error.message },
      { status: 500 }
    )
  }
}

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

    // Get recent posts (last 24 hours)
    const oneDayAgo = new Date()
    oneDayAgo.setHours(oneDayAgo.getHours() - 24)

    const postsSnapshot = await adminDb
      .collection('posts')
      .where('createdAt', '>=', oneDayAgo)
      .orderBy('createdAt', 'desc')
      .limit(100) // Process last 100 posts
      .get()

    if (postsSnapshot.empty) {
      return NextResponse.json({
        message: 'No recent posts to engage with'
      })
    }

    console.log(`  Found ${postsSnapshot.docs.length} recent posts`)

    // Get viral patterns for scoring
    let viralKeywords: string[] = []
    try {
      const viralPatterns = await getViralPatterns()
      if (viralPatterns) {
        viralKeywords = viralPatterns.top_keywords.slice(0, 20).map(k => k.word)
      }
    } catch (error) {
      console.log('  Viral patterns unavailable, continuing without them')
    }

    // Track engagement stats
    let totalLikes = 0
    let postsEngaged = 0
    const postEngagement: Array<{ postId: string; likes: number }> = []

    // Process each post
    for (const postDoc of postsSnapshot.docs) {
      const postData = postDoc.data()
      const postId = postDoc.id
      let likesForThisPost = 0

      // Randomly sample lurkers (don't have all 200 evaluate every post)
      const sampleSize = Math.floor(lurkers.length * 0.3) // 30% sample
      const sampledLurkers = lurkers
        .sort(() => 0.5 - Math.random())
        .slice(0, sampleSize)

      // Each sampled lurker evaluates the post
      for (const lurker of sampledLurkers) {
        // Check if already liked
        const alreadyLiked = postData.likes?.includes(lurker.uid) || false

        // Score the post
        const score = scorePostForLurker(
          {
            content: postData.content,
            articleTitle: postData.articleTitle,
            articleDescription: postData.articleDescription,
            category: postData.category,
            likes: postData.likes || [],
            createdAt: postData.createdAt
          },
          lurker,
          viralKeywords
        )

        // Decide if should like
        if (shouldLurkerLikePost(score, lurker, alreadyLiked)) {
          try {
            // Add like to post
            await adminDb.collection('posts').doc(postId).update({
              likes: [...(postData.likes || []), lurker.uid]
            })

            totalLikes++
            likesForThisPost++

            // Update local data to avoid duplicate likes in same batch
            postData.likes = [...(postData.likes || []), lurker.uid]

          } catch (error) {
            console.error(`  Failed to add like from ${lurker.displayName}:`, error)
          }
        }
      }

      if (likesForThisPost > 0) {
        postsEngaged++
        postEngagement.push({ postId, likes: likesForThisPost })
      }
    }

    console.log(`✅ Lurker activity complete:`)
    console.log(`   Total likes added: ${totalLikes}`)
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
      },
      topPosts: postEngagement.slice(0, 10), // Top 10 most liked posts
      message: `Lurker bots added ${totalLikes} likes to ${postsEngaged} posts`
    })

  } catch (error: any) {
    console.error('Error in lurker activity:', error)
    return NextResponse.json(
      { error: 'Failed to trigger lurker activity', details: error.message },
      { status: 500 }
    )
  }
}

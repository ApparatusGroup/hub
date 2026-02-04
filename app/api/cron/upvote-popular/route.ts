import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

/**
 * Cron endpoint for regular upvotes on popular posts
 * Call this from cron-job.org every hour
 * URL: https://your-domain.vercel.app/api/cron/upvote-popular?secret=YOUR_SECRET
 */
export async function GET(request: Request) {
  try {
    // Verify secret to prevent unauthorized access
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Starting scheduled upvote activity...')

    // Get recent popular posts (last 24 hours, sorted by engagement)
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    const postsSnapshot = await adminDb
      .collection('posts')
      .where('createdAt', '>=', twentyFourHoursAgo)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()

    if (postsSnapshot.empty) {
      console.log('⚠️ No recent posts found for upvoting')
      return NextResponse.json({ message: 'No recent posts found' }, { status: 200 })
    }

    // Score posts by engagement and recency
    const scoredPosts = postsSnapshot.docs
      .map(doc => {
        const data = doc.data()
        const now = Date.now()
        const ageInHours = (now - (data.createdAt?.toMillis() || Date.now())) / (1000 * 60 * 60)

        // Calculate engagement score
        const likeCount = data.likes?.length || 0
        const commentCount = data.commentCount || 0
        const engagementScore = (likeCount * 2) + (commentCount * 5)

        // Recency bonus (prefer posts from last 12 hours)
        const recencyBonus = ageInHours < 12 ? 20 : ageInHours < 24 ? 10 : 0

        return {
          id: doc.id,
          data,
          score: engagementScore + recencyBonus,
          ageInHours,
          likeCount,
          commentCount
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20) // Top 20 most engaging recent posts

    console.log(`📊 Found ${scoredPosts.length} popular posts for upvoting`)

    // Get all lurker bots
    const lurkersSnapshot = await adminDb
      .collection('users')
      .where('isAI', '==', true)
      .where('isLurker', '==', true)
      .get()

    if (lurkersSnapshot.empty) {
      console.log('⚠️ No lurker bots found')
      return NextResponse.json({ message: 'No lurker bots found' }, { status: 200 })
    }

    console.log(`👥 ${lurkersSnapshot.docs.length} lurker bots available for upvoting`)

    let upvotesGiven = 0

    // Each lurker upvotes 1-3 random posts from the top 20
    for (const lurkerDoc of lurkersSnapshot.docs) {
      const lurkerData = lurkerDoc.data()
      const lurkerId = lurkerData.uid

      // Select 1-3 random posts for this lurker to upvote
      const numPosts = Math.floor(Math.random() * 3) + 1
      const shuffled = [...scoredPosts].sort(() => Math.random() - 0.5)
      const postsToUpvote = shuffled.slice(0, numPosts)

      for (const post of postsToUpvote) {
        // Skip if already liked
        if (post.data.likes?.includes(lurkerId)) {
          continue
        }

        // Add upvote
        const postRef = adminDb.collection('posts').doc(post.id)
        await postRef.update({
          likes: require('firebase-admin').firestore.FieldValue.arrayUnion(lurkerId)
        })

        upvotesGiven++
      }
    }

    console.log(`✅ Gave ${upvotesGiven} upvotes across ${scoredPosts.length} popular posts`)

    return NextResponse.json({
      success: true,
      upvotesGiven,
      postsUpvoted: scoredPosts.length,
      lurkersActive: lurkersSnapshot.docs.length,
      topPost: {
        id: scoredPosts[0].id,
        likes: scoredPosts[0].likeCount,
        comments: scoredPosts[0].commentCount,
        ageHours: Math.round(scoredPosts[0].ageInHours)
      }
    })
  } catch (error: any) {
    console.error('❌ Error in upvote cron:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process upvotes' },
      { status: 500 }
    )
  }
}

// Also support POST for services that prefer POST
export async function POST(request: Request) {
  const url = new URL(request.url)
  const secret = url.searchParams.get('secret')

  if (secret !== process.env.AI_BOT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Call the GET handler
  return GET(request)
}

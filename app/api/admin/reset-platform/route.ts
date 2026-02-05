import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(request: Request) {
  try {
    // Verify admin secret
    const { secret } = await request.json()
    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🗑️ Starting platform reset...')

    // Delete all posts
    const postsSnapshot = await adminDb.collection('posts').get()
    const postDeletePromises = postsSnapshot.docs.map(doc => doc.ref.delete())
    await Promise.all(postDeletePromises)
    console.log(`✅ Deleted ${postsSnapshot.docs.length} posts`)

    // Delete all comments
    const commentsSnapshot = await adminDb.collection('comments').get()
    const commentDeletePromises = commentsSnapshot.docs.map(doc => doc.ref.delete())
    await Promise.all(commentDeletePromises)
    console.log(`✅ Deleted ${commentsSnapshot.docs.length} comments`)

    // Reset AI memory (so bots start fresh)
    const memorySnapshot = await adminDb.collection('aiMemory').get()
    const memoryDeletePromises = memorySnapshot.docs.map(doc => doc.ref.delete())
    await Promise.all(memoryDeletePromises)
    console.log(`✅ Reset ${memorySnapshot.docs.length} AI bot memories`)

    // Reset bot profiles (content preferences)
    const profilesSnapshot = await adminDb.collection('botProfiles').get()
    const profileDeletePromises = profilesSnapshot.docs.map(doc => doc.ref.delete())
    await Promise.all(profileDeletePromises)
    console.log(`✅ Reset ${profilesSnapshot.docs.length} bot profiles`)

    return NextResponse.json({
      success: true,
      message: 'Platform reset complete',
      stats: {
        postsDeleted: postsSnapshot.docs.length,
        commentsDeleted: commentsSnapshot.docs.length,
        memoriesReset: memorySnapshot.docs.length,
        profilesReset: profilesSnapshot.docs.length
      }
    })
  } catch (error) {
    console.error('Error resetting platform:', error)
    return NextResponse.json(
      { error: 'Failed to reset platform' },
      { status: 500 }
    )
  }
}

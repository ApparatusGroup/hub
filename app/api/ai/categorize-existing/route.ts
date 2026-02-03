import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { categorizePost } from '@/lib/categorize'

export async function POST(request: Request) {
  try {
    // Verify request has the secret key
    const { secret } = await request.json()
    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all posts without a category
    const postsSnapshot = await adminDb
      .collection('posts')
      .where('category', '==', null)
      .get()

    if (postsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'No posts to categorize',
        categorized: 0
      })
    }

    const updates: Promise<any>[] = []

    for (const postDoc of postsSnapshot.docs) {
      const postData = postDoc.data()

      // Auto-categorize the post
      const category = await categorizePost(
        postData.content || '',
        postData.articleTitle,
        postData.articleDescription
      )

      // Update the post with the category
      updates.push(
        adminDb.collection('posts').doc(postDoc.id).update({
          category
        })
      )
    }

    // Execute all updates
    await Promise.all(updates)

    return NextResponse.json({
      success: true,
      message: `Successfully categorized ${postsSnapshot.size} posts`,
      categorized: postsSnapshot.size
    })
  } catch (error: any) {
    console.error('Error categorizing existing posts:', error)
    return NextResponse.json(
      { error: 'Failed to categorize posts', details: error.message },
      { status: 500 }
    )
  }
}

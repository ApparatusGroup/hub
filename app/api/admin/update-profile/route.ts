import { NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'

export async function POST(request: Request) {
  try {
    // Check for authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]

    // Verify Firebase token
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Check if user is admin
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()

    if (!userData?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const { targetUserId, updates } = await request.json()

    if (!targetUserId || !updates) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Update the target user's profile
    const targetUserRef = adminDb.collection('users').doc(targetUserId)
    const targetUserDoc = await targetUserRef.get()

    if (!targetUserDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const targetUserData = targetUserDoc.data()

    // Only allow updating specific fields
    const allowedUpdates: any = {}
    if (updates.displayName !== undefined) allowedUpdates.displayName = updates.displayName
    if (updates.bio !== undefined) allowedUpdates.bio = updates.bio
    if (updates.photoURL !== undefined) allowedUpdates.photoURL = updates.photoURL

    // For AI users, allow updating personality and interests
    if (targetUserData?.isAI) {
      if (updates.aiPersonality !== undefined) allowedUpdates.aiPersonality = updates.aiPersonality
      if (updates.aiInterests !== undefined) allowedUpdates.aiInterests = updates.aiInterests
    }

    await targetUserRef.update(allowedUpdates)

    // Update all posts by this user with new name/photo
    if (updates.displayName !== undefined || updates.photoURL !== undefined) {
      const postsSnapshot = await adminDb.collection('posts')
        .where('userId', '==', targetUserId)
        .get()

      const postUpdates = postsSnapshot.docs.map(doc => {
        const postUpdates: any = {}
        if (updates.displayName !== undefined) postUpdates.userName = updates.displayName
        if (updates.photoURL !== undefined) postUpdates.userPhoto = updates.photoURL
        return doc.ref.update(postUpdates)
      })

      // Update all comments by this user with new name/photo
      const commentsSnapshot = await adminDb.collection('comments')
        .where('userId', '==', targetUserId)
        .get()

      const commentUpdates = commentsSnapshot.docs.map(doc => {
        const commentUpdates: any = {}
        if (updates.displayName !== undefined) commentUpdates.userName = updates.displayName
        if (updates.photoURL !== undefined) commentUpdates.userPhoto = updates.photoURL
        return doc.ref.update(commentUpdates)
      })

      // Update AI memory if this is an AI user and name changed
      if (targetUserData?.isAI && updates.displayName !== undefined) {
        const memorySnapshot = await adminDb.collection('aiMemories')
          .where('uid', '==', targetUserId)
          .get()

        const memoryUpdates = memorySnapshot.docs.map(doc =>
          doc.ref.update({ botName: updates.displayName })
        )

        await Promise.all([...postUpdates, ...commentUpdates, ...memoryUpdates])
      } else {
        await Promise.all([...postUpdates, ...commentUpdates])
      }
    }

    return NextResponse.json({ success: true, message: 'Profile updated successfully' })
  } catch (error: any) {
    console.error('Error updating user profile:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    )
  }
}

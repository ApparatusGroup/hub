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

    // Only allow updating specific fields
    const allowedUpdates: any = {}
    if (updates.displayName !== undefined) allowedUpdates.displayName = updates.displayName
    if (updates.bio !== undefined) allowedUpdates.bio = updates.bio
    if (updates.photoURL !== undefined) allowedUpdates.photoURL = updates.photoURL

    await targetUserRef.update(allowedUpdates)

    return NextResponse.json({ success: true, message: 'Profile updated successfully' })
  } catch (error: any) {
    console.error('Error updating user profile:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    )
  }
}

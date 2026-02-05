import { NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'

// Get all AI bot memories
export async function GET(request: Request) {
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

    const memoriesSnapshot = await adminDb.collection('aiMemories').get()
    const memories = memoriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    return NextResponse.json({ memories })
  } catch (error) {
    console.error('Error fetching AI memories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AI memories' },
      { status: 500 }
    )
  }
}

// Update AI bot memory
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

    const { uid: botUid, updates } = await request.json()

    const memoryRef = adminDb.collection('aiMemories').doc(botUid)
    const memoryDoc = await memoryRef.get()

    if (!memoryDoc.exists) {
      // Create new memory document
      await memoryRef.set({
        uid: botUid,
        ...updates,
        updatedAt: Date.now()
      })
    } else {
      // Update existing memory
      await memoryRef.update({
        ...updates,
        updatedAt: Date.now()
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating AI memory:', error)
    return NextResponse.json(
      { error: 'Failed to update AI memory' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

// Get all AI bot memories
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    const { secret, botUid, updates } = await request.json()

    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

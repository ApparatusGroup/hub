import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(request: Request) {
  try {
    const { secret } = await request.json()

    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Set jamiebt@duck.com as admin
    const usersSnapshot = await adminDb.collection('users')
      .where('email', '==', 'jamiebt@duck.com')
      .limit(1)
      .get()

    if (usersSnapshot.empty) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userDoc = usersSnapshot.docs[0]
    await adminDb.collection('users').doc(userDoc.id).update({
      isAdmin: true
    })

    return NextResponse.json({
      success: true,
      message: 'Admin status granted to jamiebt@duck.com'
    })
  } catch (error) {
    console.error('Error setting admin:', error)
    return NextResponse.json(
      { error: 'Failed to set admin status' },
      { status: 500 }
    )
  }
}

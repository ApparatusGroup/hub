import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET() {
  try {
    // Test if admin can read from Firestore
    const testDoc = await adminDb.collection('users').limit(1).get()

    return NextResponse.json({
      success: true,
      message: 'Firebase Admin is working!',
      hasPrivateKey: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
      hasProjectId: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
      hasClientEmail: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      canReadFirestore: !testDoc.empty,
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      hasPrivateKey: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
      hasProjectId: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
      hasClientEmail: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    }, { status: 500 })
  }
}

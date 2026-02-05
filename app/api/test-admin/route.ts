import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET() {
  try {
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || ''

    // Test if admin can write to Firestore
    const testRef = adminDb.collection('_test').doc('admin-test')
    await testRef.set({
      test: true,
      timestamp: new Date(),
    })

    // Clean up test document
    await testRef.delete()

    return NextResponse.json({
      success: true,
      message: 'Firebase Admin is working! Can read AND write.',
      hasPrivateKey: !!privateKey,
      hasProjectId: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
      hasClientEmail: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKeyStartsWith: privateKey.substring(0, 30),
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    })
  } catch (error: any) {
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || ''

    return NextResponse.json({
      success: false,
      error: error.message,
      errorCode: error.code,
      hasPrivateKey: !!privateKey,
      hasProjectId: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
      hasClientEmail: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKeyStartsWith: privateKey.substring(0, 30),
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    }, { status: 500 })
  }
}

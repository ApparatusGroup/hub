import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

let app: App

if (!getApps().length) {
  try {
    // For Vercel deployment, use environment variables
    if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
      let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY

      // Remove surrounding quotes if present
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1)
      }

      // Handle double-escaped newlines (\\n) and single-escaped newlines (\n)
      // Replace \\n with \n first, then \n with actual newlines
      privateKey = privateKey
        .replace(/\\\\n/g, '\\n')  // \\n -> \n
        .replace(/\\n/g, '\n')      // \n -> actual newline

      app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey,
        }),
      })
    } else {
      // Fallback for local development
      app = initializeApp()
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error)
    throw error
  }
} else {
  app = getApps()[0]
}

const adminAuth = getAuth(app)
const adminDb = getFirestore(app)

export { adminAuth, adminDb }

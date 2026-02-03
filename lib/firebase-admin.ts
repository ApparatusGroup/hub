import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

let app: App

if (!getApps().length) {
  try {
    // For Vercel deployment, use environment variables
    if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
      // Handle both formats: with literal \n and with actual newlines
      let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY

      // If it doesn't start with quotes, it might need \n replacement
      if (!privateKey.startsWith('"')) {
        privateKey = privateKey.replace(/\\n/g, '\n')
      } else {
        // Remove surrounding quotes if present and replace \n
        privateKey = privateKey
          .replace(/^"/, '')
          .replace(/"$/, '')
          .replace(/\\n/g, '\n')
      }

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

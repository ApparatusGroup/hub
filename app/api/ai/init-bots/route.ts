import { NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { AI_BOTS } from '@/lib/ai-service'

// This endpoint initializes AI bot users in Firebase
// Call this once during setup
export async function POST(request: Request) {
  try {
    // Verify request has the secret key
    const { secret } = await request.json()
    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const botProfiles = []

    for (const bot of AI_BOTS) {
      const botEmail = `${bot.name.toLowerCase()}@hubai.bot`
      const botPassword = process.env.AI_BOT_PASSWORD || 'AIBot123456!'

      try {
        // Try to create the auth user
        let userRecord
        try {
          userRecord = await adminAuth.createUser({
            email: botEmail,
            password: botPassword,
            displayName: bot.name,
          })
        } catch (error: any) {
          // If user already exists, get the existing user
          if (error.code === 'auth/email-already-exists') {
            userRecord = await adminAuth.getUserByEmail(botEmail)
          } else {
            throw error
          }
        }

        // Create/update Firestore profile
        await adminDb.collection('users').doc(userRecord.uid).set({
          uid: userRecord.uid,
          email: botEmail,
          displayName: bot.name,
          photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${bot.name}`,
          bio: bot.bio,
          isAI: true,
          aiPersonality: bot.personality,
          aiInterests: bot.interests,
          createdAt: Date.now(),
        })

        botProfiles.push({
          uid: userRecord.uid,
          name: bot.name,
          email: botEmail,
        })
      } catch (error) {
        console.error(`Error creating bot ${bot.name}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      bots: botProfiles,
    })
  } catch (error) {
    console.error('Error initializing bots:', error)
    return NextResponse.json(
      { error: 'Failed to initialize bots' },
      { status: 500 }
    )
  }
}

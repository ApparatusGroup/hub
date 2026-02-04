import { NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { generateLurkerBots } from '@/lib/lurker-bots'

/**
 * Initialize 200 lurker bots (one-time setup)
 * These bots only like posts, don't create content
 */
export async function POST(request: Request) {
  try {
    const { secret } = await request.json()
    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🤖 Initializing lurker bots...')

    // Check if lurkers already exist
    const existingLurkers = await adminDb
      .collection('users')
      .where('isLurker', '==', true)
      .limit(1)
      .get()

    if (!existingLurkers.empty) {
      return NextResponse.json({
        error: 'Lurker bots already initialized',
        message: 'Use the admin panel to manage existing lurkers'
      }, { status: 400 })
    }

    // Generate 200 lurker bot profiles
    const lurkerProfiles = generateLurkerBots(200)
    const createdBots: string[] = []
    const errors: string[] = []

    console.log(`Creating ${lurkerProfiles.length} lurker bots...`)

    for (const profile of lurkerProfiles) {
      try {
        // Create Firebase Auth user
        const userRecord = await adminAuth.createUser({
          email: `${profile.username}@algosphere-lurker.ai`,
          displayName: profile.displayName,
          photoURL: profile.photoURL,
          emailVerified: true,
        })

        // Create Firestore user document
        await adminDb.collection('users').doc(userRecord.uid).set({
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: profile.displayName,
          username: profile.username,
          photoURL: profile.photoURL,
          bio: 'Tech enthusiast', // Simple bio for lurkers
          isAI: true,
          isLurker: true,
          preferences: profile.preferences,
          engagement: profile.engagement,
          createdAt: new Date(),
        })

        createdBots.push(profile.displayName)

        // Log progress every 20 bots
        if (createdBots.length % 20 === 0) {
          console.log(`  Created ${createdBots.length}/${lurkerProfiles.length} lurkers...`)
        }

      } catch (error: any) {
        console.error(`Failed to create lurker ${profile.displayName}:`, error.message)
        errors.push(`${profile.displayName}: ${error.message}`)
      }
    }

    console.log(`✅ Created ${createdBots.length} lurker bots`)
    if (errors.length > 0) {
      console.log(`⚠️  ${errors.length} failures`)
    }

    return NextResponse.json({
      success: true,
      created: createdBots.length,
      failed: errors.length,
      errors: errors.slice(0, 10), // Return first 10 errors if any
      message: `Successfully created ${createdBots.length} lurker bots`
    })

  } catch (error: any) {
    console.error('Error initializing lurker bots:', error)
    return NextResponse.json(
      { error: 'Failed to initialize lurker bots', details: error.message },
      { status: 500 }
    )
  }
}

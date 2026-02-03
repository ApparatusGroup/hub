import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(request: Request) {
  try {
    const { secret, title, content, fileType, assignedBots } = await request.json()

    // Verify admin secret
    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!title || !content) {
      return NextResponse.json({
        error: 'Missing required fields: title and content'
      }, { status: 400 })
    }

    // Create training material document
    const trainingRef = await adminDb.collection('trainingMaterials').add({
      title,
      content,
      fileType: fileType || 'text',
      uploadedAt: new Date(),
      uploadedBy: 'admin',
      assignedBots: assignedBots || [], // Empty means all bots
      status: 'pending',
    })

    return NextResponse.json({
      success: true,
      materialId: trainingRef.id,
      message: 'Training material uploaded successfully. Analysis will begin shortly.'
    })
  } catch (error: any) {
    console.error('Error uploading training material:', error)
    return NextResponse.json(
      { error: 'Failed to upload training material', details: error.message },
      { status: 500 }
    )
  }
}

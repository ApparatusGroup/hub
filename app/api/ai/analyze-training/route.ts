import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''

export async function POST(request: Request) {
  try {
    const { secret, materialId } = await request.json()

    // Verify admin secret
    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!materialId) {
      return NextResponse.json({
        error: 'Missing materialId'
      }, { status: 400 })
    }

    // Get the training material
    const materialRef = adminDb.collection('trainingMaterials').doc(materialId)
    const materialDoc = await materialRef.get()

    if (!materialDoc.exists) {
      return NextResponse.json({ error: 'Training material not found' }, { status: 404 })
    }

    const materialData = materialDoc.data()

    // Use AI to analyze the training content
    const analysisPrompt = `You are analyzing training material for AI social media bots. Your job is to extract patterns, examples, and insights from the provided content.

Training Material Content:
"""
${materialData?.content}
"""

Analyze this content and extract:

1. GOOD EXAMPLES (3-5 examples of excellent responses/comments that should be emulated)
2. BAD EXAMPLES (2-3 examples of poor responses to avoid, if any are shown)
3. CONVERSATION PATTERNS (3-5 patterns about how to structure responses, tone, style)
4. TONE INSIGHTS (2-3 insights about the desired tone, voice, or personality)

Format your response as JSON:
{
  "goodExamples": ["example 1", "example 2", ...],
  "badExamples": ["example 1", "example 2", ...],
  "conversationPatterns": ["pattern 1", "pattern 2", ...],
  "toneInsights": ["insight 1", "insight 2", ...]
}

Be specific and extract actual examples from the content when possible.`

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL || 'https://hub-social.vercel.app',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: analysisPrompt }],
        max_tokens: 2000,
      }),
    })

    const data = await response.json()
    const analysisText = data.choices?.[0]?.message?.content

    if (!analysisText) {
      throw new Error('Failed to get analysis from AI')
    }

    // Parse the JSON response
    let analysis
    try {
      // Try to extract JSON from the response (in case AI includes extra text)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : analysisText)
    } catch (e) {
      // Fallback parsing
      analysis = {
        goodExamples: ['Analysis completed but parsing failed'],
        badExamples: [],
        conversationPatterns: [],
        toneInsights: []
      }
    }

    // Update the training material with analysis
    await materialRef.update({
      status: 'analyzed',
      analysis: {
        ...analysis,
        analyzedAt: new Date()
      }
    })

    // Update all assigned bots (or all bots if none assigned)
    const botsQuery = materialData?.assignedBots && materialData.assignedBots.length > 0
      ? adminDb.collection('users').where('uid', 'in', materialData.assignedBots)
      : adminDb.collection('users').where('isAI', '==', true)

    const botsSnapshot = await botsQuery.get()

    // Update each bot's AI memory with training insights
    const updatePromises = botsSnapshot.docs.map(async (botDoc) => {
      const botData = botDoc.data()
      const memoryRef = adminDb.collection('aiMemory').doc(botData.uid)
      const memoryDoc = await memoryRef.get()

      const existingMemory = memoryDoc.exists ? memoryDoc.data() : {}
      const existingInsights = existingMemory?.trainingInsights || {
        goodExamples: [],
        badExamples: [],
        conversationPatterns: [],
        lastTrainingUpdate: 0
      }

      // Merge new insights with existing ones (keep last 20 of each)
      const updatedInsights = {
        goodExamples: [...existingInsights.goodExamples, ...analysis.goodExamples].slice(-20),
        badExamples: [...existingInsights.badExamples, ...analysis.badExamples].slice(-20),
        conversationPatterns: [...existingInsights.conversationPatterns, ...analysis.conversationPatterns].slice(-20),
        lastTrainingUpdate: Date.now()
      }

      await memoryRef.set({
        trainingInsights: updatedInsights
      }, { merge: true })

      return botData.displayName
    })

    const updatedBots = await Promise.all(updatePromises)

    return NextResponse.json({
      success: true,
      analysis,
      botsUpdated: updatedBots.length,
      botNames: updatedBots
    })
  } catch (error: any) {
    console.error('Error analyzing training material:', error)

    // Mark material as error if it exists
    if (request.body) {
      try {
        const { materialId } = await request.json()
        if (materialId) {
          await adminDb.collection('trainingMaterials').doc(materialId).update({
            status: 'error'
          })
        }
      } catch (e) {
        // Ignore
      }
    }

    return NextResponse.json(
      { error: 'Failed to analyze training material', details: error.message },
      { status: 500 }
    )
  }
}

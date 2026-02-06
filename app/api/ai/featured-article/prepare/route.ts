import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { AI_BOTS } from '@/lib/ai-service'

export async function POST(request: Request) {
  try {
    const { secret, topic: selectedTopic, context: topicContext } = await request.json()
    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!selectedTopic?.title || !selectedTopic?.category) {
      return NextResponse.json({ error: 'Missing topic title or category' }, { status: 400 })
    }

    const topic = {
      title: selectedTopic.title,
      category: selectedTopic.category,
      tags: selectedTopic.tags || [],
    }

    // Find relevant bots for this category
    const relevantBots = AI_BOTS
      .filter(b => b.categories?.includes(topic.category))

    // Fallback if no category match
    if (relevantBots.length === 0) {
      relevantBots.push(...AI_BOTS.slice(0, 3))
    }

    const leadAuthor = relevantBots[0]
    const contributors = relevantBots.slice(1, 3)

    // Build the prompt with current event context
    const contributorNames = contributors.map(c => c.name).join(' and ')
    const contributorContext = contributors.length > 0
      ? `\nYou are collaborating with ${contributorNames}. Include perspectives they would bring:
${contributors.map(c => `- ${c.name} (${c.occupation}): ${c.personality}`).join('\n')}`
      : ''

    const currentContext = topicContext
      ? `\n\nCURRENT CONTEXT (use this to make the article timely and specific):
${topicContext}

CRITICAL: Reference these specific current events, product names, version numbers, and developments. Do NOT use outdated information. Today is ${new Date().toISOString().split('T')[0]}.`
      : ''

    const prompt = `You are ${leadAuthor.name}, a ${leadAuthor.occupation}. ${leadAuthor.personality}

Write an original opinion/analysis article titled: "${topic.title}"
${contributorContext}
${currentContext}

Requirements:
- Write 400-600 words
- Be opinionated and take a clear stance
- Reference SPECIFIC current developments, product versions, and real events
- Write in a conversational but authoritative journalist voice
- NO emoji, NO hashtags, NO "as an AI"
- Structure with 2-3 sections using ## headers
- Use **bold** for emphasis on key terms
- End with a forward-looking conclusion
- Sound like a real tech journalist, not a press release
- Be genuinely insightful, not surface-level

Write the article body in markdown (no title, that's already set).`

    // Find bot user in Firestore
    const botEmail = `${leadAuthor.name.toLowerCase().replace(/\s+/g, '')}@hubai.bot`
    const botUserSnapshot = await adminDb.collection('users').where('email', '==', botEmail).limit(1).get()

    if (botUserSnapshot.empty) {
      return NextResponse.json({ error: `Bot user not found: ${leadAuthor.name}` }, { status: 404 })
    }

    const botUser = botUserSnapshot.docs[0].data()

    const authorCredit = contributors.length > 0
      ? `By ${leadAuthor.name} with ${contributors.map(c => c.name).join(' & ')}`
      : `By ${leadAuthor.name}`

    return NextResponse.json({
      topic,
      prompt,
      authorCredit,
      contributors: [leadAuthor.name, ...contributors.map(c => c.name)],
      botUser: {
        uid: botUser.uid,
        displayName: botUser.displayName,
        photoURL: botUser.photoURL,
      },
    })
  } catch (error) {
    console.error('Error preparing featured article:', error)
    return NextResponse.json({ error: 'Failed to prepare featured article' }, { status: 500 })
  }
}

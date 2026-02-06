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
    const reviewers = relevantBots.slice(1, 3)

    const currentContext = topicContext
      ? `\n\nCURRENT EVENTS TO REFERENCE (this is what's actually happening right now):
${topicContext}

CRITICAL: Reference these specific current events, product names, version numbers, and developments. Do NOT use outdated information or make up version numbers. Today is ${new Date().toISOString().split('T')[0]}.`
      : ''

    const prompt = `You are ${leadAuthor.name}, a ${leadAuthor.occupation}. ${leadAuthor.personality}

Write an original opinion/analysis article titled: "${topic.title}"
${currentContext}

WRITING STYLE RULES (violating these makes it obviously AI-generated):
- NEVER use em dashes. Use periods or commas instead.
- NEVER use "notably", "nuanced", "straightforward", "it's worth noting", "the reality is"
- NEVER use "landscape" to describe an industry or field
- NEVER use semicolons
- NEVER start consecutive paragraphs the same way
- NEVER use the phrase "at the end of the day" or "in the grand scheme"
- Don't hedge every statement. Take a real position.
- Vary sentence length. Mix short punchy sentences with longer ones.
- Write like you're explaining this to a smart friend over coffee, not presenting at a conference.

Requirements:
- Write 400-600 words
- Be opinionated and take a clear stance
- Reference SPECIFIC current developments, product versions, and real events
- NO emoji, NO hashtags
- Structure with 2-3 sections using ## headers
- Use **bold** for emphasis on key terms
- End with a forward-looking conclusion
- Sound like a real tech journalist, not a press release or AI summary

Write the article body in markdown (no title, that's already set). Do not mention any co-authors or collaborators in the article text.`

    // Find bot user in Firestore
    const botEmail = `${leadAuthor.name.toLowerCase().replace(/\s+/g, '')}@hubai.bot`
    const botUserSnapshot = await adminDb.collection('users').where('email', '==', botEmail).limit(1).get()

    if (botUserSnapshot.empty) {
      return NextResponse.json({ error: `Bot user not found: ${leadAuthor.name}` }, { status: 404 })
    }

    const botUser = botUserSnapshot.docs[0].data()

    const authorCredit = reviewers.length > 0
      ? `By ${leadAuthor.name} | Reviewed by ${reviewers.map(c => c.name).join(' & ')}`
      : `By ${leadAuthor.name}`

    // Build review prompt for fact-checking step
    const reviewerInfo = reviewers.map(r => `${r.name} (${r.occupation}): ${r.personality}`).join('\n')
    const reviewPrompt = reviewers.length > 0
      ? `You are a team of editors reviewing an article for accuracy and readability:
${reviewerInfo}

Review the following article titled "${topic.title}" and fix any issues:
1. Remove any phrases that sound obviously AI-generated (em dashes, "notably", "landscape", "it's worth noting", hedging language)
2. Fix any factual errors or outdated references
3. Make sure it reads like a real journalist wrote it, not an AI
4. Keep the same structure and length
5. Do NOT add any mentions of reviewers, editors, or collaboration
6. Do NOT add a title - just return the corrected article body

Return ONLY the corrected article body in markdown. No commentary.`
      : null

    return NextResponse.json({
      topic,
      prompt,
      reviewPrompt,
      authorCredit,
      contributors: [leadAuthor.name, ...reviewers.map(c => c.name)],
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

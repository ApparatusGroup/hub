import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { AI_BOTS } from '@/lib/ai-service'

const FEATURED_TOPICS = [
  { title: 'Claude vs OpenAI: The AI Race Heats Up', category: 'Artificial Intelligence', tags: ['claude', 'openai', 'gpt', 'anthropic'] },
  { title: 'The State of Rust in 2026', category: 'Software & Development', tags: ['rust', 'systems', 'memory safety'] },
  { title: 'Why Every Company Is Becoming an AI Company', category: 'Big Tech & Policy', tags: ['ai', 'enterprise', 'transformation'] },
  { title: 'The Browser Wars Are Back', category: 'Personal Tech & Gadgets', tags: ['browser', 'chrome', 'firefox', 'web'] },
  { title: 'Open Source AI: Liberation or Liability?', category: 'Artificial Intelligence', tags: ['open source', 'llama', 'mistral', 'licensing'] },
  { title: 'Cloud Costs Are Out of Control', category: 'Computing & Hardware', tags: ['cloud', 'aws', 'costs', 'infrastructure'] },
  { title: 'The Death of the Traditional Tech Interview', category: 'Software & Development', tags: ['hiring', 'interviews', 'leetcode'] },
  { title: 'AI Agents: Hype vs Reality', category: 'Artificial Intelligence', tags: ['agents', 'automation', 'agentic'] },
  { title: 'Edge Computing Finally Makes Sense', category: 'Computing & Hardware', tags: ['edge', 'latency', 'distributed'] },
  { title: 'The Indie Web Revival', category: 'Personal Tech & Gadgets', tags: ['indie web', 'personal sites', 'fediverse'] },
  { title: 'Technical Debt Is Eating Your Roadmap', category: 'Software & Development', tags: ['tech debt', 'refactoring', 'architecture'] },
  { title: 'Regulation Is Coming for AI', category: 'Big Tech & Policy', tags: ['regulation', 'eu ai act', 'governance'] },
]

export async function POST(request: Request) {
  try {
    const { secret, topic: customTopic } = await request.json()
    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Pick a topic
    let topic: { title: string; category: string; tags: string[] }
    if (customTopic) {
      topic = { title: customTopic.title, category: customTopic.category || 'Artificial Intelligence', tags: customTopic.tags || [] }
    } else {
      const recentFeatured = await adminDb
        .collection('posts')
        .where('isFeaturedArticle', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get()

      const recentTitles = new Set(recentFeatured.docs.map(d => d.data().articleTitle))
      const availableTopics = FEATURED_TOPICS.filter(t => !recentTitles.has(t.title))

      if (availableTopics.length === 0) {
        return NextResponse.json({ error: 'All featured topics have been written recently' }, { status: 400 })
      }

      topic = availableTopics[Math.floor(Math.random() * availableTopics.length)]
    }

    // Find relevant bots
    const relevantBots = AI_BOTS
      .filter(b => b.categories?.includes(topic.category))
      .slice(0, 3)

    if (relevantBots.length === 0) {
      return NextResponse.json({ error: 'No relevant bots for this category' }, { status: 400 })
    }

    const leadAuthor = relevantBots[0]
    const contributors = relevantBots.slice(1)

    // Build the prompt
    const contributorNames = contributors.map(c => c.name).join(' and ')
    const contributorContext = contributors.length > 0
      ? `\nYou are collaborating with ${contributorNames}. Include perspectives they would bring:
${contributors.map(c => `- ${c.name} (${c.occupation}): ${c.personality}`).join('\n')}`
      : ''

    const prompt = `You are ${leadAuthor.name}, a ${leadAuthor.occupation}. ${leadAuthor.personality}

Write an original opinion/analysis article titled: "${topic.title}"
${contributorContext}

Requirements:
- Write 300-400 words (keep it tight and punchy)
- Be opinionated and take a clear stance
- Reference recent real developments and trends
- Write in a conversational but authoritative journalist voice
- NO emoji, NO hashtags, NO "as an AI"
- Structure with 2-3 sections using ## headers
- End with a forward-looking conclusion
- Sound like a real tech journalist, not a press release

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

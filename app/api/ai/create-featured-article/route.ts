import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { AI_BOTS } from '@/lib/ai-service'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''

// Trending topics the platform can write original articles about
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

    // Pick a topic (custom or random from list)
    let topic: { title: string; category: string; tags: string[] }
    if (customTopic) {
      topic = { title: customTopic.title, category: customTopic.category || 'Artificial Intelligence', tags: customTopic.tags || [] }
    } else {
      // Check which topics have already been written about recently
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

    // Find 2-3 relevant AI bots for this category
    const relevantBots = AI_BOTS
      .filter(b => b.categories?.includes(topic.category))
      .slice(0, 3)

    if (relevantBots.length === 0) {
      return NextResponse.json({ error: 'No relevant bots for this category' }, { status: 400 })
    }

    const leadAuthor = relevantBots[0]
    const contributors = relevantBots.slice(1)

    // Generate the article body
    const contributorNames = contributors.map(c => c.name).join(' and ')
    const contributorContext = contributors.length > 0
      ? `\nYou are collaborating with ${contributorNames}. Include perspectives they would bring:
${contributors.map(c => `- ${c.name} (${c.occupation}): ${c.personality}`).join('\n')}`
      : ''

    const articlePrompt = `You are ${leadAuthor.name}, a ${leadAuthor.occupation}. ${leadAuthor.personality}

Write an original opinion/analysis article titled: "${topic.title}"
${contributorContext}

Requirements:
- Write 400-600 words
- Be opinionated and take a clear stance
- Reference recent real developments and trends in the space
- Include specific examples and data points where relevant
- Write in a conversational but authoritative journalist voice
- NO emoji, NO hashtags, NO "as an AI"
- Structure with 3-4 sections using ## headers
- End with a forward-looking conclusion
- Sound like a real tech journalist, not a press release
- Be genuinely insightful, not surface-level

Write the article body in markdown (no title, that's already set).`

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4-20250514',
        messages: [{ role: 'user', content: articlePrompt }],
        max_tokens: 1500,
        temperature: 0.85,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('OpenRouter error:', err)
      return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
    }

    const data = await response.json()
    const articleBody = data.choices?.[0]?.message?.content?.trim()

    if (!articleBody || articleBody.length < 100) {
      return NextResponse.json({ error: 'Generated article too short' }, { status: 500 })
    }

    // Find lead author's Firestore user record
    const botEmail = `${leadAuthor.name.toLowerCase().replace(/\s+/g, '')}@hubai.bot`
    const botUserSnapshot = await adminDb.collection('users').where('email', '==', botEmail).limit(1).get()

    if (botUserSnapshot.empty) {
      return NextResponse.json({ error: `Bot user not found: ${leadAuthor.name}` }, { status: 404 })
    }

    const botUser = botUserSnapshot.docs[0].data()

    // Generate branded OG image URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://hub-gray-six.vercel.app'
    const ogParams = new URLSearchParams({
      title: topic.title,
      category: topic.category,
    })
    const articleImage = `${baseUrl}/api/og?${ogParams.toString()}`

    // Create commentary/summary for the post card
    const commentary = articleBody.split('\n').find((line: string) =>
      line.trim().length > 50 && !line.startsWith('#')
    )?.trim().substring(0, 200) || articleBody.substring(0, 200)

    // Build contributor credit
    const authorCredit = contributors.length > 0
      ? `By ${leadAuthor.name} with ${contributors.map(c => c.name).join(' & ')}`
      : `By ${leadAuthor.name}`

    // Store as a featured post
    const postRef = await adminDb.collection('posts').add({
      userId: botUser.uid,
      userName: botUser.displayName,
      userPhoto: botUser.photoURL,
      isAI: true,
      isFeaturedArticle: true,
      content: commentary,
      articleTitle: topic.title,
      articleBody: articleBody,
      articleImage: articleImage,
      articleUrl: null, // Original article, no external URL
      articleDescription: commentary,
      authorCredit: authorCredit,
      contributors: [leadAuthor.name, ...contributors.map(c => c.name)],
      category: topic.category,
      tags: topic.tags,
      upvotes: [],
      downvotes: [],
      commentCount: 0,
      createdAt: new Date(),
    })

    console.log(`📰 Created featured article: "${topic.title}" by ${authorCredit}`)

    return NextResponse.json({
      success: true,
      postId: postRef.id,
      title: topic.title,
      author: authorCredit,
      category: topic.category,
      wordCount: articleBody.split(/\s+/).length,
    })
  } catch (error) {
    console.error('Error creating featured article:', error)
    return NextResponse.json({ error: 'Failed to create featured article' }, { status: 500 })
  }
}

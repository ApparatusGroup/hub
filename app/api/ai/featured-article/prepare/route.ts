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
      ? `\n\nHere is what's actually happening in the news right now. These are REAL headlines from today (${new Date().toISOString().split('T')[0]}):
${topicContext}

You MUST reference these specific events, names, and version numbers. Do not use outdated info or guess at version numbers.`
      : ''

    // Anti-AI-detection writing prompt - based on GPTZero report analysis
    // Key: increase perplexity variance, burstiness, narrative structure, avoid mechanical patterns
    const prompt = `You are ${leadAuthor.name}, a ${leadAuthor.occupation}. ${leadAuthor.personality}

Write a 400-600 word opinion piece titled: "${topic.title}"
${currentContext}

This article will be scanned by AI detection tools like GPTZero. You need to write like a real person. Here are the specific patterns you MUST avoid and the patterns you MUST use, based on what detectors actually flag:

PATTERNS THAT GET FLAGGED AS AI (never do these):
1. FORMULAIC TRANSITIONS: Never repeat the same transition pattern. "It would mean X. It would mean Y. It would mean Z" is an instant AI flag. Never use "This is important because", "The implications are clear", "It's worth noting".
2. ROBOTIC FORMALITY: Don't write in a formal, polished, orderly tone throughout. Real writers shift between casual and serious within the same piece.
3. PREDICTABLE SYNTAX: Don't write sentence after sentence in simple subject-verb-object declarative form. That repetitive pattern is the #1 thing detectors catch.
4. MECHANICAL TRANSITIONS: Don't use subordinate clauses to connect every idea smoothly. Sometimes ideas should just... sit next to each other. Let the reader connect them.
5. MECHANICAL PRECISION: Don't drop technical terms without any casual context around them. If you mention "algorithmic dispatch", follow it with something human like "which is a fancy way of saying the app picks your driver."
6. PREDICTABLE STRUCTURE: Don't follow problem-solution-conclusion. Don't follow claim-evidence-analysis. Mix it up. Start in the middle of the story if you want.

PATTERNS THAT READ AS HUMAN (do more of these):
1. NARRATIVE STRUCTURE: Tell a story. Set up a turning point. Build progression. "X happened. Then Y happened. And that changes everything about Z."
2. QUALITATIVE FOCUS: Don't just state facts. Explore what they mean, how they feel, why they matter to real people.
3. TECHNICAL-BROAD BALANCE: When you use a technical term, balance it with a broader explanation for normal people in the same breath.
4. JOURNALISTIC VOICE: Report what happened factually, then give your take. Separate the two.
5. VARIED SENTENCE RHYTHM: This is the biggest one. Some sentences need to be three words long. Others need to run on for thirty or forty words, piling up clauses and qualifiers and asides until they feel almost unwieldy but still make sense when you reach the end.

WRITING MECHANICS:
- Use contractions always (it's, don't, won't, can't, they've, we're)
- Start some sentences with "And", "But", "So", or "Look,"
- Use sentence fragments. Deliberately.
- Include at least one rhetorical question
- Include at least one parenthetical aside (like this, even if it's tangential)
- Use tentative language sometimes ("Maybe", "I think", "probably") instead of being certain about everything
- Include a few short emphatic statements. One-word sentences work. "Absolutely." "Exactly." "Right."
- Use imperatives to address the reader directly ("Think about that.", "Consider this.", "Pay attention.")
- NEVER use: "notably", "straightforward", "nuanced", "multifaceted", "delve", "tapestry", "pivotal", "crucial", "foster", "leverage", "navigate", "landscape", "robust", "game-changer", "paradigm", "synergy", "ecosystem", "at the end of the day", "in the grand scheme", "it's worth noting", "the reality is"
- No em dashes, no semicolons
- No emoji, no hashtags

THINGS THAT LOOK AI-GENERATED (from actual GPTZero reports, avoid these):
- DO NOT use forced personal anecdotes like "I was baking at 2 AM when..." or "I was doing X when the news broke." GPTZero flags these as HIGH AI probability. They know AI does this now.
- DO NOT list three technical terms in a row ("package managers, version conflicts, and build systems"). Tricolon technical lists are flagged as "Mechanical Precision."
- DO NOT write simple bare statements without texture. "Companies are doing the math" reads as AI. "Companies are doing the math, and a few of them don't like what they're finding" reads as human.
- DO NOT use speculative predictions with specific timeframes like "by Q4" or "within 18 months." GPTZero flags these as "Speculative Focus."

FORMAT: 2-3 sections with ## headers. Use **bold** sparingly. Markdown body only, no title.

Write it now. You've got something to say and ten minutes before deadline.`

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

    // Build fact-check prompt (humanization is now a separate step)
    const reviewerInfo = reviewers.map(r => `${r.name} (${r.occupation}): ${r.personality}`).join('\n')
    const reviewPrompt = reviewers.length > 0
      ? `You are a fact-checker reviewing an article for accuracy.

Editors: ${reviewerInfo}
Article: "${topic.title}"

Review the article below and fix ONLY:
1. Factual errors or outdated information
2. Incorrect version numbers, dates, or product names
3. Misleading claims or unsupported assertions
4. Any mention of reviewers/editors/collaboration in the body text

Keep the same writing style, tone, length, and formatting. Do NOT change the voice or add your own commentary. Return ONLY the corrected article body in markdown. No title.`
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

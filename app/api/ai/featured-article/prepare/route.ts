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
- Reference a personal reaction ("I was surprised to see...", "My first thought was...")
- NEVER use: "notably", "straightforward", "nuanced", "multifaceted", "delve", "tapestry", "pivotal", "crucial", "foster", "leverage", "navigate", "landscape", "robust", "game-changer", "paradigm", "synergy", "ecosystem", "at the end of the day", "in the grand scheme", "it's worth noting", "the reality is"
- No em dashes, no semicolons
- No emoji, no hashtags

FORMAT: 2-3 sections with ## headers. Use **bold** sparingly. Markdown body only, no title.

Write it now. Bang it out like you have ten minutes before deadline and a strong opinion you need to get on paper.`

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

    // Build review prompt - based on GPTZero's specific detection criteria
    const reviewerInfo = reviewers.map(r => `${r.name} (${r.occupation}): ${r.personality}`).join('\n')
    const reviewPrompt = reviewers.length > 0
      ? `You are a rewriter. The article below was flagged by GPTZero as AI-generated. Your job: rewrite it so it passes as human.

Editors: ${reviewerInfo}
Article: "${topic.title}"

Here is the EXACT feedback from GPTZero's detection report on what flags text as AI. Fix every single one of these:

FLAG 1 - "Formulaic Transitions": GPTZero flagged sentences like "It would mean X" repeated multiple times. FIND any repeated sentence structures and rewrite each one differently. No two transitions should use the same pattern.

FLAG 2 - "Robotic Formality": GPTZero flagged "formal and polished language" with "clear and orderly" tone. FIX by adding casual phrases ("look", "honestly", "here's the thing"), contractions, and at least one slightly rough/imperfect sentence.

FLAG 3 - "Predictable Syntax": GPTZero flagged "declarative structure, using a straightforward and repetitive pattern." FIX by varying sentence structure wildly. Add questions. Add fragments. Add one long rambling sentence. Don't let 3 sentences in a row use the same subject-verb-object pattern.

FLAG 4 - "Mechanical Transitions": GPTZero flagged smooth subordinate clauses connecting ideas. FIX by sometimes just placing ideas next to each other without a connector. Let some transitions be abrupt.

FLAG 5 - "Mechanical Precision": GPTZero flagged "technical terms to provide a clear and specific solution." FIX by wrapping technical terms in casual language. Instead of "continuous monitoring of driver behavior", try "actually keeping tabs on how drivers behave, not just running a background check once and calling it a day."

FLAG 6 - "Lacks Creative Grammar": GPTZero flagged "correct grammatical structures" with no "creative deviations." FIX by starting a sentence with "And" or "But", using a fragment, or bending grammar slightly the way a real writer would.

FLAG 7 - "Lacks Complexity": GPTZero flagged "single theme explored in a straightforward manner." FIX by introducing a brief tangent, analogy, or comparison to something unexpected before returning to the main point.

WHAT GPTZero MARKED AS HUMAN (do MORE of these):
- Narrative structure with turning points
- Qualitative analysis (what things MEAN, not just what they ARE)
- Mixing technical detail with broad plain-language explanation
- Journalistic reporting style
- Precise but varied word choice

BANNED WORDS (instant AI flag): notably, straightforward, nuanced, multifaceted, delve, tapestry, pivotal, crucial, foster, leverage, navigate, landscape, robust, game-changer, paradigm, synergy, ecosystem

Remove all em dashes and semicolons. Add contractions everywhere possible. Keep the same facts and approximate length. Return ONLY the rewritten markdown article body. No title, no commentary about edits.`
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

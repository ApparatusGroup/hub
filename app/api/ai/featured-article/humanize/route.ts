export const runtime = 'edge'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

export async function POST(request: Request) {
  try {
    const { secret, articleBody } = await request.json()
    if (secret !== process.env.AI_BOT_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!articleBody) {
      return Response.json({ articleBody: '', reviewed: false })
    }

    const apiKey = process.env.OPENROUTER_API_KEY || ''

    const prompt = `You are an editor focused on making AI-written text undetectable by GPTZero and similar tools.

Rewrite the article below. Your only goal: make it read as human-written.

SPECIFIC FIXES (from GPTZero detection reports):
- Replace repeated transition patterns. No two transitions should look alike.
- Add contractions everywhere (it's, don't, won't, can't, they've).
- Break up any sequences of 3+ similar-length sentences. Add short punches ("Right." "That matters.") and long rambling ones.
- Start at least 2 sentences with "And", "But", or "So".
- Use at least 1 sentence fragment.
- Add at least 1 parenthetical aside.
- Use tentative language ("maybe", "probably", "I think") in 2-3 places.
- Remove em dashes, semicolons.
- Remove these words: notably, straightforward, nuanced, multifaceted, delve, tapestry, pivotal, crucial, foster, leverage, navigate, landscape, robust, game-changer, paradigm, synergy, ecosystem.
- Remove any forced personal anecdotes ("I was doing X at 2 AM when...").
- Break up any tricolon lists ("X, Y, and Z") into just one or two items.
- Remove speculative timeframes ("by Q4", "within 18 months"). Use "soon" or "before long".
- If any paragraph sounds too formal throughout, inject a casual phrase.

Keep the same facts, approximate length, and markdown formatting. No title. No commentary. Return ONLY the rewritten article body.

ARTICLE TO REWRITE:

${articleBody}`

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.85,
      }),
    })

    if (!response.ok) {
      console.error('Humanize failed, using original article')
      return Response.json({ articleBody, reviewed: false })
    }

    const data = await response.json()
    const rewritten = data.choices?.[0]?.message?.content?.trim()

    if (rewritten && rewritten.length > 200) {
      return Response.json({ articleBody: rewritten, reviewed: true })
    }

    return Response.json({ articleBody, reviewed: false })
  } catch (error) {
    console.error('Error humanizing article:', error)
    return Response.json({ articleBody: '', reviewed: false })
  }
}

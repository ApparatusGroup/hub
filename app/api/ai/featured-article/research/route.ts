export const runtime = 'edge'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

async function fetchHNTopTitles(): Promise<string[]> {
  try {
    const res = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json')
    const ids: number[] = await res.json()
    const top = ids.slice(0, 15)
    const stories = await Promise.all(
      top.map(async (id) => {
        try {
          const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
          const item = await r.json()
          return item?.title || null
        } catch { return null }
      })
    )
    return stories.filter(Boolean) as string[]
  } catch {
    return []
  }
}

async function fetchRedditTopTitles(): Promise<string[]> {
  try {
    const subs = ['technology', 'artificial', 'programming']
    const allTitles: string[] = []
    for (const sub of subs) {
      try {
        const res = await fetch(
          `https://www.reddit.com/r/${sub}/hot.json?limit=10`,
          { headers: { 'User-Agent': 'Algosphere/1.0' } }
        )
        const data = await res.json()
        const titles = data?.data?.children
          ?.map((c: any) => c.data?.title)
          .filter(Boolean) || []
        allTitles.push(...titles)
      } catch { /* skip sub */ }
    }
    return allTitles
  } catch {
    return []
  }
}

export async function POST(request: Request) {
  try {
    const { secret } = await request.json()
    if (secret !== process.env.AI_BOT_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY || ''

    // Fetch real headlines from multiple sources in parallel
    const [hnTitles, redditTitles] = await Promise.all([
      fetchHNTopTitles(),
      fetchRedditTopTitles(),
    ])

    const allHeadlines = [...hnTitles, ...redditTitles]

    if (allHeadlines.length === 0) {
      return Response.json({ error: 'Could not fetch any current headlines' }, { status: 500 })
    }

    // Use AI to synthesize 5 hot article topics from real headlines
    const today = new Date().toISOString().split('T')[0]
    const synthesisPrompt = `Today is ${today}. Here are the current top headlines from Hacker News and Reddit right now:

${allHeadlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}

Based on these REAL current headlines, generate exactly 5 original article topics that a tech publication should write about RIGHT NOW. These should be:
- Based on what's ACTUALLY trending today (not generic evergreen topics)
- Specific and timely (reference actual products, companies, versions, events from the headlines)
- Opinionated angles, not just news summaries
- Covering different categories

CRITICAL: Reference SPECIFIC current versions, releases, and events visible in these headlines. For example, if you see headlines about "Claude Opus 4.6" or "GPT-5.3", reference those exact versions. Do NOT make up fake version numbers.

Respond ONLY with valid JSON array, no other text:
[
  {"title": "article title here", "category": "one of: Artificial Intelligence, Computing & Hardware, Emerging Tech & Science, Software & Development, Big Tech & Policy, Personal Tech & Gadgets", "context": "2-3 sentence summary of the current events this should reference"},
  ...
]`

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4',
        messages: [{ role: 'user', content: synthesisPrompt }],
        max_tokens: 800,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('OpenRouter error:', err)
      return Response.json({ error: 'AI topic generation failed' }, { status: 500 })
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content?.trim()

    // Parse the JSON response
    let topics: { title: string; category: string; context: string }[]
    try {
      // Handle potential markdown code block wrapping
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      topics = JSON.parse(cleaned)
    } catch {
      console.error('Failed to parse topics JSON:', raw)
      return Response.json({ error: 'Failed to parse topic suggestions' }, { status: 500 })
    }

    return Response.json({
      topics: topics.slice(0, 5),
      headlineCount: allHeadlines.length,
      sources: { hn: hnTitles.length, reddit: redditTitles.length },
    })
  } catch (error) {
    console.error('Error researching topics:', error)
    return Response.json({ error: 'Failed to research trending topics' }, { status: 500 })
  }
}

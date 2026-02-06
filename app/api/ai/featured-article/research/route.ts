export const runtime = 'edge'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Hacker News - Firebase API (reliable, no auth needed)
async function fetchHNTopTitles(): Promise<string[]> {
  try {
    const res = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json')
    const ids: number[] = await res.json()
    const top = ids.slice(0, 20)
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

// Reddit - use old.reddit.com with a browser-like User-Agent
async function fetchRedditTopTitles(): Promise<string[]> {
  try {
    const subs = [
      'technology', 'programming', 'MachineLearning',
      'artificial', 'webdev', 'cscareer', 'tech',
      'gadgets', 'hardware', 'cybersecurity',
    ]
    const allTitles: string[] = []
    const fetches = subs.map(async (sub) => {
      try {
        const res = await fetch(
          `https://old.reddit.com/r/${sub}/hot.json?limit=8&raw_json=1`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(5000),
          }
        )
        if (!res.ok) return []
        const data = await res.json()
        return data?.data?.children
          ?.filter((c: any) => !c.data?.stickied)
          ?.map((c: any) => c.data?.title)
          .filter(Boolean) || []
      } catch { return [] }
    })
    const results = await Promise.all(fetches)
    for (const titles of results) {
      allTitles.push(...titles)
    }
    return allTitles
  } catch {
    return []
  }
}

// Lobsters - clean JSON API, no auth needed
async function fetchLobstersTitles(): Promise<string[]> {
  try {
    const res = await fetch('https://lobste.rs/hottest.json', {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const stories = await res.json()
    return stories
      .slice(0, 15)
      .map((s: any) => s.title)
      .filter(Boolean) as string[]
  } catch {
    return []
  }
}

// Dev.to - free public API
async function fetchDevToTitles(): Promise<string[]> {
  try {
    const res = await fetch('https://dev.to/api/articles?top=1&per_page=15', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const articles = await res.json()
    return articles
      .map((a: any) => `${a.title} (${a.tag_list?.join(', ') || ''})`)
      .filter(Boolean) as string[]
  } catch {
    return []
  }
}

// GitHub Trending - scrape the trending page
async function fetchGitHubTrending(): Promise<string[]> {
  try {
    const res = await fetch('https://api.github.com/search/repositories?q=created:>2026-02-01&sort=stars&order=desc&per_page=10', {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Algosphere-Research/1.0',
      },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.items || [])
      .map((r: any) => `${r.full_name}: ${r.description || r.name} (${r.stargazers_count} stars)`)
      .filter(Boolean) as string[]
  } catch {
    return []
  }
}

// Ars Technica RSS feed (via public RSS-to-JSON service)
async function fetchArsTechnica(): Promise<string[]> {
  try {
    const res = await fetch('https://feeds.arstechnica.com/arstechnica/technology-lab', {
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml',
        'User-Agent': 'Mozilla/5.0 (compatible; Algosphere/1.0)',
      },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    // Simple regex to extract titles from RSS XML
    const titles: string[] = []
    const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/g
    let match
    while ((match = titleRegex.exec(xml)) !== null) {
      const title = match[1] || match[2]
      if (title && !title.includes('Ars Technica')) {
        titles.push(title)
      }
    }
    return titles.slice(0, 10)
  } catch {
    return []
  }
}

// The Verge RSS feed
async function fetchTheVerge(): Promise<string[]> {
  try {
    const res = await fetch('https://www.theverge.com/rss/index.xml', {
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml',
        'User-Agent': 'Mozilla/5.0 (compatible; Algosphere/1.0)',
      },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    const titles: string[] = []
    const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/g
    let match
    while ((match = titleRegex.exec(xml)) !== null) {
      const title = match[1] || match[2]
      if (title && !title.includes('The Verge') && title.length > 10) {
        titles.push(title)
      }
    }
    return titles.slice(0, 10)
  } catch {
    return []
  }
}

// TechCrunch RSS feed
async function fetchTechCrunch(): Promise<string[]> {
  try {
    const res = await fetch('https://techcrunch.com/feed/', {
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml',
        'User-Agent': 'Mozilla/5.0 (compatible; Algosphere/1.0)',
      },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    const titles: string[] = []
    const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/g
    let match
    while ((match = titleRegex.exec(xml)) !== null) {
      const title = match[1] || match[2]
      if (title && !title.includes('TechCrunch') && title.length > 10) {
        titles.push(title)
      }
    }
    return titles.slice(0, 10)
  } catch {
    return []
  }
}

// Product Hunt - their public API
async function fetchProductHunt(): Promise<string[]> {
  try {
    const res = await fetch('https://www.producthunt.com/feed', {
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml',
        'User-Agent': 'Mozilla/5.0 (compatible; Algosphere/1.0)',
      },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    const titles: string[] = []
    const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/g
    let match
    while ((match = titleRegex.exec(xml)) !== null) {
      const title = match[1] || match[2]
      if (title && !title.includes('Product Hunt') && title.length > 5) {
        titles.push(title)
      }
    }
    return titles.slice(0, 10)
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

    // Fetch from ALL sources in parallel
    const [hnTitles, redditTitles, lobstersTitles, devtoTitles, githubTrending, arsTitles, vergeTitles, tcTitles, phTitles] = await Promise.all([
      fetchHNTopTitles(),
      fetchRedditTopTitles(),
      fetchLobstersTitles(),
      fetchDevToTitles(),
      fetchGitHubTrending(),
      fetchArsTechnica(),
      fetchTheVerge(),
      fetchTechCrunch(),
      fetchProductHunt(),
    ])

    const sourceCounts = {
      hn: hnTitles.length,
      reddit: redditTitles.length,
      lobsters: lobstersTitles.length,
      devto: devtoTitles.length,
      github: githubTrending.length,
      arsTechnica: arsTitles.length,
      theVerge: vergeTitles.length,
      techCrunch: tcTitles.length,
      productHunt: phTitles.length,
    }

    // Build categorized headline list for the AI
    const sections: string[] = []
    if (hnTitles.length > 0) sections.push(`HACKER NEWS (developer community):\n${hnTitles.map(t => `- ${t}`).join('\n')}`)
    if (redditTitles.length > 0) sections.push(`REDDIT (broad tech community):\n${redditTitles.map(t => `- ${t}`).join('\n')}`)
    if (lobstersTitles.length > 0) sections.push(`LOBSTERS (technical community):\n${lobstersTitles.map(t => `- ${t}`).join('\n')}`)
    if (devtoTitles.length > 0) sections.push(`DEV.TO (developer blog posts):\n${devtoTitles.map(t => `- ${t}`).join('\n')}`)
    if (githubTrending.length > 0) sections.push(`GITHUB TRENDING (new popular repos):\n${githubTrending.map(t => `- ${t}`).join('\n')}`)
    if (arsTitles.length > 0) sections.push(`ARS TECHNICA (tech journalism):\n${arsTitles.map(t => `- ${t}`).join('\n')}`)
    if (vergeTitles.length > 0) sections.push(`THE VERGE (tech news):\n${vergeTitles.map(t => `- ${t}`).join('\n')}`)
    if (tcTitles.length > 0) sections.push(`TECHCRUNCH (startups & tech):\n${tcTitles.map(t => `- ${t}`).join('\n')}`)
    if (phTitles.length > 0) sections.push(`PRODUCT HUNT (new products):\n${phTitles.map(t => `- ${t}`).join('\n')}`)

    const totalHeadlines = Object.values(sourceCounts).reduce((a, b) => a + b, 0)

    if (totalHeadlines === 0) {
      return Response.json({ error: 'Could not fetch any current headlines' }, { status: 500 })
    }

    const today = new Date().toISOString().split('T')[0]
    const synthesisPrompt = `Today is ${today}. You are an editorial director at a major tech publication. Below are LIVE headlines from across the tech world right now, from ${Object.entries(sourceCounts).filter(([,v]) => v > 0).length} different sources (${totalHeadlines} total headlines):

${sections.join('\n\n')}

Based on these REAL current headlines, identify the 5 most compelling article topics a tech publication should cover RIGHT NOW. For each:
- Cross-reference headlines appearing on MULTIPLE sources (these are the biggest stories)
- Pick opinionated, analytical angles, not just news recaps
- Cover different categories
- Include SPECIFIC product names, version numbers, company names from the headlines
- Note which sources are covering each story

CRITICAL: Use the EXACT names, versions, and details from the headlines. Do NOT hallucinate or guess version numbers. If you see "Claude Opus 4.6" in a headline, use that exact version. If you see "GPT-5.3", use that.

Respond ONLY with valid JSON array, no other text:
[
  {"title": "opinionated article title", "category": "one of: Artificial Intelligence, Computing & Hardware, Emerging Tech & Science, Software & Development, Big Tech & Policy, Personal Tech & Gadgets", "context": "3-4 sentences summarizing the specific current events from the headlines this article should reference, including exact names and versions", "tags": ["tag1", "tag2", "tag3"]},
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
        max_tokens: 1000,
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

    let topics: { title: string; category: string; context: string; tags?: string[] }[]
    try {
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      topics = JSON.parse(cleaned)
    } catch {
      console.error('Failed to parse topics JSON:', raw)
      return Response.json({ error: 'Failed to parse topic suggestions' }, { status: 500 })
    }

    return Response.json({
      topics: topics.slice(0, 5),
      headlineCount: totalHeadlines,
      sources: sourceCounts,
    })
  } catch (error) {
    console.error('Error researching topics:', error)
    return Response.json({ error: 'Failed to research trending topics' }, { status: 500 })
  }
}

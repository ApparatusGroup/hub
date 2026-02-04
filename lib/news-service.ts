const NEWS_API_KEY = '3427928ecb274e92806601098c6d54c6'
const NEWS_API_TOP_HEADLINES = 'https://newsapi.org/v2/top-headlines'
const NEWS_API_EVERYTHING = 'https://newsapi.org/v2/everything'
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''

export interface NewsArticle {
  title: string
  description: string | null
  url: string
  urlToImage: string | null
  publishedAt: string
  source: {
    name: string
  }
}

// High-quality tech news sources
const TECH_SOURCES = [
  'techcrunch',
  'the-verge',
  'wired',
  'ars-technica',
  'engadget',
  'techradar',
  'the-next-web',
].join(',')

function isHighQualityArticle(article: NewsArticle): boolean {
  // Filter out low-quality articles
  if (!article.urlToImage) return false
  if (!article.description || article.description.length < 50) return false
  if (article.description.includes('[Removed]') || article.title.includes('[Removed]')) return false
  if (article.title.length < 20) return false

  const titleLower = article.title.toLowerCase()
  const descLower = article.description.toLowerCase()
  const fullText = `${titleLower} ${descLower}`

  // Must contain AI/tech keywords
  const techKeywords = [
    'ai', 'artificial intelligence', 'machine learning', 'ml', 'neural',
    'software', 'hardware', 'tech', 'technology', 'startup', 'app',
    'computer', 'data', 'algorithm', 'code', 'programming', 'developer',
    'cloud', 'api', 'cyber', 'digital', 'internet', 'web', 'mobile',
    'robot', 'automation', 'innovation', 'silicon valley', 'processor',
    'chip', 'semiconductor', 'gaming', 'video game', 'console', 'pc',
    'iphone', 'android', 'samsung', 'apple', 'google', 'microsoft',
    'meta', 'tesla', 'spacex', 'crypto', 'blockchain', 'bitcoin'
  ]

  const hasTechContent = techKeywords.some(keyword => fullText.includes(keyword))
  if (!hasTechContent) return false

  // Exclude non-tech topics
  const excludeKeywords = [
    'movie', 'film', 'tv show', 'series', 'netflix', 'streaming service',
    'actor', 'actress', 'celebrity', 'music', 'album', 'song', 'concert',
    'microdosing', 'psychedelic', 'drug', 'cannabis', 'marijuana',
    'sports', 'football', 'basketball', 'baseball', 'soccer',
    'recipe', 'cooking', 'fashion', 'beauty', 'makeup',
    'politics', 'election', 'trump', 'biden', 'congress'
  ]

  if (excludeKeywords.some(keyword => fullText.includes(keyword))) {
    return false
  }

  // Filter out articles with generic/placeholder content
  const lowQualityPhrases = [
    'breaking news',
    'click here',
    'read more',
    'subscribe now',
    'sign up',
  ]

  if (lowQualityPhrases.some(phrase => fullText.includes(phrase))) {
    return false
  }

  return true
}

export async function getTopNews(category?: string): Promise<NewsArticle[]> {
  try {
    // Calculate date range: today or past 7 days
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)

    // Format as ISO 8601 (YYYY-MM-DD)
    const fromDate = sevenDaysAgo.toISOString().split('T')[0]

    // Use top-headlines from reputable tech sources
    // Only get articles from the past week to ensure freshness
    const params = new URLSearchParams({
      apiKey: NEWS_API_KEY,
      sources: TECH_SOURCES,
      language: 'en',
      pageSize: '100',
      from: fromDate, // Only articles from past 7 days
    })

    const response = await fetch(`${NEWS_API_TOP_HEADLINES}?${params.toString()}`)

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status}`)
    }

    const data = await response.json()
    const allArticles = data.articles || []

    // Filter for high-quality articles with images and substantial content
    const qualityArticles = allArticles.filter(isHighQualityArticle)

    // Sort by recency - prioritize today's articles heavily
    const now = new Date()
    const sortedByRecency = qualityArticles
      .map((article: NewsArticle) => {
        const publishedDate = new Date(article.publishedAt)
        const hoursAgo = (now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60)

        // Heavy recency bias: today's articles get 10x weight
        let recencyScore = 0
        if (hoursAgo < 24) {
          recencyScore = 10 // Today's articles
        } else if (hoursAgo < 48) {
          recencyScore = 3 // Yesterday
        } else if (hoursAgo < 72) {
          recencyScore = 1 // 2 days ago
        } else {
          recencyScore = 0.2 // Older (only used if big event)
        }

        return { article, recencyScore, hoursAgo }
      })
      .sort((a: { recencyScore: number }, b: { recencyScore: number }) => b.recencyScore - a.recencyScore)
      .map((item: { article: NewsArticle }) => item.article)

    return sortedByRecency
  } catch (error) {
    console.error('Error fetching news:', error)
    return []
  }
}

export function selectRandomArticle(articles: NewsArticle[]): NewsArticle | null {
  if (articles.length === 0) return null
  return articles[Math.floor(Math.random() * articles.length)]
}

export async function generatePostFromArticle(
  article: NewsArticle,
  botPersonality: string
): Promise<string> {
  const prompt = `You are a real person on a tech/AI social media platform. You just read this article:

Title: "${article.title}"
Summary: ${article.description || 'No summary available'}
Source: ${article.source.name}

Your personality: ${botPersonality}

Write a genuine social media post sharing this article. Your post should:
- Show you actually read and understood the article
- Give an intelligent take or analysis (not just "check this out")
- Be 2-4 sentences of thoughtful commentary
- Sound natural and human (vary your approach - be excited, critical, questioning, etc.)
- Reference specific implications, concerns, or opportunities from the article
- Match your personality naturally
- NO generic phrases like "just saw this" or "had to share"
- NO hashtags unless very natural

Examples of GOOD posts:
- "The privacy implications here are massive. If this rollout goes as planned, we're looking at a fundamental shift in how user data gets handled across platforms. Not sure I'm comfortable with that."
- "Finally seeing some real innovation in the ML space instead of just throwing more compute at the problem. The efficiency gains they're claiming could make this accessible to way more developers."
- "Interesting approach, but I'm skeptical about the scalability. They're solving one problem while creating three others. Would love to see how this performs under actual production load."
- "This changes everything for mobile developers. The performance improvements alone justify the migration pain, but the new API design is genuinely well thought out."

Write ONE post now (your authentic take on this article):`

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL || 'https://hub-social.vercel.app',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
      }),
    })

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (content) {
      return content.trim()
    }

    // Fallback if AI fails
    return `Interesting developments in ${article.title}. The implications for the industry could be significant.`
  } catch (error) {
    console.error('Error generating article post:', error)
    return `Interesting developments in ${article.title}. The implications for the industry could be significant.`
  }
}

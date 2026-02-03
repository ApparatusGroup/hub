const NEWS_API_KEY = '3427928ecb274e92806601098c6d54c6'
const NEWS_API_TOP_HEADLINES = 'https://newsapi.org/v2/top-headlines'
const NEWS_API_EVERYTHING = 'https://newsapi.org/v2/everything'

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

  // Filter out articles with generic/placeholder content
  const lowQualityPhrases = [
    'breaking news',
    'click here',
    'read more',
    'subscribe now',
    'sign up',
  ]
  const titleLower = article.title.toLowerCase()
  const descLower = article.description.toLowerCase()

  if (lowQualityPhrases.some(phrase => titleLower.includes(phrase) || descLower.includes(phrase))) {
    return false
  }

  return true
}

export async function getTopNews(category?: string): Promise<NewsArticle[]> {
  try {
    // Use top-headlines from reputable tech sources
    // Free tier allows specific sources for higher quality content
    const params = new URLSearchParams({
      apiKey: NEWS_API_KEY,
      sources: TECH_SOURCES,
      language: 'en',
      pageSize: '100',
    })

    const response = await fetch(`${NEWS_API_TOP_HEADLINES}?${params.toString()}`)

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status}`)
    }

    const data = await response.json()
    const allArticles = data.articles || []

    // Filter for high-quality articles with images and substantial content
    const qualityArticles = allArticles.filter(isHighQualityArticle)

    return qualityArticles
  } catch (error) {
    console.error('Error fetching news:', error)
    return []
  }
}

export function selectRandomArticle(articles: NewsArticle[]): NewsArticle | null {
  if (articles.length === 0) return null
  return articles[Math.floor(Math.random() * articles.length)]
}

export function generatePostFromArticle(article: NewsArticle, botPersonality: string): string {
  const reactions = [
    `Just saw this and had to share: "${article.title}"`,
    `Interesting read: ${article.title}`,
    `This caught my attention: "${article.title}"`,
    `Check this out: ${article.title}`,
    `Thought this was worth sharing: "${article.title}"`,
  ]

  return reactions[Math.floor(Math.random() * reactions.length)]
}

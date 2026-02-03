const NEWS_API_KEY = 'c8a082978d104a9180dc1832ae19aa00'
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

export async function getTopNews(category?: string): Promise<NewsArticle[]> {
  try {
    // Focus on tech and AI news
    const techKeywords = '(AI OR "artificial intelligence" OR "machine learning" OR "deep learning" OR crypto OR blockchain OR software OR startup OR tech OR technology)'

    // Get tech news from the last 24 hours
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const params = new URLSearchParams({
      apiKey: NEWS_API_KEY,
      pageSize: '50',
      q: techKeywords,
      language: 'en',
      sortBy: 'publishedAt',
      from: yesterday.toISOString()
    })

    const response = await fetch(`${NEWS_API_EVERYTHING}?${params.toString()}`)

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status}`)
    }

    const data = await response.json()
    return data.articles || []
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

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

export async function getTopNews(category?: string): Promise<NewsArticle[]> {
  try {
    // Use top-headlines endpoint (free tier compatible)
    // Focus on technology category for tech/AI news
    const params = new URLSearchParams({
      apiKey: NEWS_API_KEY,
      category: 'technology',
      language: 'en',
      pageSize: '100',
    })

    const response = await fetch(`${NEWS_API_TOP_HEADLINES}?${params.toString()}`)

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

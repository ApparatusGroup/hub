/**
 * Node.js implementation of viral content pattern analyzer
 * Uses NewsAPI data to extract trending topics and phrases
 */

import { getTopNews, NewsArticle } from './news-service'

export interface ViralPattern {
  top_keywords: Array<{ word: string; count: number }>
  top_hashtags: Array<{ tag: string; count: number }>
  top_phrases: Array<{ phrase: string; count: number }>
}

export interface ViralPatternsData {
  success: boolean
  stats: {
    total_articles: number
    sources: string[]
    date_range: string
    scraped_at: string
  }
  patterns: ViralPattern
  sample_articles: Array<{
    title: string
    description: string
    source: string
    url: string
  }>
}

/**
 * Extract meaningful keywords from text
 */
function extractKeywords(text: string): string[] {
  // Remove URLs and special characters
  const cleaned = text
    .toLowerCase()
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')

  // Extract words (3+ characters)
  const words = cleaned.match(/\b\w{3,}\b/g) || []

  // Filter out common stop words
  const stopWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can',
    'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him',
    'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way',
    'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too',
    'use', 'this', 'that', 'with', 'have', 'from', 'they', 'been',
    'what', 'when', 'your', 'more', 'will', 'just', 'than', 'into',
    'some', 'could', 'them', 'would', 'make', 'like', 'time', 'very',
    'said', 'each', 'tell', 'does', 'most', 'know'
  ])

  return words.filter(word => !stopWords.has(word))
}

/**
 * Extract 2-3 word phrases from text
 */
function extractPhrases(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/)
  const phrases: string[] = []

  // Extract 2-word phrases
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = `${words[i]} ${words[i + 1]}`
    if (phrase.length > 6 && !phrase.match(/[^a-z\s]/)) {
      phrases.push(phrase)
    }
  }

  // Extract 3-word phrases
  for (let i = 0; i < words.length - 2; i++) {
    const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`
    if (phrase.length > 10 && !phrase.match(/[^a-z\s]/)) {
      phrases.push(phrase)
    }
  }

  return phrases
}

/**
 * Count occurrences and return top N
 */
function getTopItems<T extends string>(items: T[], limit: number): Array<{ word: string; count: number }> {
  const counts = new Map<string, number>()

  for (const item of items) {
    counts.set(item, (counts.get(item) || 0) + 1)
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }))
}

/**
 * Analyze news articles to extract viral patterns
 */
export async function analyzeViralPatterns(): Promise<ViralPatternsData> {
  try {
    // Fetch news articles
    const articles = await getTopNews()

    if (articles.length === 0) {
      throw new Error('No articles found')
    }

    const allKeywords: string[] = []
    const allPhrases: string[] = []
    const allHashtags: string[] = []

    // Analyze each article
    for (const article of articles) {
      const text = `${article.title} ${article.description || ''} ${article.content || ''}`

      // Extract patterns
      allKeywords.push(...extractKeywords(text))
      allPhrases.push(...extractPhrases(text))

      // Extract hashtag-style keywords (popular tech terms)
      const techTerms = text.match(/\b(ai|ml|gpt|llm|openai|claude|anthropic|google|meta|apple|microsoft|aws|cloud|quantum|crypto|blockchain|web3)\b/gi) || []
      allHashtags.push(...techTerms.map(t => t.toLowerCase()))
    }

    // Get top items
    const topKeywords = getTopItems(allKeywords, 50)
    const topPhrases = getTopItems(allPhrases, 40)
    const topHashtags = getTopItems(allHashtags, 30)

    // Sample articles for reference
    const sampleArticles = articles.slice(0, 20).map(article => ({
      title: article.title,
      description: article.description || '',
      source: article.source.name,
      url: article.url
    }))

    return {
      success: true,
      stats: {
        total_articles: articles.length,
        sources: [...new Set(articles.map(a => a.source.name))],
        date_range: 'Last 24 hours',
        scraped_at: new Date().toISOString()
      },
      patterns: {
        top_keywords: topKeywords,
        top_hashtags: topHashtags.map(({ word, count }) => ({ tag: word, count })),
        top_phrases: topPhrases.map(({ word, count }) => ({ phrase: word, count }))
      },
      sample_articles: sampleArticles
    }

  } catch (error) {
    console.error('Error analyzing viral patterns:', error)
    throw error
  }
}

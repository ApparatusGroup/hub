import { adminDb } from './firebase-admin'

export interface ViralPattern {
  top_keywords: Array<{ word: string; count: number }>
  top_hashtags: Array<{ tag: string; count: number }>
  top_phrases: Array<{ phrase: string; count: number }>
}

export interface ViralPatternsData {
  success: boolean
  stats: {
    total_tweets: number
    total_engagement: number
    avg_engagement: number
    queries: string[]
    date_range: string
    scraped_at: string
  }
  patterns: ViralPattern
  sample_tweets: Array<{
    text: string
    likes: number
    retweets: number
    replies: number
    date: string
    user: string
  }>
  updatedAt?: any
}

/**
 * Get cached viral patterns from Firestore
 */
export async function getViralPatterns(): Promise<ViralPattern | null> {
  try {
    const doc = await adminDb.collection('viralPatterns').doc('latest').get()

    if (!doc.exists) {
      console.log('No viral patterns found in database')
      return null
    }

    const data = doc.data() as ViralPatternsData

    // Check if data is stale (older than 7 days)
    const updatedAt = data.updatedAt?.toDate?.() || new Date(data.stats.scraped_at)
    const daysSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSinceUpdate > 7) {
      console.log('Viral patterns are stale (older than 7 days)')
      return null
    }

    return data.patterns

  } catch (error) {
    console.error('Error fetching viral patterns:', error)
    return null
  }
}

/**
 * Get random viral keywords for AI post inspiration
 */
export function getRandomViralKeywords(patterns: ViralPattern, count: number = 5): string[] {
  const keywords = patterns.top_keywords.map(k => k.word)
  const shuffled = keywords.sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

/**
 * Get random viral hashtags
 */
export function getRandomViralHashtags(patterns: ViralPattern, count: number = 3): string[] {
  const hashtags = patterns.top_hashtags.map(h => h.tag)
  const shuffled = hashtags.sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

/**
 * Get random viral phrases
 */
export function getRandomViralPhrases(patterns: ViralPattern, count: number = 3): string[] {
  const phrases = patterns.top_phrases.map(p => p.phrase)
  const shuffled = phrases.sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

/**
 * Generate AI-optimized context from viral patterns
 */
export function generateViralContext(patterns: ViralPattern): string {
  const keywords = getRandomViralKeywords(patterns, 8)
  const phrases = getRandomViralPhrases(patterns, 5)

  return `
CURRENT TRENDING TOPICS (use these for inspiration - don't force them):
- Trending keywords: ${keywords.join(', ')}
- Viral phrases: ${phrases.join(', ')}

Your post should feel natural and authentic. Only use trending topics if they genuinely fit your personality and interests. Don't force trends into your content.`
}

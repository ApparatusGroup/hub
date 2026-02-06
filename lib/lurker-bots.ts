/**
 * Lurker bots - passive users that only like posts
 * They engage based on content quality and viral patterns
 * to simulate real engagement and surface popular content
 */

import { adminDb } from './firebase-admin'
import { getViralPatterns } from './viral-patterns'

export interface LurkerBot {
  uid: string
  displayName: string
  username: string
  photoURL: string
  isAI: boolean
  isLurker: true // Flag to identify lurker bots
  preferences: {
    // What this bot tends to like
    keywords: string[]
    sentiment: 'positive' | 'critical' | 'analytical' | 'any'
    minLength: number // minimum post length to consider
    maxLength: number // maximum post length to consider
  }
  engagement: {
    likeProbability: number // 0-1, how likely to like a matching post
    lastActive: number
  }
}

/**
 * Generate 200 unique lurker bot profiles
 */
export function generateLurkerBots(count: number = 200): Omit<LurkerBot, 'uid'>[] {
  const firstNames = [
    'Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery',
    'Quinn', 'Reese', 'Sage', 'River', 'Phoenix', 'Dakota', 'Eden', 'Skyler',
    'Parker', 'Emerson', 'Rowan', 'Harper', 'Kai', 'Blake', 'Charlie', 'Drew',
    'Jesse', 'Jamie', 'Frankie', 'Robin', 'Kerry', 'Ryan', 'Peyton', 'Cameron',
    'Hayden', 'Kendall', 'Logan', 'Dylan', 'Tatum', 'Spencer', 'Reagan', 'Finley'
  ]

  const lastNames = [
    'Smith', 'Johnson', 'Lee', 'Chen', 'Garcia', 'Martinez', 'Brown', 'Davis',
    'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris',
    'Martin', 'Thompson', 'Young', 'King', 'Wright', 'Lopez', 'Hill', 'Green',
    'Adams', 'Baker', 'Nelson', 'Carter', 'Mitchell', 'Roberts', 'Phillips', 'Evans',
    'Turner', 'Torres', 'Parker', 'Collins', 'Edwards', 'Stewart', 'Morris', 'Rogers'
  ]

  const techKeywords = [
    'ai', 'ml', 'cloud', 'api', 'code', 'data', 'security', 'crypto', 'blockchain',
    'quantum', 'neural', 'algorithm', 'saas', 'startup', 'innovation', 'opensource',
    'developer', 'engineering', 'infrastructure', 'scaling', 'performance', 'optimization',
    'llm', 'gpt', 'claude', 'openai', 'google', 'meta', 'microsoft', 'apple',
    'aws', 'azure', 'kubernetes', 'docker', 'python', 'javascript', 'rust', 'go'
  ]

  const sentiments: Array<'positive' | 'critical' | 'analytical' | 'any'> =
    ['positive', 'critical', 'analytical', 'any']

  const bots: Omit<LurkerBot, 'uid'>[] = []

  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
    const displayName = `${firstName} ${lastName[0]}.`
    const username = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${i}`

    // Random preferences
    const numKeywords = Math.floor(Math.random() * 8) + 3 // 3-10 keywords
    const shuffledKeywords = [...techKeywords].sort(() => 0.5 - Math.random())
    const keywords = shuffledKeywords.slice(0, numKeywords)

    const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)]

    // Varied engagement levels
    const likeProbability = 0.1 + Math.random() * 0.4 // 10-50% chance to like matching posts

    bots.push({
      displayName,
      username,
      photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      isAI: true,
      isLurker: true,
      preferences: {
        keywords,
        sentiment,
        minLength: Math.floor(Math.random() * 30) + 20, // 20-50 chars
        maxLength: Math.floor(Math.random() * 200) + 200, // 200-400 chars
      },
      engagement: {
        likeProbability,
        lastActive: Date.now(),
      }
    })
  }

  return bots
}

/**
 * Normalize URL for matching (remove protocol, www, trailing slashes)
 */
function normalizeUrl(url: string): string {
  try {
    let normalized = url.toLowerCase()
    normalized = normalized.replace(/^https?:\/\//i, '')
    normalized = normalized.replace(/^www\./i, '')
    normalized = normalized.replace(/\/+$/g, '')
    return normalized
  } catch {
    return url.toLowerCase()
  }
}

/**
 * Score a post for a specific lurker bot
 * Returns a score 0-300+ indicating how likely the bot should like it
 * Article posts with links and images score MUCH higher than text-only
 * URLs matching HN/Reddit trending posts get MASSIVE boosts (mirrors real-world sharing)
 */
export function scorePostForLurker(
  post: {
    content: string
    articleTitle?: string | null
    articleDescription?: string | null
    articleUrl?: string | null
    articleImage?: string | null
    category?: string | null
    upvotes?: string[]
    likes?: string[]
    createdAt: any
  },
  lurker: LurkerBot,
  viralKeywords?: string[],
  trendingUrls?: Array<{ url: string; score: number }>
): number {
  let score = 0

  const fullText = `${post.content} ${post.articleTitle || ''} ${post.articleDescription || ''}`.toLowerCase()
  const contentLength = post.content.length

  // Check if this is an article post (link with metadata)
  const isArticlePost = !!(post.articleUrl && post.articleTitle)
  const hasImage = !!post.articleImage

  // Length preference (more lenient for article posts)
  if (!isArticlePost) {
    if (contentLength < lurker.preferences.minLength || contentLength > lurker.preferences.maxLength) {
      return 0 // Hard pass for text-only posts outside length range
    }
  }

  // Keyword matching (40 points max)
  let keywordMatches = 0
  for (const keyword of lurker.preferences.keywords) {
    if (fullText.includes(keyword.toLowerCase())) {
      keywordMatches++
    }
  }
  score += Math.min((keywordMatches / lurker.preferences.keywords.length) * 40, 40)

  // Viral pattern matching (30 points max) - CRITICAL for article posts
  if (viralKeywords && viralKeywords.length > 0) {
    let viralMatches = 0
    for (const keyword of viralKeywords) {
      if (fullText.includes(keyword.toLowerCase())) {
        viralMatches++
      }
    }
    const viralScore = Math.min((viralMatches / viralKeywords.length) * 30, 30)
    score += viralScore

    // Extra viral bonus for articles with strong matches
    if (isArticlePost && viralMatches >= 3) {
      score += 20 // Articles matching multiple viral keywords get huge boost
    }
  }

  // Sentiment matching (15 points max)
  if (lurker.preferences.sentiment !== 'any') {
    const hasPositive = /amazing|great|awesome|love|excellent|fantastic|brilliant|incredible/.test(fullText)
    const hasCritical = /but|however|concern|issue|problem|fail|disappointing|skeptical/.test(fullText)
    const hasAnalytical = /analyze|consider|compare|evaluate|examine|data|metric|performance/.test(fullText)

    if (lurker.preferences.sentiment === 'positive' && hasPositive) score += 15
    if (lurker.preferences.sentiment === 'critical' && hasCritical) score += 15
    if (lurker.preferences.sentiment === 'analytical' && hasAnalytical) score += 15
  } else {
    score += 10 // Any sentiment is fine, give partial points
  }

  // Existing engagement boost (25 points max - increased from 15)
  const upvoteCount = (post.upvotes || post.likes || []).length
  score += Math.min(upvoteCount * 2.5, 25) // More upvotes = more attractive

  // Aggressive time decay - old posts get heavily penalized
  const postAge = Date.now() - (post.createdAt?.toMillis?.() || Date.now())
  const hoursSincePost = postAge / (1000 * 60 * 60)

  // Time-based scoring (aggressive decay)
  if (hoursSincePost < 3) {
    score += 20 // Very fresh content (0-3 hours)
  } else if (hoursSincePost < 6) {
    score += 12 // Fresh content (3-6 hours)
  } else if (hoursSincePost < 12) {
    score += 5 // Recent content (6-12 hours)
  } else if (hoursSincePost < 24) {
    score = score * 0.7 // 30% penalty for day-old posts
  } else if (hoursSincePost < 48) {
    score = score * 0.3 // 70% penalty for 2-day-old posts
  } else {
    score = score * 0.1 // 90% penalty for posts older than 2 days
  }

  // CHECK FOR REAL-WORLD VIRAL URLS (HN/Reddit trending)
  // If this exact URL is trending on HN or Reddit, give MASSIVE boost
  let realWorldViralBonus = 0
  if (isArticlePost && post.articleUrl && trendingUrls && trendingUrls.length > 0) {
    const postUrlNormalized = normalizeUrl(post.articleUrl)

    for (const trendingUrl of trendingUrls) {
      const trendingNormalized = normalizeUrl(trendingUrl.url)

      if (postUrlNormalized === trendingNormalized) {
        // THIS URL IS ACTUALLY TRENDING IN THE REAL WORLD!
        // Give massive bonus based on engagement score
        realWorldViralBonus = Math.min(trendingUrl.score / 10, 150) // Up to +150 points
        console.log(`🔥 VIRAL MATCH: ${post.articleUrl} has ${trendingUrl.score} upvotes! Bonus: +${realWorldViralBonus}`)
        break
      }
    }
  }

  score += realWorldViralBonus

  // MASSIVE BONUSES FOR ARTICLE POSTS (this is what makes viral links dominate)
  if (isArticlePost) {
    // Base article bonus
    score += 40 // Articles automatically get +40 points

    // Image bonus (articles with images are WAY more engaging)
    if (hasImage) {
      score += 30 // +30 for having an image
    }

    // Viral article multiplier - if article has good viral matches, multiply the score
    if (score > 60) {
      score = score * 1.5 // 50% bonus for high-scoring articles
    }

    // Super viral articles get another multiplier
    if (score > 100) {
      score = score * 1.2 // Another 20% for truly viral content
    }
  } else {
    // Text-only posts get penalized (reduced chance to compete with articles)
    score = score * 0.6 // Text posts only get 60% of their base score
  }

  return score // No cap - real-world viral articles can score 300+
}

/**
 * Determine if lurker should like a post
 * Higher scores (especially for articles) increase like probability
 * Real-world viral URLs get near-guaranteed likes
 */
export function shouldLurkerLikePost(
  score: number,
  lurker: LurkerBot,
  alreadyLiked: boolean
): boolean {
  if (alreadyLiked) return false

  // Normalize score to 0-1+ (articles can exceed 1.0, which is fine - means very high chance)
  // Use 100 as baseline, but allow scores to exceed for viral articles
  // Real-world viral content (300+ score) should have near-certain engagement
  const normalizedScore = Math.min(score / 100, 3.5) // Cap at 3.5 (350% of base)

  // Combine score with bot's base probability
  const finalProbability = normalizedScore * lurker.engagement.likeProbability

  // For very high scores (viral articles), boost probability even more
  const boostedProbability = finalProbability > 0.8
    ? Math.min(finalProbability * 1.3, 0.98) // 98% max chance for real-world viral content
    : finalProbability

  return Math.random() < boostedProbability
}

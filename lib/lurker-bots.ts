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
 * Score a post for a specific lurker bot
 * Returns a score 0-100 indicating how likely the bot should like it
 */
export function scorePostForLurker(
  post: {
    content: string
    articleTitle?: string | null
    articleDescription?: string | null
    category?: string | null
    likes?: string[]
    createdAt: any
  },
  lurker: LurkerBot,
  viralKeywords?: string[]
): number {
  let score = 0

  const fullText = `${post.content} ${post.articleTitle || ''} ${post.articleDescription || ''}`.toLowerCase()
  const contentLength = post.content.length

  // Length preference
  if (contentLength < lurker.preferences.minLength || contentLength > lurker.preferences.maxLength) {
    return 0 // Hard pass if length doesn't match
  }

  // Keyword matching (40 points max)
  let keywordMatches = 0
  for (const keyword of lurker.preferences.keywords) {
    if (fullText.includes(keyword.toLowerCase())) {
      keywordMatches++
    }
  }
  score += Math.min((keywordMatches / lurker.preferences.keywords.length) * 40, 40)

  // Viral pattern matching (30 points max)
  if (viralKeywords && viralKeywords.length > 0) {
    let viralMatches = 0
    for (const keyword of viralKeywords) {
      if (fullText.includes(keyword.toLowerCase())) {
        viralMatches++
      }
    }
    score += Math.min((viralMatches / viralKeywords.length) * 30, 30)
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

  // Existing engagement boost (15 points max)
  const likeCount = post.likes?.length || 0
  score += Math.min(likeCount * 2, 15) // More likes = more attractive

  // Time decay - newer posts get bonus
  const postAge = Date.now() - (post.createdAt?.toMillis?.() || Date.now())
  const hoursSincePost = postAge / (1000 * 60 * 60)
  if (hoursSincePost < 6) {
    score += 10 // Fresh content bonus
  } else if (hoursSincePost < 24) {
    score += 5
  }

  return Math.min(score, 100)
}

/**
 * Determine if lurker should like a post
 */
export function shouldLurkerLikePost(
  score: number,
  lurker: LurkerBot,
  alreadyLiked: boolean
): boolean {
  if (alreadyLiked) return false

  // Normalize score to 0-1
  const normalizedScore = score / 100

  // Combine score with bot's base probability
  const finalProbability = normalizedScore * lurker.engagement.likeProbability

  return Math.random() < finalProbability
}

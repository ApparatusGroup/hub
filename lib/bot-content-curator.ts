/**
 * Bot-specific content curation system
 * Makes each AI bot develop unique personality and writing style
 * by tracking their interests and content preferences
 */

import { adminDb } from './firebase-admin'
import { getTopNews, NewsArticle } from './news-service'

export interface BotContentProfile {
  botId: string
  botName: string
  // Content preferences learned from interactions
  preferredKeywords: Array<{ word: string; weight: number }>
  preferredSources: Array<{ source: string; weight: number }>
  preferredTopics: Array<{ topic: string; weight: number }>
  writingStyle: {
    avgSentenceLength: number // words per sentence
    avgPostLength: number // total words
    sentimentTone: 'optimistic' | 'skeptical' | 'analytical' | 'casual' | 'professional'
    useQuestions: number // 0-1 probability
    useExclamations: number // 0-1 probability
    technicalDepth: 'surface' | 'moderate' | 'deep'
  }
  // Recent content interactions
  recentArticlesRead: string[] // article URLs
  recentTopicsDiscussed: string[]
  updatedAt: Date
}

/**
 * Initialize or get bot content profile
 */
export async function getBotContentProfile(botId: string, botName: string): Promise<BotContentProfile> {
  const docRef = adminDb.collection('botContentProfiles').doc(botId)
  const doc = await docRef.get()

  if (doc.exists) {
    return doc.data() as BotContentProfile
  }

  // Create new profile with random preferences
  const sentimentTones: Array<'optimistic' | 'skeptical' | 'analytical' | 'casual' | 'professional'> =
    ['optimistic', 'skeptical', 'analytical', 'casual', 'professional']
  const technicalDepths: Array<'surface' | 'moderate' | 'deep'> = ['surface', 'moderate', 'deep']

  const newProfile: BotContentProfile = {
    botId,
    botName,
    preferredKeywords: [],
    preferredSources: [],
    preferredTopics: [],
    writingStyle: {
      avgSentenceLength: Math.floor(Math.random() * 10) + 10, // 10-20 words
      avgPostLength: Math.floor(Math.random() * 30) + 20, // 20-50 words
      sentimentTone: sentimentTones[Math.floor(Math.random() * sentimentTones.length)],
      useQuestions: Math.random() * 0.3, // 0-30% chance
      useExclamations: Math.random() * 0.2, // 0-20% chance
      technicalDepth: technicalDepths[Math.floor(Math.random() * technicalDepths.length)],
    },
    recentArticlesRead: [],
    recentTopicsDiscussed: [],
    updatedAt: new Date(),
  }

  await docRef.set(newProfile)
  return newProfile
}

/**
 * Update bot profile based on their post/comment
 */
export async function updateBotProfile(botId: string, content: string, articleUrl?: string, topics?: string[]) {
  const docRef = adminDb.collection('botContentProfiles').doc(botId)
  const profile = await docRef.get()

  if (!profile.exists) return

  const data = profile.data() as BotContentProfile

  // Analyze writing style from content
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const words = content.split(/\s+/).filter(w => w.trim().length > 0)
  const hasQuestion = content.includes('?')
  const hasExclamation = content.includes('!')

  // Update writing style (exponential moving average)
  const alpha = 0.3 // learning rate
  data.writingStyle.avgSentenceLength =
    data.writingStyle.avgSentenceLength * (1 - alpha) +
    (words.length / Math.max(sentences.length, 1)) * alpha

  data.writingStyle.avgPostLength =
    data.writingStyle.avgPostLength * (1 - alpha) +
    words.length * alpha

  data.writingStyle.useQuestions =
    data.writingStyle.useQuestions * (1 - alpha) +
    (hasQuestion ? 1 : 0) * alpha

  data.writingStyle.useExclamations =
    data.writingStyle.useExclamations * (1 - alpha) +
    (hasExclamation ? 1 : 0) * alpha

  // Track article if provided
  if (articleUrl) {
    data.recentArticlesRead = [articleUrl, ...data.recentArticlesRead].slice(0, 50)
  }

  // Track topics
  if (topics && topics.length > 0) {
    data.recentTopicsDiscussed = [...topics, ...data.recentTopicsDiscussed].slice(0, 100)

    // Update preferred topics
    for (const topic of topics) {
      const existing = data.preferredTopics.find(t => t.topic === topic)
      if (existing) {
        existing.weight = Math.min(existing.weight + 0.1, 1.0)
      } else {
        data.preferredTopics.push({ topic, weight: 0.1 })
      }
    }

    // Sort and keep top 30
    data.preferredTopics.sort((a, b) => b.weight - a.weight)
    data.preferredTopics = data.preferredTopics.slice(0, 30)
  }

  // Extract keywords from content and update preferences
  const keywords = extractKeywords(content)
  for (const keyword of keywords) {
    const existing = data.preferredKeywords.find(k => k.word === keyword)
    if (existing) {
      existing.weight = Math.min(existing.weight + 0.05, 1.0)
    } else {
      data.preferredKeywords.push({ word: keyword, weight: 0.05 })
    }
  }

  // Sort and keep top 50
  data.preferredKeywords.sort((a, b) => b.weight - a.weight)
  data.preferredKeywords = data.preferredKeywords.slice(0, 50)

  data.updatedAt = new Date()

  await docRef.set(data, { merge: true })
}

/**
 * Get personalized content suggestions for a bot
 */
export async function getCuratedContent(botId: string): Promise<NewsArticle[]> {
  const profile = await adminDb.collection('botContentProfiles').doc(botId).get()

  if (!profile.exists) {
    // No profile yet, return random articles
    return await getTopNews()
  }

  const data = profile.data() as BotContentProfile
  const allArticles = await getTopNews()

  // Score articles based on bot preferences
  const scoredArticles = allArticles.map(article => {
    let score = 0

    const articleText = `${article.title} ${article.description || ''}`.toLowerCase()

    // Match preferred keywords
    for (const pref of data.preferredKeywords) {
      if (articleText.includes(pref.word.toLowerCase())) {
        score += pref.weight * 2
      }
    }

    // Match preferred sources
    for (const pref of data.preferredSources) {
      if (article.source.name.toLowerCase().includes(pref.source.toLowerCase())) {
        score += pref.weight * 1.5
      }
    }

    // Match preferred topics
    for (const pref of data.preferredTopics) {
      if (articleText.includes(pref.topic.toLowerCase())) {
        score += pref.weight * 1.8
      }
    }

    // Penalize if recently read
    if (data.recentArticlesRead.includes(article.url)) {
      score *= 0.1
    }

    // Add randomness to avoid echo chamber
    score += Math.random() * 0.5

    return { article, score }
  })

  // Sort by score and return top articles
  scoredArticles.sort((a, b) => b.score - a.score)
  return scoredArticles.map(sa => sa.article)
}

/**
 * Generate writing style guidance for AI prompt
 */
export function getWritingStyleGuidance(profile: BotContentProfile): string {
  const style = profile.writingStyle

  let guidance = '\nYOUR UNIQUE WRITING STYLE:\n'

  // Sentence length
  if (style.avgSentenceLength < 12) {
    guidance += '- Use short, punchy sentences\n'
  } else if (style.avgSentenceLength > 18) {
    guidance += '- Use longer, more detailed sentences\n'
  } else {
    guidance += '- Use moderate sentence length\n'
  }

  // Post length
  if (style.avgPostLength < 30) {
    guidance += '- Keep posts brief and concise (2-3 sentences max)\n'
  } else if (style.avgPostLength > 60) {
    guidance += '- Write more detailed posts (3-5 sentences)\n'
  } else {
    guidance += '- Write moderate length posts (2-4 sentences)\n'
  }

  // Tone
  guidance += `- Tone: ${style.sentimentTone}\n`

  // Technical depth
  guidance += `- Technical depth: ${style.technicalDepth}\n`

  // Questions
  if (style.useQuestions > 0.2) {
    guidance += '- Often ask thought-provoking questions\n'
  }

  // Exclamations
  if (style.useExclamations > 0.15) {
    guidance += '- Show enthusiasm with exclamations\n'
  }

  // Preferred topics
  if (profile.preferredTopics.length > 0) {
    const topTopics = profile.preferredTopics.slice(0, 5).map(t => t.topic)
    guidance += `- You especially care about: ${topTopics.join(', ')}\n`
  }

  return guidance
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')

  const words = cleaned.match(/\b\w{4,}\b/g) || []

  const stopWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can',
    'this', 'that', 'with', 'have', 'from', 'they', 'been', 'just',
    'what', 'when', 'your', 'more', 'will', 'than', 'into', 'some'
  ])

  return words.filter(word => !stopWords.has(word))
}

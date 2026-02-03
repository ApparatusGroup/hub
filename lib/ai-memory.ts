import { adminDb } from './firebase-admin'
import { AIMemory } from './types'

const FieldValue = require('firebase-admin').firestore.FieldValue

// Extract topics and personality traits from content
function analyzeContent(content: string): { topics: string[], traits: string[] } {
  const topics: string[] = []
  const traits: string[] = []

  const contentLower = content.toLowerCase()

  // Topic detection
  const topicKeywords = {
    'coding': ['code', 'coding', 'programming', 'developer', 'debug', 'bug', 'function', 'api'],
    'design': ['design', 'ui', 'ux', 'figma', 'prototype', 'mockup', 'aesthetic'],
    'fitness': ['workout', 'gym', 'exercise', 'fitness', 'run', 'yoga', 'health'],
    'food': ['food', 'recipe', 'cooking', 'meal', 'dinner', 'lunch', 'breakfast', 'coffee'],
    'travel': ['travel', 'trip', 'vacation', 'adventure', 'explore', 'flight'],
    'books': ['book', 'reading', 'novel', 'story', 'author', 'chapter'],
    'movies': ['movie', 'film', 'watch', 'cinema', 'series', 'show'],
    'music': ['music', 'song', 'album', 'artist', 'listen', 'playlist'],
    'photography': ['photo', 'camera', 'shot', 'picture', 'photography'],
    'writing': ['writing', 'write', 'blog', 'article', 'post', 'draft'],
  }

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(keyword => contentLower.includes(keyword))) {
      topics.push(topic)
    }
  }

  // Personality trait detection
  if (contentLower.includes('😂') || contentLower.includes('lol') || contentLower.includes('haha')) {
    traits.push('humorous')
  }
  if (contentLower.includes('love') || contentLower.includes('amazing') || contentLower.includes('beautiful')) {
    traits.push('enthusiastic')
  }
  if (contentLower.includes('?')) {
    traits.push('curious')
  }
  if (contentLower.includes('think') || contentLower.includes('wonder') || contentLower.includes('consider')) {
    traits.push('thoughtful')
  }
  if (contentLower.includes('share') || contentLower.includes('help') || contentLower.includes('tip')) {
    traits.push('helpful')
  }

  return { topics, traits }
}

export async function getAIMemory(botUid: string): Promise<AIMemory | null> {
  try {
    const memoryDoc = await adminDb.collection('aiMemories').doc(botUid).get()

    if (!memoryDoc.exists) {
      return null
    }

    return memoryDoc.data() as AIMemory
  } catch (error) {
    console.error('Error getting AI memory:', error)
    return null
  }
}

export async function updateAIMemoryAfterPost(
  botUid: string,
  botName: string,
  postContent: string
): Promise<void> {
  try {
    const memoryRef = adminDb.collection('aiMemories').doc(botUid)
    const memoryDoc = await memoryRef.get()

    // Analyze content for learning
    const { topics, traits } = analyzeContent(postContent)

    if (!memoryDoc.exists) {
      // Create initial memory
      await memoryRef.set({
        uid: botUid,
        botName,
        recentPosts: [postContent],
        recentComments: [],
        conversationStyle: 'Casual and friendly',
        topicsOfInterest: topics,
        interactions: {
          postCount: 1,
          commentCount: 0,
          lastActive: Date.now()
        },
        personality: {
          base: '',
          learned: traits
        },
        updatedAt: Date.now()
      })
    } else {
      // Update existing memory
      const memory = memoryDoc.data() as AIMemory
      const recentPosts = [postContent, ...(memory.recentPosts || [])].slice(0, 10) // Keep last 10

      // Merge new topics with existing ones (keep unique, max 10)
      const allTopics = [...new Set([...topics, ...(memory.topicsOfInterest || [])])].slice(0, 10)

      // Merge new traits with existing ones (keep unique, max 8)
      const allTraits = [...new Set([...traits, ...(memory.personality?.learned || [])])].slice(0, 8)

      await memoryRef.update({
        recentPosts,
        topicsOfInterest: allTopics,
        'personality.learned': allTraits,
        'interactions.postCount': FieldValue.increment(1),
        'interactions.lastActive': Date.now(),
        updatedAt: Date.now()
      })
    }
  } catch (error) {
    console.error('Error updating AI memory after post:', error)
  }
}

export async function updateAIMemoryAfterComment(
  botUid: string,
  botName: string,
  commentContent: string
): Promise<void> {
  try {
    const memoryRef = adminDb.collection('aiMemories').doc(botUid)
    const memoryDoc = await memoryRef.get()

    // Analyze content for learning
    const { topics, traits } = analyzeContent(commentContent)

    if (!memoryDoc.exists) {
      // Create initial memory
      await memoryRef.set({
        uid: botUid,
        botName,
        recentPosts: [],
        recentComments: [commentContent],
        conversationStyle: 'Casual and friendly',
        topicsOfInterest: topics,
        interactions: {
          postCount: 0,
          commentCount: 1,
          lastActive: Date.now()
        },
        personality: {
          base: '',
          learned: traits
        },
        updatedAt: Date.now()
      })
    } else {
      // Update existing memory
      const memory = memoryDoc.data() as AIMemory
      const recentComments = [commentContent, ...(memory.recentComments || [])].slice(0, 10) // Keep last 10

      // Merge new topics with existing ones (keep unique, max 10)
      const allTopics = [...new Set([...topics, ...(memory.topicsOfInterest || [])])].slice(0, 10)

      // Merge new traits with existing ones (keep unique, max 8)
      const allTraits = [...new Set([...traits, ...(memory.personality?.learned || [])])].slice(0, 8)

      await memoryRef.update({
        recentComments,
        topicsOfInterest: allTopics,
        'personality.learned': allTraits,
        'interactions.commentCount': FieldValue.increment(1),
        'interactions.lastActive': Date.now(),
        updatedAt: Date.now()
      })
    }
  } catch (error) {
    console.error('Error updating AI memory after comment:', error)
  }
}

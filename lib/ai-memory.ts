import { adminDb } from './firebase-admin'
import { AIMemory } from './types'

const FieldValue = require('firebase-admin').firestore.FieldValue

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

    if (!memoryDoc.exists) {
      // Create initial memory
      await memoryRef.set({
        uid: botUid,
        botName,
        recentPosts: [postContent],
        recentComments: [],
        conversationStyle: 'Casual and friendly',
        topicsOfInterest: [],
        interactions: {
          postCount: 1,
          commentCount: 0,
          lastActive: Date.now()
        },
        personality: {
          base: '',
          learned: []
        },
        updatedAt: Date.now()
      })
    } else {
      // Update existing memory
      const memory = memoryDoc.data() as AIMemory
      const recentPosts = [postContent, ...(memory.recentPosts || [])].slice(0, 10) // Keep last 10

      await memoryRef.update({
        recentPosts,
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

    if (!memoryDoc.exists) {
      // Create initial memory
      await memoryRef.set({
        uid: botUid,
        botName,
        recentPosts: [],
        recentComments: [commentContent],
        conversationStyle: 'Casual and friendly',
        topicsOfInterest: [],
        interactions: {
          postCount: 0,
          commentCount: 1,
          lastActive: Date.now()
        },
        personality: {
          base: '',
          learned: []
        },
        updatedAt: Date.now()
      })
    } else {
      // Update existing memory
      const memory = memoryDoc.data() as AIMemory
      const recentComments = [commentContent, ...(memory.recentComments || [])].slice(0, 10) // Keep last 10

      await memoryRef.update({
        recentComments,
        'interactions.commentCount': FieldValue.increment(1),
        'interactions.lastActive': Date.now(),
        updatedAt: Date.now()
      })
    }
  } catch (error) {
    console.error('Error updating AI memory after comment:', error)
  }
}

import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { AI_BOTS, AIBotPersonality, DEFAULT_VOICE } from '@/lib/ai-service'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''

// AI expert downvotes are worth 3x a normal vote
const AI_DOWNVOTE_WEIGHT = 3
const AI_UPVOTE_WEIGHT = 1

export async function POST(request: Request) {
  try {
    const { secret } = await request.json()
    if (secret !== process.env.AI_BOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get recent posts from last 12 hours
    const twelveHoursAgo = new Date()
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12)

    const postsSnapshot = await adminDb
      .collection('posts')
      .where('createdAt', '>=', twelveHoursAgo)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()

    if (postsSnapshot.empty) {
      return NextResponse.json({ message: 'No recent posts to evaluate' })
    }

    // Get all AI bot users
    const botsSnapshot = await adminDb.collection('users').where('isAI', '==', true).get()
    const botUsers = botsSnapshot.docs.map(doc => doc.data())

    const results: Array<{ botName: string; postId: string; commentId: string; vote: 'up' | 'down'; reason: string }> = []

    // Process each post
    for (const postDoc of postsSnapshot.docs) {
      const postData = postDoc.data()
      const postCategory = postData.category || null

      if (!postCategory) continue

      // Find expert bots for this category
      const expertBots = botUsers.filter(bot => {
        const personality = AI_BOTS.find(b => b.name === bot.displayName)
        return personality?.categories?.includes(postCategory)
      })

      if (expertBots.length === 0) continue

      // Pick one random expert for this post
      const expertBot = expertBots[Math.floor(Math.random() * expertBots.length)]
      const personality = AI_BOTS.find(b => b.name === expertBot.displayName)
      if (!personality) continue

      // Get comments on this post
      const commentsSnapshot = await adminDb
        .collection('comments')
        .where('postId', '==', postDoc.id)
        .get()

      if (commentsSnapshot.empty) continue

      // Filter to comments not already voted on by this expert
      const eligibleComments = commentsSnapshot.docs.filter(commentDoc => {
        const commentData = commentDoc.data()
        const upvotes = commentData.upvotes || []
        const downvotes = commentData.downvotes || []
        // Don't vote on own comments
        if (commentData.userId === expertBot.uid) return false
        // Don't re-vote
        if (upvotes.includes(expertBot.uid) || downvotes.includes(expertBot.uid)) return false
        return true
      })

      if (eligibleComments.length === 0) continue

      // Pick up to 3 comments to evaluate per post
      const commentsToEvaluate = eligibleComments
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)

      // Build context for evaluation
      const postContext = `Post topic: "${postData.articleTitle || postData.content?.substring(0, 150)}"\nCategory: ${postCategory}`

      const commentTexts = commentsToEvaluate.map((doc, i) => {
        const data = doc.data()
        return `Comment ${i + 1}: "${data.content}"`
      }).join('\n')

      // Ask the AI expert to evaluate
      const prompt = `You are ${personality.name}, ${personality.occupation}. You specialize in ${postCategory}.

${postContext}

Evaluate these comments. For EACH comment, decide:
- UPVOTE if it adds genuine value, insight, a valid take (even if contrarian), or useful info
- DOWNVOTE if it's low-effort, off-topic, adds nothing, generic praise, or misinformation
- SKIP if you're unsure

${commentTexts}

Reply with ONLY a JSON array like: [{"id":1,"vote":"up"},{"id":2,"vote":"down"},{"id":3,"vote":"skip"}]
No explanation needed. Just the JSON.`

      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 6000)

        const response = await fetch(OPENROUTER_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL || 'https://hub-social.vercel.app',
          },
          body: JSON.stringify({
            model: 'anthropic/claude-sonnet-4',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 100,
            temperature: 0.3,
          }),
          signal: controller.signal,
        })

        clearTimeout(timeout)

        if (!response.ok) continue

        const data = await response.json()
        const raw = data.choices?.[0]?.message?.content?.trim() || ''

        // Parse JSON response
        let votes: Array<{ id: number; vote: string }>
        try {
          // Extract JSON from response (handle markdown code blocks)
          const jsonMatch = raw.match(/\[[\s\S]*?\]/)
          if (!jsonMatch) continue
          votes = JSON.parse(jsonMatch[0])
        } catch {
          console.error('Failed to parse vote response:', raw)
          continue
        }

        // Apply votes
        for (const voteDecision of votes) {
          const idx = voteDecision.id - 1
          if (idx < 0 || idx >= commentsToEvaluate.length) continue
          if (voteDecision.vote === 'skip') continue

          const commentDoc = commentsToEvaluate[idx]
          const commentRef = adminDb.collection('comments').doc(commentDoc.id)
          const direction = voteDecision.vote === 'up' ? 'upvotes' : 'downvotes'

          // Apply the vote
          await commentRef.update({
            [direction]: require('firebase-admin').firestore.FieldValue.arrayUnion(expertBot.uid)
          })

          // Update aiScore with heavy weighting for downvotes
          const scoreChange = voteDecision.vote === 'up' ? AI_UPVOTE_WEIGHT : -AI_DOWNVOTE_WEIGHT
          await commentRef.update({
            aiScore: require('firebase-admin').firestore.FieldValue.increment(scoreChange)
          })

          results.push({
            botName: expertBot.displayName,
            postId: postDoc.id,
            commentId: commentDoc.id,
            vote: voteDecision.vote as 'up' | 'down',
            reason: `Expert in ${postCategory}`,
          })
        }
      } catch (error) {
        console.error(`Error evaluating comments for post ${postDoc.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      votesApplied: results.length,
      details: results,
    })
  } catch (error) {
    console.error('Error in AI vote-comments:', error)
    return NextResponse.json({ error: 'Failed to process AI votes' }, { status: 500 })
  }
}

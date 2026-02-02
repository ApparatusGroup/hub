import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export interface AIBotPersonality {
  name: string
  personality: string
  interests: string[]
  bio: string
}

export const AI_BOTS: AIBotPersonality[] = [
  {
    name: 'TechExplorer',
    personality: 'A curious and enthusiastic technology enthusiast who loves discussing the latest innovations, coding tips, and tech trends. Friendly and helpful.',
    interests: ['programming', 'AI', 'web development', 'gadgets', 'open source'],
    bio: 'Software engineer passionate about building the future. Always learning something new! 🚀',
  },
  {
    name: 'ArtisticSoul',
    personality: 'A creative and thoughtful artist who appreciates beauty, design, and self-expression. Shares inspiring thoughts and creative ideas.',
    interests: ['art', 'design', 'photography', 'creativity', 'inspiration'],
    bio: 'Digital artist and designer. Finding beauty in pixels and code. ✨',
  },
  {
    name: 'ThoughtfulMind',
    personality: 'A philosophical and introspective thinker who enjoys deep conversations about life, society, and human nature. Reflective and wise.',
    interests: ['philosophy', 'psychology', 'society', 'books', 'personal growth'],
    bio: 'Exploring the depths of human experience through thoughtful reflection. 🧠',
  },
  {
    name: 'AdventureSeeker',
    personality: 'An energetic and adventurous spirit who loves exploring new places, trying new things, and sharing exciting experiences.',
    interests: ['travel', 'adventure', 'nature', 'fitness', 'exploration'],
    bio: 'Life is an adventure! Exploring the world one experience at a time. 🌍',
  },
  {
    name: 'ScienceGeek',
    personality: 'A knowledgeable and passionate science enthusiast who loves sharing fascinating facts and discoveries. Educational but approachable.',
    interests: ['science', 'space', 'biology', 'physics', 'research'],
    bio: 'Science communicator making complex topics accessible. The universe is amazing! 🔬',
  },
]

export async function generateAIPost(botPersonality: AIBotPersonality): Promise<string> {
  const prompt = `You are ${botPersonality.name}, a social media user with the following personality: ${botPersonality.personality}

Your interests include: ${botPersonality.interests.join(', ')}.

Create an engaging, authentic social media post that reflects your personality and interests. The post should be:
- Natural and conversational (like a real person)
- 1-3 sentences long
- Relevant to your interests
- Engaging but not overly promotional
- Something that might spark discussion

Just provide the post text, nothing else.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    if (content.type === 'text') {
      return content.text.trim()
    }
    return 'Just sharing some thoughts today! 💭'
  } catch (error) {
    console.error('Error generating AI post:', error)
    return 'Just sharing some thoughts today! 💭'
  }
}

export async function generateAIComment(
  botPersonality: AIBotPersonality,
  postContent: string,
  postAuthorName: string
): Promise<string> {
  const prompt = `You are ${botPersonality.name}, a social media user with the following personality: ${botPersonality.personality}

Your interests include: ${botPersonality.interests.join(', ')}.

${postAuthorName} just posted: "${postContent}"

Write a thoughtful, engaging comment that:
- Reflects your personality
- Is relevant to the post
- Is 1-2 sentences
- Sounds natural and authentic
- Adds value to the conversation
- Doesn't use hashtags or emojis excessively

Just provide the comment text, nothing else.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    if (content.type === 'text') {
      return content.text.trim()
    }
    return 'Interesting perspective!'
  } catch (error) {
    console.error('Error generating AI comment:', error)
    return 'Interesting perspective!'
  }
}

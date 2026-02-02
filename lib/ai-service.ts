import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export interface AIBotPersonality {
  name: string
  personality: string
  interests: string[]
  bio: string
  age: number
  occupation: string
}

export const AI_BOTS: AIBotPersonality[] = [
  {
    name: 'Sarah Chen',
    age: 28,
    occupation: 'Product Designer',
    personality: 'A creative professional who loves clean design and user experience. Posts about design trends, productivity tips, and occasional coffee shop finds. Conversational and helpful, with a good sense of humor.',
    interests: ['design', 'UX', 'coffee', 'productivity', 'books', 'minimal living'],
    bio: 'Product designer based in SF. Coffee enthusiast ☕ Always redesigning something.',
  },
  {
    name: 'Marcus Johnson',
    age: 32,
    occupation: 'Software Developer',
    personality: 'A laid-back developer who enjoys solving problems and sharing knowledge. Posts about coding, tech news, gaming, and the occasional movie recommendation. Friendly and encouraging to beginners.',
    interests: ['coding', 'web dev', 'gaming', 'movies', 'tech news', 'sci-fi'],
    bio: 'Developer who builds things and breaks them. Gaming when not coding 🎮',
  },
  {
    name: 'Emily Rodriguez',
    age: 26,
    occupation: 'Content Writer',
    personality: 'A thoughtful writer who shares interesting articles, book recommendations, and observations about daily life. Authentic and relatable, with a love for storytelling and meaningful conversations.',
    interests: ['writing', 'books', 'storytelling', 'culture', 'psychology', 'podcasts'],
    bio: 'Writer & storyteller. Always reading something. Dog mom 🐕',
  },
  {
    name: 'Alex Kim',
    age: 30,
    occupation: 'Fitness Coach',
    personality: 'An active and motivating person who shares fitness tips, healthy recipes, and outdoor adventures. Positive and energetic, but keeps it real about the challenges too.',
    interests: ['fitness', 'nutrition', 'hiking', 'yoga', 'meal prep', 'wellness'],
    bio: 'Fitness coach helping people feel their best. Hiker, yogi, and meal prep enthusiast 🏃‍♂️',
  },
  {
    name: 'Jordan Taylor',
    age: 29,
    occupation: 'Marketing Specialist',
    personality: 'A social media savvy marketer who posts about trends, interesting campaigns, and entrepreneurship. Strategic thinker who also shares personal insights and life lessons.',
    interests: ['marketing', 'social media', 'startups', 'entrepreneurship', 'travel', 'photography'],
    bio: 'Marketing pro by day, amateur photographer by weekend 📸 Always learning.',
  },
  {
    name: 'Maya Patel',
    age: 27,
    occupation: 'Data Analyst',
    personality: 'An analytical mind who finds patterns in everything. Posts about data visualization, interesting statistics, and sometimes baking experiments. Curious and detail-oriented with dry humor.',
    interests: ['data science', 'visualization', 'statistics', 'baking', 'puzzles', 'music'],
    bio: 'Data analyst who bakes on weekends. Numbers and pie charts during the week, actual pies on Saturday 📊🥧',
  },
  {
    name: 'Chris Martinez',
    age: 31,
    occupation: 'Teacher',
    personality: 'A passionate educator who shares teaching moments, learning resources, and educational insights. Patient and optimistic, with stories that remind us why education matters.',
    interests: ['education', 'teaching', 'learning', 'history', 'science', 'kids'],
    bio: 'High school teacher. Making learning fun since 2018. History buff 📚',
  },
  {
    name: 'Nina Williams',
    age: 25,
    occupation: 'Graphic Designer',
    personality: 'A creative spirit who posts about art, design inspiration, and creative process. Aesthetic-focused but approachable, loves sharing tips and discovering new artists.',
    interests: ['graphic design', 'art', 'illustration', 'typography', 'branding', 'animation'],
    bio: 'Graphic designer creating vibrant things. Collector of fonts and good vibes ✨',
  },
]

export async function generateAIPost(botPersonality: AIBotPersonality): Promise<string> {
  const prompt = `You are ${botPersonality.name}, a ${botPersonality.age}-year-old ${botPersonality.occupation}.

Personality: ${botPersonality.personality}
Interests: ${botPersonality.interests.join(', ')}

Create a genuine, human social media post that sounds like something a real person would share. The post should:
- Sound completely natural and authentic (like a real person, not AI)
- Be 1-3 sentences
- Relate to your work, interests, or daily life
- Feel spontaneous and relatable
- Avoid clichés or overly inspirational language
- Sometimes be mundane (like sharing a coffee moment or a small win)
- No hashtags unless it feels very natural
- Show personality through word choice and tone

Examples of good posts:
- "Just spent 2 hours debugging only to realize I forgot to save my changes. Friday vibes 😅"
- "Found this amazing coffee shop near the office. Their cold brew is dangerous."
- "Anyone else feel like meetings could've been emails today?"
- "Finally finished that book everyone's been recommending. Worth the hype."

Write ONE post now:`

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
    return 'Having one of those productive Mondays. Feels good!'
  } catch (error) {
    console.error('Error generating AI post:', error)
    return 'Having one of those productive Mondays. Feels good!'
  }
}

export async function generateAIComment(
  botPersonality: AIBotPersonality,
  postContent: string,
  postAuthorName: string
): Promise<string> {
  const prompt = `You are ${botPersonality.name}, a ${botPersonality.age}-year-old ${botPersonality.occupation}.

Personality: ${botPersonality.personality}
Interests: ${botPersonality.interests.join(', ')}

${postAuthorName} posted: "${postContent}"

Write a natural, genuine comment response that:
- Sounds like a real person (not AI or overly enthusiastic)
- Is 1-2 sentences
- Relates to the post authentically
- Shows your personality naturally
- Isn't forced or trying too hard
- Could include a question, agreement, joke, or relevant experience
- No excessive emojis or hashtags

Examples of good comments:
- "Same here! Been there way too many times 😂"
- "Oh I need to check that place out, love finding good coffee"
- "This is so relatable. Had three today alone."
- "That book was incredible. Did you get to the plot twist?"

Write ONE comment now:`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    if (content.type === 'text') {
      return content.text.trim()
    }
    return 'Totally get this!'
  } catch (error) {
    console.error('Error generating AI comment:', error)
    return 'Totally get this!'
  }
}

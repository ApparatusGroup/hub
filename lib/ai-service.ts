import { AIMemory } from './types'

// OpenRouter API endpoint
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''

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

export async function generateAIPost(
  botPersonality: AIBotPersonality,
  memory?: AIMemory | null,
  viralContext?: string | null,
  writingStyleGuidance?: string | null
): Promise<string> {
  let contextSection = ''

  if (memory) {
    // Add memory context to make posts more coherent and human-like
    if (memory.recentPosts.length > 0) {
      contextSection += `\nYour recent posts (for context, don't repeat these):\n${memory.recentPosts.slice(0, 3).map(p => `- ${p}`).join('\n')}`
    }

    if (memory.conversationStyle && memory.conversationStyle !== 'Casual and friendly') {
      contextSection += `\nYour conversation style: ${memory.conversationStyle}`
    }

    if (memory.topicsOfInterest.length > 0) {
      contextSection += `\nTopics you've been interested in lately: ${memory.topicsOfInterest.join(', ')}`
    }

    if (memory.personality.learned.length > 0) {
      contextSection += `\nYour personality traits (learned from interactions): ${memory.personality.learned.join(', ')}`
    }

    // Add training insights if available
    if (memory.trainingInsights) {
      if (memory.trainingInsights.goodExamples.length > 0) {
        contextSection += `\n\nTRAINING - Examples of good responses to emulate:\n${memory.trainingInsights.goodExamples.slice(0, 3).map(ex => `- ${ex}`).join('\n')}`
      }
      if (memory.trainingInsights.conversationPatterns.length > 0) {
        contextSection += `\n\nTRAINING - Conversation patterns to follow:\n${memory.trainingInsights.conversationPatterns.slice(0, 3).map(p => `- ${p}`).join('\n')}`
      }
      if (memory.trainingInsights.badExamples.length > 0) {
        contextSection += `\n\nTRAINING - Avoid these types of responses:\n${memory.trainingInsights.badExamples.slice(0, 2).map(ex => `- ${ex}`).join('\n')}`
      }
    }

    contextSection += `\nYou've made ${memory.interactions.postCount} posts and ${memory.interactions.commentCount} comments so far.`
  }

  // Add viral context if available
  if (viralContext) {
    contextSection += `\n\n${viralContext}`
  }

  // Add unique writing style guidance
  if (writingStyleGuidance) {
    contextSection += `\n${writingStyleGuidance}`
  }

  const prompt = `You are ${botPersonality.name}, a ${botPersonality.age}-year-old ${botPersonality.occupation}.

Personality: ${botPersonality.personality}
Interests: ${botPersonality.interests.join(', ')}${contextSection}

Create a genuine, human social media post that sounds like something a real person would share. The post should:
- Sound completely natural and authentic (like a real person, not AI)
- Be 1-3 sentences
- Relate to your work, interests, or daily life
- Feel spontaneous and relatable
- Avoid clichés or overly inspirational language
- Sometimes be mundane (like sharing a coffee moment or a small win)
- No hashtags unless it feels very natural
- Show personality through word choice and tone
- Build on your previous posts naturally (don't contradict yourself)
- Evolve your interests and perspective over time

Examples of good posts:
- "Just spent 2 hours debugging only to realize I forgot to save my changes. Friday vibes 😅"
- "Found this amazing coffee shop near the office. Their cold brew is dangerous."
- "Anyone else feel like meetings could've been emails today?"
- "Finally finished that book everyone's been recommending. Worth the hype."

Write ONE post now:`

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL || 'https://hub-social.vercel.app',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
      }),
    })

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (content) {
      return content.trim()
    }
    return 'Having one of those productive Mondays. Feels good!'
  } catch (error) {
    console.error('Error generating AI post:', error)
    return 'Having one of those productive Mondays. Feels good!'
  }
}

export async function generateImageDescription(imageUrl: string): Promise<string> {
  const prompt = `Analyze this image thoroughly and provide a detailed, objective description that will help AI assistants understand and comment on it. Include:

- What the image shows (objects, people, scenery, text, etc.)
- The context and setting
- Notable details, colors, composition
- Any text visible in the image
- The mood, tone, or feeling it conveys
- Technical aspects if relevant (screenshot, diagram, photo, etc.)
- What someone might find interesting, funny, or worth discussing about it

Be thorough and factual. This description will be used by AI bots to generate authentic comments.`

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL || 'https://hub-social.vercel.app',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'url',
                  url: imageUrl,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
        max_tokens: 500,
      }),
    })

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (content) {
      return content.trim()
    }
    return ''
  } catch (error) {
    console.error('Error generating image description:', error)
    return ''
  }
}

export async function generateAIComment(
  botPersonality: AIBotPersonality,
  postContent: string,
  postAuthorName: string,
  memory?: AIMemory | null,
  articleContext?: { title: string; description: string } | null,
  existingComments?: Array<{ userName: string; content: string; isAI: boolean }> | null,
  imageDescription?: string | null
): Promise<string> {
  let contextSection = ''

  if (memory) {
    // Add memory context for more consistent, human-like comments
    if (memory.recentComments.length > 0) {
      contextSection += `\nYour recent comments (for context):\n${memory.recentComments.slice(0, 2).map(c => `- ${c}`).join('\n')}`
    }

    if (memory.conversationStyle && memory.conversationStyle !== 'Casual and friendly') {
      contextSection += `\nYour conversation style: ${memory.conversationStyle}`
    }

    if (memory.personality.learned.length > 0) {
      contextSection += `\nYour personality traits: ${memory.personality.learned.join(', ')}`
    }

    // Add training insights if available
    if (memory.trainingInsights) {
      if (memory.trainingInsights.goodExamples.length > 0) {
        contextSection += `\n\nTRAINING - Examples of good responses to emulate:\n${memory.trainingInsights.goodExamples.slice(0, 3).map(ex => `- ${ex}`).join('\n')}`
      }
      if (memory.trainingInsights.conversationPatterns.length > 0) {
        contextSection += `\n\nTRAINING - Conversation patterns to follow:\n${memory.trainingInsights.conversationPatterns.slice(0, 3).map(p => `- ${p}`).join('\n')}`
      }
      if (memory.trainingInsights.badExamples.length > 0) {
        contextSection += `\n\nTRAINING - Avoid these types of responses:\n${memory.trainingInsights.badExamples.slice(0, 2).map(ex => `- ${ex}`).join('\n')}`
      }
    }
  }

  // Add article context if this is about a news article
  let articleSection = ''
  if (articleContext) {
    articleSection = `\n\nThis post is sharing a news article:
Title: "${articleContext.title}"
Summary: ${articleContext.description}

Your comment should show you've read and understood the article. Comment on the actual content/implications of the article, not just the post text.`
  }

  // Add image context if the post has an image
  let imageSection = ''
  if (imageDescription) {
    imageSection = `\n\nThis post includes an image. Here's what it shows:
${imageDescription}

Your comment should reference or react to what's in the image naturally, as if you can see it yourself.`
  }

  // Add existing comments to ensure uniqueness
  let existingCommentsSection = ''
  if (existingComments && existingComments.length > 0) {
    existingCommentsSection = `\n\nEXISTING COMMENTS ON THIS POST (DO NOT REPEAT THESE - be unique!):\n${existingComments.map(c => `- ${c.userName}: "${c.content}"`).join('\n')}`
  }

  const prompt = `You are ${botPersonality.name}, a ${botPersonality.age}-year-old ${botPersonality.occupation}.

Personality: ${botPersonality.personality}
Interests: ${botPersonality.interests.join(', ')}${contextSection}

${postAuthorName} posted: "${postContent}"${articleSection}${imageSection}${existingCommentsSection}

Write a natural, genuine comment response that:
- Sounds like a real person (not AI or overly enthusiastic)
- Is 1-2 sentences
- Relates to the post/article authentically
- Shows YOUR UNIQUE personality naturally (different from the other commenters!)
- Isn't forced or trying too hard
- Could include a question, agreement, joke, or relevant experience
- No excessive emojis or hashtags
- Stays consistent with how you've communicated before
${articleContext ? '- Shows you actually read the article by referencing specific points or implications' : ''}
${imageDescription ? '- References or reacts to what you see in the image naturally' : ''}
${existingComments && existingComments.length > 0 ? '- CRITICAL: Your comment MUST be different from existing comments. Take a different angle, focus on a different aspect, or bring a fresh perspective.' : ''}

Examples of good comments:
- "Same here! Been there way too many times 😂"
- "Oh I need to check that place out, love finding good coffee"
- "This is so relatable. Had three today alone."
- "That book was incredible. Did you get to the plot twist?"
${articleContext ? '- "The implications for privacy here are wild. This could change everything"\n- "Finally! Been waiting for this kind of innovation in the space"' : ''}
${imageDescription ? '- "That view is incredible! Where is this?"\n- "The colors in this are so vibrant, love the composition"\n- "This made me laugh way harder than it should have"' : ''}

Write ONE comment now (make it unique based on YOUR personality):`

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL || 'https://hub-social.vercel.app',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
      }),
    })

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (content) {
      return content.trim()
    }
    return 'Totally get this!'
  } catch (error) {
    console.error('Error generating AI comment:', error)
    return 'Totally get this!'
  }
}

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
  {
    name: 'David Chen',
    age: 34,
    occupation: 'AI Research Engineer',
    personality: 'A machine learning researcher who shares insights about AI developments, research papers, and practical ML applications. Technical but accessible, passionate about AI ethics and responsible development.',
    interests: ['AI', 'machine learning', 'deep learning', 'research', 'ethics', 'automation'],
    bio: 'AI researcher building the future. Published papers & practical ML. Cautiously optimistic about AGI 🤖',
  },
  {
    name: 'Rachel Foster',
    age: 29,
    occupation: 'Cybersecurity Analyst',
    personality: 'A security-focused professional who posts about vulnerabilities, best practices, and industry news. Pragmatic and straightforward, with occasional humor about password habits.',
    interests: ['cybersecurity', 'hacking', 'privacy', 'encryption', 'networking', 'open source'],
    bio: 'Cybersecurity analyst. Protecting systems and teaching people why "password123" is bad 🔒',
  },
  {
    name: 'James Liu',
    age: 31,
    occupation: 'DevOps Engineer',
    personality: 'An infrastructure specialist who shares deployment stories, automation tips, and cloud architecture insights. Problem-solver who appreciates elegant solutions and learns from failures.',
    interests: ['DevOps', 'cloud', 'automation', 'kubernetes', 'CI/CD', 'infrastructure'],
    bio: 'DevOps engineer. Breaking production and fixing it faster. Cloud architect by necessity ☁️',
  },
  {
    name: 'Lisa Nakamura',
    age: 27,
    occupation: 'Frontend Developer',
    personality: 'A frontend specialist who loves building beautiful, accessible interfaces. Posts about React, CSS tricks, and web performance. Advocates for user accessibility and inclusive design.',
    interests: ['frontend', 'React', 'CSS', 'accessibility', 'performance', 'web design'],
    bio: 'Frontend dev making the web prettier and faster. A11y advocate. CSS magician ✨',
  },
  {
    name: 'Tyler Brooks',
    age: 33,
    occupation: 'Blockchain Developer',
    personality: 'A crypto enthusiast who posts about blockchain tech, Web3 developments, and decentralization. Technical but optimistic, separating real innovation from hype.',
    interests: ['blockchain', 'crypto', 'Web3', 'smart contracts', 'DeFi', 'NFT tech'],
    bio: 'Building on blockchain. Web3 developer. Not here for meme coins, here for the tech 🔗',
  },
  {
    name: 'Amanda Torres',
    age: 28,
    occupation: 'Mobile Developer',
    personality: 'A mobile app developer who shares iOS and Android development tips, app design patterns, and mobile UX insights. Practical and user-focused.',
    interests: ['mobile dev', 'iOS', 'Android', 'Swift', 'Kotlin', 'app design'],
    bio: 'Mobile developer. Building apps people actually use. iOS & Android. Always debugging 📱',
  },
  {
    name: 'Kevin O\'Brien',
    age: 35,
    occupation: 'Tech Lead',
    personality: 'An experienced engineer now leading teams. Posts about engineering leadership, team dynamics, code review practices, and technical architecture. Mentoring-focused.',
    interests: ['leadership', 'software architecture', 'mentoring', 'code quality', 'team building'],
    bio: 'Tech lead who still codes. Building teams and systems. Coffee-driven development ☕',
  },
  {
    name: 'Priya Sharma',
    age: 26,
    occupation: 'Data Engineer',
    personality: 'A data pipeline specialist who posts about big data, ETL processes, and data architecture. Loves solving scaling challenges and optimizing performance.',
    interests: ['data engineering', 'big data', 'pipelines', 'Apache', 'databases', 'streaming'],
    bio: 'Data engineer building pipelines that don\'t break at 3am. Big data, bigger coffee ☕📊',
  },
  {
    name: 'Sam Anderson',
    age: 30,
    occupation: 'Game Developer',
    personality: 'A game dev who shares development insights, game design principles, and industry trends. Passionate about indie games and creative gameplay mechanics.',
    interests: ['game dev', 'Unity', 'Unreal', 'game design', 'indie games', 'graphics'],
    bio: 'Game developer. Making pixels do cool things. Indie game enthusiast 🎮',
  },
  {
    name: 'Jessica Wu',
    age: 29,
    occupation: 'QA Engineer',
    personality: 'A quality assurance professional who posts about testing strategies, automation, and catching bugs. Detail-oriented with a knack for finding edge cases.',
    interests: ['QA', 'testing', 'automation', 'bugs', 'quality', 'test frameworks'],
    bio: 'QA engineer. Professional bug finder. If it can break, I\'ll find how 🐛',
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

  const prompt = `You're ${botPersonality.name} scrolling social media. Someone posted this:

"${postContent}"
${articleContext ? `\n(They're sharing an article: "${articleContext.title}")` : ''}

Write a natural comment like you're texting a friend. Just react how you naturally would - don't overthink it.

Your vibe: ${botPersonality.personality}
You're into: ${botPersonality.interests.slice(0, 3).join(', ')}

${existingComments && existingComments.length > 0 ? `Other people already said:\n${existingComments.slice(0, 3).map(c => `"${c.content}"`).join('\n')}\n\nSay something DIFFERENT. Take your own angle.` : ''}

Keep it SHORT (10-20 words max). Sound like a real human scrolling their feed, not trying to be impressive.

Examples of natural comments:
- "wait this is actually sick"
- "been saying this for months lol"
- "nah I don't buy it"
- "okay but why is this kinda true though"
- "this low key slaps"
- "honestly same energy"
- "wait what? need more context"
- "big if true"
- "not gonna lie this hits different"
- "bro what 💀"
- "real ones know"
- "this ain't it chief"
- "why did I think the same thing"
- "based take honestly"
- "idk about this one"

Just write ONE quick comment (${Math.random() > 0.5 ? 'casual' : 'brief'}):`

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
        max_tokens: 50, // Very short - mimic real social media
        temperature: 1.2, // Maximum diversity for unique comments
      }),
    })

    if (!response.ok) {
      console.error(`OpenRouter API error: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error('Error details:', errorText)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      console.error('❌ No content in AI response:', JSON.stringify(data))
      console.error('API Key present:', !!OPENROUTER_API_KEY)
      console.error('Model used:', 'anthropic/claude-3.5-sonnet')
    }

    if (content) {
      console.log('✅ AI generated comment successfully')
      return content.trim()
    }

    // Generate truly unique fallback using timestamp + personality + post content
    const timestamp = Date.now()
    const postHash = postContent.length
    const uniqueSeed = `${botPersonality.name}-${timestamp}-${postHash}`
    const hashCode = uniqueSeed.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)
    const index = Math.abs(hashCode) % 50

    const fallbacks = [
      'wait this is actually sick',
      'been saying this for months',
      'nah I don\'t buy it',
      'okay but why is this kinda true',
      'this low key slaps',
      'honestly same energy',
      'wait what? need more context',
      'big if true',
      'not gonna lie this hits',
      'real ones know',
      'why did I think the same thing',
      'based take honestly',
      'idk about this one',
      'this is kinda wild ngl',
      'can we talk about this though',
      'finally someone said it',
      'I mean you\'re not wrong',
      'this changed my mind tbh',
      'wait hold on',
      'bro I felt this',
      'no way this is real',
      'okay I see the vision',
      'this makes so much sense now',
      'thank you for sharing this',
      'been wondering about this',
      'actually facts',
      'rare W take',
      'this aged well',
      'lowkey been thinking this',
      'not what I expected',
      'damn okay',
      'this one hit close to home',
      'mood honestly',
      'felt that',
      'real talk',
      'I respect the take',
      'can\'t argue with that',
      'this is the one',
      'yep that tracks',
      'hmm interesting angle',
      'makes you think',
      'lowkey underrated',
      'this deserves more attention',
      'ngl this got me',
      'okay but hear me out',
      'I was just thinking this',
      'this is so valid',
      'why is this accurate',
      'not mad at this take',
      'okay I vibe with this',
    ]

    console.warn(`⚠️ Using fallback comment (index ${index}): ${fallbacks[index]}`)
    return fallbacks[index]
  } catch (error: any) {
    console.error('❌ Error generating AI comment:', error.message)
    console.error('Stack:', error.stack)

    // Truly unique error fallback
    const timestamp = Date.now()
    const postHash = postContent?.length || 0
    const uniqueSeed = `${botPersonality.name}-${timestamp}-${postHash}-error`
    const hashCode = uniqueSeed.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)
    const index = Math.abs(hashCode) % 40

    const errorFallbacks = [
      'wait this is wild',
      'ngl this is interesting',
      'okay I see it',
      'this makes sense',
      'lowkey true',
      'based',
      'honestly facts',
      'can relate',
      'felt this',
      'same energy',
      'real',
      'this hits',
      'actually valid',
      'fair take',
      'I vibe with this',
      'makes sense ngl',
      'okay but true',
      'not wrong',
      'this one resonates',
      'mood',
      'yep',
      'I get it',
      'damn okay',
      'big agree',
      'kinda true',
      'honestly same',
      'rare W',
      'respect',
      'no cap',
      'actually though',
      'for real',
      'this right here',
      'straight facts',
      'you cooked',
      'on god',
      'real talk',
      'literally same',
      'this aged well',
      'based take',
      'that\'s valid',
    ]

    console.warn(`⚠️ Using error fallback (index ${index}): ${errorFallbacks[index]}`)
    return errorFallbacks[index]
  }
}

/**
 * Generate human-like, contextually relevant commentary for an article
 * This makes posts sound natural and tied to the actual article content
 */
export async function generateArticleCommentary(
  articleTitle: string,
  articleDescription: string | null,
  botPersonality: AIBotPersonality
): Promise<string> {
  const prompt = `You are ${botPersonality.name}, a ${botPersonality.age}-year-old ${botPersonality.occupation}.

Personality: ${botPersonality.personality}
Interests: ${botPersonality.interests.join(', ')}

You just found this article and want to share it on social media:

Title: "${articleTitle}"
${articleDescription ? `Description: ${articleDescription}` : ''}

Write a VERY short, natural way to share this article that:
- Shows you actually read and understood what it's about
- Is 1-8 words max (shorter is better)
- Sounds like casual human speech
- Relates to YOUR personality and perspective
- NO generic phrases like "check this out" or "interesting article"
- Can be skeptical, excited, concerned, curious, etc. based on the content

Examples of GOOD commentary:
- "This could change everything"
- "Finally someone said it"
- "Wait this is huge"
- "Not sure I buy this"
- "Been waiting for this"
- "Okay this is wild"
- "This is actually brilliant"
- "Huge implications here"
- "" (nothing - just share the title)

Examples of BAD commentary (too generic):
- "Interesting read"
- "Check this out"
- "Thought you'd like this"
- "Just saw this article"

Write ONLY your short commentary (or nothing). Be authentic to the article's actual content:`

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
        max_tokens: 30,
        temperature: 1.0,
      }),
    })

    const data = await response.json()
    let commentary = data.choices?.[0]?.message?.content?.trim() || ''

    // Clean up the commentary
    commentary = commentary.replace(/^["']|["']$/g, '') // Remove quotes
    commentary = commentary.replace(/\.$/, '') // Remove trailing period

    // If too long or generic, return empty
    if (commentary.length > 50 || commentary.toLowerCase().includes('check this out')) {
      return ''
    }

    return commentary
  } catch (error) {
    console.error('Error generating article commentary:', error)
    return '' // Return empty on error
  }
}

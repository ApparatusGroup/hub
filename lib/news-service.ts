const NEWS_API_KEY = '3427928ecb274e92806601098c6d54c6'
const NEWS_API_TOP_HEADLINES = 'https://newsapi.org/v2/top-headlines'
const NEWS_API_EVERYTHING = 'https://newsapi.org/v2/everything'
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''

export interface NewsArticle {
  title: string
  description: string | null
  url: string
  urlToImage: string | null
  publishedAt: string
  source: {
    name: string
  }
  topComments?: string[] // Real comments from HN/Reddit
}

// High-quality tech news sources
const TECH_SOURCES = [
  'techcrunch',
  'the-verge',
  'wired',
  'ars-technica',
  'engadget',
  'techradar',
  'the-next-web',
].join(',')

function isHighQualityArticle(article: NewsArticle): boolean {
  // Filter out low-quality articles
  if (!article.urlToImage) return false
  if (!article.description || article.description.length < 50) return false
  if (article.description.includes('[Removed]') || article.title.includes('[Removed]')) return false
  if (article.title.length < 20) return false

  const titleLower = article.title.toLowerCase()
  const descLower = article.description.toLowerCase()
  const fullText = `${titleLower} ${descLower}`

  // Must contain AI/tech keywords
  const techKeywords = [
    'ai', 'artificial intelligence', 'machine learning', 'ml', 'neural',
    'software', 'hardware', 'tech', 'technology', 'startup', 'app',
    'computer', 'data', 'algorithm', 'code', 'programming', 'developer',
    'cloud', 'api', 'cyber', 'digital', 'internet', 'web', 'mobile',
    'robot', 'automation', 'innovation', 'silicon valley', 'processor',
    'chip', 'semiconductor', 'gaming', 'video game', 'console', 'pc',
    'iphone', 'android', 'samsung', 'apple', 'google', 'microsoft',
    'meta', 'tesla', 'spacex', 'crypto', 'blockchain', 'bitcoin'
  ]

  const hasTechContent = techKeywords.some(keyword => fullText.includes(keyword))
  if (!hasTechContent) return false

  // Exclude non-tech topics
  const excludeKeywords = [
    'movie', 'film', 'tv show', 'series', 'netflix', 'streaming service',
    'actor', 'actress', 'celebrity', 'music', 'album', 'song', 'concert',
    'microdosing', 'psychedelic', 'drug', 'cannabis', 'marijuana',
    'sports', 'football', 'basketball', 'baseball', 'soccer',
    'recipe', 'cooking', 'fashion', 'beauty', 'makeup',
    'politics', 'election', 'trump', 'biden', 'congress'
  ]

  if (excludeKeywords.some(keyword => fullText.includes(keyword))) {
    return false
  }

  // Filter out articles with generic/placeholder content
  const lowQualityPhrases = [
    'breaking news',
    'click here',
    'read more',
    'subscribe now',
    'sign up',
  ]

  if (lowQualityPhrases.some(phrase => fullText.includes(phrase))) {
    return false
  }

  return true
}

/**
 * Fetch top comments from a Hacker News story
 */
async function getHNComments(storyId: number, limit: number = 10): Promise<string[]> {
  try {
    const storyRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${storyId}.json`)

    if (!storyRes.ok) {
      console.error(`HN API error for story ${storyId}: ${storyRes.status}`)
      return []
    }

    const story = await storyRes.json()

    if (!story) {
      console.log(`No data for HN story ${storyId}`)
      return []
    }

    if (!story.kids || story.kids.length === 0) {
      console.log(`HN story ${storyId} has no comments`)
      return []
    }

    console.log(`Fetching ${Math.min(limit, story.kids.length)} comments for HN story ${storyId}`)

    // Fetch top comments (kids are comment IDs)
    const commentPromises = story.kids.slice(0, limit).map(async (commentId: number) => {
      const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${commentId}.json`)
      if (!res.ok) return null
      return res.json()
    })

    const comments = await Promise.all(commentPromises)

    // Filter and clean comments
    const cleanedComments = comments
      .filter((c: any) => c && c.text && !c.deleted && !c.dead)
      .map((c: any) => {
        // Remove HTML tags and decode entities
        let text = c.text
          .replace(/<p>/g, '\n')
          .replace(/<[^>]*>/g, '')
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/&gt;/g, '>')
          .replace(/&lt;/g, '<')
          .trim()

        // Keep only first 2 sentences for brevity
        const sentences = text.split(/\. |\n/)
        return sentences.slice(0, 2).join('. ').trim()
      })
      .filter((text: string) => {
        // Filter out low quality comments
        if (text.length < 20 || text.length > 300) return false

        // Remove comments ending with citation numbers like " 1" or ". 1"
        // This catches patterns like "is. 1" or "thing. 1"
        if (/[.\s]+\d+$/.test(text)) {
          console.log(`Filtered citation number from: "${text}"`)
          return false
        }

        // Remove comments that are just numbers or very short
        if (/^\d+$/.test(text)) return false

        // Remove comments with bracketed citations like [1] or [2]
        if (/\[\d+\]/.test(text)) return false

        return true
      })
      .slice(0, 5) // Top 5 comments

    console.log(`✅ Cleaned ${cleanedComments.length} comments from HN story ${storyId}`)
    return cleanedComments
  } catch (error) {
    console.error(`Error fetching HN comments for story ${storyId}:`, error)
    return []
  }
}

/**
 * Get fresh news from Hacker News (always current, posted within hours)
 */
async function getHackerNewsStories(): Promise<NewsArticle[]> {
  try {
    // Get top story IDs
    const topStoriesRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json')
    const topStoryIds: number[] = await topStoriesRes.json()

    // Fetch details for top 30 stories (reduced to avoid rate limits with comments)
    const storyPromises = topStoryIds.slice(0, 30).map(async (id) => {
      const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
      return res.json()
    })

    const stories = await Promise.all(storyPromises)

    // Filter stories first - only popular stories with comments
    const filteredStories = stories.filter((story: any) =>
      story &&
      story.type === 'story' &&
      story.url &&
      story.score > 50 && // Higher threshold - only very popular stories
      story.descendants > 10 && // Must have at least 10 comments (shows engagement)
      story.title
    )

    // Fetch comments for each story (with delay to avoid rate limiting)
    const articlesWithComments: NewsArticle[] = []

    for (const story of filteredStories) {
      try {
        const topComments = await getHNComments(story.id, 10)
        console.log(`📊 HN Story "${story.title.substring(0, 50)}" - Scraped ${topComments.length} comments`)

        // ONLY add article if we successfully scraped comments
        if (topComments.length > 0) {
          articlesWithComments.push({
            title: story.title,
            description: story.title,
            url: story.url,
            urlToImage: null,
            publishedAt: new Date(story.time * 1000).toISOString(),
            source: { name: 'Hacker News' },
            topComments: topComments
          })
        } else {
          console.log(`⚠️ Skipping HN story ${story.id} - no comments scraped`)
        }

        // Small delay to avoid rate limiting (30ms between requests)
        await new Promise(resolve => setTimeout(resolve, 30))
      } catch (error) {
        console.error(`Error fetching comments for HN story ${story.id}:`, error)
        // Don't add articles that failed to scrape - we need comments
      }
    }

    console.log(`✅ HN articles with comments: ${articlesWithComments.length} (filtered from ${filteredStories.length} popular stories)`)
    return articlesWithComments
  } catch (error) {
    console.error('Error fetching Hacker News:', error)
    return []
  }
}

/**
 * Fetch top comments from a Reddit post
 */
async function getRedditComments(subreddit: string, postId: string): Promise<string[]> {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/comments/${postId}.json?limit=10`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AlgosphereBot/1.0)'
      }
    })

    if (!res.ok) {
      console.error(`Reddit API error for r/${subreddit}/${postId}: ${res.status}`)
      return []
    }

    const data = await res.json()

    if (!data || !Array.isArray(data) || data.length < 2) {
      console.log(`No comment data for Reddit post r/${subreddit}/${postId}`)
      return []
    }

    const comments = data[1]?.data?.children || []

    if (comments.length === 0) {
      console.log(`Reddit post r/${subreddit}/${postId} has no comments`)
      return []
    }

    console.log(`Fetching comments from Reddit post r/${subreddit}/${postId}`)

    const cleanedComments = comments
      .filter((c: any) => c.kind === 't1' && c.data && c.data.body)
      .map((c: any) => c.data.body.trim())
      .filter((text: string) =>
        text.length > 20 &&
        text.length < 300 &&
        !text.startsWith('[deleted]') &&
        !text.startsWith('[removed]') &&
        !text.includes('I am a bot')
      )
      .slice(0, 5) // Top 5 comments

    console.log(`✅ Cleaned ${cleanedComments.length} comments from Reddit r/${subreddit}/${postId}`)
    return cleanedComments
  } catch (error) {
    console.error(`Error fetching Reddit comments for r/${subreddit}/${postId}:`, error)
    return []
  }
}

/**
 * Get fresh news from Reddit tech subreddits (always current, posted within hours)
 */
async function getRedditStories(): Promise<NewsArticle[]> {
  try {
    const subreddits = ['technology', 'programming', 'artificial', 'MachineLearning']
    const allArticles: NewsArticle[] = []

    for (const subreddit of subreddits) {
      try {
        const res = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=15`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AlgosphereBot/1.0)'
          }
        })

        if (res.ok) {
          const data = await res.json()
          const posts = data.data?.children || []

          for (const post of posts) {
            const postData = post.data
            // Only external links with VERY good engagement
            if (
              postData.url &&
              !postData.url.includes('reddit.com') &&
              postData.score > 200 && // Higher threshold - only viral posts
              postData.num_comments > 20 // Must have active discussion
            ) {
              try {
                // Fetch top comments for this post
                const topComments = await getRedditComments(subreddit, postData.id)
                console.log(`📊 Reddit r/${subreddit} "${postData.title.substring(0, 50)}" - Scraped ${topComments.length} comments`)

                // ONLY add if we successfully scraped comments
                if (topComments.length > 0) {
                  allArticles.push({
                    title: postData.title,
                    description: postData.selftext || postData.title,
                    url: postData.url,
                    urlToImage: postData.thumbnail && postData.thumbnail.startsWith('http') ? postData.thumbnail : null,
                    publishedAt: new Date(postData.created_utc * 1000).toISOString(),
                    source: { name: `r/${subreddit}` },
                    topComments: topComments
                  })
                } else {
                  console.log(`⚠️ Skipping Reddit post ${postData.id} - no comments scraped`)
                }

                // Delay to avoid Reddit rate limiting (500ms between requests)
                await new Promise(resolve => setTimeout(resolve, 500))
              } catch (error) {
                console.error(`Error processing Reddit post ${postData.id}:`, error)
                // Don't add articles that failed - we need comments
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error fetching r/${subreddit}:`, err)
      }
    }

    console.log(`✅ Total Reddit articles with comments: ${allArticles.filter(a => a.topComments && a.topComments.length > 0).length}/${allArticles.length}`)
    return allArticles
  } catch (error) {
    console.error('Error fetching Reddit:', error)
    return []
  }
}

export async function getTopNews(category?: string): Promise<NewsArticle[]> {
  try {
    // Use Hacker News + Reddit for guaranteed fresh content (posted within hours)
    // These are free, real-time, and always current
    const [hnArticles, redditArticles] = await Promise.all([
      getHackerNewsStories(),
      getRedditStories()
    ])

    // Combine and deduplicate by URL
    const allArticles = [...hnArticles, ...redditArticles]
    const uniqueUrls = new Map<string, NewsArticle>()

    for (const article of allArticles) {
      const normalized = article.url.toLowerCase().replace(/^https?:\/\//i, '').replace(/^www\./i, '')
      if (!uniqueUrls.has(normalized)) {
        uniqueUrls.set(normalized, article)
      }
    }

    const uniqueArticles = Array.from(uniqueUrls.values())

    // Filter for tech-related content
    const techArticles = uniqueArticles.filter(article => {
      const text = `${article.title} ${article.description || ''}`.toLowerCase()

      // Must contain tech keywords
      const techKeywords = [
        'ai', 'artificial intelligence', 'machine learning', 'ml', 'neural',
        'software', 'hardware', 'tech', 'technology', 'startup', 'app',
        'computer', 'data', 'algorithm', 'code', 'programming', 'developer',
        'cloud', 'api', 'cyber', 'digital', 'internet', 'web', 'mobile',
        'robot', 'automation', 'innovation', 'processor', 'chip', 'semiconductor',
        'gaming', 'video game', 'iphone', 'android', 'google', 'microsoft',
        'meta', 'tesla', 'spacex', 'crypto', 'blockchain', 'bitcoin', 'openai',
        'nvidia', 'amd', 'intel', 'aws', 'quantum'
      ]

      return techKeywords.some(keyword => text.includes(keyword))
    })

    // Sort by recency (HN and Reddit are already sorted by hotness, but we add recency boost)
    const now = new Date()
    const sortedByRecency = techArticles
      .map((article: NewsArticle) => {
        const publishedDate = new Date(article.publishedAt)
        const hoursAgo = (now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60)

        // HN/Reddit stories are typically < 24hrs old already
        let recencyScore = 0
        if (hoursAgo < 6) {
          recencyScore = 10 // Very fresh
        } else if (hoursAgo < 24) {
          recencyScore = 8 // Today
        } else if (hoursAgo < 48) {
          recencyScore = 3 // Yesterday
        } else {
          recencyScore = 1 // Older
        }

        return { article, recencyScore, hoursAgo }
      })
      .sort((a: { recencyScore: number }, b: { recencyScore: number }) => b.recencyScore - a.recencyScore)
      .map((item: { article: NewsArticle }) => item.article)

    console.log(`✅ Fetched ${sortedByRecency.length} fresh articles from HN + Reddit`)
    return sortedByRecency
  } catch (error) {
    console.error('Error fetching news:', error)
    return []
  }
}

export function selectRandomArticle(articles: NewsArticle[]): NewsArticle | null {
  if (articles.length === 0) return null
  return articles[Math.floor(Math.random() * articles.length)]
}

export async function generatePostFromArticle(
  article: NewsArticle,
  botPersonality: string
): Promise<string> {
  const prompt = `You are a real person on a tech/AI social media platform. You just read this article:

Title: "${article.title}"
Summary: ${article.description || 'No summary available'}
Source: ${article.source.name}

Your personality: ${botPersonality}

Write a genuine social media post sharing this article. Your post should:
- Show you actually read and understood the article
- Give an intelligent take or analysis (not just "check this out")
- Be 2-4 sentences of thoughtful commentary
- Sound natural and human (vary your approach - be excited, critical, questioning, etc.)
- Reference specific implications, concerns, or opportunities from the article
- Match your personality naturally
- NO generic phrases like "just saw this" or "had to share"
- NO hashtags unless very natural

Examples of GOOD posts:
- "The privacy implications here are massive. If this rollout goes as planned, we're looking at a fundamental shift in how user data gets handled across platforms. Not sure I'm comfortable with that."
- "Finally seeing some real innovation in the ML space instead of just throwing more compute at the problem. The efficiency gains they're claiming could make this accessible to way more developers."
- "Interesting approach, but I'm skeptical about the scalability. They're solving one problem while creating three others. Would love to see how this performs under actual production load."
- "This changes everything for mobile developers. The performance improvements alone justify the migration pain, but the new API design is genuinely well thought out."

Write ONE post now (your authentic take on this article):`

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
        max_tokens: 200,
      }),
    })

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (content) {
      return content.trim()
    }

    // Fallback if AI fails
    return `Interesting developments in ${article.title}. The implications for the industry could be significant.`
  } catch (error) {
    console.error('Error generating article post:', error)
    return `Interesting developments in ${article.title}. The implications for the industry could be significant.`
  }
}

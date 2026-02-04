/**
 * Node.js implementation of viral content pattern analyzer
 * Uses NewsAPI + Hacker News data to extract trending topics and real engagement metrics
 */

import { getTopNews, NewsArticle } from './news-service'

export interface ViralPattern {
  top_keywords: Array<{ word: string; count: number; engagement?: number }>
  top_hashtags: Array<{ tag: string; count: number; engagement?: number }>
  top_phrases: Array<{ phrase: string; count: number; engagement?: number }>
}

export interface HackerNewsStory {
  id: number
  title: string
  url?: string
  score: number // upvotes
  descendants?: number // comment count
  time: number
  by: string
}

export interface ViralPatternsData {
  success: boolean
  stats: {
    total_articles: number
    hn_stories: number
    total_engagement: number
    sources: string[]
    date_range: string
    scraped_at: string
  }
  patterns: ViralPattern
  sample_articles: Array<{
    title: string
    description: string
    source: string
    url: string
    engagement?: number
  }>
  trending_urls: Array<{
    url: string
    title: string
    score: number
    comments: number
  }>
}

/**
 * Extract meaningful keywords from text
 */
function extractKeywords(text: string): string[] {
  // Remove URLs and special characters
  const cleaned = text
    .toLowerCase()
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')

  // Extract words (3+ characters)
  const words = cleaned.match(/\b\w{3,}\b/g) || []

  // Filter out common stop words
  const stopWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can',
    'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him',
    'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way',
    'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too',
    'use', 'this', 'that', 'with', 'have', 'from', 'they', 'been',
    'what', 'when', 'your', 'more', 'will', 'just', 'than', 'into',
    'some', 'could', 'them', 'would', 'make', 'like', 'time', 'very',
    'said', 'each', 'tell', 'does', 'most', 'know'
  ])

  return words.filter(word => !stopWords.has(word))
}

/**
 * Extract 2-3 word phrases from text
 */
function extractPhrases(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/)
  const phrases: string[] = []

  // Extract 2-word phrases
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = `${words[i]} ${words[i + 1]}`
    if (phrase.length > 6 && !phrase.match(/[^a-z\s]/)) {
      phrases.push(phrase)
    }
  }

  // Extract 3-word phrases
  for (let i = 0; i < words.length - 2; i++) {
    const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`
    if (phrase.length > 10 && !phrase.match(/[^a-z\s]/)) {
      phrases.push(phrase)
    }
  }

  return phrases
}

/**
 * Count occurrences and return top N with optional engagement weighting
 */
function getTopItems<T extends string>(
  items: T[],
  limit: number,
  engagementMap?: Map<string, number>
): Array<{ word: string; count: number; engagement?: number }> {
  const counts = new Map<string, number>()

  for (const item of items) {
    counts.set(item, (counts.get(item) || 0) + 1)
  }

  const results = Array.from(counts.entries()).map(([word, count]) => ({
    word,
    count,
    engagement: engagementMap?.get(word) || 0
  }))

  // Sort by engagement first, then by count
  results.sort((a, b) => {
    const engagementDiff = (b.engagement || 0) - (a.engagement || 0)
    if (engagementDiff !== 0) return engagementDiff
    return b.count - a.count
  })

  return results.slice(0, limit)
}

/**
 * Fetch top stories from Hacker News
 */
async function getHackerNewsTopStories(limit: number = 100): Promise<HackerNewsStory[]> {
  try {
    // Get top story IDs
    const topStoriesRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json')
    const topStoryIds: number[] = await topStoriesRes.json()

    // Fetch details for top stories (limit to avoid rate limiting)
    const storyPromises = topStoryIds.slice(0, limit).map(async (id) => {
      const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
      return res.json()
    })

    const stories = await Promise.all(storyPromises)

    // Filter out deleted stories and jobs, keep only stories with URLs
    return stories.filter((story): story is HackerNewsStory =>
      story &&
      story.type === 'story' &&
      story.url &&
      story.score > 0
    )
  } catch (error) {
    console.error('Error fetching Hacker News stories:', error)
    return []
  }
}

/**
 * Normalize URL for matching (remove protocol, www, trailing slashes)
 */
function normalizeUrl(url: string): string {
  try {
    let normalized = url.toLowerCase()
    normalized = normalized.replace(/^https?:\/\//i, '')
    normalized = normalized.replace(/^www\./i, '')
    normalized = normalized.replace(/\/+$/g, '')
    return normalized
  } catch {
    return url.toLowerCase()
  }
}

/**
 * Fetch trending posts from Reddit tech subreddits
 */
async function getRedditTrendingPosts(): Promise<Array<{ title: string; url: string; score: number; comments: number }>> {
  try {
    const subreddits = ['technology', 'programming', 'artificial', 'MachineLearning', 'tech']
    const allPosts: Array<{ title: string; url: string; score: number; comments: number }> = []

    for (const subreddit of subreddits) {
      try {
        const res = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=25`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AlgosphereBot/1.0)'
          }
        })

        if (res.ok) {
          const data = await res.json()
          const posts = data.data?.children || []

          for (const post of posts) {
            const postData = post.data
            if (postData.url && !postData.url.includes('reddit.com') && postData.score > 50) {
              allPosts.push({
                title: postData.title,
                url: postData.url,
                score: postData.score,
                comments: postData.num_comments || 0
              })
            }
          }
        }
      } catch (err) {
        console.error(`Error fetching r/${subreddit}:`, err)
      }
    }

    return allPosts
  } catch (error) {
    console.error('Error fetching Reddit posts:', error)
    return []
  }
}

/**
 * Analyze news articles + Hacker News + Reddit to extract viral patterns with real engagement
 */
export async function analyzeViralPatterns(): Promise<ViralPatternsData> {
  try {
    // Fetch from multiple sources in parallel
    const [articles, hnStories, redditPosts] = await Promise.all([
      getTopNews(),
      getHackerNewsTopStories(100),
      getRedditTrendingPosts()
    ])

    console.log(`📊 Scraped data: ${articles.length} news, ${hnStories.length} HN stories, ${redditPosts.length} Reddit posts`)

    // Create URL-to-engagement mapping
    const urlEngagement = new Map<string, number>()

    // Track trending URLs with their engagement metrics
    const trendingUrls: Array<{ url: string; title: string; score: number; comments: number }> = []

    // Process Hacker News stories (highest quality indicator)
    for (const story of hnStories) {
      if (story.url) {
        const normalized = normalizeUrl(story.url)
        const currentScore = urlEngagement.get(normalized) || 0
        // HN score is highly valuable (multiply by 5)
        urlEngagement.set(normalized, currentScore + story.score * 5)

        trendingUrls.push({
          url: story.url,
          title: story.title,
          score: story.score,
          comments: story.descendants || 0
        })
      }
    }

    // Process Reddit posts
    for (const post of redditPosts) {
      const normalized = normalizeUrl(post.url)
      const currentScore = urlEngagement.get(normalized) || 0
      // Reddit upvotes (multiply by 2)
      urlEngagement.set(normalized, currentScore + post.score * 2)

      // Add to trending if not already there
      if (!trendingUrls.some(t => normalizeUrl(t.url) === normalized)) {
        trendingUrls.push({
          url: post.url,
          title: post.title,
          score: post.score,
          comments: post.comments
        })
      }
    }

    // Sort trending URLs by engagement
    trendingUrls.sort((a, b) => b.score - a.score)

    // Track total engagement
    let totalEngagement = 0
    urlEngagement.forEach(score => totalEngagement += score)

    const allKeywords: string[] = []
    const allPhrases: string[] = []
    const allHashtags: string[] = []
    const keywordEngagement = new Map<string, number>()
    const phraseEngagement = new Map<string, number>()
    const hashtagEngagement = new Map<string, number>()

    // Analyze NewsAPI articles
    for (const article of articles) {
      const text = `${article.title} ${article.description || ''}`
      const normalized = normalizeUrl(article.url)
      const engagement = urlEngagement.get(normalized) || 0

      const keywords = extractKeywords(text)
      const phrases = extractPhrases(text)
      const techTerms = text.match(/\b(ai|ml|gpt|llm|openai|claude|anthropic|google|meta|apple|microsoft|aws|cloud|quantum|crypto|blockchain|web3|nvidia|amd|intel|tesla|spacex)\b/gi) || []

      // Weight by engagement
      keywords.forEach(kw => {
        allKeywords.push(kw)
        keywordEngagement.set(kw, (keywordEngagement.get(kw) || 0) + engagement)
      })

      phrases.forEach(phrase => {
        allPhrases.push(phrase)
        phraseEngagement.set(phrase, (phraseEngagement.get(phrase) || 0) + engagement)
      })

      techTerms.forEach(term => {
        const lower = term.toLowerCase()
        allHashtags.push(lower)
        hashtagEngagement.set(lower, (hashtagEngagement.get(lower) || 0) + engagement)
      })
    }

    // Analyze Hacker News titles (highly engaged content)
    for (const story of hnStories) {
      const text = story.title
      const engagement = story.score * 5 // HN engagement is valuable

      const keywords = extractKeywords(text)
      const phrases = extractPhrases(text)
      const techTerms = text.match(/\b(ai|ml|gpt|llm|openai|claude|anthropic|google|meta|apple|microsoft|aws|cloud|quantum|crypto|blockchain|web3|nvidia|amd|intel|tesla|spacex)\b/gi) || []

      keywords.forEach(kw => {
        allKeywords.push(kw)
        keywordEngagement.set(kw, (keywordEngagement.get(kw) || 0) + engagement)
      })

      phrases.forEach(phrase => {
        allPhrases.push(phrase)
        phraseEngagement.set(phrase, (phraseEngagement.get(phrase) || 0) + engagement)
      })

      techTerms.forEach(term => {
        const lower = term.toLowerCase()
        allHashtags.push(lower)
        hashtagEngagement.set(lower, (hashtagEngagement.get(lower) || 0) + engagement)
      })
    }

    // Analyze Reddit titles
    for (const post of redditPosts) {
      const text = post.title
      const engagement = post.score * 2

      const keywords = extractKeywords(text)
      const phrases = extractPhrases(text)
      const techTerms = text.match(/\b(ai|ml|gpt|llm|openai|claude|anthropic|google|meta|apple|microsoft|aws|cloud|quantum|crypto|blockchain|web3|nvidia|amd|intel|tesla|spacex)\b/gi) || []

      keywords.forEach(kw => {
        allKeywords.push(kw)
        keywordEngagement.set(kw, (keywordEngagement.get(kw) || 0) + engagement)
      })

      phrases.forEach(phrase => {
        allPhrases.push(phrase)
        phraseEngagement.set(phrase, (phraseEngagement.get(phrase) || 0) + engagement)
      })

      techTerms.forEach(term => {
        const lower = term.toLowerCase()
        allHashtags.push(lower)
        hashtagEngagement.set(lower, (hashtagEngagement.get(lower) || 0) + engagement)
      })
    }

    // Get top items weighted by engagement
    const topKeywords = getTopItems(allKeywords, 50, keywordEngagement)
    const topPhrases = getTopItems(allPhrases, 40, phraseEngagement)
    const topHashtags = getTopItems(allHashtags, 30, hashtagEngagement)

    // Sample articles with engagement data
    const sampleArticles = articles.slice(0, 20).map(article => {
      const normalized = normalizeUrl(article.url)
      return {
        title: article.title,
        description: article.description || '',
        source: article.source.name,
        url: article.url,
        engagement: urlEngagement.get(normalized) || 0
      }
    })

    // Sort sample articles by engagement
    sampleArticles.sort((a, b) => (b.engagement || 0) - (a.engagement || 0))

    return {
      success: true,
      stats: {
        total_articles: articles.length,
        hn_stories: hnStories.length,
        total_engagement: totalEngagement,
        sources: [...new Set([
          ...articles.map(a => a.source.name),
          'Hacker News',
          ...redditPosts.length > 0 ? ['Reddit'] : []
        ])],
        date_range: 'Last 24 hours',
        scraped_at: new Date().toISOString()
      },
      patterns: {
        top_keywords: topKeywords,
        top_hashtags: topHashtags.map(({ word, count, engagement }) => ({
          tag: word,
          count,
          engagement
        })),
        top_phrases: topPhrases.map(({ word, count, engagement }) => ({
          phrase: word,
          count,
          engagement
        }))
      },
      sample_articles: sampleArticles,
      trending_urls: trendingUrls.slice(0, 20) // Top 20 most shared URLs
    }

  } catch (error) {
    console.error('Error analyzing viral patterns:', error)
    throw error
  }
}

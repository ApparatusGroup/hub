/**
 * Generate engaging post commentary for article shares
 * Makes posts feel authentic and enticing, not just regurgitated titles
 */

const COMMENTARY_STYLES = [
  // Bold statements
  { type: 'bold', templates: [
    'This changes everything about {topic}',
    'Finally, someone gets it right with {topic}',
    'The {topic} landscape just shifted dramatically',
    '{topic} will never be the same after this',
    'This is the {topic} breakthrough we\'ve been waiting for',
  ]},
  // Questions
  { type: 'question', templates: [
    'Is this the future of {topic}?',
    'Why isn\'t anyone talking about this approach to {topic}?',
    'Could this solve the biggest problem in {topic}?',
    'What does this mean for the future of {topic}?',
    'Is {topic} about to get a lot more interesting?',
  ]},
  // Hot takes
  { type: 'hot-take', templates: [
    'Hot take: this {topic} development is more important than people realize',
    'Unpopular opinion: this is exactly what {topic} needed',
    'Everyone\'s sleeping on this {topic} innovation',
    'This {topic} approach is controversial but absolutely correct',
    'The {topic} industry isn\'t ready for this conversation',
  ]},
  // Skeptical
  { type: 'skeptical', templates: [
    'Interesting take on {topic}, but I\'m not convinced',
    'The {topic} claims here seem ambitious',
    'I want to believe this {topic} solution works, but...',
    'This {topic} approach raises more questions than answers',
    'Not sure I buy the {topic} argument here',
  ]},
  // Excited
  { type: 'excited', templates: [
    'This {topic} development is wild',
    'Absolutely fascinating approach to {topic}',
    'The implications for {topic} are massive',
    'This {topic} solution is genuinely innovative',
    'Finally seeing real innovation in {topic}',
  ]},
  // Analytical
  { type: 'analytical', templates: [
    'The {topic} trade-offs here are interesting',
    'This {topic} solution addresses a real pain point',
    'Great breakdown of the current state of {topic}',
    'This {topic} analysis cuts through the hype',
    'The {topic} performance numbers here are impressive',
  ]},
  // Provocative
  { type: 'provocative', templates: [
    'This {topic} piece is going to ruffle some feathers',
    'Prepare for the {topic} community to lose their minds over this',
    'This {topic} take will be controversial',
    'Not what the {topic} establishment wants to hear',
    'This challenges everything we thought about {topic}',
  ]}
]

interface CommentaryOptions {
  articleTitle: string
  category?: string
  topCommentText?: string
}

/**
 * Extract topic from article title
 */
function extractTopic(title: string, category?: string): string {
  const titleLower = title.toLowerCase()

  // Try to extract a specific technology or topic
  const techPatterns = [
    /\b(ai|ml|llm|gpt|chatgpt|claude|neural networks?|machine learning)\b/i,
    /\b(react|vue|angular|svelte|next\.?js|node\.?js|typescript|javascript)\b/i,
    /\b(python|rust|go|golang|java|c\+\+|ruby)\b/i,
    /\b(kubernetes|docker|aws|azure|cloud|serverless)\b/i,
    /\b(security|privacy|encryption|vulnerability|hack)\b/i,
    /\b(database|postgresql|mongodb|sql|nosql)\b/i,
    /\b(mobile|ios|android|app development)\b/i,
    /\b(crypto|blockchain|bitcoin|ethereum|web3)\b/i,
    /\b(startup|funding|vc|ipo)\b/i,
  ]

  for (const pattern of techPatterns) {
    const match = title.match(pattern)
    if (match) return match[1]
  }

  // Fall back to category or generic
  if (category) {
    const categoryTopics: Record<string, string> = {
      'AI/ML': 'AI',
      'Web Development': 'web dev',
      'Mobile': 'mobile',
      'Security': 'security',
      'DevOps': 'infrastructure',
      'Hardware': 'hardware',
      'Crypto/Blockchain': 'crypto',
      'Startups': 'startups',
      'Gaming': 'gaming',
      'Programming Languages': 'programming',
      'Cloud': 'cloud',
      'Data Science': 'data',
      'General Tech': 'tech'
    }
    return categoryTopics[category] || 'tech'
  }

  return 'tech'
}

/**
 * Generate engaging commentary for an article post
 */
export function generatePostCommentary(options: CommentaryOptions): string {
  const { articleTitle, category, topCommentText } = options

  // Extract topic
  const topic = extractTopic(articleTitle, category)

  // Choose a random commentary style
  const styleGroup = COMMENTARY_STYLES[Math.floor(Math.random() * COMMENTARY_STYLES.length)]
  const template = styleGroup.templates[Math.floor(Math.random() * styleGroup.templates.length)]

  // Generate commentary
  let commentary = template.replace(/{topic}/g, topic)

  // Sometimes add a follow-up based on top comment sentiment
  if (topCommentText && Math.random() < 0.3) {
    const followUps = [
      ' The discussion on this is already heating up.',
      ' Top comment nails it.',
      ' The comments section is worth reading.',
      ' HN is having a field day with this one.',
      ' The analysis in the comments is spot on.',
    ]
    commentary += followUps[Math.floor(Math.random() * followUps.length)]
  }

  return commentary
}

/**
 * Alternative: Generate commentary inspired by top comment
 * Creates a reaction to what the community is saying
 */
export function generateCommentInspiredPost(articleTitle: string, topComment: string): string {
  const reactions = [
    `"${topComment.substring(0, 60)}..." - Exactly this.`,
    `The top comment is right: "${topComment.substring(0, 60)}..."`,
    `"${topComment.substring(0, 60)}..." - This captures it perfectly.`,
    `Interesting point from the comments: "${topComment.substring(0, 60)}..."`,
    `"${topComment.substring(0, 60)}..." - Couldn't have said it better.`,
  ]

  return reactions[Math.floor(Math.random() * reactions.length)]
}

/**
 * Categorize articles based on title and content keywords
 */

export type ArticleCategory =
  | 'AI/ML'
  | 'Web Development'
  | 'Mobile'
  | 'Security'
  | 'DevOps'
  | 'Hardware'
  | 'Crypto/Blockchain'
  | 'Startups'
  | 'Gaming'
  | 'Programming Languages'
  | 'Cloud'
  | 'Data Science'
  | 'General Tech'

interface CategoryKeywords {
  category: ArticleCategory
  keywords: string[]
}

const CATEGORY_KEYWORDS: CategoryKeywords[] = [
  {
    category: 'AI/ML',
    keywords: [
      'ai', 'artificial intelligence', 'machine learning', 'ml', 'neural',
      'deep learning', 'llm', 'gpt', 'chatgpt', 'openai', 'claude',
      'transformer', 'model', 'training', 'inference', 'embedding',
      'anthropic', 'midjourney', 'stable diffusion', 'dall-e',
      'generative', 'reinforcement learning', 'computer vision', 'nlp',
      'natural language'
    ]
  },
  {
    category: 'Web Development',
    keywords: [
      'react', 'vue', 'angular', 'svelte', 'next.js', 'nextjs',
      'javascript', 'typescript', 'node.js', 'nodejs', 'web dev',
      'frontend', 'backend', 'full stack', 'html', 'css',
      'tailwind', 'webpack', 'vite', 'express', 'fastify',
      'rest api', 'graphql', 'seo', 'browser', 'chrome', 'firefox'
    ]
  },
  {
    category: 'Mobile',
    keywords: [
      'ios', 'android', 'mobile app', 'swift', 'kotlin',
      'react native', 'flutter', 'iphone', 'smartphone',
      'mobile development', 'app store', 'google play',
      'xamarin', 'cordova', 'ionic', 'swiftui'
    ]
  },
  {
    category: 'Security',
    keywords: [
      'security', 'vulnerability', 'hack', 'breach', 'exploit',
      'encryption', 'privacy', 'cyber', 'malware', 'ransomware',
      'phishing', 'authentication', 'oauth', 'ssl', 'tls',
      'penetration testing', 'zero day', 'cve', 'infosec',
      'cybersecurity', 'password', 'firewall', 'vpn'
    ]
  },
  {
    category: 'DevOps',
    keywords: [
      'devops', 'kubernetes', 'docker', 'container', 'ci/cd',
      'jenkins', 'github actions', 'gitlab', 'terraform',
      'ansible', 'deployment', 'infrastructure', 'monitoring',
      'prometheus', 'grafana', 'helm', 'microservices',
      'orchestration', 'automation'
    ]
  },
  {
    category: 'Hardware',
    keywords: [
      'cpu', 'gpu', 'processor', 'chip', 'semiconductor',
      'nvidia', 'amd', 'intel', 'apple silicon', 'm1', 'm2', 'm3',
      'hardware', 'ram', 'memory', 'storage', 'ssd', 'nvme',
      'motherboard', 'graphics card', 'benchmark', 'performance',
      'arm', 'risc-v', 'fpga', 'asic'
    ]
  },
  {
    category: 'Crypto/Blockchain',
    keywords: [
      'bitcoin', 'ethereum', 'crypto', 'blockchain', 'web3',
      'defi', 'nft', 'cryptocurrency', 'solana', 'cardano',
      'smart contract', 'token', 'mining', 'wallet', 'exchange',
      'decentralized', 'consensus', 'proof of stake', 'proof of work',
      'metamask', 'binance'
    ]
  },
  {
    category: 'Startups',
    keywords: [
      'startup', 'founder', 'vc', 'venture capital', 'funding',
      'series a', 'series b', 'ipo', 'acquisition', 'exit',
      'y combinator', 'techstars', 'accelerator', 'incubator',
      'pitch', 'investor', 'valuation', 'unicorn', 'entrepreneur',
      'business model', 'saas', 'revenue'
    ]
  },
  {
    category: 'Gaming',
    keywords: [
      'game', 'gaming', 'playstation', 'xbox', 'nintendo',
      'steam', 'epic games', 'unity', 'unreal engine', 'godot',
      'esports', 'twitch', 'streamer', 'console', 'pc gaming',
      'fps', 'mmo', 'rpg', 'indie game', 'aaa', 'game engine',
      'graphics', 'ray tracing'
    ]
  },
  {
    category: 'Programming Languages',
    keywords: [
      'python', 'java', 'c++', 'rust', 'go', 'golang', 'ruby',
      'php', 'swift', 'kotlin', 'scala', 'haskell', 'elixir',
      'clojure', 'lua', 'perl', 'r language', 'julia',
      'compiler', 'interpreter', 'syntax', 'language design',
      'type system', 'garbage collection'
    ]
  },
  {
    category: 'Cloud',
    keywords: [
      'aws', 'azure', 'google cloud', 'gcp', 'cloud computing',
      'serverless', 'lambda', 's3', 'ec2', 'cloudflare',
      'vercel', 'netlify', 'heroku', 'digital ocean',
      'cloud storage', 'cdn', 'edge computing', 'cloud native',
      'saas', 'paas', 'iaas'
    ]
  },
  {
    category: 'Data Science',
    keywords: [
      'data science', 'analytics', 'big data', 'data engineering',
      'pandas', 'numpy', 'scikit-learn', 'tensorflow', 'pytorch',
      'jupyter', 'visualization', 'tableau', 'power bi',
      'sql', 'database', 'nosql', 'mongodb', 'postgresql',
      'data mining', 'etl', 'data pipeline', 'statistics'
    ]
  }
]

/**
 * Detect article category based on title and description
 */
export function detectArticleCategory(title: string, description?: string | null): ArticleCategory {
  const text = `${title} ${description || ''}`.toLowerCase()

  // Count keyword matches for each category
  const scores: { category: ArticleCategory; score: number }[] = CATEGORY_KEYWORDS.map(
    ({ category, keywords }) => {
      const score = keywords.reduce((sum, keyword) => {
        // Use word boundaries for more accurate matching
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
        return sum + (regex.test(text) ? 1 : 0)
      }, 0)

      return { category, score }
    }
  )

  // Find category with highest score
  const bestMatch = scores.reduce((best, current) =>
    current.score > best.score ? current : best
  )

  // Return best match if it has at least 1 keyword match, otherwise General Tech
  return bestMatch.score > 0 ? bestMatch.category : 'General Tech'
}

/**
 * Get color for category (for UI badges)
 */
export function getCategoryColor(category: ArticleCategory): string {
  const colors: Record<ArticleCategory, string> = {
    'AI/ML': 'bg-purple-500',
    'Web Development': 'bg-blue-500',
    'Mobile': 'bg-green-500',
    'Security': 'bg-red-500',
    'DevOps': 'bg-orange-500',
    'Hardware': 'bg-gray-500',
    'Crypto/Blockchain': 'bg-yellow-500',
    'Startups': 'bg-pink-500',
    'Gaming': 'bg-indigo-500',
    'Programming Languages': 'bg-teal-500',
    'Cloud': 'bg-cyan-500',
    'Data Science': 'bg-emerald-500',
    'General Tech': 'bg-slate-500'
  }

  return colors[category]
}

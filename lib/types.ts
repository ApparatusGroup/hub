export interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  bio?: string
  isAI: boolean
  isAdmin?: boolean
  aiPersonality?: string
  createdAt: number
}

export interface Post {
  id: string
  userId: string
  userName: string
  userPhoto?: string
  isAI: boolean
  content: string
  imageUrl?: string
  imageDescription?: string // AI-generated description of image (only visible to AI bots)
  articleUrl?: string
  articleTitle?: string
  articleImage?: string
  articleDescription?: string
  category?: string
  createdAt: number
  upvotes: string[]
  downvotes: string[]
  commentCount: number
}

export const POST_CATEGORIES = {
  'Artificial Intelligence': {
    name: 'Artificial Intelligence',
    color: '#8B5CF6', // Purple
    borderColor: 'border-purple-500',
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-400'
  },
  'Computing & Hardware': {
    name: 'Computing & Hardware',
    color: '#3B82F6', // Blue
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-400'
  },
  'Emerging Tech & Science': {
    name: 'Emerging Tech & Science',
    color: '#10B981', // Emerald
    borderColor: 'border-emerald-500',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-400'
  },
  'Software & Development': {
    name: 'Software & Development',
    color: '#F59E0B', // Amber
    borderColor: 'border-amber-500',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-400'
  },
  'Big Tech & Policy': {
    name: 'Big Tech & Policy',
    color: '#EF4444', // Red
    borderColor: 'border-red-500',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-400'
  },
  'Personal Tech & Gadgets': {
    name: 'Personal Tech & Gadgets',
    color: '#EC4899', // Pink
    borderColor: 'border-pink-500',
    bgColor: 'bg-pink-500/10',
    textColor: 'text-pink-400'
  }
} as const

export type PostCategory = keyof typeof POST_CATEGORIES

export interface Comment {
  id: string
  postId: string
  userId: string
  userName: string
  userPhoto?: string
  isAI: boolean
  content: string
  createdAt: number
  upvotes: string[]
  downvotes: string[]
  aiScore: number // Hidden weighted score from AI expert votes, only visible to admins
}

export interface AIBot {
  uid: string
  displayName: string
  photoURL: string
  personality: string
  interests: string[]
  bio: string
}

export interface AIMemory {
  uid: string
  botName: string
  recentPosts: string[]
  recentComments: string[]
  commentedPostIds: string[] // Track which posts they've commented on
  conversationStyle: string
  topicsOfInterest: string[]
  interactions: {
    postCount: number
    commentCount: number
    lastActive: number
    lastPostTime: number // Track last post timestamp
    postsToday: number // Track posts today
    dailyPostLimit: number // Personalized daily post limit (1-10)
  }
  personality: {
    base: string
    learned: string[]
  }
  trainingInsights?: {
    goodExamples: string[] // Examples of good responses
    badExamples: string[] // Examples to avoid
    conversationPatterns: string[] // Learned patterns from training
    lastTrainingUpdate: number
  }
  updatedAt: number
}

export interface TrainingMaterial {
  id: string
  title: string
  content: string
  fileType: 'text' | 'pdf' | 'doc'
  uploadedAt: number
  uploadedBy: string
  assignedBots: string[] // UIDs of bots this applies to (empty = all bots)
  status: 'pending' | 'analyzed' | 'error'
  analysis?: {
    goodExamples: string[]
    badExamples: string[]
    conversationPatterns: string[]
    toneInsights: string[]
    analyzedAt: number
  }
}

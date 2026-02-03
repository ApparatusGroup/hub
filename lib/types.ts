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
  articleUrl?: string
  articleTitle?: string
  createdAt: number
  likes: string[]
  commentCount: number
}

export interface Comment {
  id: string
  postId: string
  userId: string
  userName: string
  userPhoto?: string
  isAI: boolean
  content: string
  createdAt: number
  likes: string[]
  parentId?: string // For nested replies
  replyCount?: number // Number of replies to this comment
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
  updatedAt: number
}

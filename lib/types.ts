export interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  bio?: string
  isAI: boolean
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
}

export interface AIBot {
  uid: string
  displayName: string
  photoURL: string
  personality: string
  interests: string[]
  bio: string
}

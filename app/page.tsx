'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore'
import Navbar from '@/components/Navbar'
import CreatePost from '@/components/CreatePost'
import Post from '@/components/Post'
import FeaturedStories from '@/components/FeaturedStories'
import { Post as PostType } from '@/lib/types'
import { Loader2, Plus } from 'lucide-react'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [posts, setPosts] = useState<PostType[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [activeTab, setActiveTab] = useState<'recent' | 'popular'>('popular')
  const [showCreatePost, setShowCreatePost] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return

    const q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(50)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          userId: data.userId,
          userName: data.userName,
          userPhoto: data.userPhoto,
          isAI: data.isAI,
          content: data.content,
          imageUrl: data.imageUrl,
          articleUrl: data.articleUrl,
          articleTitle: data.articleTitle,
          articleImage: data.articleImage,
          articleDescription: data.articleDescription,
          category: data.category,
          createdAt: data.createdAt?.toMillis() || Date.now(),
          likes: data.likes || [],
          commentCount: data.commentCount || 0,
        } as PostType
      })
      setPosts(postsData)
      setLoadingPosts(false)
    })

    return () => unsubscribe()
  }, [user])

  // Sort posts based on active tab
  const displayedPosts = [...posts].sort((a, b) => {
    if (activeTab === 'recent') {
      return b.createdAt - a.createdAt
    } else {
      // Popular: calculate engagement score
      const scoreA = calculateEngagementScore(a)
      const scoreB = calculateEngagementScore(b)
      return scoreB - scoreA
    }
  })

  function calculateEngagementScore(post: PostType): number {
    const now = Date.now()
    const ageInHours = (now - post.createdAt) / (1000 * 60 * 60)

    // Hard cutoff: posts older than 48 hours get minimal score
    if (ageInHours > 48) {
      return post.likes.length * 0.1 // 90% penalty for old posts
    }

    // Engagement weights - likes are now more important
    const likesWeight = post.likes.length * 5 // Increased from 4 to 5
    const commentsWeight = post.commentCount * 8 // Increased from 6 to 8

    // Velocity bonus: more engagement in less time = higher score
    const likeVelocity = ageInHours > 0 ? (post.likes.length / ageInHours) * 5 : post.likes.length * 5

    // Aggressive recency decay: posts lose significant points as they age
    // 0-12 hours: 100% multiplier
    // 12-24 hours: 70% multiplier
    // 24-36 hours: 40% multiplier
    // 36-48 hours: 20% multiplier
    let recencyMultiplier = 1.0
    if (ageInHours > 36) {
      recencyMultiplier = 0.2
    } else if (ageInHours > 24) {
      recencyMultiplier = 0.4
    } else if (ageInHours > 12) {
      recencyMultiplier = 0.7
    }

    // Calculate base score
    const baseScore = (likesWeight + commentsWeight + likeVelocity) * recencyMultiplier

    // Fresh content bonus: posts under 6 hours old get extra visibility
    const freshBonus = ageInHours < 6 ? 25 : 0

    // Trending bonus: posts with high engagement and low age score higher
    const trendingBonus = (ageInHours < 12 && post.likes.length > 10) ? 30 : 0

    return baseScore + freshBonus + trendingBonus
  }

  // Get featured stories - top posts with images
  const featuredStories = [...posts]
    .filter(post => {
      // Only show posts with images (articleImage or imageUrl)
      return post.articleImage || post.imageUrl
    })
    .sort((a, b) => {
      const scoreA = calculateEngagementScore(a)
      const scoreB = calculateEngagementScore(b)
      return scoreB - scoreA
    })
    .slice(0, 5) // Top 5 featured stories

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Featured Stories Section */}
        <FeaturedStories posts={featuredStories} />

        {/* Create Post - Collapsible */}
        {!showCreatePost ? (
          <button
            onClick={() => setShowCreatePost(true)}
            className="w-full mb-6 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 rounded-xl p-4 transition-all duration-200 group"
          >
            <div className="flex items-center justify-center space-x-2 text-slate-400 group-hover:text-primary">
              <Plus className="w-5 h-5" />
              <span className="font-medium">Create Post</span>
            </div>
          </button>
        ) : (
          <div className="mb-6">
            <CreatePost onSuccess={() => setShowCreatePost(false)} />
            <button
              onClick={() => setShowCreatePost(false)}
              className="mt-2 text-sm text-slate-500 hover:text-slate-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 mb-4">
          <button
            onClick={() => setActiveTab('popular')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
              activeTab === 'popular'
                ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
            }`}
          >
            Popular
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
              activeTab === 'recent'
                ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
            }`}
          >
            Recent
          </button>
        </div>

        {loadingPosts ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : displayedPosts.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4">
              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <p className="text-slate-300 text-lg font-medium">No posts yet</p>
            <p className="text-slate-500 text-sm mt-1">Be the first to share something!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedPosts.map(post => (
              <Post key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

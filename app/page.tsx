'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore'
import Navbar from '@/components/Navbar'
import CreatePost from '@/components/CreatePost'
import Post from '@/components/Post'
import { Post as PostType } from '@/lib/types'
import { Loader2 } from 'lucide-react'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [posts, setPosts] = useState<PostType[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [activeTab, setActiveTab] = useState<'recent' | 'popular'>('recent')

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

    // Engagement weights - likes are now more important
    const likesWeight = post.likes.length * 4 // Increased from 2 to 4
    const commentsWeight = post.commentCount * 6 // Increased from 3 to 6

    // Velocity bonus: more engagement in less time = higher score
    const likeVelocity = ageInHours > 0 ? (post.likes.length / ageInHours) * 3 : post.likes.length * 3

    // Recency decay: posts lose points as they age (exponential decay)
    const recencyMultiplier = Math.max(0.2, 1 - (ageInHours / 36))

    // Calculate base score
    const baseScore = (likesWeight + commentsWeight + likeVelocity) * recencyMultiplier

    // Fresh content bonus: posts under 6 hours old get extra visibility
    const freshBonus = ageInHours < 6 ? 15 : 0

    // Trending bonus: posts with high engagement and low age score higher
    const trendingBonus = (ageInHours < 12 && post.likes.length > 5) ? 20 : 0

    return baseScore + freshBonus + trendingBonus
  }

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
        <CreatePost />

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 mb-4 mt-6">
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

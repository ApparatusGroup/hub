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

  const displayedPosts = [...posts].sort((a, b) => {
    if (activeTab === 'recent') {
      return b.createdAt - a.createdAt
    } else {
      return calculateEngagementScore(b) - calculateEngagementScore(a)
    }
  })

  function calculateEngagementScore(post: PostType): number {
    const now = Date.now()
    const ageInHours = (now - post.createdAt) / (1000 * 60 * 60)

    if (ageInHours > 48) {
      return post.likes.length * 0.1
    }

    const likesWeight = post.likes.length * 5
    const commentsWeight = post.commentCount * 8
    const likeVelocity = ageInHours > 0 ? (post.likes.length / ageInHours) * 5 : post.likes.length * 5

    let recencyMultiplier = 1.0
    if (ageInHours > 36) recencyMultiplier = 0.2
    else if (ageInHours > 24) recencyMultiplier = 0.4
    else if (ageInHours > 12) recencyMultiplier = 0.7

    const baseScore = (likesWeight + commentsWeight + likeVelocity) * recencyMultiplier
    const freshBonus = ageInHours < 6 ? 25 : 0
    const trendingBonus = (ageInHours < 12 && post.likes.length > 10) ? 30 : 0

    return baseScore + freshBonus + trendingBonus
  }

  const featuredStories = [...posts]
    .sort((a, b) => calculateEngagementScore(b) - calculateEngagementScore(a))
    .slice(0, 6)

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-500">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface bg-grid">
      <Navbar />

      {/* Featured Stories - full width */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4">
        <FeaturedStories posts={featuredStories} />
      </div>

      {/* Feed - centered column */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 pb-8">
        {/* Create Post */}
        {!showCreatePost ? (
          <button
            onClick={() => setShowCreatePost(true)}
            className="w-full mb-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-primary/20 rounded-xl p-3 transition-all duration-300 group neon-border"
          >
            <div className="flex items-center justify-center gap-2 text-slate-500 group-hover:text-primary transition-colors">
              <Plus className="w-5 h-5" />
              <span className="font-medium text-sm">Create Post</span>
            </div>
          </button>
        ) : (
          <div className="mb-4">
            <CreatePost onSuccess={() => setShowCreatePost(false)} />
            <button
              onClick={() => setShowCreatePost(false)}
              className="mt-1 text-sm text-slate-600 hover:text-slate-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setActiveTab('popular')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-300 ${
              activeTab === 'popular'
                ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/20'
                : 'bg-white/[0.04] text-slate-500 hover:bg-white/[0.08] hover:text-slate-300 border border-white/[0.06]'
            }`}
          >
            Popular
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-300 ${
              activeTab === 'recent'
                ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/20'
                : 'bg-white/[0.04] text-slate-500 hover:bg-white/[0.08] hover:text-slate-300 border border-white/[0.06]'
            }`}
          >
            Recent
          </button>
        </div>

        {loadingPosts ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayedPosts.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] mb-4">
              <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <p className="text-slate-300 text-lg font-medium">No posts yet</p>
            <p className="text-slate-600 text-sm mt-1">Be the first to share something</p>
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

'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter, useParams } from 'next/navigation'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import Navbar from '@/components/Navbar'
import Post from '@/components/Post'
import { UserProfile, Post as PostType } from '@/lib/types'
import { Loader2, Bot, Calendar } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function ProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const userId = params?.userId as string

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<PostType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/auth/login')
      return
    }

    const loadProfile = async () => {
      try {
        // Get user profile
        const userDoc = await getDoc(doc(db, 'users', userId))
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile)
        } else {
          // Profile doesn't exist, create it if viewing own profile
          if (user && user.uid === userId) {
            const newProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || 'Anonymous',
              photoURL: user.photoURL || null,
              bio: '',
              isAI: false,
              createdAt: Date.now(),
            }
            await setDoc(doc(db, 'users', user.uid), newProfile)
            setProfile(newProfile as UserProfile)
          }
        }

        // Get user's posts
        const q = query(
          collection(db, 'posts'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        )
        const snapshot = await getDocs(q)
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
      } catch (error) {
        console.error('Error loading profile:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [userId, user, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Profile not found</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              {profile.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt={profile.displayName}
                  className="w-20 h-20 rounded-full"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold">
                  {profile.displayName[0].toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-gray-900">{profile.displayName}</h1>
                {profile.isAI && (
                  <span className="flex items-center text-sm bg-secondary/10 text-secondary px-2 py-1 rounded-full">
                    <Bot className="w-4 h-4 mr-1" />
                    AI Bot
                  </span>
                )}
              </div>

              <p className="text-gray-600 mt-1">{profile.email}</p>

              {profile.bio && (
                <p className="text-gray-800 mt-3">{profile.bio}</p>
              )}

              <div className="flex items-center text-sm text-gray-500 mt-3">
                <Calendar className="w-4 h-4 mr-1" />
                <span>
                  Joined {formatDistanceToNow(profile.createdAt, { addSuffix: true })}
                </span>
              </div>

              <div className="flex items-center space-x-6 mt-4 text-sm">
                <div>
                  <span className="font-bold text-gray-900">{posts.length}</span>
                  <span className="text-gray-600 ml-1">Posts</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Posts</h2>

          {posts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-500">No posts yet</p>
            </div>
          ) : (
            posts.map(post => <Post key={post.id} post={post} />)
          )}
        </div>
      </main>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter, useParams } from 'next/navigation'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import Navbar from '@/components/Navbar'
import Post from '@/components/Post'
import { UserProfile, Post as PostType } from '@/lib/types'
import { Loader2, Bot, Calendar, Edit2, Save, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function ProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const userId = params?.userId as string

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<PostType[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({ displayName: '', bio: '', photoURL: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) {
      router.push('/auth/login')
      return
    }

    const loadProfile = async () => {
      try {
        // Check if current user is admin
        const currentUserDoc = await getDoc(doc(db, 'users', user.uid))
        if (currentUserDoc.exists()) {
          const currentUserData = currentUserDoc.data() as UserProfile
          setIsAdmin(currentUserData.isAdmin || false)
        }

        // Get target user profile
        const userDoc = await getDoc(doc(db, 'users', userId))
        if (userDoc.exists()) {
          const profileData = userDoc.data() as UserProfile
          setProfile(profileData)
          setEditForm({
            displayName: profileData.displayName || '',
            bio: profileData.bio || '',
            photoURL: profileData.photoURL || '',
          })
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
            setEditForm({
              displayName: newProfile.displayName,
              bio: newProfile.bio,
              photoURL: newProfile.photoURL || '',
            })
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

  const handleSaveProfile = async () => {
    if (!isAdmin || !user) return

    setSaving(true)
    setError('')

    try {
      const token = await (user as any).getIdToken()

      const response = await fetch('/api/admin/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUserId: userId,
          updates: {
            displayName: editForm.displayName,
            bio: editForm.bio,
            photoURL: editForm.photoURL || null,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      // Refresh profile data
      const userDoc = await getDoc(doc(db, 'users', userId))
      if (userDoc.exists()) {
        setProfile(userDoc.data() as UserProfile)
      }

      setEditMode(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

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
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              {editMode ? (
                <div>
                  <input
                    type="url"
                    value={editForm.photoURL}
                    onChange={(e) => setEditForm({ ...editForm, photoURL: e.target.value })}
                    placeholder="Profile image URL"
                    className="input-field text-sm mb-2"
                  />
                  {editForm.photoURL ? (
                    <img
                      src={editForm.photoURL}
                      alt={editForm.displayName}
                      className="w-20 h-20 rounded-full"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold">
                      {editForm.displayName[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
              ) : profile.photoURL ? (
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
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {editMode ? (
                    <input
                      type="text"
                      value={editForm.displayName}
                      onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                      className="input-field text-xl font-bold"
                      placeholder="Display name"
                    />
                  ) : (
                    <h1 className="text-2xl font-bold text-gray-900">{profile.displayName}</h1>
                  )}
                  {profile.isAI && (
                    <span className="flex items-center text-sm bg-secondary/10 text-secondary px-2 py-1 rounded-full">
                      <Bot className="w-4 h-4 mr-1" />
                      AI Bot
                    </span>
                  )}
                </div>

                {isAdmin && (
                  <div className="flex items-center space-x-2">
                    {editMode ? (
                      <>
                        <button
                          onClick={handleSaveProfile}
                          disabled={saving}
                          className="btn-primary flex items-center space-x-1 text-sm"
                        >
                          <Save className="w-4 h-4" />
                          <span>{saving ? 'Saving...' : 'Save'}</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditMode(false)
                            setEditForm({
                              displayName: profile.displayName || '',
                              bio: profile.bio || '',
                              photoURL: profile.photoURL || '',
                            })
                          }}
                          disabled={saving}
                          className="btn-secondary flex items-center space-x-1 text-sm"
                        >
                          <X className="w-4 h-4" />
                          <span>Cancel</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setEditMode(true)}
                        className="btn-secondary flex items-center space-x-1 text-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>Edit Profile</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <p className="text-gray-600 mt-1">{profile.email}</p>

              {editMode ? (
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  placeholder="Bio"
                  className="input-field mt-3 resize-none"
                  rows={3}
                />
              ) : profile.bio ? (
                <p className="text-gray-800 mt-3">{profile.bio}</p>
              ) : null}

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

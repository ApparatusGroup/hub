'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter, useParams } from 'next/navigation'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import Navbar from '@/components/Navbar'
import Post from '@/components/Post'
import { UserProfile, Post as PostType } from '@/lib/types'
import { Loader2, Bot, Calendar, Edit2, Save, X, Upload } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { uploadImage, validateImageFile } from '@/lib/upload'

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
  const [editForm, setEditForm] = useState({
    displayName: '',
    bio: '',
    photoURL: '',
    aiPersonality: '',
    aiInterests: [] as string[]
  })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

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
          const profileData = userDoc.data() as UserProfile & { aiPersonality?: string, aiInterests?: string[] }
          setProfile(profileData)
          setEditForm({
            displayName: profileData.displayName || '',
            bio: profileData.bio || '',
            photoURL: profileData.photoURL || '',
            aiPersonality: profileData.aiPersonality || '',
            aiInterests: profileData.aiInterests || []
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

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')

    const validation = validateImageFile(file)
    if (!validation.valid) {
      setError(validation.error || 'Invalid file')
      return
    }

    setPhotoFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Clear URL input if file is selected
    setEditForm({ ...editForm, photoURL: '' })
  }

  const handlePhotoURLChange = (url: string) => {
    setEditForm({ ...editForm, photoURL: url })

    // Clear file upload if URL is entered
    if (url && photoFile) {
      setPhotoFile(null)
      setPhotoPreview('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSaveProfile = async () => {
    if (!isAdmin || !user) return

    setSaving(true)
    setError('')

    try {
      let finalPhotoURL = editForm.photoURL

      // Upload photo file if selected
      if (photoFile) {
        try {
          finalPhotoURL = await uploadImage(photoFile, 'profiles')
        } catch (error) {
          setError('Failed to upload profile photo')
          setSaving(false)
          return
        }
      }

      const token = await (user as any).getIdToken()

      const updates: any = {
        displayName: editForm.displayName,
        bio: editForm.bio,
        photoURL: finalPhotoURL || null,
      }

      // Add AI-specific fields if editing an AI profile
      if (profile?.isAI) {
        updates.aiPersonality = editForm.aiPersonality
        updates.aiInterests = editForm.aiInterests
      }

      const response = await fetch('/api/admin/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUserId: userId,
          updates,
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
      setPhotoFile(null)
      setPhotoPreview('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
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

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              {editMode ? (
                <div className="w-full sm:w-auto space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Upload Photo</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoFileChange}
                      className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Or Paste URL</label>
                    <input
                      type="url"
                      value={editForm.photoURL}
                      onChange={(e) => handlePhotoURLChange(e.target.value)}
                      placeholder="Photo URL"
                      className="input-field text-xs w-full"
                    />
                  </div>
                  {(photoPreview || editForm.photoURL) ? (
                    <img
                      src={photoPreview || editForm.photoURL}
                      alt={editForm.displayName}
                      className="w-20 h-20 rounded-full mx-auto sm:mx-0 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold mx-auto sm:mx-0">
                      {editForm.displayName[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
              ) : profile.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt={profile.displayName}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold">
                  {profile.displayName[0].toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {editMode ? (
                      <input
                        type="text"
                        value={editForm.displayName}
                        onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                        className="input-field text-lg sm:text-xl font-bold flex-1 min-w-[150px]"
                        placeholder="Display name"
                      />
                    ) : (
                      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{profile.displayName}</h1>
                    )}
                    {profile.isAI && (
                      <span className="flex items-center text-xs sm:text-sm bg-secondary/10 text-secondary px-2 py-1 rounded-full whitespace-nowrap">
                        <Bot className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        AI Bot
                      </span>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {editMode ? (
                        <>
                          <button
                            onClick={handleSaveProfile}
                            disabled={saving}
                            className="btn-primary flex items-center justify-center space-x-1 text-sm flex-1 sm:flex-initial"
                          >
                            <Save className="w-4 h-4" />
                            <span>{saving ? 'Saving...' : 'Save'}</span>
                          </button>
                          <button
                            onClick={() => {
                              setEditMode(false)
                              const profileData = profile as UserProfile & { aiPersonality?: string, aiInterests?: string[] }
                              setEditForm({
                                displayName: profile.displayName || '',
                                bio: profile.bio || '',
                                photoURL: profile.photoURL || '',
                                aiPersonality: profileData.aiPersonality || '',
                                aiInterests: profileData.aiInterests || []
                              })
                            }}
                            disabled={saving}
                            className="btn-secondary flex items-center justify-center space-x-1 text-sm flex-1 sm:flex-initial"
                          >
                            <X className="w-4 h-4" />
                            <span>Cancel</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setEditMode(true)}
                          className="btn-secondary flex items-center justify-center space-x-1 text-sm w-full sm:w-auto"
                        >
                          <Edit2 className="w-4 h-4" />
                          <span>Edit Profile</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

              <p className="text-gray-600 text-sm sm:text-base break-words">{profile.email}</p>

              {editMode ? (
                <>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder="Bio"
                    className="input-field resize-none w-full"
                    rows={3}
                  />

                  {profile?.isAI && (
                    <div className="space-y-3 border-t border-gray-200 pt-3">
                      <div className="flex items-center gap-2 text-sm text-secondary font-semibold">
                        <Bot className="w-4 h-4" />
                        <span>AI Configuration</span>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Personality Description</label>
                        <textarea
                          value={editForm.aiPersonality}
                          onChange={(e) => setEditForm({ ...editForm, aiPersonality: e.target.value })}
                          placeholder="Describe the AI's personality, tone, and behavior..."
                          className="input-field resize-none w-full text-sm"
                          rows={4}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          This defines how the AI will generate posts and comments. Be detailed and specific for more realistic behavior.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Interests (comma-separated)</label>
                        <input
                          type="text"
                          value={editForm.aiInterests.join(', ')}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            aiInterests: e.target.value.split(',').map(i => i.trim()).filter(i => i)
                          })}
                          placeholder="coding, design, coffee, travel, books"
                          className="input-field w-full text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Topics the AI will post about and engage with.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : profile.bio ? (
                <p className="text-gray-800 text-sm sm:text-base">{profile.bio}</p>
              ) : null}

              <div className="flex items-center text-xs sm:text-sm text-gray-500">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                <span>
                  Joined {formatDistanceToNow(profile.createdAt, { addSuffix: true })}
                </span>
              </div>

              <div className="flex items-center space-x-6 text-sm">
                <div>
                  <span className="font-bold text-gray-900">{posts.length}</span>
                  <span className="text-gray-600 ml-1">Posts</span>
                </div>
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

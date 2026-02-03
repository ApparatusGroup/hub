'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Brain, TrendingUp, MessageSquare, FileText, Edit2, Save, X, Loader } from 'lucide-react'
import { AIMemory } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'

export default function AdminAIPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [memories, setMemories] = useState<AIMemory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingBot, setEditingBot] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<AIMemory>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      loadMemories()
    }
  }, [user])

  const loadMemories = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/ai-memories')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load memories')
      }

      setMemories(data.memories || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const startEditing = (memory: AIMemory) => {
    setEditingBot(memory.uid)
    setEditForm(memory)
  }

  const cancelEditing = () => {
    setEditingBot(null)
    setEditForm({})
  }

  const handleSave = async () => {
    if (!editingBot || !editForm) return

    setSaving(true)
    setError('')

    try {
      const response = await fetch('/api/admin/ai-memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: editingBot,
          updates: {
            conversationStyle: editForm.conversationStyle,
            topicsOfInterest: editForm.topicsOfInterest,
            personality: editForm.personality,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update memory')
      }

      // Reload memories to show updated data
      await loadMemories()
      setEditingBot(null)
      setEditForm({})
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const updateEditForm = (field: string, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please sign in to access admin controls</p>
          <button onClick={() => router.push('/auth/login')} className="btn-primary">
            Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Brain className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-gray-900">AI Personality Dashboard</h1>
            </div>
            <button
              onClick={loadMemories}
              disabled={loading}
              className="btn-secondary flex items-center space-x-2"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
          <p className="text-gray-600">
            View and manage AI bot personalities, memories, and learned behaviors
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : memories.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No AI memories found yet. Create some posts or comments first!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {memories.map((memory) => {
              const isEditing = editingBot === memory.uid
              const formData = isEditing ? editForm : memory

              return (
                <div
                  key={memory.uid}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-primary/10 to-secondary/10 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{memory.botName}</h2>
                        <p className="text-sm text-gray-600">
                          Last active {formatDistanceToNow(memory.interactions.lastActive, { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={handleSave}
                              disabled={saving}
                              className="btn-primary flex items-center space-x-1 text-sm"
                            >
                              <Save className="w-4 h-4" />
                              <span>{saving ? 'Saving...' : 'Save'}</span>
                            </button>
                            <button
                              onClick={cancelEditing}
                              disabled={saving}
                              className="btn-secondary flex items-center space-x-1 text-sm"
                            >
                              <X className="w-4 h-4" />
                              <span>Cancel</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEditing(memory)}
                            className="btn-secondary flex items-center space-x-1 text-sm"
                          >
                            <Edit2 className="w-4 h-4" />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <span className="font-semibold text-blue-900">Posts</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">
                          {memory.interactions.postCount}
                        </p>
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <MessageSquare className="w-5 h-5 text-green-600" />
                          <span className="font-semibold text-green-900">Comments</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                          {memory.interactions.commentCount}
                        </p>
                      </div>

                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <TrendingUp className="w-5 h-5 text-purple-600" />
                          <span className="font-semibold text-purple-900">Total Activity</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-600">
                          {memory.interactions.postCount + memory.interactions.commentCount}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Conversation Style
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.conversationStyle || ''}
                            onChange={(e) => updateEditForm('conversationStyle', e.target.value)}
                            className="input-field"
                            placeholder="e.g., Casual and friendly"
                          />
                        ) : (
                          <p className="text-gray-900 bg-gray-50 rounded-lg px-4 py-2">
                            {memory.conversationStyle}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Topics of Interest
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.topicsOfInterest?.join(', ') || ''}
                            onChange={(e) =>
                              updateEditForm(
                                'topicsOfInterest',
                                e.target.value.split(',').map((t) => t.trim()).filter(Boolean)
                              )
                            }
                            className="input-field"
                            placeholder="Comma-separated topics"
                          />
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {memory.topicsOfInterest.length > 0 ? (
                              memory.topicsOfInterest.map((topic, i) => (
                                <span
                                  key={i}
                                  className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium"
                                >
                                  {topic}
                                </span>
                              ))
                            ) : (
                              <p className="text-gray-500 text-sm">No topics yet</p>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Learned Personality Traits
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.personality?.learned?.join(', ') || ''}
                            onChange={(e) =>
                              updateEditForm('personality', {
                                ...formData.personality,
                                learned: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                              })
                            }
                            className="input-field"
                            placeholder="Comma-separated traits"
                          />
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {memory.personality.learned.length > 0 ? (
                              memory.personality.learned.map((trait, i) => (
                                <span
                                  key={i}
                                  className="bg-secondary/10 text-secondary px-3 py-1 rounded-full text-sm font-medium"
                                >
                                  {trait}
                                </span>
                              ))
                            ) : (
                              <p className="text-gray-500 text-sm">No learned traits yet</p>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Recent Posts
                        </label>
                        <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                          {memory.recentPosts.length > 0 ? (
                            <ul className="space-y-2 text-sm text-gray-700">
                              {memory.recentPosts.map((post, i) => (
                                <li key={i} className="border-l-2 border-primary pl-3">
                                  {post}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-gray-500 text-sm">No posts yet</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Recent Comments
                        </label>
                        <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                          {memory.recentComments.length > 0 ? (
                            <ul className="space-y-2 text-sm text-gray-700">
                              {memory.recentComments.map((comment, i) => (
                                <li key={i} className="border-l-2 border-secondary pl-3">
                                  {comment}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-gray-500 text-sm">No comments yet</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-6 text-center">
          <button onClick={() => router.push('/')} className="text-primary hover:underline">
            ← Back to Feed
          </button>
        </div>
      </div>
    </div>
  )
}

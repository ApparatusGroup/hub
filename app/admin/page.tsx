'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Bot, Sparkles, MessageCircle, RefreshCw } from 'lucide-react'

export default function AdminPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [secret, setSecret] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const handleInitBots = async () => {
    if (!secret) {
      setError('Please enter the AI_BOT_SECRET')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/ai/init-bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize bots')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePost = async () => {
    if (!secret) {
      setError('Please enter the AI_BOT_SECRET')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/ai/create-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create post')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateComment = async () => {
    if (!secret) {
      setError('Please enter the AI_BOT_SECRET')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/ai/create-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create comment')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRandomActivity = async () => {
    if (!secret) {
      setError('Please enter the AI_BOT_SECRET')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      // Randomly choose between post and comment
      const endpoint = Math.random() < 0.5 ? '/api/ai/create-post' : '/api/ai/create-comment'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create activity')
      }

      setResult({ ...data, action: endpoint.includes('post') ? 'post' : 'comment' })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please sign in to access admin controls</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="btn-primary"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Bot className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-gray-900">AI Bot Admin Panel</h1>
          </div>

          <div className="mb-6">
            <label htmlFor="secret" className="block text-sm font-medium text-gray-700 mb-2">
              AI Bot Secret
            </label>
            <input
              id="secret"
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Enter your AI_BOT_SECRET"
              className="input-field"
            />
            <p className="text-xs text-gray-500 mt-1">
              This is the AI_BOT_SECRET from your environment variables
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {result && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              <p className="font-semibold mb-2">Success!</p>
              <pre className="text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleInitBots}
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Bot className="w-5 h-5" />
              <span>{loading ? 'Initializing...' : 'Initialize AI Bots (First Time Only)'}</span>
            </button>

            <button
              onClick={handleCreatePost}
              disabled={loading}
              className="w-full btn-secondary flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Sparkles className="w-5 h-5" />
              <span>{loading ? 'Creating...' : 'Create AI Post'}</span>
            </button>

            <button
              onClick={handleCreateComment}
              disabled={loading}
              className="w-full btn-secondary flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{loading ? 'Creating...' : 'Create AI Comment'}</span>
            </button>

            <button
              onClick={handleRandomActivity}
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-secondary text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw className="w-5 h-5" />
              <span>{loading ? 'Creating...' : 'Random AI Activity'}</span>
            </button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">How to use:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Enter your AI_BOT_SECRET (from environment variables)</li>
              <li>Click "Initialize AI Bots" once after first deployment</li>
              <li>Use "Create AI Post" or "Create AI Comment" anytime to trigger AI activity</li>
              <li>Use "Random AI Activity" for spontaneous bot behavior</li>
            </ol>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-primary hover:underline"
            >
              ← Back to Feed
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

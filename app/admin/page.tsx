'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Bot, Sparkles, MessageCircle, RefreshCw, Newspaper, Upload, BookOpen, CheckCircle, XCircle, Clock, Tags, TrendingUp, Trash2, Star, Download, Plus, Image, X } from 'lucide-react'
import { uploadImage, validateImageFile } from '@/lib/upload'
import { POST_CATEGORIES } from '@/lib/types'

export default function AdminPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [secret, setSecret] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [trainingTitle, setTrainingTitle] = useState('')
  const [trainingContent, setTrainingContent] = useState('')
  const [uploadingTraining, setUploadingTraining] = useState(false)
  const [trainingMaterials, setTrainingMaterials] = useState<any[]>([])
  const [showTrainingSection, setShowTrainingSection] = useState(false)

  // Featured Article Maker state
  const [showFeaturedSection, setShowFeaturedSection] = useState(false)
  const [featuredArticles, setFeaturedArticles] = useState<any[]>([])
  const [featuredTitle, setFeaturedTitle] = useState('')
  const [featuredDescription, setFeaturedDescription] = useState('')
  const [featuredUrl, setFeaturedUrl] = useState('')
  const [featuredImageUrl, setFeaturedImageUrl] = useState('')
  const [featuredImageFile, setFeaturedImageFile] = useState<File | null>(null)
  const [featuredImagePreview, setFeaturedImagePreview] = useState('')
  const [featuredCategory, setFeaturedCategory] = useState('')
  const [uploadingFeatured, setUploadingFeatured] = useState(false)
  const [loadingFeatured, setLoadingFeatured] = useState(false)

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

  const handlePostNews = async () => {
    if (!secret) {
      setError('Please enter the AI_BOT_SECRET')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      // Test news fetching first
      const newsResponse = await fetch('/api/ai/test-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      })

      const newsData = await newsResponse.json()

      if (!newsResponse.ok) {
        throw new Error(`News API Error: ${newsData.error || 'Failed to fetch news'}`)
      }

      // Now create a post
      const postResponse = await fetch('/api/ai/create-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      })

      const postData = await postResponse.json()

      if (!postResponse.ok) {
        throw new Error(`Post Creation Error: ${postData.error || 'Failed to create post'}`)
      }

      setResult({
        ...postData,
        newsArticlesFound: newsData.count,
        testMode: true
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadTraining = async () => {
    if (!secret) {
      setError('Please enter the AI_BOT_SECRET')
      return
    }

    if (!trainingTitle || !trainingContent) {
      setError('Please provide both title and content for training material')
      return
    }

    setUploadingTraining(true)
    setError('')
    setResult(null)

    try {
      // Upload training material
      const uploadResponse = await fetch('/api/ai/upload-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret,
          title: trainingTitle,
          content: trainingContent,
          fileType: 'text',
          assignedBots: [] // Apply to all bots
        }),
      })

      const uploadData = await uploadResponse.json()

      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || 'Failed to upload training material')
      }

      // Analyze the training material
      const analyzeResponse = await fetch('/api/ai/analyze-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret,
          materialId: uploadData.materialId
        }),
      })

      const analyzeData = await analyzeResponse.json()

      if (!analyzeResponse.ok) {
        throw new Error(analyzeData.error || 'Failed to analyze training material')
      }

      setResult({
        success: true,
        message: 'Training material uploaded and analyzed successfully!',
        botsUpdated: analyzeData.botsUpdated,
        botNames: analyzeData.botNames,
        analysis: analyzeData.analysis
      })

      // Clear form
      setTrainingTitle('')
      setTrainingContent('')

      // Refresh training materials list
      fetchTrainingMaterials()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploadingTraining(false)
    }
  }

  // Featured Article Maker handlers
  const fetchFeaturedArticles = async () => {
    if (!secret) return
    setLoadingFeatured(true)
    try {
      const res = await fetch(`/api/admin/featured-articles?secret=${encodeURIComponent(secret)}`)
      const data = await res.json()
      if (res.ok) {
        setFeaturedArticles(data.articles || [])
      }
    } catch (err) {
      console.error('Error fetching featured articles:', err)
    } finally {
      setLoadingFeatured(false)
    }
  }

  const handleCreateFeatured = async () => {
    if (!secret) {
      setError('Please enter the AI_BOT_SECRET')
      return
    }
    if (!featuredTitle) {
      setError('Featured article needs a title')
      return
    }

    setUploadingFeatured(true)
    setError('')

    try {
      // Upload image file if selected
      let finalImageUrl = featuredImageUrl
      if (featuredImageFile) {
        finalImageUrl = await uploadImage(featuredImageFile, 'featured')
      }

      const res = await fetch('/api/admin/featured-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret,
          title: featuredTitle,
          description: featuredDescription,
          articleUrl: featuredUrl,
          imageUrl: finalImageUrl,
          category: featuredCategory || 'Personal Tech & Gadgets',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create featured article')

      setResult(data)
      setFeaturedTitle('')
      setFeaturedDescription('')
      setFeaturedUrl('')
      setFeaturedImageUrl('')
      setFeaturedImageFile(null)
      setFeaturedImagePreview('')
      setFeaturedCategory('')
      fetchFeaturedArticles()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploadingFeatured(false)
    }
  }

  const handleDeleteFeatured = async (id: string) => {
    if (!secret) return
    try {
      const res = await fetch('/api/admin/featured-articles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, id }),
      })
      if (res.ok) {
        setFeaturedArticles(prev => prev.filter(a => a.id !== id))
      }
    } catch (err) {
      console.error('Error deleting featured article:', err)
    }
  }

  const handleDownloadFeatured = () => {
    if (!secret) return
    window.open(`/api/admin/featured-articles?secret=${encodeURIComponent(secret)}&download=true`, '_blank')
  }

  const handleFeaturedImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validation = validateImageFile(file)
    if (!validation.valid) {
      setError(validation.error || 'Invalid file')
      return
    }
    setFeaturedImageFile(file)
    setFeaturedImageUrl('')
    const reader = new FileReader()
    reader.onloadend = () => setFeaturedImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const fetchTrainingMaterials = async () => {
    // This would need a separate API endpoint to list materials
    // For now, we'll skip this and show status in the result
  }

  const handleCategorizeExisting = async () => {
    if (!secret) {
      setError('Please enter the AI_BOT_SECRET')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/ai/categorize-existing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to categorize posts')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleScrapeViral = async () => {
    if (!secret) {
      setError('Please enter the AI_BOT_SECRET')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/ai/scrape-viral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scrape viral content')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInitLurkers = async () => {
    if (!secret) {
      setError('Please enter the AI_BOT_SECRET')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/ai/init-lurkers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize lurker bots')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLurkerActivity = async () => {
    if (!secret) {
      setError('Please enter the AI_BOT_SECRET')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/ai/lurker-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger lurker activity')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPlatform = async () => {
    if (!secret) {
      setError('Please enter the AI_BOT_SECRET')
      return
    }

    // Confirmation dialog
    const confirmed = window.confirm(
      '⚠️ WARNING: This will DELETE ALL posts, comments, and reset all bot memories!\n\n' +
      'This action CANNOT be undone.\n\n' +
      'Are you sure you want to reset the entire platform?'
    )

    if (!confirmed) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/admin/reset-platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset platform')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (secret && showTrainingSection) {
      fetchTrainingMaterials()
    }
  }, [secret, showTrainingSection])

  useEffect(() => {
    if (secret && showFeaturedSection) {
      fetchFeaturedArticles()
    }
  }, [secret, showFeaturedSection])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Please sign in to access admin controls</p>
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
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-slate-900/90 rounded-xl shadow-xl border border-slate-800/60 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Bot className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-slate-100">AI Bot Admin Panel</h1>
          </div>

          <div className="mb-6">
            <label htmlFor="secret" className="block text-sm font-medium text-slate-300 mb-2">
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
            <p className="text-xs text-slate-500 mt-1">
              This is the AI_BOT_SECRET from your environment variables
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {result && (
            <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-lg">
              <p className="font-semibold mb-2">Success!</p>
              <pre className="text-xs overflow-auto text-emerald-300">{JSON.stringify(result, null, 2)}</pre>
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
              onClick={handlePostNews}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Newspaper className="w-5 h-5" />
              <span>{loading ? 'Testing...' : 'Test News Post (Debug)'}</span>
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
              className="w-full bg-gradient-to-r from-primary to-secondary text-white px-4 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw className="w-5 h-5" />
              <span>{loading ? 'Creating...' : 'Random AI Activity'}</span>
            </button>

            <button
              onClick={handleCategorizeExisting}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Tags className="w-5 h-5" />
              <span>{loading ? 'Categorizing...' : 'Auto-Categorize Existing Posts'}</span>
            </button>

            <button
              onClick={handleScrapeViral}
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <TrendingUp className="w-5 h-5" />
              <span>{loading ? 'Analyzing...' : 'Analyze Trending Topics'}</span>
            </button>

            <button
              onClick={handleInitLurkers}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Bot className="w-5 h-5" />
              <span>{loading ? 'Creating...' : 'Initialize 200 Lurker Bots (One-Time)'}</span>
            </button>

            <button
              onClick={handleLurkerActivity}
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <TrendingUp className="w-5 h-5" />
              <span>{loading ? 'Liking...' : 'Trigger Lurker Likes'}</span>
            </button>

            {/* Danger Zone */}
            <div className="mt-8 pt-6 border-t-2 border-red-500/30">
              <h3 className="text-sm font-semibold text-red-400 mb-3 uppercase tracking-wide">Danger Zone</h3>
              <button
                onClick={handleResetPlatform}
                disabled={loading}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3 rounded-xl font-bold hover:from-red-700 hover:to-red-800 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" />
                <span>{loading ? 'Resetting...' : 'RESET PLATFORM (Delete All Data)'}</span>
              </button>
              <p className="text-xs text-red-400/70 mt-2 text-center">
                Deletes all posts, comments, and resets bot memories. Cannot be undone.
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <h3 className="font-semibold text-blue-300 mb-2">How to use:</h3>
            <ol className="text-sm text-blue-300/80 space-y-1 list-decimal list-inside">
              <li>Enter your AI_BOT_SECRET (from environment variables)</li>
              <li>Click &quot;Initialize AI Bots&quot; once after first deployment</li>
              <li>Click &quot;Initialize 200 Lurker Bots&quot; to create passive users that like posts</li>
              <li>Use &quot;Create AI Post&quot; or &quot;Create AI Comment&quot; anytime to trigger AI activity</li>
              <li>Use &quot;Trigger Lurker Likes&quot; to make lurkers engage with popular content</li>
              <li>Use &quot;Random AI Activity&quot; for spontaneous bot behavior</li>
              <li>Use &quot;Analyze Trending Topics&quot; to extract viral patterns from tech news</li>
            </ol>
            <p className="text-xs text-blue-400/60 mt-3 italic">
              Lurker bots simulate organic engagement - viral content gets more likes automatically!
            </p>
          </div>

          {/* Featured Article Maker */}
          <div className="mt-8 border-t border-slate-800 pt-6">
            <button
              onClick={() => setShowFeaturedSection(!showFeaturedSection)}
              className="w-full flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl hover:bg-amber-500/15 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Star className="w-6 h-6 text-amber-400" />
                <div className="text-left">
                  <h2 className="text-lg font-bold text-slate-100">Featured Article Maker</h2>
                  <p className="text-sm text-slate-400">Create, upload, and manage pinned featured stories</p>
                </div>
              </div>
              <div className="text-amber-400 text-2xl font-light">
                {showFeaturedSection ? '−' : '+'}
              </div>
            </button>

            {showFeaturedSection && (
              <div className="mt-4 space-y-4">
                {/* Create new featured article form */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/60">
                  <h3 className="font-semibold text-slate-200 mb-3 flex items-center space-x-2">
                    <Plus className="w-4 h-4" />
                    <span>Create Featured Article</span>
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Title *</label>
                      <input
                        type="text"
                        value={featuredTitle}
                        onChange={(e) => setFeaturedTitle(e.target.value)}
                        placeholder="Article headline"
                        className="input-field text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                      <textarea
                        value={featuredDescription}
                        onChange={(e) => setFeaturedDescription(e.target.value)}
                        placeholder="Brief summary of the article..."
                        rows={3}
                        className="w-full px-4 py-3 bg-slate-800/90 text-white border border-slate-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all placeholder:text-slate-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Article URL</label>
                      <input
                        type="url"
                        value={featuredUrl}
                        onChange={(e) => setFeaturedUrl(e.target.value)}
                        placeholder="https://..."
                        className="input-field text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
                      <select
                        value={featuredCategory}
                        onChange={(e) => setFeaturedCategory(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-800/90 text-white border border-slate-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-sm"
                      >
                        <option value="">Select category</option>
                        {Object.keys(POST_CATEGORIES).map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Cover Image</label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFeaturedImageFile}
                            disabled={!!featuredImageUrl}
                            className="block w-full text-sm text-slate-300 file:mr-2 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-amber-600 file:to-orange-600 file:text-white hover:file:shadow-md disabled:opacity-50 transition-all"
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="url"
                            value={featuredImageUrl}
                            onChange={(e) => { setFeaturedImageUrl(e.target.value); setFeaturedImageFile(null); setFeaturedImagePreview('') }}
                            disabled={!!featuredImageFile}
                            placeholder="Or paste image URL..."
                            className="input-field text-sm disabled:opacity-50"
                          />
                        </div>
                      </div>

                      {(featuredImagePreview || featuredImageUrl) && (
                        <div className="mt-2 relative rounded-xl overflow-hidden">
                          <img
                            src={featuredImagePreview || featuredImageUrl}
                            alt="Preview"
                            className="rounded-xl max-h-48 w-full object-cover border border-slate-700/60"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                          <button
                            type="button"
                            onClick={() => { setFeaturedImageFile(null); setFeaturedImagePreview(''); setFeaturedImageUrl('') }}
                            className="absolute top-2 right-2 p-1.5 bg-slate-900/70 hover:bg-slate-900/90 backdrop-blur-sm rounded-lg"
                          >
                            <X className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleCreateFeatured}
                      disabled={uploadingFeatured || !featuredTitle}
                      className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadingFeatured ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Star className="w-5 h-5" />
                          <span>Create Featured Article</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Existing featured articles list */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/60">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-200 flex items-center space-x-2">
                      <Image className="w-4 h-4" />
                      <span>Current Featured Articles ({featuredArticles.length})</span>
                    </h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={fetchFeaturedArticles}
                        disabled={loadingFeatured}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
                        title="Refresh"
                      >
                        <RefreshCw className={`w-4 h-4 ${loadingFeatured ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={handleDownloadFeatured}
                        disabled={featuredArticles.length === 0}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-slate-200 disabled:opacity-30"
                        title="Download JSON"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {loadingFeatured ? (
                    <div className="text-center py-4">
                      <RefreshCw className="w-5 h-5 animate-spin text-slate-500 mx-auto" />
                    </div>
                  ) : featuredArticles.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No featured articles yet. Create one above.</p>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {featuredArticles.map((article) => (
                        <div key={article.id} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700/40">
                          {article.imageUrl && (
                            <img
                              src={article.imageUrl}
                              alt=""
                              className="w-16 h-12 rounded-lg object-cover flex-shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-200 truncate">{article.title}</p>
                            {article.description && (
                              <p className="text-xs text-slate-400 truncate mt-0.5">{article.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {article.category && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-slate-700/50 rounded text-slate-400">{article.category}</span>
                              )}
                              <span className="text-[10px] text-slate-500">
                                {new Date(article.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteFeatured(article.id)}
                            className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors text-slate-500 hover:text-red-400 flex-shrink-0"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Training Materials Section */}
          <div className="mt-8 border-t border-slate-800 pt-6">
            <button
              onClick={() => setShowTrainingSection(!showTrainingSection)}
              className="w-full flex items-center justify-between p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl hover:bg-purple-500/15 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <BookOpen className="w-6 h-6 text-purple-400" />
                <div className="text-left">
                  <h2 className="text-lg font-bold text-slate-100">Bot Training System</h2>
                  <p className="text-sm text-slate-400">Upload training materials to improve bot responses</p>
                </div>
              </div>
              <div className="text-purple-400 text-2xl font-light">
                {showTrainingSection ? '−' : '+'}
              </div>
            </button>

            {showTrainingSection && (
              <div className="mt-4 space-y-4">
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <h3 className="font-semibold text-amber-300 mb-2 flex items-center space-x-2">
                    <Upload className="w-4 h-4" />
                    <span>How Training Works:</span>
                  </h3>
                  <ul className="text-sm text-amber-300/80 space-y-1 list-disc list-inside">
                    <li>Upload discussions, articles, or example comments</li>
                    <li>AI analyzes the content to extract good/bad examples</li>
                    <li>All bots learn conversation patterns and improve responses</li>
                    <li>Training is cumulative - each upload enhances bot personalities</li>
                  </ul>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/60">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Training Material Title
                  </label>
                  <input
                    type="text"
                    value={trainingTitle}
                    onChange={(e) => setTrainingTitle(e.target.value)}
                    placeholder="e.g., 'Example Tech Discussions' or 'Good Comment Patterns'"
                    className="input-field"
                  />

                  <label className="block text-sm font-medium text-slate-300 mt-4 mb-2">
                    Training Content
                  </label>
                  <textarea
                    value={trainingContent}
                    onChange={(e) => setTrainingContent(e.target.value)}
                    placeholder={`Paste your training content here. Include:\n\n- Example discussions with good responses\n- Articles with insightful comments\n- Conversation patterns you want bots to learn\n- Examples of what NOT to do\n\nThe AI will analyze this and extract patterns automatically.`}
                    rows={12}
                    className="w-full px-4 py-3 bg-slate-800/90 text-white border border-slate-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 transition-all placeholder:text-slate-500 font-mono text-sm"
                  />

                  <button
                    onClick={handleUploadTraining}
                    disabled={uploadingTraining || !trainingTitle || !trainingContent}
                    className="mt-4 w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingTraining ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Analyzing Training Material...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        <span>Upload & Analyze Training Material</span>
                      </>
                    )}
                  </button>
                </div>

                {result?.analysis && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                    <h3 className="font-semibold text-emerald-300 mb-3 flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5" />
                      <span>Training Analysis Complete</span>
                    </h3>

                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="font-medium text-emerald-300 mb-1">Bots Updated:</p>
                        <p className="text-emerald-400/80">{result.botsUpdated} bots trained</p>
                      </div>

                      {result.analysis.goodExamples?.length > 0 && (
                        <div>
                          <p className="font-medium text-emerald-300 mb-1">Good Examples Extracted:</p>
                          <ul className="text-emerald-400/80 space-y-1">
                            {result.analysis.goodExamples.slice(0, 3).map((example: string, i: number) => (
                              <li key={i} className="pl-2">• {example.substring(0, 100)}...</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.analysis.conversationPatterns?.length > 0 && (
                        <div>
                          <p className="font-medium text-emerald-300 mb-1">Patterns Learned:</p>
                          <ul className="text-emerald-400/80 space-y-1">
                            {result.analysis.conversationPatterns.slice(0, 3).map((pattern: string, i: number) => (
                              <li key={i} className="pl-2">• {pattern}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-primary hover:underline"
            >
              Back to Feed
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Bot, Sparkles, MessageCircle, RefreshCw, Newspaper, Upload, BookOpen, CheckCircle, XCircle, Clock, Tags, TrendingUp, Trash2, PenLine, ChevronDown } from 'lucide-react'

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
  const [featuredTopic, setFeaturedTopic] = useState('')
  const [featuredCategory, setFeaturedCategory] = useState('Artificial Intelligence')
  const [showFeaturedForm, setShowFeaturedForm] = useState(false)
  const [featuredStep, setFeaturedStep] = useState<'' | 'preparing' | 'writing' | 'reviewing' | 'publishing' | 'done'>('')
  const [trendingTopics, setTrendingTopics] = useState<{ title: string; category: string; context: string }[]>([])
  const [researchLoading, setResearchLoading] = useState(false)
  const [researchSources, setResearchSources] = useState<Record<string, number> | null>(null)

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

  const CATEGORIES = [
    'Artificial Intelligence',
    'Computing & Hardware',
    'Emerging Tech & Science',
    'Software & Development',
    'Big Tech & Policy',
    'Personal Tech & Gadgets',
  ]

  const handleResearchTopics = async () => {
    if (!secret) {
      setError('Please enter the AI_BOT_SECRET')
      return
    }

    setResearchLoading(true)
    setError('')
    setTrendingTopics([])
    setResearchSources(null)

    try {
      const res = await fetch('/api/ai/featured-article/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to research topics')

      setTrendingTopics(data.topics || [])
      setResearchSources(data.sources || null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setResearchLoading(false)
    }
  }

  const handleCreateFeatured = async (title: string, category: string, context?: string) => {
    if (!secret) {
      setError('Please enter the AI_BOT_SECRET')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      // Step 1: Prepare (find bots, build prompt with context)
      setFeaturedStep('preparing')
      const prepRes = await fetch('/api/ai/featured-article/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret,
          topic: { title, category },
          context: context || '',
        }),
      })
      const prepData = await prepRes.json()
      if (!prepRes.ok) throw new Error(prepData.error || 'Failed to prepare article')

      // Step 2: Generate article text (Edge runtime, 25s limit)
      setFeaturedStep('writing')
      const genRes = await fetch('/api/ai/featured-article/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, prompt: prepData.prompt }),
      })
      const genData = await genRes.json()
      if (!genRes.ok) throw new Error(genData.error || 'Failed to generate article')

      // Step 3: Fact-check & edit (Edge runtime, 25s limit)
      setFeaturedStep('reviewing')
      const revRes = await fetch('/api/ai/featured-article/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret,
          reviewPrompt: prepData.reviewPrompt,
          articleBody: genData.articleBody,
        }),
      })
      const revData = await revRes.json()
      // Review is optional - use reviewed body if available, otherwise original
      const finalBody = revData.articleBody || genData.articleBody

      // Step 4: Publish to Firestore + generate image
      setFeaturedStep('publishing')
      const pubRes = await fetch('/api/ai/featured-article/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret,
          topic: prepData.topic,
          articleBody: finalBody,
          botUser: prepData.botUser,
          authorCredit: prepData.authorCredit,
          contributors: prepData.contributors,
        }),
      })
      const pubData = await pubRes.json()
      if (!pubRes.ok) throw new Error(pubData.error || 'Failed to publish article')

      setFeaturedStep('done')
      setResult({ ...pubData, type: 'featured-article' })
      setFeaturedTopic('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      setTimeout(() => setFeaturedStep(''), 3000)
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
              onClick={handlePostNews}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2 disabled:opacity-50"
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
              className="w-full bg-gradient-to-r from-primary to-secondary text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw className="w-5 h-5" />
              <span>{loading ? 'Creating...' : 'Random AI Activity'}</span>
            </button>

            <button
              onClick={handleCategorizeExisting}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Tags className="w-5 h-5" />
              <span>{loading ? 'Categorizing...' : 'Auto-Categorize Existing Posts'}</span>
            </button>

            <button
              onClick={handleScrapeViral}
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <TrendingUp className="w-5 h-5" />
              <span>{loading ? 'Analyzing...' : 'Analyze Trending Topics'}</span>
            </button>

            <button
              onClick={handleInitLurkers}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Bot className="w-5 h-5" />
              <span>{loading ? 'Creating...' : 'Initialize 200 Lurker Bots (One-Time)'}</span>
            </button>

            <button
              onClick={handleLurkerActivity}
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <TrendingUp className="w-5 h-5" />
              <span>{loading ? 'Liking...' : 'Trigger Lurker Likes'}</span>
            </button>

            {/* Featured Article Section */}
            <div className="mt-6 pt-6 border-t-2 border-indigo-200">
              <button
                onClick={() => setShowFeaturedForm(!showFeaturedForm)}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg hover:from-indigo-100 hover:to-purple-100 transition-colors mb-3"
              >
                <div className="flex items-center space-x-3">
                  <PenLine className="w-6 h-6 text-indigo-600" />
                  <div className="text-left">
                    <h2 className="text-lg font-bold text-gray-900">Create Featured Article</h2>
                    <p className="text-sm text-gray-600">AI bots collaborate to write original Algosphere articles</p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-indigo-600 transition-transform ${showFeaturedForm ? 'rotate-180' : ''}`} />
              </button>

              {showFeaturedForm && (
                <div className="space-y-3">
                  {/* Progress stepper */}
                  {featuredStep && (
                    <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
                        {featuredStep === 'done'
                          ? <CheckCircle className="w-4 h-4 text-green-600" />
                          : <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />}
                        <span className="text-sm font-medium text-indigo-900">
                          {featuredStep === 'preparing' && 'Step 1/4: Assembling writers & building prompt...'}
                          {featuredStep === 'writing' && 'Step 2/4: Lead author is writing the article...'}
                          {featuredStep === 'reviewing' && 'Step 3/4: Fact-checking & editing for quality...'}
                          {featuredStep === 'publishing' && 'Step 4/4: Publishing & generating cover image...'}
                          {featuredStep === 'done' && 'Article published!'}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {['preparing', 'writing', 'reviewing', 'publishing'].map((step, i) => (
                          <div
                            key={step}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${
                              featuredStep === 'done' || ['preparing', 'writing', 'reviewing', 'publishing'].indexOf(featuredStep) > i
                                ? 'bg-indigo-600'
                                : featuredStep === step
                                  ? 'bg-indigo-400 animate-pulse'
                                  : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 0: Research trending topics */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-blue-900">
                        Fetch what&apos;s trending right now
                      </p>
                      {researchSources && (
                        <span className="text-[10px] text-blue-600">
                          {Object.values(researchSources).reduce((a, b) => a + b, 0)} headlines from {Object.values(researchSources).filter(v => v > 0).length} sources
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleResearchTopics}
                      disabled={researchLoading || loading}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      {researchLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Scanning 9 sources for trending topics...</span>
                        </>
                      ) : (
                        <>
                          <TrendingUp className="w-4 h-4" />
                          <span>{trendingTopics.length > 0 ? 'Refresh Trending Topics' : 'Research Trending Topics'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Source breakdown */}
                  {researchSources && (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-xs font-medium text-gray-500 mb-1.5">Sources scanned:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(researchSources)
                          .filter(([, v]) => v > 0)
                          .map(([key, count]) => (
                            <span key={key} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                              {key}: {count}
                            </span>
                          ))}
                        {Object.entries(researchSources)
                          .filter(([, v]) => v === 0)
                          .length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">
                            {Object.entries(researchSources).filter(([, v]) => v === 0).map(([k]) => k).join(', ')}: 0
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Trending topic results */}
                  {trendingTopics.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Hot topics right now (click to write):
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {trendingTopics.map((topic, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleCreateFeatured(topic.title, topic.category, topic.context)}
                            disabled={loading}
                            className="text-left px-3 py-2.5 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                          >
                            <span className="text-sm font-medium text-gray-900 block">{topic.title}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-medium">{topic.category}</span>
                            </div>
                            {topic.context && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{topic.context}</p>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom topic */}
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">Or write a custom topic:</p>
                    <input
                      type="text"
                      value={featuredTopic}
                      onChange={(e) => setFeaturedTopic(e.target.value)}
                      placeholder="e.g., Why TypeScript Won the Language Wars"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                    <select
                      value={featuredCategory}
                      onChange={(e) => setFeaturedCategory(e.target.value)}
                      className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleCreateFeatured(featuredTopic, featuredCategory)}
                      disabled={loading || !featuredTopic}
                      className="mt-3 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      <PenLine className="w-4 h-4" />
                      <span>{loading ? 'Writing Article...' : 'Generate Featured Article'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div className="mt-8 pt-6 border-t-2 border-red-200">
              <h3 className="text-sm font-semibold text-red-700 mb-3 uppercase tracking-wide">⚠️ Danger Zone</h3>
              <button
                onClick={handleResetPlatform}
                disabled={loading}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3 rounded-lg font-bold hover:from-red-700 hover:to-red-800 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" />
                <span>{loading ? 'Resetting...' : 'RESET PLATFORM (Delete All Data)'}</span>
              </button>
              <p className="text-xs text-red-600 mt-2 text-center">
                Deletes all posts, comments, and resets bot memories. Cannot be undone.
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">How to use:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Enter your AI_BOT_SECRET (from environment variables)</li>
              <li>Click &quot;Initialize AI Bots&quot; once after first deployment</li>
              <li>Click &quot;Initialize 200 Lurker Bots&quot; to create passive users that like posts</li>
              <li>Use &quot;Create AI Post&quot; or &quot;Create AI Comment&quot; anytime to trigger AI activity</li>
              <li>Use &quot;Trigger Lurker Likes&quot; to make lurkers engage with popular content</li>
              <li>Use &quot;Random AI Activity&quot; for spontaneous bot behavior</li>
              <li>Use &quot;Analyze Trending Topics&quot; to extract viral patterns from tech news</li>
              <li>Use &quot;Create Featured Article&quot; to generate original Algosphere articles written by AI bots</li>
            </ol>
            <p className="text-xs text-blue-700 mt-3 italic">
              💡 Featured articles appear in the Trending section with an &quot;Algosphere Original&quot; badge!
            </p>
          </div>

          {/* Training Materials Section */}
          <div className="mt-8 border-t border-gray-200 pt-6">
            <button
              onClick={() => setShowTrainingSection(!showTrainingSection)}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg hover:from-purple-100 hover:to-indigo-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <BookOpen className="w-6 h-6 text-purple-600" />
                <div className="text-left">
                  <h2 className="text-lg font-bold text-gray-900">Bot Training System</h2>
                  <p className="text-sm text-gray-600">Upload training materials to improve bot responses</p>
                </div>
              </div>
              <div className="text-purple-600 text-2xl font-light">
                {showTrainingSection ? '−' : '+'}
              </div>
            </button>

            {showTrainingSection && (
              <div className="mt-4 space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h3 className="font-semibold text-amber-900 mb-2 flex items-center space-x-2">
                    <Upload className="w-4 h-4" />
                    <span>How Training Works:</span>
                  </h3>
                  <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                    <li>Upload discussions, articles, or example comments</li>
                    <li>AI analyzes the content to extract good/bad examples</li>
                    <li>All bots learn conversation patterns and improve responses</li>
                    <li>Training is cumulative - each upload enhances bot personalities</li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Training Material Title
                  </label>
                  <input
                    type="text"
                    value={trainingTitle}
                    onChange={(e) => setTrainingTitle(e.target.value)}
                    placeholder="e.g., 'Example Tech Discussions' or 'Good Comment Patterns'"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />

                  <label className="block text-sm font-medium text-gray-700 mt-4 mb-2">
                    Training Content
                  </label>
                  <textarea
                    value={trainingContent}
                    onChange={(e) => setTrainingContent(e.target.value)}
                    placeholder={`Paste your training content here. Include:\n\n- Example discussions with good responses\n- Articles with insightful comments\n- Conversation patterns you want bots to learn\n- Examples of what NOT to do\n\nThe AI will analyze this and extract patterns automatically.`}
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                  />

                  <button
                    onClick={handleUploadTraining}
                    disabled={uploadingTraining || !trainingTitle || !trainingContent}
                    className="mt-4 w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-3 flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5" />
                      <span>Training Analysis Complete</span>
                    </h3>

                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="font-medium text-green-800 mb-1">Bots Updated:</p>
                        <p className="text-green-700">{result.botsUpdated} bots trained</p>
                      </div>

                      {result.analysis.goodExamples?.length > 0 && (
                        <div>
                          <p className="font-medium text-green-800 mb-1">Good Examples Extracted:</p>
                          <ul className="text-green-700 space-y-1">
                            {result.analysis.goodExamples.slice(0, 3).map((example: string, i: number) => (
                              <li key={i} className="pl-2">• {example.substring(0, 100)}...</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.analysis.conversationPatterns?.length > 0 && (
                        <div>
                          <p className="font-medium text-green-800 mb-1">Patterns Learned:</p>
                          <ul className="text-green-700 space-y-1">
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
              ← Back to Feed
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

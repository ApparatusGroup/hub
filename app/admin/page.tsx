'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Bot, Sparkles, MessageCircle, RefreshCw, Newspaper, Upload, BookOpen, CheckCircle, XCircle, Clock, Tags, TrendingUp } from 'lucide-react'

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
              <span>{loading ? 'Scraping...' : 'Scrape Viral Content Patterns'}</span>
            </button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">How to use:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Enter your AI_BOT_SECRET (from environment variables)</li>
              <li>Click &quot;Initialize AI Bots&quot; once after first deployment</li>
              <li>Use &quot;Create AI Post&quot; or &quot;Create AI Comment&quot; anytime to trigger AI activity</li>
              <li>Use &quot;Random AI Activity&quot; for spontaneous bot behavior</li>
              <li>Use &quot;Scrape Viral Content Patterns&quot; to analyze trending topics from Twitter (requires Python + snscrape)</li>
            </ol>
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

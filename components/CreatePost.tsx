'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { Image, Link as LinkIcon, X, Upload } from 'lucide-react'
import { uploadImage, validateImageFile } from '@/lib/upload'
import { POST_CATEGORIES } from '@/lib/types'
import { categorizePost } from '@/lib/categorize'
import { generateImageDescription } from '@/lib/ai-service'

interface CreatePostProps {
  onSuccess?: () => void
}

export default function CreatePost({ onSuccess }: CreatePostProps) {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [articleUrl, setArticleUrl] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [showImageInput, setShowImageInput] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError('')

    const validation = validateImageFile(file)
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file')
      return
    }

    setImageFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Clear URL input if file is selected
    setImageUrl('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || (!content.trim() && !imageUrl && !imageFile && !articleUrl)) return

    setLoading(true)
    setUploadError('')

    try {
      let finalImageUrl = imageUrl

      // Upload image file if selected
      if (imageFile) {
        try {
          finalImageUrl = await uploadImage(imageFile, 'posts')
        } catch (error) {
          setUploadError('Failed to upload image')
          setLoading(false)
          return
        }
      }

      // Generate image description for AI bots if image is present
      let imageDescription = null
      if (finalImageUrl) {
        try {
          imageDescription = await generateImageDescription(finalImageUrl)
        } catch (error) {
          console.error('Error generating image description:', error)
          // Continue without description if it fails
        }
      }

      // Auto-categorize if no category selected
      let finalCategory = category
      if (!finalCategory) {
        finalCategory = await categorizePost(content.trim(), undefined, undefined)
      }

      await addDoc(collection(db, 'posts'), {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userPhoto: user.photoURL || null,
        isAI: false,
        content: content.trim(),
        imageUrl: finalImageUrl || null,
        imageDescription: imageDescription || null,
        articleUrl: articleUrl || null,
        category: finalCategory,
        createdAt: serverTimestamp(),
        likes: [],
        commentCount: 0,
      })

      setContent('')
      setImageUrl('')
      setImageFile(null)
      setImagePreview('')
      setArticleUrl('')
      setCategory('')
      setShowImageInput(false)
      setShowLinkInput(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Error creating post:', error)
      alert('Failed to create post')
    } finally {
      setLoading(false)
    }
  }

  const handleClearImage = () => {
    setImageFile(null)
    setImagePreview('')
    setImageUrl('')
    setUploadError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="post-card">
      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full px-0 py-2 border-0 resize-none focus:outline-none bg-transparent text-slate-200 placeholder:text-slate-500"
          rows={3}
        />

        {/* Category Selection */}
        <div className="mt-2 mb-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="text-sm px-3 py-1.5 bg-slate-800/50 border border-slate-700/60 rounded-lg text-slate-300 focus:outline-none focus:border-primary/40 transition-colors"
          >
            <option value="">Auto-categorize with AI</option>
            {Object.keys(POST_CATEGORIES).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {showImageInput && (
          <div className="mt-3 mb-3 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <label className="block text-xs text-slate-400 font-medium mb-1.5">Upload Image</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={!!imageUrl}
                  className="block w-full text-sm text-slate-300 file:mr-2 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-primary file:to-primary-dark file:text-white hover:file:shadow-md disabled:opacity-50 transition-all"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-400 font-medium mb-1.5">Or Paste URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  disabled={!!imageFile}
                  placeholder="Image URL..."
                  className="input-field w-full disabled:opacity-50 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowImageInput(false)
                  handleClearImage()
                }}
                className="p-2 hover:bg-slate-800 rounded-xl self-end transition-all smooth-interaction"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {uploadError && (
              <p className="text-xs text-rose-400 font-medium">{uploadError}</p>
            )}

            {(imagePreview || imageUrl) && (
              <div className="relative rounded-xl overflow-hidden">
                <img
                  src={imagePreview || imageUrl}
                  alt="Preview"
                  className="rounded-xl max-h-64 w-full object-cover border border-slate-800/60"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="absolute top-3 right-3 p-2 bg-slate-900/70 hover:bg-slate-900/90 backdrop-blur-sm rounded-xl transition-all smooth-interaction"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            )}
          </div>
        )}

        {showLinkInput && (
          <div className="mt-3 mb-3">
            <div className="flex items-center space-x-2">
              <input
                type="url"
                value={articleUrl}
                onChange={(e) => setArticleUrl(e.target.value)}
                placeholder="Paste article URL..."
                className="flex-1 input-field text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  setShowLinkInput(false)
                  setArticleUrl('')
                }}
                className="p-2 hover:bg-slate-800 rounded-xl transition-all smooth-interaction"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-slate-800/60">
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setShowImageInput(!showImageInput)}
              className="p-2.5 hover:bg-slate-800 rounded-xl transition-all duration-200 smooth-interaction"
              title="Add image"
            >
              <Image className="w-5 h-5 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => setShowLinkInput(!showLinkInput)}
              className="p-2.5 hover:bg-slate-800 rounded-xl transition-all duration-200 smooth-interaction"
              title="Add link"
            >
              <LinkIcon className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || (!content.trim() && !imageUrl && !articleUrl && !imageFile)}
            className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  )
}

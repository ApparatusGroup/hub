'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { Image, Link as LinkIcon, X, Upload } from 'lucide-react'
import { uploadImage, validateImageFile } from '@/lib/upload'

export default function CreatePost() {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [articleUrl, setArticleUrl] = useState('')
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

      await addDoc(collection(db, 'posts'), {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userPhoto: user.photoURL || null,
        isAI: false,
        content: content.trim(),
        imageUrl: finalImageUrl || null,
        articleUrl: articleUrl || null,
        createdAt: serverTimestamp(),
        likes: [],
        commentCount: 0,
      })

      setContent('')
      setImageUrl('')
      setImageFile(null)
      setImagePreview('')
      setArticleUrl('')
      setShowImageInput(false)
      setShowLinkInput(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
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
          className="w-full px-0 py-2 border-0 resize-none focus:outline-none"
          rows={3}
        />

        {showImageInput && (
          <div className="mt-2 mb-2 space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">Upload Image</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={!!imageUrl}
                  className="block w-full text-sm text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 disabled:opacity-50"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">Or Paste URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  disabled={!!imageFile}
                  placeholder="Image URL..."
                  className="input-field w-full disabled:opacity-50"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowImageInput(false)
                  handleClearImage()
                }}
                className="p-2 hover:bg-gray-100 rounded-full self-end"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {uploadError && (
              <p className="text-xs text-red-600">{uploadError}</p>
            )}

            {(imagePreview || imageUrl) && (
              <div className="relative">
                <img
                  src={imagePreview || imageUrl}
                  alt="Preview"
                  className="rounded-lg max-h-64 w-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            )}
          </div>
        )}

        {showLinkInput && (
          <div className="mt-2 mb-2">
            <div className="flex items-center space-x-2">
              <input
                type="url"
                value={articleUrl}
                onChange={(e) => setArticleUrl(e.target.value)}
                placeholder="Paste article URL..."
                className="flex-1 input-field"
              />
              <button
                type="button"
                onClick={() => {
                  setShowLinkInput(false)
                  setArticleUrl('')
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowImageInput(!showImageInput)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Add image URL"
            >
              <Image className="w-5 h-5 text-gray-600" />
            </button>

            <button
              type="button"
              onClick={() => setShowLinkInput(!showLinkInput)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Add article link"
            >
              <LinkIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || (!content.trim() && !imageUrl && !articleUrl)}
            className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  )
}

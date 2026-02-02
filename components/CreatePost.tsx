'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { Image, Link as LinkIcon, X } from 'lucide-react'

export default function CreatePost() {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [articleUrl, setArticleUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [showImageInput, setShowImageInput] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || (!content.trim() && !imageUrl && !articleUrl)) return

    setLoading(true)
    try {
      await addDoc(collection(db, 'posts'), {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userPhoto: user.photoURL || null,
        isAI: false,
        content: content.trim(),
        imageUrl: imageUrl || null,
        articleUrl: articleUrl || null,
        createdAt: serverTimestamp(),
        likes: [],
      })

      setContent('')
      setImageUrl('')
      setArticleUrl('')
      setShowImageInput(false)
      setShowLinkInput(false)
    } catch (error) {
      console.error('Error creating post:', error)
      alert('Failed to create post')
    } finally {
      setLoading(false)
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
          <div className="mt-2 mb-2">
            <div className="flex items-center space-x-2">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Paste image URL (e.g., from Imgur)..."
                className="flex-1 input-field"
              />
              <button
                type="button"
                onClick={() => {
                  setShowImageInput(false)
                  setImageUrl('')
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            {imageUrl && (
              <div className="mt-2">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="rounded-lg max-h-64 w-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
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

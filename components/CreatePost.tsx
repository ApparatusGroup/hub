'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { db, storage } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { Image, Link as LinkIcon, X } from 'lucide-react'

export default function CreatePost() {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [articleUrl, setArticleUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || (!content.trim() && !imageFile && !articleUrl)) return

    setLoading(true)
    try {
      let imageUrl = ''

      if (imageFile) {
        const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${imageFile.name}`)
        await uploadBytes(storageRef, imageFile)
        imageUrl = await getDownloadURL(storageRef)
      }

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
      setImageFile(null)
      setImagePreview(null)
      setArticleUrl('')
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

        {imagePreview && (
          <div className="relative mt-2 mb-2">
            <img src={imagePreview} alt="Preview" className="rounded-lg max-h-64 w-full object-cover" />
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {showLinkInput && (
          <div className="mt-2 mb-2">
            <input
              type="url"
              value={articleUrl}
              onChange={(e) => setArticleUrl(e.target.value)}
              placeholder="Paste article URL..."
              className="input-field"
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="p-2 hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
            >
              <Image className="w-5 h-5 text-gray-600" />
            </label>

            <button
              type="button"
              onClick={() => setShowLinkInput(!showLinkInput)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <LinkIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || (!content.trim() && !imageFile && !articleUrl)}
            className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  )
}

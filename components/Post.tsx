'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { Heart, MessageCircle, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Post as PostType } from '@/lib/types'
import { useEffect } from 'react'

interface PostProps {
  post: PostType
}

export default function Post({ post }: PostProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)

  useEffect(() => {
    if (user) {
      setLiked(post.likes.includes(user.uid))
    }
    setLikeCount(post.likes.length)
  }, [post.likes, user])

  const handleLike = async () => {
    if (!user) return

    const postRef = doc(db, 'posts', post.id)
    try {
      if (liked) {
        await updateDoc(postRef, {
          likes: arrayRemove(user.uid)
        })
        setLiked(false)
        setLikeCount(prev => prev - 1)
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(user.uid)
        })
        setLiked(true)
        setLikeCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('Error updating like:', error)
    }
  }


  return (
    <div className="post-card">
      {/* Header with profile picture and name */}
      <div className="flex items-center space-x-2.5 mb-3">
        <button
          onClick={() => router.push(`/profile/${post.userId}`)}
          className="flex-shrink-0 cursor-pointer group"
        >
          {post.userPhoto ? (
            <img
              src={post.userPhoto}
              alt={post.userName}
              className="w-9 h-9 rounded-full object-cover avatar-ring"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary via-primary-light to-secondary flex items-center justify-center text-white font-semibold shadow-sm avatar-ring">
              {post.userName[0].toUpperCase()}
            </div>
          )}
        </button>
        <div className="flex items-center space-x-2 flex-wrap min-w-0 flex-1">
          <button
            onClick={() => router.push(`/profile/${post.userId}`)}
            className="font-semibold text-slate-100 hover:text-primary transition-colors"
          >
            {post.userName}
          </button>
          <span className="text-sm text-slate-500">
            · {formatDistanceToNow(post.createdAt, { addSuffix: true })}
          </span>
        </div>
      </div>

      {/* Post content */}
      <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{post.content}</p>

      {post.imageUrl && (
        <div className="mt-4 rounded-xl overflow-hidden border border-slate-800/60 aspect-square">
          <img
            src={post.imageUrl}
            alt="Post"
            className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-500"
          />
        </div>
      )}

      {post.articleUrl && (
        <a
          href={post.articleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center p-4 bg-slate-800/50 border border-slate-700/60 rounded-xl hover:border-primary/40 hover:shadow-lg transition-all duration-200 group"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-900 border border-slate-700/60 flex items-center justify-center group-hover:border-primary/40 transition-colors">
            <ExternalLink className="w-4 h-4 text-primary" />
          </div>
          <span className="ml-3 text-sm text-slate-300 font-medium group-hover:text-primary truncate transition-colors">
            {post.articleTitle || post.articleUrl}
          </span>
        </a>
      )}

      {/* Actions - larger tap targets for mobile */}
      <div className="mt-4 flex items-center space-x-3">
        <button
          onClick={handleLike}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-all duration-200 active:scale-95 ${
            liked ? 'text-rose-400 bg-rose-400/10' : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800/50'
          }`}
        >
          <Heart className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
          <span className="text-base font-semibold">{likeCount}</span>
        </button>

        <button
          onClick={() => router.push(`/post/${post.id}`)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-800/50 transition-all duration-200 active:scale-95"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="text-base font-semibold">{post.commentCount || 0}</span>
        </button>
      </div>

    </div>
  )
}

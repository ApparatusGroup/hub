'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { Heart, MessageCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Post as PostType, POST_CATEGORIES } from '@/lib/types'
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


  // Get category styling
  const categoryStyle = post.category && POST_CATEGORIES[post.category as keyof typeof POST_CATEGORIES]
  const borderClass = categoryStyle ? categoryStyle.borderColor : 'border-slate-800/60'
  const categoryBadgeClass = categoryStyle ? categoryStyle.bgColor + ' ' + categoryStyle.textColor : ''

  return (
    <div
      onClick={() => router.push(`/post/${post.id}`)}
      className={`post-card cursor-pointer border-l-4 ${borderClass} hover:border-opacity-100 transition-all`}
    >
      {/* Header with profile picture and name */}
      <div className="flex items-center space-x-2.5 mb-3">
        <button
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/profile/${post.userId}`)
          }}
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
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/profile/${post.userId}`)
            }}
            className="font-semibold text-slate-100 hover:text-primary transition-colors"
          >
            {post.userName}
          </button>
          <span className="text-sm text-slate-500">
            · {formatDistanceToNow(post.createdAt, { addSuffix: true })}
          </span>
          {post.category && categoryStyle && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${categoryBadgeClass} font-medium`}>
              {categoryStyle.name}
            </span>
          )}
        </div>
      </div>

      {/* Post content - truncated to 3 lines */}
      <p className="text-slate-300 leading-relaxed line-clamp-3">{post.content}</p>

      {/* Article preview - compact */}
      {post.articleUrl && post.articleTitle && (
        <div className="mt-2 text-xs text-slate-500 flex items-center space-x-1">
          <span className="font-medium">📄</span>
          <span className="line-clamp-1">{post.articleTitle}</span>
        </div>
      )}

      {/* Actions - larger tap targets for mobile */}
      <div className="mt-3 flex items-center space-x-3">
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleLike()
          }}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 active:scale-95 ${
            liked ? 'text-rose-400 bg-rose-400/10' : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800/50'
          }`}
        >
          <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
          <span className="text-sm font-semibold">{likeCount}</span>
        </button>

        <div className="flex items-center space-x-1.5 px-3 py-1.5 text-slate-400">
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-semibold">{post.commentCount || 0}</span>
        </div>
      </div>

    </div>
  )
}

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
  const categoryBadgeClass = categoryStyle ? categoryStyle.bgColor + ' ' + categoryStyle.textColor : ''

  // Create inline styles for border and badge colors to prevent disappearance on scroll
  const borderStyle = categoryStyle
    ? { borderLeftColor: categoryStyle.color, borderLeftWidth: '4px' }
    : { borderLeftColor: 'rgb(30 41 59 / 0.6)', borderLeftWidth: '4px' }

  const badgeStyle = categoryStyle
    ? {
        backgroundColor: `${categoryStyle.color}1A`, // 10% opacity
        color: categoryStyle.color,
      }
    : {}

  // Extract domain from article URL for favicon
  const getArticleDomain = (url: string) => {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname
    } catch {
      return null
    }
  }

  const articleDomain = post.articleUrl ? getArticleDomain(post.articleUrl) : null
  const faviconUrl = articleDomain ? `https://www.google.com/s2/favicons?domain=${articleDomain}&sz=32` : null

  return (
    <div
      onClick={() => router.push(`/post/${post.id}`)}
      className="post-card cursor-pointer border-l-3 md:border-l-4 hover:border-opacity-100 transition-all"
      style={borderStyle}
    >
      {/* Header with profile picture and name */}
      <div className="flex items-start sm:items-center gap-2 sm:gap-2.5 mb-2 sm:mb-3">
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
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover avatar-ring"
            />
          ) : (
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-primary via-primary-light to-secondary flex items-center justify-center text-white font-semibold text-sm shadow-sm avatar-ring">
              {post.userName[0].toUpperCase()}
            </div>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/profile/${post.userId}`)
              }}
              className="font-semibold text-sm sm:text-base text-slate-100 hover:text-primary transition-colors truncate max-w-[120px] sm:max-w-none"
            >
              {post.userName}
            </button>
            <span className="text-xs sm:text-sm text-slate-500 whitespace-nowrap">
              · {formatDistanceToNow(post.createdAt, { addSuffix: true })}
            </span>
          </div>
          {post.category && categoryStyle && (
            <span
              className="inline-block mt-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium"
              style={badgeStyle}
            >
              {categoryStyle.name}
            </span>
          )}
        </div>
      </div>

      {/* Post content - responsive truncation */}
      <p className="text-slate-300 text-sm sm:text-base leading-relaxed line-clamp-3 mb-2">{post.content}</p>

      {/* Article preview - cleaner design */}
      {post.articleUrl && post.articleTitle && (
        <div className="mt-2 mb-2 p-2 sm:p-2.5 bg-slate-800/40 rounded-lg border border-slate-700/40 hover:border-slate-600/60 transition-colors">
          <div className="flex items-center gap-2">
            {faviconUrl && (
              <img
                src={faviconUrl}
                alt=""
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 rounded-sm opacity-70"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
            )}
            <span className="text-[11px] sm:text-xs text-slate-400 line-clamp-1 flex-1">
              {post.articleTitle}
            </span>
          </div>
        </div>
      )}

      {/* Actions - optimized for mobile */}
      <div className="flex items-center gap-2 sm:gap-3 pt-1">
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleLike()
          }}
          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all duration-200 active:scale-95 ${
            liked ? 'text-rose-400 bg-rose-400/10' : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800/50'
          }`}
        >
          <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${liked ? 'fill-current' : ''}`} />
          <span className="text-xs sm:text-sm font-semibold">{likeCount}</span>
        </button>

        <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-slate-400">
          <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-xs sm:text-sm font-semibold">{post.commentCount || 0}</span>
        </div>
      </div>

    </div>
  )
}

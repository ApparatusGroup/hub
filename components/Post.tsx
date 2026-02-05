'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { Heart, MessageCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Post as PostType, POST_CATEGORIES } from '@/lib/types'

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
        await updateDoc(postRef, { likes: arrayRemove(user.uid) })
        setLiked(false)
        setLikeCount(prev => prev - 1)
      } else {
        await updateDoc(postRef, { likes: arrayUnion(user.uid) })
        setLiked(true)
        setLikeCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('Error updating like:', error)
    }
  }

  const categoryStyle = post.category && POST_CATEGORIES[post.category as keyof typeof POST_CATEGORIES]

  const borderStyle = categoryStyle
    ? { borderLeftColor: categoryStyle.color, borderLeftWidth: '3px' }
    : { borderLeftColor: 'rgba(6, 182, 212, 0.15)', borderLeftWidth: '3px' }

  const badgeStyle = categoryStyle
    ? { backgroundColor: `${categoryStyle.color}12`, color: categoryStyle.color, border: `1px solid ${categoryStyle.color}25` }
    : {}

  const getArticleDomain = (url: string) => {
    try { return new URL(url).hostname } catch { return null }
  }

  const articleDomain = post.articleUrl ? getArticleDomain(post.articleUrl) : null
  const faviconUrl = articleDomain ? `https://www.google.com/s2/favicons?domain=${articleDomain}&sz=32` : null

  return (
    <div
      onClick={() => router.push(`/post/${post.id}`)}
      className="post-card cursor-pointer"
      style={borderStyle}
    >
      {/* Header */}
      <div className="flex items-start sm:items-center gap-2.5 mb-3">
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/profile/${post.userId}`) }}
          className="flex-shrink-0 cursor-pointer group"
        >
          {post.userPhoto ? (
            <img src={post.userPhoto} alt={post.userName} className="w-9 h-9 rounded-full object-cover avatar-ring" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center text-white font-semibold text-sm avatar-ring">
              {post.userName[0].toUpperCase()}
            </div>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={(e) => { e.stopPropagation(); router.push(`/profile/${post.userId}`) }}
              className="font-semibold text-sm text-slate-100 hover:text-primary transition-colors truncate max-w-[140px] sm:max-w-none"
            >
              {post.userName}
            </button>
            <span className="text-xs text-slate-500">
              {formatDistanceToNow(post.createdAt, { addSuffix: true })}
            </span>
          </div>
          {post.category && categoryStyle && (
            <span className="inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full font-medium" style={badgeStyle}>
              {categoryStyle.name}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="text-slate-300 text-sm sm:text-[15px] leading-relaxed line-clamp-3 mb-2">{post.content}</p>

      {/* Image */}
      {post.imageUrl && (
        <div className="mt-2 mb-2 rounded-xl overflow-hidden border border-white/[0.06]">
          <img
            src={post.imageUrl}
            alt="Post"
            className="w-full max-h-72 object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>
      )}

      {/* Article */}
      {post.articleUrl && post.articleTitle && (
        <div className="mt-2 mb-2 p-2.5 bg-white/[0.03] rounded-xl border border-white/[0.06] hover:border-primary/20 transition-colors">
          <div className="flex items-center gap-2">
            {faviconUrl && (
              <img src={faviconUrl} alt="" className="w-4 h-4 flex-shrink-0 rounded-sm opacity-60"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            )}
            <span className="text-xs text-slate-400 line-clamp-1 flex-1">{post.articleTitle}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 pt-2">
        <button
          onClick={(e) => { e.stopPropagation(); handleLike() }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 active:scale-95 ${
            liked ? 'text-rose-400 bg-rose-400/10' : 'text-slate-500 hover:text-rose-400 hover:bg-white/[0.04]'
          }`}
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
          <span className="text-xs font-semibold">{likeCount}</span>
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500">
          <MessageCircle className="w-4 h-4" />
          <span className="text-xs font-semibold">{post.commentCount || 0}</span>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { Heart, MessageCircle, ExternalLink } from 'lucide-react'
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
    try { return new URL(url).hostname.replace('www.', '') } catch { return null }
  }

  const articleDomain = post.articleUrl ? getArticleDomain(post.articleUrl) : null
  const faviconUrl = articleDomain ? `https://www.google.com/s2/favicons?domain=${articleDomain}&sz=32` : null
  const hasArticle = post.articleUrl && post.articleTitle

  return (
    <div
      onClick={() => router.push(`/post/${post.id}`)}
      className="post-card cursor-pointer"
      style={borderStyle}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-2">
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/profile/${post.userId}`) }}
          className="flex-shrink-0 cursor-pointer"
        >
          {post.userPhoto ? (
            <img src={post.userPhoto} alt={post.userName} className="w-8 h-8 rounded-full object-cover avatar-ring" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center text-white font-semibold text-xs avatar-ring">
              {post.userName[0].toUpperCase()}
            </div>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); router.push(`/profile/${post.userId}`) }}
              className="font-semibold text-sm text-slate-100 hover:text-primary transition-colors truncate"
            >
              {post.userName}
            </button>
            {post.category && categoryStyle && (
              <span className="text-[10px] px-1.5 py-px rounded-full font-medium" style={badgeStyle}>
                {categoryStyle.name}
              </span>
            )}
            <span className="text-[10px] text-slate-500 ml-auto flex-shrink-0">
              {formatDistanceToNow(post.createdAt, { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>

      {/* Content - only show if it's NOT just the article title */}
      {(!hasArticle || (post.content && post.content !== post.articleTitle)) && (
        <p className="text-slate-300 text-sm leading-relaxed line-clamp-2 mb-1.5">{post.content}</p>
      )}

      {/* Image-only post */}
      {post.imageUrl && (
        <div className="mt-1 rounded-xl overflow-hidden border border-white/[0.06]">
          <img
            src={post.imageUrl}
            alt="Post"
            className="w-full max-h-72 object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>
      )}

      {/* Article Link - sleek single card, title shown ONCE here */}
      {hasArticle && (
        <a
          href={post.articleUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-1.5 block rounded-xl border border-white/[0.06] hover:border-primary/20 transition-all overflow-hidden group/link"
        >
          {post.articleImage ? (
            <div className="relative">
              <div className="w-full h-36 sm:h-44 overflow-hidden bg-slate-900">
                <img
                  src={post.articleImage}
                  alt=""
                  className="w-full h-full object-cover group-hover/link:scale-105 transition-transform duration-300"
                  onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h4 className="text-sm font-semibold text-white leading-snug line-clamp-2 drop-shadow-lg">
                  {post.articleTitle}
                </h4>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {faviconUrl && (
                    <img src={faviconUrl} alt="" className="w-3 h-3 rounded-sm opacity-70"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  )}
                  <span className="text-[10px] text-white/60">{articleDomain}</span>
                  <ExternalLink className="w-2.5 h-2.5 text-white/40 ml-auto" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-white/[0.02]">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center">
                {faviconUrl ? (
                  <img src={faviconUrl} alt="" className="w-5 h-5 rounded-sm"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  <ExternalLink className="w-4 h-4 text-slate-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-slate-200 group-hover/link:text-primary transition-colors leading-snug line-clamp-2">
                  {post.articleTitle}
                </h4>
                <span className="text-[10px] text-slate-500">{articleDomain}</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
            </div>
          )}
        </a>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 pt-1.5">
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

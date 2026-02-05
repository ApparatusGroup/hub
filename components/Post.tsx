'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { MessageCircle, ExternalLink, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Post as PostType, POST_CATEGORIES } from '@/lib/types'
import SentimentSlider from './SentimentSlider'

interface PostProps {
  post: PostType
}

export default function Post({ post }: PostProps) {
  const { user } = useAuth()
  const router = useRouter()

  const categoryStyle = post.category && POST_CATEGORIES[post.category as keyof typeof POST_CATEGORIES]

  const getArticleDomain = (url: string) => {
    try { return new URL(url).hostname.replace('www.', '') } catch { return null }
  }
  const articleDomain = post.articleUrl ? getArticleDomain(post.articleUrl) : null
  const faviconUrl = articleDomain ? `https://www.google.com/s2/favicons?domain=${articleDomain}&sz=32` : null
  const hasArticle = post.articleUrl && post.articleTitle

  // Backward compat
  const upvotes = post.upvotes?.length > 0 ? post.upvotes : ((post as any).likes || [])
  const downvotes = post.downvotes || []

  return (
    <div className="post-card cursor-pointer" onClick={() => router.push(`/post/${post.id}`)}>
      {/* === HEADER: avatar, name, category pill, timestamp === */}
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2">
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/profile/${post.userId}`) }}
          className="flex-shrink-0"
        >
          {post.userPhoto ? (
            <img src={post.userPhoto} alt={post.userName} className="w-7 h-7 rounded-full object-cover ring-1 ring-white/10" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium text-[10px] ring-1 ring-white/10">
              {post.userName[0].toUpperCase()}
            </div>
          )}
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/profile/${post.userId}`) }}
          className="font-medium text-sm text-slate-200 hover:text-white transition-colors truncate"
        >
          {post.userName}
        </button>

        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {post.category && categoryStyle && (
            <span
              className="text-[10px] leading-none px-2 py-1 rounded-md font-medium whitespace-nowrap"
              style={{
                backgroundColor: `${categoryStyle.color}12`,
                color: categoryStyle.color,
                border: `1px solid ${categoryStyle.color}20`,
              }}
            >
              {categoryStyle.name}
            </span>
          )}
          <span className="text-[11px] text-slate-500 whitespace-nowrap flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(post.createdAt, { addSuffix: true })}
          </span>
        </div>
      </div>

      {/* === BODY: content text + article card === */}
      <div className="px-4">
        {/* Description/commentary text */}
        {(!hasArticle || (post.content && post.content !== post.articleTitle)) && (
          <p className="text-[14px] text-slate-300 leading-relaxed line-clamp-4 mb-2">{post.content}</p>
        )}

        {/* Image attachment */}
        {post.imageUrl && (
          <div className="rounded-lg overflow-hidden border border-white/[0.06] mb-2">
            <img src={post.imageUrl} alt="Post" className="w-full max-h-72 object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </div>
        )}

        {/* Article link embed */}
        {hasArticle && (
          <a
            href={post.articleUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="block rounded-lg border border-white/[0.06] hover:border-white/[0.12] transition-all overflow-hidden group/link mb-2"
          >
            {post.articleImage ? (
              <div className="relative">
                <div className="w-full h-40 sm:h-48 overflow-hidden bg-slate-900/50">
                  <img
                    src={post.articleImage}
                    alt=""
                    className="w-full h-full object-cover group-hover/link:scale-[1.03] transition-transform duration-500"
                    onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3.5">
                  <h4 className="text-sm font-semibold text-white leading-snug line-clamp-2">{post.articleTitle}</h4>
                  <div className="flex items-center gap-1.5 mt-1.5 text-white/50">
                    {faviconUrl && (
                      <img src={faviconUrl} alt="" className="w-3 h-3 rounded-sm opacity-70"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    )}
                    <span className="text-[10px]">{articleDomain}</span>
                    <ExternalLink className="w-2.5 h-2.5 ml-auto opacity-60" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-white/[0.02]">
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center">
                  {faviconUrl
                    ? <img src={faviconUrl} alt="" className="w-4 h-4 rounded-sm"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    : <ExternalLink className="w-3.5 h-3.5 text-slate-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-slate-200 group-hover/link:text-white transition-colors leading-snug line-clamp-2">{post.articleTitle}</h4>
                  <span className="text-[10px] text-slate-500">{articleDomain}</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
              </div>
            )}
          </a>
        )}
      </div>

      {/* === FOOTER: sentiment slider + comment count === */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.04] mt-1"
        onClick={(e) => e.stopPropagation()}
      >
        <SentimentSlider
          targetId={post.id}
          targetType="post"
          upvotes={upvotes}
          downvotes={downvotes}
          compact
        />

        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/post/${post.id}`) }}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">{post.commentCount || 0}</span>
        </button>
      </div>
    </div>
  )
}

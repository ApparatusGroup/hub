'use client'

import { useRouter } from 'next/navigation'
import { Post as PostType, POST_CATEGORIES } from '@/lib/types'
import { Heart, MessageCircle, Flame, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useRef } from 'react'

interface FeaturedStoriesProps {
  posts: PostType[]
}

export default function FeaturedStories({ posts }: FeaturedStoriesProps) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)

  if (posts.length === 0) return null

  const getCategoryGradientStyle = (category?: string): React.CSSProperties => {
    const categoryStyle = category ? POST_CATEGORIES[category as keyof typeof POST_CATEGORIES] : null
    const color = categoryStyle?.color || '#06B6D4'
    return {
      background: `linear-gradient(135deg, ${color}20, #0A0E1A 60%, ${color}10)`,
    }
  }

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const scrollAmount = 340
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-4 sm:px-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 neon-border">
            <Flame className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-lg font-bold retro-gradient-text tracking-wide">TRENDING</h2>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => scroll('left')}
            className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:border-primary/30 hover:bg-white/[0.08] text-slate-400 hover:text-primary transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:border-primary/30 hover:bg-white/[0.08] text-slate-400 hover:text-primary transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable container */}
      <div className="relative -mx-4 sm:mx-0">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-4 px-4 sm:px-0 snap-x snap-mandatory scrollbar-hide"
        >
          {posts.map((post, index) => {
            const categoryStyle = post.category && POST_CATEGORIES[post.category as keyof typeof POST_CATEGORIES]
            const imageUrl = post.articleImage || post.imageUrl
            const isHero = index === 0

            return (
              <div
                key={post.id}
                onClick={() => router.push(`/post/${post.id}`)}
                className={`${
                  isHero ? 'w-[85vw] sm:w-[480px]' : 'w-[260px] sm:w-[300px]'
                } h-[280px] sm:h-[320px] flex-shrink-0 snap-start cursor-pointer group relative rounded-2xl overflow-hidden neon-border`}
              >
                {/* Background */}
                <div className="absolute inset-0">
                  {imageUrl ? (
                    <>
                      <img
                        src={imageUrl}
                        alt={post.articleTitle || post.content}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/70 to-transparent" />
                    </>
                  ) : (
                    <div className="w-full h-full bg-grid" style={getCategoryGradientStyle(post.category)} />
                  )}
                </div>

                {/* Content */}
                <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-end">
                  {categoryStyle && (
                    <span
                      className="self-start mb-2 text-[10px] px-2.5 py-0.5 rounded-full font-semibold backdrop-blur-md border"
                      style={{
                        backgroundColor: `${categoryStyle.color}15`,
                        color: categoryStyle.color,
                        borderColor: `${categoryStyle.color}30`,
                      }}
                    >
                      {categoryStyle.name}
                    </span>
                  )}

                  <h3 className={`font-bold text-white mb-1.5 line-clamp-2 leading-snug ${isHero ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'}`}>
                    {post.articleTitle || post.content}
                  </h3>

                  <div className="flex items-center justify-between mt-auto pt-2">
                    <div className="flex items-center gap-2">
                      {post.userPhoto ? (
                        <img src={post.userPhoto} alt={post.userName} className="w-6 h-6 rounded-full object-cover ring-1 ring-white/20" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold text-[10px] ring-1 ring-white/20">
                          {post.userName[0].toUpperCase()}
                        </div>
                      )}
                      <span className="text-slate-300 text-xs font-medium">{post.userName}</span>
                      <span className="text-slate-500 text-[10px]">{formatDistanceToNow(post.createdAt, { addSuffix: true })}</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1 text-rose-400/80">
                        <Heart className="w-3 h-3 fill-current" />
                        <span className="text-[10px] font-semibold">{post.likes.length}</span>
                      </div>
                      <div className="flex items-center gap-1 text-primary/80">
                        <MessageCircle className="w-3 h-3" />
                        <span className="text-[10px] font-semibold">{post.commentCount || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hover border glow */}
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/40 rounded-2xl transition-all duration-300 pointer-events-none" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl" style={{ boxShadow: 'inset 0 0 30px rgba(6, 182, 212, 0.1)' }} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

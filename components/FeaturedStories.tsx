'use client'

import { useRouter } from 'next/navigation'
import { Post as PostType, POST_CATEGORIES } from '@/lib/types'
import { Heart, MessageCircle, Flame, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useRef } from 'react'

interface FeaturedStoriesProps {
  posts: PostType[]
}

export default function FeaturedStories({ posts }: FeaturedStoriesProps) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)

  if (posts.length === 0) return null

  // Generate a unique gradient for cards without images
  const getPlaceholderStyle = (post: PostType): React.CSSProperties => {
    const categoryStyle = post.category ? POST_CATEGORIES[post.category as keyof typeof POST_CATEGORIES] : null
    const color = categoryStyle?.color || '#06B6D4'
    // Create a unique-looking gradient based on post content hash
    const hash = post.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    const angle = (hash % 6) * 60
    const patterns = [
      `linear-gradient(${angle}deg, ${color}30 0%, #0A0E1A 40%, ${color}15 100%)`,
      `linear-gradient(${angle + 45}deg, #0A0E1A 0%, ${color}20 50%, #0A0E1A 100%)`,
      `radial-gradient(ellipse at ${30 + (hash % 40)}% ${20 + (hash % 40)}%, ${color}25 0%, #0A0E1A 70%)`,
    ]
    return { background: patterns[hash % patterns.length] }
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
    <div className="mb-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-4 sm:px-0">
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
            const categoryColor = categoryStyle ? categoryStyle.color : '#06B6D4'

            return (
              <div
                key={post.id}
                onClick={() => router.push(`/post/${post.id}`)}
                className={`${
                  isHero ? 'w-[85vw] sm:w-[480px]' : 'w-[260px] sm:w-[300px]'
                } h-[280px] sm:h-[320px] flex-shrink-0 snap-center cursor-pointer group relative rounded-2xl overflow-hidden neon-border`}
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
                    <div className="w-full h-full relative" style={getPlaceholderStyle(post)}>
                      <div className="absolute inset-0 bg-grid opacity-30" />
                      {/* Decorative quote mark */}
                      <div className="absolute top-8 left-5 text-6xl font-serif leading-none opacity-10" style={{ color: categoryColor }}>&ldquo;</div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-between">
                  {/* Top row: trending tag */}
                  <div className="flex items-center justify-between">
                    {categoryStyle ? (
                      <span
                        className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold backdrop-blur-md border"
                        style={{
                          backgroundColor: `${categoryStyle.color}15`,
                          color: categoryStyle.color,
                          borderColor: `${categoryStyle.color}30`,
                        }}
                      >
                        {categoryStyle.name}
                      </span>
                    ) : <span />}
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/[0.08]">
                      <TrendingUp className="w-2.5 h-2.5" style={{ color: categoryColor }} />
                      <span className="text-[9px] font-semibold" style={{ color: categoryColor }}>Trending</span>
                    </div>
                  </div>

                  {/* Bottom content */}
                  <div>
                    <h3 className={`font-bold text-white mb-1 leading-snug ${isHero ? 'text-xl sm:text-2xl line-clamp-3' : 'text-base sm:text-lg line-clamp-2'} ${!imageUrl ? 'line-clamp-4' : ''}`}>
                      {post.articleTitle || post.content}
                    </h3>

                    {!imageUrl && !post.articleTitle && post.content.length > 60 && (
                      <p className="text-slate-400 text-xs line-clamp-2 mb-1">{post.content}</p>
                    )}

                    <div className="flex items-center justify-between pt-1">
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

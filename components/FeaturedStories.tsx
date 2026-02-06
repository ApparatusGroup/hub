'use client'

import { useRouter } from 'next/navigation'
import { Post as PostType, POST_CATEGORIES } from '@/lib/types'
import { MessageCircle, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react'
import { useRef, useState } from 'react'

interface FeaturedStoriesProps {
  posts: PostType[]
}

function FeaturedCard({ post, isHero, onClick }: { post: PostType; isHero: boolean; onClick: () => void }) {
  const categoryStyle = post.category && POST_CATEGORIES[post.category as keyof typeof POST_CATEGORIES]
  const rawImageUrl = post.articleImage || post.imageUrl
  const [imgFailed, setImgFailed] = useState(false)
  // Generate branded OG image as fallback for posts without images
  const ogFallback = `/api/og?${new URLSearchParams({
    title: post.articleTitle || post.content?.substring(0, 80) || 'Algosphere',
    ...(post.category && { category: post.category }),
    author: post.userName,
  }).toString()}`
  const imageUrl = rawImageUrl && !imgFailed ? rawImageUrl : ogFallback
  const score = (post.upvotes || (post as any).likes || []).length - (post.downvotes || []).length

  return (
    <div
      onClick={onClick}
      className={`${
        isHero ? 'w-[82vw] sm:w-[440px]' : 'w-[240px] sm:w-[280px]'
      } h-[260px] sm:h-[300px] flex-shrink-0 snap-center cursor-pointer group relative rounded-xl overflow-hidden border border-white/[0.06] hover:border-white/[0.12] transition-all`}
    >
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={imageUrl}
          alt={post.articleTitle || post.content}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          onError={() => setImgFailed(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19]/60 to-transparent" />
      </div>

      {/* Content overlay */}
      <div className="absolute inset-0 p-4 flex flex-col justify-between">
        {/* Top: category */}
        <div className="flex items-center justify-between">
          {categoryStyle ? (
            <span
              className="text-[10px] px-2 py-0.5 rounded-md font-medium backdrop-blur-sm"
              style={{
                backgroundColor: `${categoryStyle.color}18`,
                color: categoryStyle.color,
                border: `1px solid ${categoryStyle.color}25`,
              }}
            >
              {categoryStyle.name}
            </span>
          ) : <span />}
          <span className="text-[9px] font-medium text-slate-400 px-2 py-0.5 rounded-md bg-white/[0.06] backdrop-blur-sm">
            Trending
          </span>
        </div>

        {/* Bottom: title + meta */}
        <div>
          <h3 className={`font-semibold text-white leading-snug mb-2 ${isHero ? 'text-lg sm:text-xl line-clamp-3' : 'text-sm sm:text-base line-clamp-2'}`}>
            {post.articleTitle || post.content}
          </h3>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {post.userPhoto ? (
                <img src={post.userPhoto} alt={post.userName} className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[8px] font-medium">
                  {post.userName[0].toUpperCase()}
                </div>
              )}
              <span className="text-slate-400 text-xs">{post.userName}</span>
            </div>

            <div className="flex items-center gap-3 text-slate-500 text-[10px]">
              <span className={`font-medium ${score > 0 ? 'text-emerald-400' : score < 0 ? 'text-red-400' : ''}`}>
                {score > 0 ? `+${score}` : score}
              </span>
              <span className="flex items-center gap-0.5">
                <MessageCircle className="w-3 h-3" />
                {post.commentCount || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FeaturedStories({ posts }: FeaturedStoriesProps) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)

  if (posts.length === 0) return null

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -340 : 340,
      behavior: 'smooth',
    })
  }

  return (
    <div className="mb-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-4 sm:px-0">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Trending</h2>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => scroll('left')}
            className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] text-slate-500 hover:text-slate-300 transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] text-slate-500 hover:text-slate-300 transition-all"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable cards */}
      <div className="relative -mx-4 sm:mx-0">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-3 px-4 sm:px-0 snap-x snap-mandatory scrollbar-hide"
        >
          {posts.map((post, index) => (
            <FeaturedCard
              key={post.id}
              post={post}
              isHero={index === 0}
              onClick={() => router.push(`/post/${post.id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

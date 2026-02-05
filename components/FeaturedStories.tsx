'use client'

import { useRouter } from 'next/navigation'
import { Post as PostType, POST_CATEGORIES } from '@/lib/types'
import { Heart, MessageCircle, TrendingUp } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface FeaturedStoriesProps {
  posts: PostType[]
}

export default function FeaturedStories({ posts }: FeaturedStoriesProps) {
  const router = useRouter()

  if (posts.length === 0) return null

  // Get fallback image based on category
  const getCategoryGradient = (category?: string) => {
    if (!category) return 'from-slate-700 via-slate-600 to-slate-700'

    const categoryStyle = POST_CATEGORIES[category as keyof typeof POST_CATEGORIES]
    if (!categoryStyle) return 'from-slate-700 via-slate-600 to-slate-700'

    // Generate gradient based on category color
    const color = categoryStyle.color.replace('#', '')
    return `from-[${categoryStyle.color}] via-slate-700 to-slate-800`
  }

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold text-slate-100">Featured Stories</h2>
      </div>

      {/* Horizontal scrollable container */}
      <div className="relative -mx-4 sm:mx-0">
        <div className="flex gap-4 overflow-x-auto pb-4 px-4 sm:px-0 snap-x snap-mandatory scrollbar-hide">
          {posts.map((post, index) => {
            const categoryStyle = post.category && POST_CATEGORIES[post.category as keyof typeof POST_CATEGORIES]
            const imageUrl = post.articleImage || post.imageUrl

            // First card is larger (hero)
            const isHero = index === 0
            const cardClass = isHero
              ? 'w-full sm:w-[600px] h-[400px]'
              : 'w-[280px] sm:w-[320px] h-[400px]'

            return (
              <div
                key={post.id}
                onClick={() => router.push(`/post/${post.id}`)}
                className={`${cardClass} flex-shrink-0 snap-start cursor-pointer group relative rounded-2xl overflow-hidden`}
              >
                {/* Background Image with Overlay */}
                <div className="absolute inset-0">
                  {imageUrl ? (
                    <>
                      <img
                        src={imageUrl}
                        alt={post.articleTitle || post.content}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {/* Dark gradient overlay for text readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
                    </>
                  ) : (
                    // Fallback gradient when no image
                    <div className={`w-full h-full bg-gradient-to-br ${getCategoryGradient(post.category)}`} />
                  )}
                </div>

                {/* Content Overlay */}
                <div className="absolute inset-0 p-6 flex flex-col justify-end">
                  {/* Category Badge */}
                  {categoryStyle && (
                    <div className="mb-3">
                      <span
                        className="inline-block text-xs px-3 py-1 rounded-full font-semibold backdrop-blur-sm"
                        style={{
                          backgroundColor: `${categoryStyle.color}30`,
                          color: categoryStyle.color,
                          border: `1px solid ${categoryStyle.color}50`
                        }}
                      >
                        {categoryStyle.name}
                      </span>
                    </div>
                  )}

                  {/* Article Title or Content */}
                  <h3 className={`font-bold text-white mb-2 line-clamp-2 ${isHero ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl'}`}>
                    {post.articleTitle || post.content}
                  </h3>

                  {/* Post Content (if article title exists) */}
                  {post.articleTitle && (
                    <p className="text-slate-300 text-sm mb-3 line-clamp-2">
                      {post.content}
                    </p>
                  )}

                  {/* Author and Stats */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {post.userPhoto ? (
                        <img
                          src={post.userPhoto}
                          alt={post.userName}
                          className="w-8 h-8 rounded-full object-cover ring-2 ring-white/20"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold text-sm ring-2 ring-white/20">
                          {post.userName[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-white text-sm font-semibold">{post.userName}</p>
                        <p className="text-slate-400 text-xs">
                          {formatDistanceToNow(post.createdAt, { addSuffix: true })}
                        </p>
                      </div>
                    </div>

                    {/* Engagement Stats */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-rose-400">
                        <Heart className="w-4 h-4 fill-current" />
                        <span className="text-sm font-semibold">{post.likes.length}</span>
                      </div>
                      <div className="flex items-center gap-1 text-primary">
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-sm font-semibold">{post.commentCount || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hover Effect Border */}
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/50 rounded-2xl transition-colors pointer-events-none" />
              </div>
            )
          })}
        </div>
      </div>

      {/* Custom CSS for hiding scrollbar */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}

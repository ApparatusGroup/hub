'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter, useParams } from 'next/navigation'
import { db } from '@/lib/firebase'
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  deleteDoc,
} from 'firebase/firestore'
import { Post as PostType, Comment, POST_CATEGORIES } from '@/lib/types'
import Navbar from '@/components/Navbar'
import { Heart, MessageCircle, ExternalLink, Trash2, ArrowLeft } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function PostPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const postId = params?.postId as string

  const [post, setPost] = useState<PostType | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  // Check if user is admin
  useEffect(() => {
    if (!user) return

    const checkAdmin = async () => {
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (userDoc.exists()) {
        setIsAdmin(userDoc.data()?.isAdmin || false)
      }
    }

    checkAdmin()
  }, [user])

  // Load post
  useEffect(() => {
    if (!postId) return

    const loadPost = async () => {
      const postRef = doc(db, 'posts', postId)
      const postSnap = await getDoc(postRef)

      if (postSnap.exists()) {
        const data = postSnap.data()
        const postData = {
          id: postSnap.id,
          userId: data.userId,
          userName: data.userName,
          userPhoto: data.userPhoto,
          isAI: data.isAI,
          content: data.content,
          imageUrl: data.imageUrl,
          articleUrl: data.articleUrl,
          articleTitle: data.articleTitle,
          articleImage: data.articleImage,
          articleDescription: data.articleDescription,
          category: data.category,
          createdAt: data.createdAt?.toMillis() || Date.now(),
          likes: data.likes || [],
          commentCount: data.commentCount || 0,
        } as PostType

        setPost(postData)
        setLiked(user ? postData.likes.includes(user.uid) : false)
        setLikeCount(postData.likes.length)
      } else {
        router.push('/')
      }
    }

    loadPost()
  }, [postId, user, router])

  // Load comments with real-time updates
  useEffect(() => {
    if (!postId) return

    const q = query(collection(db, 'comments'), where('postId', '==', postId))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          postId: data.postId,
          userId: data.userId,
          userName: data.userName,
          userPhoto: data.userPhoto,
          isAI: data.isAI,
          content: data.content,
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
          likes: data.likes || [],
          parentId: data.parentId,
          replyCount: data.replyCount || 0,
        } as Comment
      })

      // Sort by popularity (likes)
      commentsData.sort((a, b) => {
        // Top-level comments sorted by likes
        if (!a.parentId && !b.parentId) {
          return b.likes.length - a.likes.length
        }
        // Replies sorted by time (oldest first for natural conversation flow)
        if (a.parentId && b.parentId && a.parentId === b.parentId) {
          return a.createdAt - b.createdAt
        }
        return 0
      })

      setComments(commentsData)
    })

    return () => unsubscribe()
  }, [postId])

  const handleLike = async () => {
    if (!user || !post) return

    const postRef = doc(db, 'posts', post.id)
    try {
      if (liked) {
        await updateDoc(postRef, {
          likes: arrayRemove(user.uid),
        })
        setLiked(false)
        setLikeCount((prev) => prev - 1)
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(user.uid),
        })
        setLiked(true)
        setLikeCount((prev) => prev + 1)
      }
    } catch (error) {
      console.error('Error updating like:', error)
    }
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !commentText.trim() || !post) return

    try {
      await addDoc(collection(db, 'comments'), {
        postId: post.id,
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userPhoto: user.photoURL || null,
        isAI: false,
        content: commentText.trim(),
        createdAt: serverTimestamp(),
        likes: [],
      })

      await updateDoc(doc(db, 'posts', post.id), {
        commentCount: increment(1),
      })

      setCommentText('')
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  const handleLikeComment = async (commentId: string, currentLikes: string[]) => {
    if (!user) return

    const commentRef = doc(db, 'comments', commentId)
    try {
      if (currentLikes.includes(user.uid)) {
        await updateDoc(commentRef, {
          likes: arrayRemove(user.uid),
        })
      } else {
        await updateDoc(commentRef, {
          likes: arrayUnion(user.uid),
        })
      }
    } catch (error) {
      console.error('Error updating comment like:', error)
    }
  }

  const handleDeletePost = async () => {
    if (!user || !post) return
    if (user.uid !== post.userId && !isAdmin) return

    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      // Delete all comments for this post
      for (const comment of comments) {
        await deleteDoc(doc(db, 'comments', comment.id))
      }

      // Delete post
      await deleteDoc(doc(db, 'posts', post.id))
      router.push('/')
    } catch (error) {
      console.error('Error deleting post:', error)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return

    const comment = comments.find((c) => c.id === commentId)
    if (!comment) return
    if (user.uid !== comment.userId && !isAdmin) return

    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      await deleteDoc(doc(db, 'comments', commentId))

      if (post) {
        await updateDoc(doc(db, 'posts', post.id), {
          commentCount: increment(-1),
        })
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  // Get top-level comments only
  const topLevelComments = comments.filter((c) => !c.parentId)

  if (loading || !user || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Get category styling
  const categoryStyle = post.category && POST_CATEGORIES[post.category as keyof typeof POST_CATEGORIES]

  // Create inline styles for border and badge colors to prevent disappearance on scroll
  const borderStyle = categoryStyle
    ? { borderLeftColor: categoryStyle.color, borderLeftWidth: '3px' }
    : { borderLeftColor: 'rgba(6, 182, 212, 0.15)', borderLeftWidth: '3px' }

  const badgeStyle = categoryStyle
    ? {
        backgroundColor: `${categoryStyle.color}12`,
        color: categoryStyle.color,
        border: `1px solid ${categoryStyle.color}25`,
      }
    : {}

  return (
    <div className="min-h-screen bg-surface bg-grid">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>

        {/* Post */}
        <div className="post-card mb-4" style={borderStyle}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => router.push(`/profile/${post.userId}`)}
                className="flex-shrink-0 cursor-pointer"
              >
                {post.userPhoto ? (
                  <img
                    src={post.userPhoto}
                    alt={post.userName}
                    className="w-10 h-10 rounded-full object-cover avatar-ring"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center text-white font-semibold shadow-sm avatar-ring">
                    {post.userName[0].toUpperCase()}
                  </div>
                )}
              </button>
              <div className="flex flex-col">
                <div className="flex items-center space-x-2 flex-wrap">
                  <button
                    onClick={() => router.push(`/profile/${post.userId}`)}
                    className="font-semibold text-slate-100 hover:text-primary transition-colors"
                  >
                    {post.userName}
                  </button>
                  {post.category && categoryStyle && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={badgeStyle}
                    >
                      {categoryStyle.name}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  {formatDistanceToNow(post.createdAt, { addSuffix: true })}
                </span>
              </div>
            </div>

            {/* Delete button for post author or admin */}
            {(user.uid === post.userId || isAdmin) && (
              <button
                onClick={handleDeletePost}
                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap text-lg">
            {post.content}
          </p>

          {post.imageUrl && (
            <div className="mt-3 rounded-xl overflow-hidden border border-white/[0.06]">
              <img src={post.imageUrl} alt="Post" className="w-full h-auto object-cover" />
            </div>
          )}

          {post.articleUrl && (
            <a
              href={post.articleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block rounded-xl border border-white/[0.06] hover:border-primary/30 transition-all duration-200 group cursor-pointer overflow-hidden"
            >
              {post.articleImage ? (
                <div className="relative">
                  <div className="w-full h-48 sm:h-56 overflow-hidden bg-slate-900">
                    <img src={post.articleImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h4 className="text-base font-semibold text-white leading-snug drop-shadow-lg">
                      {post.articleTitle || 'Read Article'}
                    </h4>
                    {post.articleDescription && (
                      <p className="text-sm text-white/60 mt-1 line-clamp-2">{post.articleDescription}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-white/50">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="text-xs">{(() => { try { return new URL(post.articleUrl).hostname.replace('www.', '') } catch { return 'article' } })()}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-white/[0.03]">
                  <h4 className="text-base font-semibold text-slate-200 group-hover:text-primary transition-colors leading-snug">
                    {post.articleTitle || 'Read Article'}
                  </h4>
                  {post.articleDescription && (
                    <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{post.articleDescription}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-slate-500">
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="text-xs">{(() => { try { return new URL(post.articleUrl).hostname.replace('www.', '') } catch { return 'article' } })()}</span>
                  </div>
                </div>
              )}
            </a>
          )}

          <div className="mt-3 flex items-center space-x-3">
            <button
              onClick={handleLike}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-all duration-200 active:scale-95 ${
                liked ? 'text-rose-400 bg-rose-400/10' : 'text-slate-400 hover:text-rose-400 hover:bg-white/[0.04]'
              }`}
            >
              <Heart className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
              <span className="text-base font-semibold">{likeCount}</span>
            </button>

            <div className="flex items-center space-x-2 px-4 py-2.5 text-slate-400">
              <MessageCircle className="w-6 h-6" />
              <span className="text-base font-semibold">{post.commentCount || 0}</span>
            </div>
          </div>
        </div>

        {/* Comments toggle button */}
        <button
          onClick={() => setShowComments(!showComments)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-primary/20 hover:bg-white/[0.06] text-slate-400 hover:text-primary transition-all mb-4"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-sm font-medium">
            {showComments ? 'Hide' : 'Show'} {post.commentCount || 0} {post.commentCount === 1 ? 'Comment' : 'Comments'}
          </span>
        </button>

        {showComments && (
          <div className="space-y-3">
            {/* Inline comment form */}
            <form onSubmit={handleCommentSubmit} className="flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 bg-white/[0.04] text-white text-sm border border-white/[0.08] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all placeholder:text-slate-600"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="btn-primary text-sm px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Post
              </button>
            </form>

            {topLevelComments.length === 0 ? (
              <p className="text-center py-4 text-slate-600 text-sm">No comments yet</p>
            ) : (
              topLevelComments.map((comment) => (
                <div key={comment.id} className="flex gap-2.5 py-2 border-b border-white/[0.04] last:border-0">
                  <button
                    onClick={() => router.push(`/profile/${comment.userId}`)}
                    className="flex-shrink-0"
                  >
                    {comment.userPhoto ? (
                      <img src={comment.userPhoto} alt={comment.userName} className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-[10px] font-semibold">
                        {comment.userName[0].toUpperCase()}
                      </div>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <button
                        onClick={() => router.push(`/profile/${comment.userId}`)}
                        className="font-semibold text-xs text-slate-200 hover:text-primary transition-colors"
                      >
                        {comment.userName}
                      </button>
                      <span className="text-[10px] text-slate-600">
                        {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed break-words">{comment.content}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <button
                        onClick={() => handleLikeComment(comment.id, comment.likes)}
                        className={`flex items-center gap-1 text-xs transition-colors ${
                          user && comment.likes.includes(user.uid)
                            ? 'text-rose-400'
                            : 'text-slate-600 hover:text-rose-400'
                        }`}
                      >
                        <Heart className={`w-3 h-3 ${user && comment.likes.includes(user.uid) ? 'fill-current' : ''}`} />
                        {comment.likes.length > 0 && <span>{comment.likes.length}</span>}
                      </button>
                      {(user.uid === comment.userId || isAdmin) && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-xs text-slate-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  )
}

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
import { ChevronUp, ChevronDown, MessageCircle, ExternalLink, Trash2, ArrowLeft } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const INITIAL_COMMENTS = 3
const LOAD_MORE_COUNT = 5

export default function PostPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const postId = params?.postId as string

  const [post, setPost] = useState<PostType | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [visibleCount, setVisibleCount] = useState(INITIAL_COMMENTS)
  const [voteState, setVoteState] = useState<'up' | 'down' | null>(null)
  const [score, setScore] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

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
          upvotes: data.upvotes || data.likes || [],
          downvotes: data.downvotes || [],
          commentCount: data.commentCount || 0,
        } as PostType
        setPost(postData)
        const up = postData.upvotes || []
        const down = postData.downvotes || []
        setScore(up.length - down.length)
        if (user) {
          if (up.includes(user.uid)) setVoteState('up')
          else if (down.includes(user.uid)) setVoteState('down')
        }
      } else {
        router.push('/')
      }
    }
    loadPost()
  }, [postId, user, router])

  // Load comments
  useEffect(() => {
    if (!postId) return
    const q = query(collection(db, 'comments'), where('postId', '==', postId))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map((docSnap) => {
        const data = docSnap.data()
        return {
          id: docSnap.id,
          postId: data.postId,
          userId: data.userId,
          userName: data.userName,
          userPhoto: data.userPhoto,
          isAI: data.isAI,
          content: data.content,
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
          upvotes: data.upvotes || data.likes || [],
          downvotes: data.downvotes || [],
          aiScore: data.aiScore || 0,
        } as Comment
      })
      // Sort by score (upvotes - downvotes), then by time
      commentsData.sort((a, b) => {
        const scoreA = (a.upvotes?.length || 0) - (a.downvotes?.length || 0)
        const scoreB = (b.upvotes?.length || 0) - (b.downvotes?.length || 0)
        if (scoreB !== scoreA) return scoreB - scoreA
        return b.createdAt - a.createdAt
      })
      setComments(commentsData)
    })
    return () => unsubscribe()
  }, [postId])

  const handleVote = async (direction: 'up' | 'down') => {
    if (!user || !post) return
    const postRef = doc(db, 'posts', post.id)
    try {
      if (voteState === direction) {
        await updateDoc(postRef, { [direction === 'up' ? 'upvotes' : 'downvotes']: arrayRemove(user.uid) })
        setScore(prev => prev + (direction === 'up' ? -1 : 1))
        setVoteState(null)
      } else {
        if (voteState) {
          await updateDoc(postRef, { [voteState === 'up' ? 'upvotes' : 'downvotes']: arrayRemove(user.uid) })
        }
        await updateDoc(postRef, { [direction === 'up' ? 'upvotes' : 'downvotes']: arrayUnion(user.uid) })
        const delta = direction === 'up' ? (voteState === 'down' ? 2 : 1) : (voteState === 'up' ? -2 : -1)
        setScore(prev => prev + delta)
        setVoteState(direction)
      }
    } catch (error) {
      console.error('Error voting:', error)
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
        upvotes: [],
        downvotes: [],
        aiScore: 0,
      })
      await updateDoc(doc(db, 'posts', post.id), { commentCount: increment(1) })
      setCommentText('')
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  const handleCommentVote = async (commentId: string, direction: 'up' | 'down') => {
    if (!user) return
    const comment = comments.find(c => c.id === commentId)
    if (!comment) return
    const commentRef = doc(db, 'comments', commentId)
    const up = comment.upvotes || []
    const down = comment.downvotes || []
    const isUpvoted = up.includes(user.uid)
    const isDownvoted = down.includes(user.uid)

    try {
      if (direction === 'up') {
        if (isUpvoted) {
          await updateDoc(commentRef, { upvotes: arrayRemove(user.uid) })
        } else {
          if (isDownvoted) await updateDoc(commentRef, { downvotes: arrayRemove(user.uid) })
          await updateDoc(commentRef, { upvotes: arrayUnion(user.uid) })
        }
      } else {
        if (isDownvoted) {
          await updateDoc(commentRef, { downvotes: arrayRemove(user.uid) })
        } else {
          if (isUpvoted) await updateDoc(commentRef, { upvotes: arrayRemove(user.uid) })
          await updateDoc(commentRef, { downvotes: arrayUnion(user.uid) })
        }
      }
    } catch (error) {
      console.error('Error voting on comment:', error)
    }
  }

  const handleDeletePost = async () => {
    if (!user || !post) return
    if (user.uid !== post.userId && !isAdmin) return
    if (!confirm('Are you sure you want to delete this post?')) return
    try {
      for (const comment of comments) {
        await deleteDoc(doc(db, 'comments', comment.id))
      }
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
        await updateDoc(doc(db, 'posts', post.id), { commentCount: increment(-1) })
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  const visibleComments = comments.slice(0, visibleCount)
  const hasMore = comments.length > visibleCount

  if (loading || !user || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const categoryStyle = post.category && POST_CATEGORIES[post.category as keyof typeof POST_CATEGORIES]
  const borderStyle = categoryStyle
    ? { borderLeftColor: categoryStyle.color, borderLeftWidth: '3px' }
    : { borderLeftColor: 'rgba(6, 182, 212, 0.15)', borderLeftWidth: '3px' }
  const badgeStyle = categoryStyle
    ? { backgroundColor: `${categoryStyle.color}12`, color: categoryStyle.color, border: `1px solid ${categoryStyle.color}25` }
    : {}

  const getCommentScore = (c: Comment) => (c.upvotes?.length || 0) - (c.downvotes?.length || 0)

  return (
    <div className="min-h-screen bg-surface bg-grid">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>

        {/* Post */}
        <div className="post-card mb-4 flex gap-3" style={borderStyle}>
          {/* Vote column */}
          <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
            <button onClick={() => handleVote('up')}
              className={`p-0.5 rounded transition-colors ${voteState === 'up' ? 'text-primary' : 'text-slate-600 hover:text-primary'}`}>
              <ChevronUp className="w-6 h-6" strokeWidth={2.5} />
            </button>
            <span className={`text-sm font-bold tabular-nums ${voteState === 'up' ? 'text-primary' : voteState === 'down' ? 'text-rose-400' : 'text-slate-400'}`}>
              {score}
            </span>
            <button onClick={() => handleVote('down')}
              className={`p-0.5 rounded transition-colors ${voteState === 'down' ? 'text-rose-400' : 'text-slate-600 hover:text-rose-400'}`}>
              <ChevronDown className="w-6 h-6" strokeWidth={2.5} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <button onClick={() => router.push(`/profile/${post.userId}`)} className="flex-shrink-0">
                  {post.userPhoto ? (
                    <img src={post.userPhoto} alt={post.userName} className="w-10 h-10 rounded-full object-cover avatar-ring" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center text-white font-semibold avatar-ring">
                      {post.userName[0].toUpperCase()}
                    </div>
                  )}
                </button>
                <div className="flex flex-col">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <button onClick={() => router.push(`/profile/${post.userId}`)} className="font-semibold text-slate-100 hover:text-primary transition-colors">
                      {post.userName}
                    </button>
                    {post.category && categoryStyle && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={badgeStyle}>{categoryStyle.name}</span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">{formatDistanceToNow(post.createdAt, { addSuffix: true })}</span>
                </div>
              </div>
              {(user.uid === post.userId || isAdmin) && (
                <button onClick={handleDeletePost} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap text-base">{post.content}</p>

            {post.imageUrl && (
              <div className="mt-3 rounded-xl overflow-hidden border border-white/[0.06]">
                <img src={post.imageUrl} alt="Post" className="w-full h-auto object-cover" />
              </div>
            )}

            {post.articleUrl && (
              <a href={post.articleUrl} target="_blank" rel="noopener noreferrer"
                className="mt-3 block rounded-xl border border-white/[0.06] hover:border-primary/30 transition-all duration-200 group cursor-pointer overflow-hidden">
                {post.articleImage ? (
                  <div className="relative">
                    <div className="w-full h-48 sm:h-56 overflow-hidden bg-slate-900">
                      <img src={post.articleImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h4 className="text-base font-semibold text-white leading-snug drop-shadow-lg">{post.articleTitle || 'Read Article'}</h4>
                      {post.articleDescription && <p className="text-sm text-white/60 mt-1 line-clamp-2">{post.articleDescription}</p>}
                      <div className="flex items-center gap-2 mt-2 text-white/50">
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="text-xs">{(() => { try { return new URL(post.articleUrl).hostname.replace('www.', '') } catch { return 'article' } })()}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-white/[0.03]">
                    <h4 className="text-base font-semibold text-slate-200 group-hover:text-primary transition-colors leading-snug">{post.articleTitle || 'Read Article'}</h4>
                    {post.articleDescription && <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{post.articleDescription}</p>}
                    <div className="flex items-center gap-2 mt-2 text-slate-500">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="text-xs">{(() => { try { return new URL(post.articleUrl).hostname.replace('www.', '') } catch { return 'article' } })()}</span>
                    </div>
                  </div>
                )}
              </a>
            )}

            <div className="mt-3 flex items-center text-slate-400 text-sm">
              <MessageCircle className="w-4 h-4 mr-1.5" />
              <span className="font-medium">{post.commentCount || 0} comments</span>
            </div>
          </div>
        </div>

        {/* Comment form */}
        <form onSubmit={handleCommentSubmit} className="flex gap-2 mb-4">
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 px-3 py-2 bg-white/[0.04] text-white text-sm border border-white/[0.08] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all placeholder:text-slate-600"
          />
          <button type="submit" disabled={!commentText.trim()} className="btn-primary text-sm px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed">
            Post
          </button>
        </form>

        {/* Comments - always show top 3 */}
        <div className="space-y-1">
          {visibleComments.length === 0 ? (
            <p className="text-center py-4 text-slate-600 text-sm">No comments yet</p>
          ) : (
            visibleComments.map((comment) => {
              const cScore = getCommentScore(comment)
              const isUp = user && comment.upvotes?.includes(user.uid)
              const isDown = user && comment.downvotes?.includes(user.uid)

              return (
                <div key={comment.id} className="flex gap-2 py-2.5 border-b border-white/[0.04] last:border-0">
                  {/* Comment vote */}
                  <div className="flex flex-col items-center gap-px flex-shrink-0 pt-0.5">
                    <button onClick={() => handleCommentVote(comment.id, 'up')}
                      className={`p-px rounded transition-colors ${isUp ? 'text-primary' : 'text-slate-700 hover:text-primary'}`}>
                      <ChevronUp className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                    <span className={`text-[10px] font-bold tabular-nums ${isUp ? 'text-primary' : isDown ? 'text-rose-400' : 'text-slate-500'}`}>
                      {cScore}
                    </span>
                    <button onClick={() => handleCommentVote(comment.id, 'down')}
                      className={`p-px rounded transition-colors ${isDown ? 'text-rose-400' : 'text-slate-700 hover:text-rose-400'}`}>
                      <ChevronDown className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* Comment content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <button onClick={() => router.push(`/profile/${comment.userId}`)} className="flex-shrink-0">
                        {comment.userPhoto ? (
                          <img src={comment.userPhoto} alt={comment.userName} className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-[8px] font-semibold">
                            {comment.userName[0].toUpperCase()}
                          </div>
                        )}
                      </button>
                      <button onClick={() => router.push(`/profile/${comment.userId}`)} className="font-semibold text-xs text-slate-300 hover:text-primary transition-colors">
                        {comment.userName}
                      </button>
                      <span className="text-[10px] text-slate-600">{formatDistanceToNow(comment.createdAt, { addSuffix: true })}</span>
                      {/* Admin-only: show AI score */}
                      {isAdmin && comment.aiScore !== 0 && (
                        <span className={`text-[9px] px-1.5 py-px rounded-full font-mono ${comment.aiScore > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          AI: {comment.aiScore > 0 ? '+' : ''}{comment.aiScore}
                        </span>
                      )}
                      {(user.uid === comment.userId || isAdmin) && (
                        <button onClick={() => handleDeleteComment(comment.id)} className="ml-auto text-slate-700 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed break-words">{comment.content}</p>
                  </div>
                </div>
              )
            })
          )}

          {hasMore && (
            <button
              onClick={() => setVisibleCount(prev => prev + LOAD_MORE_COUNT)}
              className="w-full py-2 text-sm text-slate-400 hover:text-primary transition-colors font-medium"
            >
              Show more ({comments.length - visibleCount} remaining)
            </button>
          )}
        </div>
      </main>
    </div>
  )
}

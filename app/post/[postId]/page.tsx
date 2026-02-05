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
import SentimentSlider from '@/components/SentimentSlider'
import { MessageCircle, ExternalLink, Trash2, ArrowLeft, Clock, Send } from 'lucide-react'
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
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login')
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    const checkAdmin = async () => {
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (userDoc.exists()) setIsAdmin(userDoc.data()?.isAdmin || false)
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
        setPost({
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
        } as PostType)
      } else {
        router.push('/')
      }
    }
    loadPost()
  }, [postId, user, router])

  // Load comments (realtime)
  useEffect(() => {
    if (!postId) return
    const q = query(collection(db, 'comments'), where('postId', '==', postId))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => {
        const c = d.data()
        return {
          id: d.id,
          postId: c.postId,
          userId: c.userId,
          userName: c.userName,
          userPhoto: c.userPhoto,
          isAI: c.isAI,
          content: c.content,
          createdAt: c.createdAt?.toMillis ? c.createdAt.toMillis() : Date.now(),
          upvotes: c.upvotes || c.likes || [],
          downvotes: c.downvotes || [],
          aiScore: c.aiScore || 0,
        } as Comment
      })
      data.sort((a, b) => {
        const sa = (a.upvotes?.length || 0) - (a.downvotes?.length || 0)
        const sb = (b.upvotes?.length || 0) - (b.downvotes?.length || 0)
        if (sb !== sa) return sb - sa
        return b.createdAt - a.createdAt
      })
      setComments(data)
    })
    return () => unsubscribe()
  }, [postId])

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

  const handleDeletePost = async () => {
    if (!user || !post) return
    if (user.uid !== post.userId && !isAdmin) return
    if (!confirm('Delete this post?')) return
    try {
      for (const comment of comments) await deleteDoc(doc(db, 'comments', comment.id))
      await deleteDoc(doc(db, 'posts', post.id))
      router.push('/')
    } catch (error) {
      console.error('Error deleting post:', error)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return
    const c = comments.find((x) => x.id === commentId)
    if (!c || (user.uid !== c.userId && !isAdmin)) return
    if (!confirm('Delete this comment?')) return
    try {
      await deleteDoc(doc(db, 'comments', commentId))
      if (post) await updateDoc(doc(db, 'posts', post.id), { commentCount: increment(-1) })
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  const visibleComments = comments.slice(0, visibleCount)
  const hasMore = comments.length > visibleCount

  if (loading || !user || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const categoryStyle = post.category && POST_CATEGORIES[post.category as keyof typeof POST_CATEGORIES]
  const upvotes = post.upvotes?.length > 0 ? post.upvotes : ((post as any).likes || [])
  const downvotes = post.downvotes || []
  const domain = post.articleUrl ? (() => { try { return new URL(post.articleUrl!).hostname.replace('www.', '') } catch { return 'article' } })() : null
  const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : null

  return (
    <div className="min-h-screen bg-[#0B0F19]">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Back button */}
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors mb-4 text-sm">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        {/* ===== POST CARD ===== */}
        <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] mb-5 overflow-hidden">
          {/* Post header */}
          <div className="flex items-center gap-2.5 px-4 sm:px-5 pt-4 pb-2">
            <button onClick={() => router.push(`/profile/${post.userId}`)} className="flex-shrink-0">
              {post.userPhoto ? (
                <img src={post.userPhoto} alt={post.userName} className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs ring-1 ring-white/10">
                  {post.userName[0].toUpperCase()}
                </div>
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <button onClick={() => router.push(`/profile/${post.userId}`)} className="font-medium text-sm text-slate-100 hover:text-white transition-colors">
                  {post.userName}
                </button>
                {post.category && categoryStyle && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                    style={{
                      backgroundColor: `${categoryStyle.color}12`,
                      color: categoryStyle.color,
                      border: `1px solid ${categoryStyle.color}20`,
                    }}
                  >
                    {categoryStyle.name}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(post.createdAt, { addSuffix: true })}
              </span>
            </div>
            {(user.uid === post.userId || isAdmin) && (
              <button onClick={handleDeletePost} className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Post body */}
          <div className="px-4 sm:px-5 pb-3">
            {/* Content text - only for non-article posts */}
            {post.content && !post.articleUrl && (
              <p className="text-[15px] text-slate-200 leading-relaxed whitespace-pre-wrap mb-3">{post.content}</p>
            )}

            {/* Image */}
            {post.imageUrl && (
              <div className="rounded-lg overflow-hidden border border-white/[0.06] mb-3">
                <img src={post.imageUrl} alt="Post" className="w-full h-auto object-cover" />
              </div>
            )}

            {/* Article embed - commentary merged inside, title shown ONCE */}
            {post.articleUrl && (
              <a href={post.articleUrl} target="_blank" rel="noopener noreferrer"
                className="block rounded-lg border border-white/[0.06] hover:border-white/[0.12] transition-all overflow-hidden group">
                {post.articleImage ? (
                  <div className="relative">
                    <div className="w-full h-52 sm:h-64 overflow-hidden bg-slate-900/50">
                      <img src={post.articleImage} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-base font-semibold text-white leading-snug line-clamp-2">{post.articleTitle || 'Read Article'}</h3>
                      <div className="flex items-center gap-2 mt-2 text-white/40">
                        {faviconUrl && <img src={faviconUrl} alt="" className="w-3.5 h-3.5 rounded-sm opacity-70" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />}
                        <span className="text-xs">{domain}</span>
                        <ExternalLink className="w-3 h-3 ml-auto" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-white/[0.02]">
                    <h3 className="text-base font-semibold text-slate-200 group-hover:text-white transition-colors leading-snug">{post.articleTitle || 'Read Article'}</h3>
                    <div className="flex items-center gap-2 mt-2 text-slate-500">
                      {faviconUrl && <img src={faviconUrl} alt="" className="w-3.5 h-3.5 rounded-sm opacity-70" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />}
                      <span className="text-xs">{domain}</span>
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </div>
                  </div>
                )}
                {/* Commentary/description below the embed image */}
                {post.content && (
                  <div className="px-4 py-3 border-t border-white/[0.04]">
                    <p className="text-sm text-slate-300 leading-relaxed">{post.content}</p>
                  </div>
                )}
              </a>
            )}
          </div>

          {/* Post footer: centered sentiment + comments count */}
          <div className="flex items-center px-4 sm:px-5 py-3 border-t border-white/[0.04]">
            <div className="flex-1" />
            <SentimentSlider
              targetId={post.id}
              targetType="post"
              upvotes={upvotes}
              downvotes={downvotes}
              isAdmin={isAdmin}
            />
            <div className="flex-1 flex justify-end">
              <div className="flex items-center gap-1.5 text-slate-500">
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{post.commentCount || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== COMMENT INPUT ===== */}
        <form onSubmit={handleCommentSubmit} className="flex items-center gap-2 mb-5">
          <div className="flex-shrink-0">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full object-cover ring-1 ring-white/10" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-medium ring-1 ring-white/10">
                {(user.displayName || 'A')[0].toUpperCase()}
              </div>
            )}
          </div>
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 px-3.5 py-2 bg-white/[0.04] text-white text-sm border border-white/[0.08] rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500/30 transition-all placeholder:text-slate-600"
          />
          <button
            type="submit"
            disabled={!commentText.trim()}
            className="p-2 rounded-lg bg-indigo-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-indigo-400 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* ===== COMMENTS ===== */}
        <div className="space-y-0">
          {visibleComments.length === 0 ? (
            <p className="text-center py-8 text-slate-600 text-sm">No comments yet</p>
          ) : (
            visibleComments.map((comment) => (
              <div key={comment.id} className="py-3 border-b border-white/[0.04] last:border-0">
                <div className="flex items-start gap-2.5">
                  {/* Avatar */}
                  <button onClick={() => router.push(`/profile/${comment.userId}`)} className="flex-shrink-0 mt-0.5">
                    {comment.userPhoto ? (
                      <img src={comment.userPhoto} alt={comment.userName} className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[8px] font-medium">
                        {comment.userName[0].toUpperCase()}
                      </div>
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <button onClick={() => router.push(`/profile/${comment.userId}`)} className="font-medium text-xs text-slate-300 hover:text-white transition-colors">
                        {comment.userName}
                      </button>
                      <span className="text-[10px] text-slate-600">{formatDistanceToNow(comment.createdAt, { addSuffix: true })}</span>
                      {isAdmin && comment.aiScore !== 0 && (
                        <span className={`text-[9px] px-1.5 py-px rounded font-mono ${comment.aiScore > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          AI: {comment.aiScore > 0 ? '+' : ''}{comment.aiScore}
                        </span>
                      )}
                      {(user.uid === comment.userId || isAdmin) && (
                        <button onClick={() => handleDeleteComment(comment.id)} className="ml-auto text-slate-700 hover:text-red-400 transition-colors p-0.5">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed break-words">{comment.content}</p>

                    {/* Comment sentiment slider */}
                    <div className="mt-1.5">
                      <SentimentSlider
                        targetId={comment.id}
                        targetType="comment"
                        upvotes={comment.upvotes || []}
                        downvotes={comment.downvotes || []}
                        isAdmin={isAdmin}
                        compact
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {hasMore && (
            <button
              onClick={() => setVisibleCount(prev => prev + LOAD_MORE_COUNT)}
              className="w-full py-3 text-sm text-slate-400 hover:text-white transition-colors font-medium"
            >
              Show more ({comments.length - visibleCount} remaining)
            </button>
          )}
        </div>
      </main>
    </div>
  )
}

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
import { Post as PostType, Comment } from '@/lib/types'
import Navbar from '@/components/Navbar'
import { Heart, MessageCircle, ExternalLink, Trash2, ArrowLeft, Reply } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function PostPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const postId = params?.postId as string

  const [post, setPost] = useState<PostType | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
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
        // Replies sorted by time (newest first within thread)
        if (a.parentId && b.parentId && a.parentId === b.parentId) {
          return b.createdAt - a.createdAt
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
        parentId: replyingTo || null,
        replyCount: 0,
      })

      // Increment comment count on the post
      await updateDoc(doc(db, 'posts', post.id), {
        commentCount: increment(1),
      })

      // If replying, increment reply count on parent comment
      if (replyingTo) {
        await updateDoc(doc(db, 'comments', replyingTo), {
          replyCount: increment(1),
        })
      }

      setCommentText('')
      setReplyingTo(null)
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
      // Delete all comments
      const commentsSnapshot = await query(
        collection(db, 'comments'),
        where('postId', '==', post.id)
      )

      comments.forEach(async (comment) => {
        await deleteDoc(doc(db, 'comments', comment.id))
      })

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
      // Delete all replies to this comment
      const replies = comments.filter((c) => c.parentId === commentId)
      for (const reply of replies) {
        await deleteDoc(doc(db, 'comments', reply.id))
      }

      // Delete the comment
      await deleteDoc(doc(db, 'comments', commentId))

      // Decrement comment count on post
      if (post) {
        await updateDoc(doc(db, 'posts', post.id), {
          commentCount: increment(-(1 + replies.length)),
        })
      }

      // If this was a reply, decrement parent reply count
      if (comment.parentId) {
        await updateDoc(doc(db, 'comments', comment.parentId), {
          replyCount: increment(-1),
        })
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  // Get top-level comments (no parent)
  const topLevelComments = comments.filter((c) => !c.parentId)

  // Get replies for a specific comment
  const getReplies = (commentId: string) => {
    return comments.filter((c) => c.parentId === commentId)
  }

  // Calculate reply depth for a comment
  const getCommentDepth = (comment: Comment): number => {
    let depth = 0
    let currentParentId = comment.parentId

    while (currentParentId && depth < 10) {
      const parent = comments.find((c) => c.id === currentParentId)
      if (!parent) break
      depth++
      currentParentId = parent.parentId
    }

    return depth
  }

  if (loading || !user || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-slate-400 hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>

        {/* Post */}
        <div className="post-card mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2.5">
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
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary via-primary-light to-secondary flex items-center justify-center text-white font-semibold shadow-sm avatar-ring">
                    {post.userName[0].toUpperCase()}
                  </div>
                )}
              </button>
              <div>
                <button
                  onClick={() => router.push(`/profile/${post.userId}`)}
                  className="font-semibold text-slate-100 hover:text-primary transition-colors block"
                >
                  {post.userName}
                </button>
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
            <div className="mt-4 rounded-xl overflow-hidden border border-slate-800/60 aspect-square">
              <img
                src={post.imageUrl}
                alt="Post"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {post.articleUrl && (
            <a
              href={post.articleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-start space-x-3 p-3 bg-slate-800/50 border border-slate-700/60 rounded-xl hover:border-primary/40 hover:shadow-lg transition-all duration-200 group cursor-pointer"
            >
              {post.articleImage && (
                <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-slate-900">
                  <img
                    src={post.articleImage}
                    alt={post.articleTitle || 'Article'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-200 group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                  {post.articleTitle || 'Read Article'}
                </h4>
                {post.articleDescription && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {post.articleDescription}
                  </p>
                )}
              </div>
            </a>
          )}

          <div className="mt-4 flex items-center space-x-3">
            <button
              onClick={handleLike}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-all duration-200 active:scale-95 ${
                liked ? 'text-rose-400 bg-rose-400/10' : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800/50'
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

        {/* Comment form */}
        <div className="post-card mb-6">
          <form onSubmit={handleCommentSubmit}>
            {replyingTo && (
              <div className="mb-2 flex items-center justify-between bg-slate-800/50 px-3 py-2 rounded-lg">
                <span className="text-sm text-slate-400">
                  Replying to {comments.find((c) => c.id === replyingTo)?.userName}
                </span>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="text-xs text-slate-500 hover:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            )}
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={replyingTo ? 'Write a reply...' : 'Add a comment...'}
              className="w-full px-4 py-3 bg-slate-800/90 text-white border border-slate-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all placeholder:text-slate-400 resize-none"
              rows={3}
            />
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="px-4 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg font-semibold hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {replyingTo ? 'Reply' : 'Comment'}
              </button>
            </div>
          </form>
        </div>

        {/* Comments */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-200">
            {post.commentCount || 0} {post.commentCount === 1 ? 'Comment' : 'Comments'}
          </h3>

          {topLevelComments.length === 0 ? (
            <p className="text-center py-8 text-slate-500">No comments yet. Be the first!</p>
          ) : (
            topLevelComments.map((comment) => (
              <div key={comment.id} className="post-card">
                {/* Comment Header */}
                <div className="flex items-center space-x-2.5 mb-2">
                  <button
                    onClick={() => router.push(`/profile/${comment.userId}`)}
                    className="flex-shrink-0 cursor-pointer"
                  >
                    {comment.userPhoto ? (
                      <img
                        src={comment.userPhoto}
                        alt={comment.userName}
                        className="w-8 h-8 rounded-full object-cover avatar-ring"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary via-primary-light to-secondary flex items-center justify-center text-white text-sm font-semibold avatar-ring">
                        {comment.userName[0].toUpperCase()}
                      </div>
                    )}
                  </button>
                  <div className="flex items-center space-x-2 flex-wrap min-w-0 flex-1">
                    <button
                      onClick={() => router.push(`/profile/${comment.userId}`)}
                      className="font-semibold text-sm text-slate-100 hover:text-primary transition-colors"
                    >
                      {comment.userName}
                    </button>
                    <span className="text-xs text-slate-500">
                      · {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                    </span>
                  </div>

                  {/* Delete button for comment author or admin */}
                  {(user.uid === comment.userId || isAdmin) && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Comment Content */}
                <p className="text-slate-200 leading-relaxed break-words">
                  {comment.content}
                </p>

                <div className="mt-3">
                  <div className="flex items-center gap-4">

                    <button
                      onClick={() => handleLikeComment(comment.id, comment.likes)}
                      className={`flex items-center gap-1.5 text-sm transition-colors ${
                        user && comment.likes.includes(user.uid)
                          ? 'text-rose-400'
                          : 'text-slate-500 hover:text-rose-400'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          user && comment.likes.includes(user.uid) ? 'fill-current' : ''
                        }`}
                      />
                      <span className="font-medium">
                        {comment.likes.length > 0 ? comment.likes.length : ''}
                      </span>
                    </button>

                    {/* Only show Reply button if depth < 4 */}
                    {getCommentDepth(comment) < 3 && (
                      <button
                        onClick={() => setReplyingTo(comment.id)}
                        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors"
                      >
                        <Reply className="w-4 h-4" />
                        <span className="font-medium">Reply</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Replies */}
                {(comment.replyCount || 0) > 0 && (
                  <div className="mt-4 space-y-3 pl-4 border-l-2 border-slate-800">
                    {getReplies(comment.id).map((reply) => (
                      <div key={reply.id}>
                        {/* Reply Header */}
                        <div className="flex items-center space-x-2 mb-1.5">
                          <button
                            onClick={() => router.push(`/profile/${reply.userId}`)}
                            className="flex-shrink-0 cursor-pointer"
                          >
                            {reply.userPhoto ? (
                              <img
                                src={reply.userPhoto}
                                alt={reply.userName}
                                className="w-7 h-7 rounded-full object-cover avatar-ring"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary via-primary-light to-secondary flex items-center justify-center text-white text-xs font-semibold avatar-ring">
                                {reply.userName[0].toUpperCase()}
                              </div>
                            )}
                          </button>
                          <div className="flex items-center space-x-2 flex-wrap min-w-0 flex-1">
                            <button
                              onClick={() => router.push(`/profile/${reply.userId}`)}
                              className="font-semibold text-xs text-slate-100 hover:text-primary transition-colors"
                            >
                              {reply.userName}
                            </button>
                            <span className="text-xs text-slate-500">
                              · {formatDistanceToNow(reply.createdAt, { addSuffix: true })}
                            </span>
                          </div>

                          {/* Delete button for reply author or admin */}
                          {(user.uid === reply.userId || isAdmin) && (
                            <button
                              onClick={() => handleDeleteComment(reply.id)}
                              className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-all flex-shrink-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Reply Content */}
                        <p className="text-slate-200 text-sm mt-1 leading-relaxed break-words">
                          {reply.content}
                        </p>

                        <div className="flex items-center gap-3 mt-2">
                          <button
                            onClick={() => handleLikeComment(reply.id, reply.likes)}
                            className={`flex items-center gap-1 text-xs transition-colors ${
                              user && reply.likes.includes(user.uid)
                                ? 'text-rose-400'
                                : 'text-slate-500 hover:text-rose-400'
                            }`}
                          >
                            <Heart
                              className={`w-3 h-3 ${
                                user && reply.likes.includes(user.uid) ? 'fill-current' : ''
                              }`}
                            />
                            <span className="font-medium">
                              {reply.likes.length > 0 ? reply.likes.length : ''}
                            </span>
                          </button>

                          {/* Only show Reply button if depth < 4 */}
                          {getCommentDepth(reply) < 3 && (
                            <button
                              onClick={() => setReplyingTo(comment.id)}
                              className="flex items-center gap-1 text-xs text-slate-500 hover:text-primary transition-colors"
                            >
                              <Reply className="w-3 h-3" />
                              <span className="font-medium">Reply</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}

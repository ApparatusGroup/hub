'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { doc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, increment } from 'firebase/firestore'
import { Heart, MessageCircle, Bot, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Post as PostType, Comment } from '@/lib/types'
import { useEffect } from 'react'

interface PostProps {
  post: PostType
}

export default function Post({ post }: PostProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)

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
        await updateDoc(postRef, {
          likes: arrayRemove(user.uid)
        })
        setLiked(false)
        setLikeCount(prev => prev - 1)
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(user.uid)
        })
        setLiked(true)
        setLikeCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('Error updating like:', error)
    }
  }

  const loadComments = async () => {
    setLoadingComments(true)
    try {
      const q = query(
        collection(db, 'comments'),
        where('postId', '==', post.id),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(q)
      const commentsData = snapshot.docs.map(doc => {
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
        } as Comment
      })
      setComments(commentsData)
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setLoadingComments(false)
    }
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !commentText.trim()) return

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

      // Increment comment count on the post
      const postRef = doc(db, 'posts', post.id)
      await updateDoc(postRef, {
        commentCount: increment(1)
      })

      setCommentText('')
      loadComments()
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  const toggleComments = () => {
    if (!showComments) {
      loadComments()
    }
    setShowComments(!showComments)
  }

  const handleLikeComment = async (commentId: string, currentLikes: string[]) => {
    if (!user) return

    const commentRef = doc(db, 'comments', commentId)
    try {
      if (currentLikes.includes(user.uid)) {
        await updateDoc(commentRef, {
          likes: arrayRemove(user.uid)
        })
      } else {
        await updateDoc(commentRef, {
          likes: arrayUnion(user.uid)
        })
      }
      loadComments()
    } catch (error) {
      console.error('Error updating comment like:', error)
    }
  }

  return (
    <div className="post-card">
      <div className="flex items-start space-x-3.5">
        <button
          onClick={() => router.push(`/profile/${post.userId}`)}
          className="flex-shrink-0 cursor-pointer group"
        >
          {post.userPhoto ? (
            <img
              src={post.userPhoto}
              alt={post.userName}
              className="w-11 h-11 rounded-full object-cover avatar-ring"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary via-primary-light to-secondary flex items-center justify-center text-white font-semibold shadow-sm avatar-ring">
              {post.userName[0].toUpperCase()}
            </div>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 flex-wrap">
            <button
              onClick={() => router.push(`/profile/${post.userId}`)}
              className="font-semibold text-slate-100 hover:text-primary transition-colors"
            >
              {post.userName}
            </button>
            <span className="text-sm text-slate-500">
              · {formatDistanceToNow(post.createdAt, { addSuffix: true })}
            </span>
          </div>

          <p className="mt-2.5 text-slate-300 leading-relaxed whitespace-pre-wrap">{post.content}</p>

          {post.imageUrl && (
            <div className="mt-4 rounded-xl overflow-hidden border border-slate-800/60">
              <img
                src={post.imageUrl}
                alt="Post"
                className="w-full max-h-[500px] object-cover hover:scale-[1.02] transition-transform duration-500"
              />
            </div>
          )}

          {post.articleUrl && (
            <a
              href={post.articleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center p-4 bg-slate-800/50 border border-slate-700/60 rounded-xl hover:border-primary/40 hover:shadow-lg transition-all duration-200 group"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-900 border border-slate-700/60 flex items-center justify-center group-hover:border-primary/40 transition-colors">
                <ExternalLink className="w-4 h-4 text-primary" />
              </div>
              <span className="ml-3 text-sm text-slate-300 font-medium group-hover:text-primary truncate transition-colors">
                {post.articleTitle || post.articleUrl}
              </span>
            </a>
          )}

          <div className="mt-5 flex items-center space-x-6">
            <button
              onClick={handleLike}
              className={`flex items-center space-x-2 transition-all duration-200 smooth-interaction ${
                liked ? 'text-rose-400' : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
              <span className="text-sm font-medium">{likeCount}</span>
            </button>

            <button
              onClick={toggleComments}
              className="flex items-center space-x-2 text-slate-400 hover:text-primary transition-all duration-200 smooth-interaction"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{post.commentCount || comments.length}</span>
            </button>
          </div>

          {showComments && (
            <div className="mt-4 pt-4 border-t border-slate-200/60 bg-slate-900/[0.02] -mx-5 px-5 -mb-5 pb-5 rounded-b-2xl">
              <form onSubmit={handleCommentSubmit} className="mb-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 text-sm bg-slate-800/90 text-white border border-slate-700/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="px-3 py-2 text-xs font-semibold bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Post
                  </button>
                </div>
              </form>

              {loadingComments ? (
                <p className="text-xs text-slate-500 text-center py-3">Loading...</p>
              ) : (
                <div className="space-y-2">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2 animate-fade-in">
                      <button
                        onClick={() => router.push(`/profile/${comment.userId}`)}
                        className="flex-shrink-0 cursor-pointer mt-0.5"
                      >
                        {comment.userPhoto ? (
                          <img
                            src={comment.userPhoto}
                            alt={comment.userName}
                            className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-700/30"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white text-xs font-semibold ring-1 ring-slate-700/30">
                            {comment.userName[0].toUpperCase()}
                          </div>
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="bg-slate-800/90 rounded-lg px-3 py-2 border border-slate-700/50">
                          <button
                            onClick={() => router.push(`/profile/${comment.userId}`)}
                            className="font-semibold text-xs text-white hover:text-primary transition-colors"
                          >
                            {comment.userName}
                          </button>
                          <p className="text-sm text-slate-200 mt-0.5 leading-snug break-words">{comment.content}</p>
                        </div>
                        <div className="flex items-center gap-3 mt-1 px-1">
                          <button
                            onClick={() => handleLikeComment(comment.id, comment.likes)}
                            className={`flex items-center gap-1 text-xs transition-colors ${
                              user && comment.likes.includes(user.uid) ? 'text-rose-400' : 'text-slate-500 hover:text-rose-400'
                            }`}
                          >
                            <Heart className={`w-3 h-3 ${user && comment.likes.includes(user.uid) ? 'fill-current' : ''}`} />
                            <span className="font-medium">{comment.likes.length > 0 ? comment.likes.length : ''}</span>
                          </button>
                          <span className="text-xs text-slate-500">
                            {comment.createdAt ? formatDistanceToNow(comment.createdAt, { addSuffix: true }) : 'now'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

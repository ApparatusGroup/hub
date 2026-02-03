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
              className="font-semibold text-slate-900 hover:text-primary transition-colors"
            >
              {post.userName}
            </button>
            <span className="text-sm text-slate-500">
              · {formatDistanceToNow(post.createdAt, { addSuffix: true })}
            </span>
          </div>

          <p className="mt-2.5 text-slate-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>

          {post.imageUrl && (
            <div className="mt-4 rounded-xl overflow-hidden border border-slate-200/60">
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
              className="mt-4 flex items-center p-4 bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-slate-200/60 rounded-xl hover:border-primary/30 hover:shadow-sm transition-all duration-200 group"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white border border-slate-200/60 flex items-center justify-center group-hover:border-primary/30 transition-colors">
                <ExternalLink className="w-4 h-4 text-primary" />
              </div>
              <span className="ml-3 text-sm text-slate-700 font-medium group-hover:text-primary truncate transition-colors">
                {post.articleTitle || post.articleUrl}
              </span>
            </a>
          )}

          <div className="mt-5 flex items-center space-x-6">
            <button
              onClick={handleLike}
              className={`flex items-center space-x-2 transition-all duration-200 smooth-interaction ${
                liked ? 'text-rose-500' : 'text-slate-500 hover:text-rose-500'
              }`}
            >
              <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
              <span className="text-sm font-medium">{likeCount}</span>
            </button>

            <button
              onClick={toggleComments}
              className="flex items-center space-x-2 text-slate-500 hover:text-primary transition-all duration-200 smooth-interaction"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{post.commentCount || comments.length}</span>
            </button>
          </div>

          {showComments && (
            <div className="mt-5 pt-5 border-t border-slate-200/60">
              <form onSubmit={handleCommentSubmit} className="mb-5">
                <div className="flex space-x-2.5">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Post
                  </button>
                </div>
              </form>

              {loadingComments ? (
                <p className="text-sm text-slate-500">Loading comments...</p>
              ) : (
                <div className="space-y-3.5">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex space-x-2.5 animate-fade-in">
                      <button
                        onClick={() => router.push(`/profile/${comment.userId}`)}
                        className="flex-shrink-0 cursor-pointer group"
                      >
                        {comment.userPhoto ? (
                          <img
                            src={comment.userPhoto}
                            alt={comment.userName}
                            className="w-9 h-9 rounded-full object-cover avatar-ring"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-semibold avatar-ring">
                            {comment.userName[0].toUpperCase()}
                          </div>
                        )}
                      </button>

                      <div className="flex-1 bg-slate-50/80 rounded-xl px-4 py-3 border border-slate-200/40">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => router.push(`/profile/${comment.userId}`)}
                            className="font-semibold text-sm hover:text-primary transition-colors"
                          >
                            {comment.userName}
                          </button>
                        </div>
                        <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">{comment.content}</p>
                        <div className="flex items-center space-x-4 mt-2.5">
                          <button
                            onClick={() => handleLikeComment(comment.id, comment.likes)}
                            className={`flex items-center space-x-1.5 text-xs transition-colors ${
                              user && comment.likes.includes(user.uid) ? 'text-rose-500' : 'text-slate-500 hover:text-rose-500'
                            }`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${user && comment.likes.includes(user.uid) ? 'fill-current' : ''}`} />
                            <span className="font-medium">{comment.likes.length}</span>
                          </button>
                          <span className="text-xs text-slate-500">
                            {comment.createdAt ? formatDistanceToNow(comment.createdAt, { addSuffix: true }) : 'Just now'}
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

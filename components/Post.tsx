'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
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
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {post.userPhoto ? (
            <img src={post.userPhoto} alt={post.userName} className="w-10 h-10 rounded-full" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
              {post.userName[0].toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-gray-900">{post.userName}</h3>
            {post.isAI && (
              <span className="flex items-center text-xs bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">
                <Bot className="w-3 h-3 mr-1" />
                AI
              </span>
            )}
            <span className="text-sm text-gray-500">
              {formatDistanceToNow(post.createdAt, { addSuffix: true })}
            </span>
          </div>

          <p className="mt-2 text-gray-800 whitespace-pre-wrap">{post.content}</p>

          {post.imageUrl && (
            <img src={post.imageUrl} alt="Post" className="mt-3 rounded-lg max-h-96 w-full object-cover" />
          )}

          {post.articleUrl && (
            <a
              href={post.articleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="w-4 h-4 mr-2 text-primary" />
              <span className="text-sm text-primary hover:underline truncate">
                {post.articleTitle || post.articleUrl}
              </span>
            </a>
          )}

          <div className="mt-4 flex items-center space-x-6">
            <button
              onClick={handleLike}
              className={`flex items-center space-x-2 transition-colors ${
                liked ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
              }`}
            >
              <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
              <span className="text-sm font-medium">{likeCount}</span>
            </button>

            <button
              onClick={toggleComments}
              className="flex items-center space-x-2 text-gray-600 hover:text-primary transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{post.commentCount || comments.length}</span>
            </button>
          </div>

          {showComments && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <form onSubmit={handleCommentSubmit} className="mb-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="btn-primary text-sm disabled:opacity-50"
                  >
                    Post
                  </button>
                </div>
              </form>

              {loadingComments ? (
                <p className="text-sm text-gray-500">Loading comments...</p>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex space-x-2">
                      <div className="flex-shrink-0">
                        {comment.userPhoto ? (
                          <img src={comment.userPhoto} alt={comment.userName} className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">
                            {comment.userName[0].toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 bg-gray-100 rounded-lg px-3 py-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-sm">{comment.userName}</span>
                          {comment.isAI && <Bot className="w-3 h-3 text-secondary" />}
                        </div>
                        <p className="text-sm text-gray-800 mt-1">{comment.content}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <button
                            onClick={() => handleLikeComment(comment.id, comment.likes)}
                            className={`flex items-center space-x-1 text-xs ${
                              user && comment.likes.includes(user.uid) ? 'text-red-500' : 'text-gray-500'
                            }`}
                          >
                            <Heart className={`w-3 h-3 ${user && comment.likes.includes(user.uid) ? 'fill-current' : ''}`} />
                            <span>{comment.likes.length}</span>
                          </button>
                          <span className="text-xs text-gray-500">
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

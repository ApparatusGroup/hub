"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface User {
  id: string;
  name: string | null;
  image: string | null;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: User;
}

interface Like {
  id: string;
  userId: string;
}

interface PostProps {
  post: {
    id: string;
    content: string;
    image: string | null;
    createdAt: string;
    user: User & { email: string | null };
    comments: Comment[];
    likes: Like[];
    _count: {
      comments: number;
      likes: number;
    };
  };
}

export default function Post({ post }: PostProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const isLiked = post.likes.some(
    (like) => like.userId === session?.user?.id
  );

  const handleLike = async () => {
    if (!session) return;

    try {
      const method = isLiked ? "DELETE" : "POST";
      const response = await fetch(`/api/posts/${post.id}/likes`, {
        method,
      });

      if (response.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comment.trim() || !session) return;

    setIsCommenting(true);

    try {
      const response = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: comment }),
      });

      if (response.ok) {
        setComment("");
        setShowComments(true);
        router.refresh();
      }
    } catch (error) {
      console.error("Error posting comment:", error);
    } finally {
      setIsCommenting(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-4">
      <div className="flex items-center mb-4">
        {post.user.image ? (
          <Image
            src={post.user.image}
            alt={post.user.name || "User"}
            width={40}
            height={40}
            className="rounded-full"
          />
        ) : (
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-gray-600 font-semibold">
              {post.user.name?.charAt(0) || "U"}
            </span>
          </div>
        )}
        <div className="ml-3">
          <h3 className="font-semibold">{post.user.name}</h3>
          <p className="text-sm text-gray-500">
            {new Date(post.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <p className="text-gray-800 mb-4 whitespace-pre-wrap">{post.content}</p>

      {post.image && (
        <div className="mb-4 relative w-full h-64">
          <Image
            src={post.image}
            alt="Post image"
            fill
            className="rounded-lg object-cover"
          />
        </div>
      )}

      <div className="flex items-center space-x-6 text-gray-600 border-t pt-3">
        <button
          onClick={handleLike}
          disabled={!session}
          className={`flex items-center space-x-2 ${
            isLiked ? "text-red-500" : "hover:text-red-500"
          } disabled:cursor-not-allowed`}
        >
          <svg
            className="w-5 h-5"
            fill={isLiked ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <span>{post._count.likes} Likes</span>
        </button>
        
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center space-x-2 hover:text-blue-500"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span>{post._count.comments} Comments</span>
        </button>
      </div>

      {showComments && (
        <div className="mt-4 border-t pt-4">
          {session && (
            <form onSubmit={handleComment} className="mb-4">
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write a comment..."
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isCommenting}
              />
              <button
                type="submit"
                disabled={isCommenting || !comment.trim()}
                className="mt-2 bg-blue-600 text-white px-4 py-1 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
              >
                {isCommenting ? "Posting..." : "Comment"}
              </button>
            </form>
          )}

          <div className="space-y-3">
            {post.comments.map((comment) => (
              <div key={comment.id} className="flex space-x-2">
                {comment.user.image ? (
                  <Image
                    src={comment.user.image}
                    alt={comment.user.name || "User"}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 text-sm font-semibold">
                      {comment.user.name?.charAt(0) || "U"}
                    </span>
                  </div>
                )}
                <div className="flex-1 bg-gray-100 rounded-lg p-2">
                  <h4 className="font-semibold text-sm">{comment.user.name}</h4>
                  <p className="text-sm text-gray-800">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

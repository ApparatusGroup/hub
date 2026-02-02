export interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: User;
}

export interface Like {
  id: string;
  userId: string;
  user?: {
    id: string;
    name: string | null;
  };
}

export interface Post {
  id: string;
  content: string;
  image: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user: User;
  comments: Comment[];
  likes: Like[];
  _count: {
    comments: number;
    likes: number;
  };
}

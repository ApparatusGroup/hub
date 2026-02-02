# Hub - Social Network Platform

A modern, full-featured social network built with Next.js, PostgreSQL, Prisma, and NextAuth.js. Deploy-ready for Vercel.

## Features

- **User Authentication**: Secure email/password authentication using NextAuth.js
- **User Feed**: Dynamic feed displaying posts from all users
- **Create Posts**: Share text updates and images
- **Interactions**: Like and comment on posts
- **User Profiles**: View user profiles with avatars, bio, and post counts
- **Responsive Design**: Mobile-friendly UI built with Tailwind CSS

## Technology Stack

- **Frontend**: Next.js 14+ (App Router)
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js 18+ 
- npm or yarn
- PostgreSQL database (local or cloud-hosted)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ApparatusGroup/hub.git
cd hub
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

Update the `.env` file with your actual values:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/hub?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"
```

To generate a secure `NEXTAUTH_SECRET`, run:

```bash
openssl rand -base64 32
```

### 4. Set up the database

Run Prisma migrations to create the database schema:

```bash
npx prisma migrate dev --name init
```

Generate the Prisma Client:

```bash
npx prisma generate
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The application uses the following main models:

- **User**: Stores user information (email, password, profile data)
- **Post**: User-created posts with text and optional images
- **Comment**: Comments on posts
- **Like**: Post likes/reactions
- **Session/Account**: NextAuth.js session management

## Project Structure

```
hub/
├── app/
│   ├── api/               # API routes
│   │   ├── auth/         # NextAuth.js routes
│   │   ├── posts/        # Post CRUD operations
│   │   ├── register/     # User registration
│   │   └── users/        # User profile operations
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   ├── profile/          # User profile pages
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home/Feed page
│   └── globals.css       # Global styles
├── components/           # React components
│   ├── Navbar.tsx       # Navigation bar
│   ├── Post.tsx         # Post display component
│   ├── CreatePost.tsx   # Post creation form
│   └── Providers.tsx    # NextAuth session provider
├── lib/                 # Utility functions
│   ├── auth.ts         # NextAuth configuration
│   └── prisma.ts       # Prisma client instance
├── prisma/
│   └── schema.prisma   # Database schema
├── types/              # TypeScript type definitions
└── public/             # Static assets
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Deployment to Vercel

### 1. Set up a PostgreSQL database

You can use:
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- [Supabase](https://supabase.com)
- [Railway](https://railway.app)
- [Neon](https://neon.tech)

### 2. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ApparatusGroup/hub)

Or manually:

```bash
npm install -g vercel
vercel
```

### 3. Configure environment variables

In your Vercel dashboard, add these environment variables:
- `DATABASE_URL` - Your PostgreSQL connection string
- `NEXTAUTH_URL` - Your deployment URL (e.g., https://your-app.vercel.app)
- `NEXTAUTH_SECRET` - Your NextAuth secret

### 4. Run database migrations

After deployment, run migrations in your Vercel project:

```bash
npx prisma migrate deploy
```

## Features Roadmap

- [ ] User profile editing
- [ ] Image upload (Cloudinary/S3 integration)
- [ ] Follow/unfollow users
- [ ] Direct messaging
- [ ] Notifications
- [ ] Search functionality
- [ ] Post editing and deletion
- [ ] Rich text editor
- [ ] Email verification
- [ ] Password reset
- [ ] OAuth providers (Google, GitHub)

## Security Considerations

- Passwords are hashed using bcryptjs
- API routes are protected with NextAuth.js session validation
- SQL injection protection via Prisma ORM
- Environment variables for sensitive data
- CSRF protection via NextAuth.js

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC License

## Support

For issues and questions, please open an issue on GitHub.

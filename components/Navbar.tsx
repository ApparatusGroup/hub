'use client'

import { useAuth } from '@/lib/auth-context'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import { Home, User, LogOut } from 'lucide-react'

export default function Navbar() {
  const { user } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      router.push('/auth/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (!user) return null

  return (
    <nav className="sticky top-0 z-50 navbar-glass">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-3 group cursor-pointer"
        >
          {/* Algosphere Globe Logo */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-secondary rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity animate-glow-pulse" />
            <div className="relative w-9 h-9 flex items-center justify-center">
              <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Globe */}
                <circle cx="24" cy="24" r="18" stroke="url(#globe-gradient)" strokeWidth="1.5" opacity="0.6" />
                {/* Grid lines horizontal */}
                <ellipse cx="24" cy="24" rx="18" ry="7" stroke="url(#globe-gradient)" strokeWidth="0.8" opacity="0.3" />
                <ellipse cx="24" cy="24" rx="18" ry="13" stroke="url(#globe-gradient)" strokeWidth="0.8" opacity="0.3" />
                {/* Grid lines vertical */}
                <ellipse cx="24" cy="24" rx="7" ry="18" stroke="url(#globe-gradient)" strokeWidth="0.8" opacity="0.3" />
                <ellipse cx="24" cy="24" rx="13" ry="18" stroke="url(#globe-gradient)" strokeWidth="0.8" opacity="0.3" />
                {/* Orbit ring */}
                <ellipse cx="24" cy="24" rx="22" ry="9" transform="rotate(-20 24 24)" stroke="url(#orbit-gradient)" strokeWidth="1.5" strokeLinecap="round" />
                {/* Center glow */}
                <circle cx="24" cy="24" r="4" fill="url(#center-gradient)" />
                <circle cx="24" cy="24" r="2" fill="white" opacity="0.9" />
                <defs>
                  <linearGradient id="globe-gradient" x1="6" y1="6" x2="42" y2="42">
                    <stop stopColor="#06B6D4" />
                    <stop offset="1" stopColor="#D946EF" />
                  </linearGradient>
                  <linearGradient id="orbit-gradient" x1="2" y1="24" x2="46" y2="24">
                    <stop stopColor="#06B6D4" stopOpacity="0.8" />
                    <stop offset="0.5" stopColor="#8B5CF6" />
                    <stop offset="1" stopColor="#D946EF" stopOpacity="0.8" />
                  </linearGradient>
                  <radialGradient id="center-gradient" cx="24" cy="24" r="4">
                    <stop stopColor="#22D3EE" />
                    <stop offset="1" stopColor="#06B6D4" stopOpacity="0.6" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
          </div>
          <span className="text-xl font-extrabold tracking-wide chrome-text hidden sm:block">
            ALGOSPHERE
          </span>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => router.push('/')}
            className="p-2.5 rounded-xl text-slate-400 hover:text-primary hover:bg-white/[0.06] transition-all duration-200 smooth-interaction"
            aria-label="Home"
          >
            <Home className="w-5 h-5" />
          </button>

          <button
            onClick={() => router.push(`/profile/${user.uid}`)}
            className="p-2.5 rounded-xl text-slate-400 hover:text-primary hover:bg-white/[0.06] transition-all duration-200 smooth-interaction"
            aria-label="Profile"
          >
            <User className="w-5 h-5" />
          </button>

          <button
            onClick={handleSignOut}
            className="p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-white/[0.06] transition-all duration-200 smooth-interaction"
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  )
}

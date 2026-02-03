'use client'

import { useAuth } from '@/lib/auth-context'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import { Home, User, LogOut, Bot } from 'lucide-react'

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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => router.push('/')}
          className="flex items-center space-x-2 group cursor-pointer"
        >
          {/* Algosphere Logo */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-xl blur-md opacity-40 group-hover:opacity-60 transition-opacity"></div>
            <div className="relative bg-gradient-to-br from-primary to-secondary p-2 rounded-xl shadow-sm group-hover:shadow-md transition-all duration-200">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3"/>
                <circle cx="12" cy="12" r="6" fill="white" fillOpacity="0.3"/>
                <circle cx="12" cy="12" r="3" fill="white"/>
              </svg>
            </div>
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent group-hover:opacity-80 transition-opacity">
            Algosphere
          </h1>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => router.push('/')}
            className="p-2.5 hover:bg-slate-100 rounded-xl transition-all duration-200 text-slate-600 hover:text-primary smooth-interaction"
            aria-label="Home"
          >
            <Home className="w-5 h-5" />
          </button>

          <button
            onClick={() => router.push(`/profile/${user.uid}`)}
            className="p-2.5 hover:bg-slate-100 rounded-xl transition-all duration-200 text-slate-600 hover:text-primary smooth-interaction"
            aria-label="Profile"
          >
            <User className="w-5 h-5" />
          </button>

          <button
            onClick={handleSignOut}
            className="p-2.5 hover:bg-slate-100 rounded-xl transition-all duration-200 text-slate-600 hover:text-rose-500 smooth-interaction"
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  )
}

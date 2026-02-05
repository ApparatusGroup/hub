'use client'

import { useState } from 'react'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, setDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      await updateProfile(user, { displayName })

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName,
        photoURL: null,
        bio: '',
        isAI: false,
        createdAt: Date.now(),
      })

      router.push('/')
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface bg-grid">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-secondary/8 via-transparent to-transparent pointer-events-none" />

      <div className="relative max-w-md w-full">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/10 to-secondary/20 rounded-3xl blur-xl opacity-40" />

        <div className="relative bg-surface-raised/90 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-full blur-xl opacity-30 animate-glow-pulse" />
              <svg width="56" height="56" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative">
                <circle cx="24" cy="24" r="18" stroke="url(#lg2)" strokeWidth="1.5" opacity="0.6" />
                <ellipse cx="24" cy="24" rx="18" ry="7" stroke="url(#lg2)" strokeWidth="0.8" opacity="0.3" />
                <ellipse cx="24" cy="24" rx="7" ry="18" stroke="url(#lg2)" strokeWidth="0.8" opacity="0.3" />
                <ellipse cx="24" cy="24" rx="22" ry="9" transform="rotate(-20 24 24)" stroke="url(#og2)" strokeWidth="1.5" />
                <circle cx="24" cy="24" r="4" fill="url(#cg2)" />
                <circle cx="24" cy="24" r="2" fill="white" opacity="0.9" />
                <defs>
                  <linearGradient id="lg2" x1="6" y1="6" x2="42" y2="42"><stop stopColor="#06B6D4" /><stop offset="1" stopColor="#D946EF" /></linearGradient>
                  <linearGradient id="og2" x1="2" y1="24" x2="46" y2="24"><stop stopColor="#06B6D4" /><stop offset="0.5" stopColor="#8B5CF6" /><stop offset="1" stopColor="#D946EF" /></linearGradient>
                  <radialGradient id="cg2" cx="24" cy="24" r="4"><stop stopColor="#22D3EE" /><stop offset="1" stopColor="#06B6D4" stopOpacity="0.6" /></radialGradient>
                </defs>
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold tracking-widest chrome-text">ALGOSPHERE</h1>
          </div>

          <h2 className="text-xl font-bold text-center mb-6 text-slate-200">Create Account</h2>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-4 py-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-slate-400 mb-1.5">Display Name</label>
              <input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                className="input-field" required placeholder="John Doe" />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-400 mb-1.5">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="input-field" required placeholder="you@example.com" />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-400 mb-1.5">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="input-field" required placeholder="••••••••" minLength={6} />
              <p className="text-xs text-slate-600 mt-1">Minimum 6 characters</p>
            </div>

            <button type="submit" disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary font-medium hover:text-primary-light transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

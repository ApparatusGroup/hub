'use client'

import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push('/')
    } catch (err: any) {
      setError(err.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface bg-grid">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-primary/8 via-transparent to-transparent pointer-events-none" />

      <div className="relative max-w-md w-full">
        {/* Card glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/10 to-secondary/20 rounded-3xl blur-xl opacity-40" />

        <div className="relative bg-surface-raised/90 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-full blur-xl opacity-30 animate-glow-pulse" />
              <svg width="56" height="56" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative">
                <circle cx="24" cy="24" r="18" stroke="url(#lg)" strokeWidth="1.5" opacity="0.6" />
                <ellipse cx="24" cy="24" rx="18" ry="7" stroke="url(#lg)" strokeWidth="0.8" opacity="0.3" />
                <ellipse cx="24" cy="24" rx="7" ry="18" stroke="url(#lg)" strokeWidth="0.8" opacity="0.3" />
                <ellipse cx="24" cy="24" rx="22" ry="9" transform="rotate(-20 24 24)" stroke="url(#og)" strokeWidth="1.5" />
                <circle cx="24" cy="24" r="4" fill="url(#cg)" />
                <circle cx="24" cy="24" r="2" fill="white" opacity="0.9" />
                <defs>
                  <linearGradient id="lg" x1="6" y1="6" x2="42" y2="42"><stop stopColor="#06B6D4" /><stop offset="1" stopColor="#D946EF" /></linearGradient>
                  <linearGradient id="og" x1="2" y1="24" x2="46" y2="24"><stop stopColor="#06B6D4" /><stop offset="0.5" stopColor="#8B5CF6" /><stop offset="1" stopColor="#D946EF" /></linearGradient>
                  <radialGradient id="cg" cx="24" cy="24" r="4"><stop stopColor="#22D3EE" /><stop offset="1" stopColor="#06B6D4" stopOpacity="0.6" /></radialGradient>
                </defs>
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold tracking-widest chrome-text">ALGOSPHERE</h1>
          </div>

          <h2 className="text-xl font-bold text-center mb-6 text-slate-200">Welcome Back</h2>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-4 py-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-400 mb-1.5">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="input-field" required placeholder="you@example.com" />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-400 mb-1.5">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="input-field" required placeholder="••••••••" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-primary font-medium hover:text-primary-light transition-colors">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

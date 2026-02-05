'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc } from 'firebase/firestore'
import { Minus, Plus, Zap } from 'lucide-react'

type SentimentLevel = -2 | -1 | 0 | 1 | 2
type TargetType = 'post' | 'comment'

interface SentimentSliderProps {
  targetId: string
  targetType: TargetType
  upvotes: string[]
  downvotes: string[]
  isAdmin?: boolean
  compact?: boolean
}

export default function SentimentSlider({
  targetId,
  targetType,
  upvotes,
  downvotes,
  isAdmin = false,
  compact = false,
}: SentimentSliderProps) {
  const { user } = useAuth()
  const [level, setLevel] = useState<SentimentLevel>(0)
  const [canUseExtreme, setCanUseExtreme] = useState(true)
  const [score, setScore] = useState(0)

  useEffect(() => {
    setScore((upvotes?.length || 0) - (downvotes?.length || 0))
  }, [upvotes, downvotes])

  useEffect(() => {
    if (!user) return
    if (upvotes?.includes(user.uid)) setLevel(1)
    else if (downvotes?.includes(user.uid)) setLevel(-1)
    else setLevel(0)
  }, [user, upvotes, downvotes])

  useEffect(() => {
    if (!user || isAdmin) {
      setCanUseExtreme(true)
      return
    }
    const checkLimit = async () => {
      try {
        const limitDoc = await getDoc(doc(db, 'userLimits', user.uid))
        if (limitDoc.exists()) {
          const data = limitDoc.data()
          const lastExtreme = data.lastExtremeVote?.toMillis?.() || data.lastExtremeVote || 0
          const hoursSince = (Date.now() - lastExtreme) / (1000 * 60 * 60)
          setCanUseExtreme(hoursSince >= 24)
        } else {
          setCanUseExtreme(true)
        }
      } catch {
        setCanUseExtreme(true)
      }
    }
    checkLimit()
  }, [user, isAdmin])

  const applyVote = useCallback(async (newLevel: SentimentLevel) => {
    if (!user) return

    const coll = targetType === 'post' ? 'posts' : 'comments'
    const ref = doc(db, coll, targetId)

    try {
      // Remove existing vote
      if (level > 0 || upvotes?.includes(user.uid)) {
        await updateDoc(ref, { upvotes: arrayRemove(user.uid) })
      }
      if (level < 0 || downvotes?.includes(user.uid)) {
        await updateDoc(ref, { downvotes: arrayRemove(user.uid) })
      }

      // Toggle off
      if (newLevel === 0 || newLevel === level) {
        setLevel(0)
        return
      }

      // Apply
      if (newLevel > 0) {
        if (newLevel === 2) {
          for (let i = 0; i < 5; i++) {
            await updateDoc(ref, { upvotes: arrayUnion(user.uid + (i === 0 ? '' : `_x${i}`)) })
          }
          if (!isAdmin) {
            await setDoc(doc(db, 'userLimits', user.uid), { lastExtremeVote: new Date() }, { merge: true })
            setCanUseExtreme(false)
          }
        } else {
          await updateDoc(ref, { upvotes: arrayUnion(user.uid) })
        }
      } else {
        if (newLevel === -2) {
          for (let i = 0; i < 5; i++) {
            await updateDoc(ref, { downvotes: arrayUnion(user.uid + (i === 0 ? '' : `_x${i}`)) })
          }
          if (!isAdmin) {
            await setDoc(doc(db, 'userLimits', user.uid), { lastExtremeVote: new Date() }, { merge: true })
            setCanUseExtreme(false)
          }
        } else {
          await updateDoc(ref, { downvotes: arrayUnion(user.uid) })
        }
      }

      setLevel(newLevel)
    } catch (error) {
      console.error('Error voting:', error)
    }
  }, [user, level, targetId, targetType, upvotes, downvotes, isAdmin, canUseExtreme])

  const handleDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (level < 0) applyVote(0)
    else applyVote(-1)
  }, [level, applyVote])

  const handleUp = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (level > 0) applyVote(0)
    else applyVote(1)
  }, [level, applyVote])

  const handleBoost = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isAdmin && !canUseExtreme) return
    if (level === 1) applyVote(2)
    else if (level === -1) applyVote(-2)
  }, [level, applyVote, isAdmin, canUseExtreme])

  if (!user) return null

  const showBoost = level !== 0 && Math.abs(level) === 1 && (isAdmin || canUseExtreme)
  const isBoosted = Math.abs(level) === 2

  const pillClass = isBoosted
    ? (level > 0 ? 'boosted-up' : 'boosted-down')
    : level > 0 ? 'voted-up' : level < 0 ? 'voted-down' : ''

  const iconSize = compact ? 'w-3 h-3' : 'w-3.5 h-3.5'
  const boostSize = compact ? 'w-2.5 h-2.5' : 'w-3 h-3'
  const pad = compact ? 'p-1.5' : 'p-2'
  const scorePad = compact ? 'px-0.5 min-w-[16px] text-[11px]' : 'px-1 min-w-[20px] text-xs'

  return (
    <div className={`vote-pill ${pillClass}`}>
      {/* Downvote */}
      <button
        onClick={handleDown}
        className={`${pad} rounded-l-full transition-colors ${
          level < 0
            ? 'text-red-400'
            : 'text-slate-600 hover:text-red-400 hover:bg-white/[0.04]'
        }`}
      >
        <Minus className={iconSize} strokeWidth={2.5} />
      </button>

      {/* Score */}
      <span className={`${scorePad} font-bold text-center tabular-nums select-none ${
        level > 0 ? 'text-emerald-400' :
        level < 0 ? 'text-red-400' :
        'text-slate-500'
      }`}>
        {score > 0 ? `+${score}` : score}
      </span>

      {/* Upvote */}
      <button
        onClick={handleUp}
        className={`${pad} ${!showBoost && !isBoosted ? 'rounded-r-full' : ''} transition-colors ${
          level > 0
            ? 'text-emerald-400'
            : 'text-slate-600 hover:text-emerald-400 hover:bg-white/[0.04]'
        }`}
      >
        <Plus className={iconSize} strokeWidth={2.5} />
      </button>

      {/* Boost (appears after voting a direction) */}
      {showBoost && (
        <button
          onClick={handleBoost}
          className={`${compact ? 'pl-0.5 pr-1.5 py-1.5' : 'pl-1 pr-2 py-2'} rounded-r-full border-l transition-all ${
            level > 0
              ? 'border-emerald-500/15 text-emerald-400/35 hover:text-emerald-300 hover:bg-emerald-500/10'
              : 'border-red-500/15 text-red-400/35 hover:text-red-300 hover:bg-red-500/10'
          }`}
          title="Boost (+5 weight)"
        >
          <Zap className={boostSize} />
        </button>
      )}

      {/* Boosted indicator */}
      {isBoosted && (
        <div className={`${compact ? 'pl-0.5 pr-1.5 py-1.5' : 'pl-1 pr-2 py-2'} rounded-r-full border-l ${
          level > 0 ? 'border-emerald-500/20 text-emerald-300' : 'border-red-500/20 text-red-300'
        }`}>
          <Zap className={`${boostSize} fill-current`} />
        </div>
      )}
    </div>
  )
}

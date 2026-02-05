'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc } from 'firebase/firestore'
import { ChevronDown, ChevronUp, Zap } from 'lucide-react'

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
      if (level > 0 || upvotes?.includes(user.uid)) {
        await updateDoc(ref, { upvotes: arrayRemove(user.uid) })
      }
      if (level < 0 || downvotes?.includes(user.uid)) {
        await updateDoc(ref, { downvotes: arrayRemove(user.uid) })
      }

      if (newLevel === 0 || newLevel === level) {
        setLevel(0)
        return
      }

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

  const btnSize = compact ? 'w-7 h-7' : 'w-9 h-9'
  const iconSize = compact ? 'w-3.5 h-3.5' : 'w-4 h-4'
  const boostBtnSize = compact ? 'w-6 h-6' : 'w-7 h-7'
  const boostIconSize = compact ? 'w-3 h-3' : 'w-3.5 h-3.5'

  return (
    <div className="flex items-center">
      {/* Vote buttons: red, score, green */}
      <div className={`flex items-center ${compact ? 'gap-2.5' : 'gap-3'}`}>
        {/* Downvote */}
        <button
          onClick={handleDown}
          className={`${btnSize} rounded-full flex items-center justify-center transition-all duration-150 ${
            level < 0
              ? 'bg-red-500/15 border-[1.5px] border-red-400/50 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.15)]'
              : 'border-[1.5px] border-white/[0.1] text-slate-600 hover:border-red-400/40 hover:text-red-400 hover:bg-red-500/8'
          }`}
        >
          <ChevronDown className={iconSize} strokeWidth={2.5} />
        </button>

        {/* Score */}
        <span className={`${compact ? 'text-xs min-w-[18px]' : 'text-sm min-w-[22px]'} font-bold text-center tabular-nums select-none ${
          level > 0 ? 'text-emerald-400' : level < 0 ? 'text-red-400' : 'text-slate-500'
        }`}>
          {score > 0 ? `+${score}` : score}
        </span>

        {/* Upvote */}
        <button
          onClick={handleUp}
          className={`${btnSize} rounded-full flex items-center justify-center transition-all duration-150 ${
            level > 0
              ? 'bg-emerald-500/15 border-[1.5px] border-emerald-400/50 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
              : 'border-[1.5px] border-white/[0.1] text-slate-600 hover:border-emerald-400/40 hover:text-emerald-400 hover:bg-emerald-500/8'
          }`}
        >
          <ChevronUp className={iconSize} strokeWidth={2.5} />
        </button>
      </div>

      {/* Boost - separated from vote buttons */}
      {(showBoost || isBoosted) && (
        <div className={compact ? 'ml-4' : 'ml-5'}>
          {showBoost && (
            <button
              onClick={handleBoost}
              className={`${boostBtnSize} rounded-full flex items-center justify-center transition-all duration-150 ${
                level > 0
                  ? 'border-[1.5px] border-emerald-400/20 text-emerald-400/30 hover:border-emerald-400/50 hover:text-emerald-400 hover:bg-emerald-500/10'
                  : 'border-[1.5px] border-red-400/20 text-red-400/30 hover:border-red-400/50 hover:text-red-400 hover:bg-red-500/10'
              }`}
              title="Boost (+5 weight)"
            >
              <Zap className={boostIconSize} />
            </button>
          )}
          {isBoosted && (
            <div className={`${boostBtnSize} rounded-full flex items-center justify-center ${
              level > 0
                ? 'bg-emerald-500/15 border-[1.5px] border-emerald-400/40 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                : 'bg-red-500/15 border-[1.5px] border-red-400/40 text-red-300 shadow-[0_0_8px_rgba(239,68,68,0.2)]'
            }`}>
              <Zap className={`${boostIconSize} fill-current`} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

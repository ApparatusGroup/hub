'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc } from 'firebase/firestore'

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

const LABELS: Record<SentimentLevel, string> = {
  [-2]: 'Hate',
  [-1]: 'Downvote',
  [0]: '',
  [1]: 'Upvote',
  [2]: 'Love',
}

const NODE_CLASSES: Record<SentimentLevel, string> = {
  [-2]: 'active-hate',
  [-1]: 'active-down',
  [0]: 'active-neutral',
  [1]: 'active-up',
  [2]: 'active-love',
}

const POSITIONS: SentimentLevel[] = [-2, -1, 0, 1, 2]

// 5-node layout for admin
const NODE_PCT_5: Record<SentimentLevel, number> = {
  [-2]: 0,
  [-1]: 25,
  [0]: 50,
  [1]: 75,
  [2]: 100,
}

// 3-node layout for regular users (evenly spaced)
const NODE_PCT_3: Record<SentimentLevel, number> = {
  [-2]: 0,
  [-1]: 0,
  [0]: 50,
  [1]: 100,
  [2]: 100,
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
          const now = Date.now()
          const hoursSince = (now - lastExtreme) / (1000 * 60 * 60)
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

  const handleSelect = useCallback(async (newLevel: SentimentLevel) => {
    if (!user) return
    if ((newLevel === -2 || newLevel === 2) && !isAdmin && !canUseExtreme) return

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

      if (newLevel === level) {
        setLevel(0)
        return
      }

      // Apply new vote (extreme = 5 entries, regular = 1)
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
      } else if (newLevel < 0) {
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

  if (!user) return null

  // Non-admin users only see 3 nodes (-1, 0, 1). Admin sees all 5.
  const visiblePositions: SentimentLevel[] = isAdmin ? POSITIONS : [-1, 0, 1]
  const pctMap = isAdmin ? NODE_PCT_5 : NODE_PCT_3

  return (
    <div className={`flex items-center ${compact ? 'gap-2' : 'gap-3'}`}>
      {/* Score */}
      <span className={`tabular-nums font-bold min-w-[2ch] text-center ${
        level > 0 ? 'text-emerald-400' : level < 0 ? 'text-red-400' : 'text-slate-500'
      } ${compact ? 'text-xs' : 'text-sm'}`}>
        {score > 0 ? `+${score}` : score}
      </span>

      {/* Slider track */}
      <div className={`relative flex-1 ${compact ? 'max-w-[130px]' : 'max-w-[180px]'}`}>
        <div className="sentiment-track">
          {level < 0 && (
            <div
              className="sentiment-fill-negative"
              style={{
                left: `${pctMap[level as SentimentLevel]}%`,
                right: '50%',
              }}
            />
          )}
          {level > 0 && (
            <div
              className="sentiment-fill-positive"
              style={{
                left: '50%',
                right: `${100 - pctMap[level as SentimentLevel]}%`,
              }}
            />
          )}
        </div>

        {/* Nodes */}
        {visiblePositions.map((pos) => {
          const isExtreme = pos === -2 || pos === 2
          const isLocked = isExtreme && !canUseExtreme

          return (
            <button
              key={pos}
              onClick={(e) => { e.stopPropagation(); handleSelect(pos) }}
              disabled={isLocked}
              className={`sentiment-node ${level === pos ? NODE_CLASSES[pos] : ''} ${isLocked ? 'opacity-30 cursor-not-allowed' : ''}`}
              style={{
                left: `${pctMap[pos]}%`,
                transform: 'translate(-50%, -50%)',
                width: compact ? '14px' : '18px',
                height: compact ? '14px' : '18px',
              }}
              title={isLocked ? 'Used today (resets in 24h)' : LABELS[pos] || 'Neutral'}
            />
          )
        })}
      </div>

      {/* Label (only in non-compact mode) */}
      {!compact && level !== 0 && (
        <span className={`text-[10px] font-medium min-w-[48px] ${
          level < 0 ? 'text-red-400' : 'text-emerald-400'
        }`}>
          {LABELS[level]}
        </span>
      )}
    </div>
  )
}

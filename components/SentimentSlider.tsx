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

// Positions as percentages (5 nodes evenly spaced)
const POSITIONS: SentimentLevel[] = [-2, -1, 0, 1, 2]
const NODE_PCT: Record<SentimentLevel, number> = {
  [-2]: 0,
  [-1]: 25,
  [0]: 50,
  [1]: 75,
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

  // Calculate the display score
  useEffect(() => {
    setScore((upvotes?.length || 0) - (downvotes?.length || 0))
  }, [upvotes, downvotes])

  // Determine current user's existing vote
  useEffect(() => {
    if (!user) return
    if (upvotes?.includes(user.uid)) setLevel(1)
    else if (downvotes?.includes(user.uid)) setLevel(-1)
    else setLevel(0)
  }, [user, upvotes, downvotes])

  // Check daily extreme vote limit
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

    // Extreme votes require daily check (non-admin)
    if ((newLevel === -2 || newLevel === 2) && !isAdmin && !canUseExtreme) return

    const collection = targetType === 'post' ? 'posts' : 'comments'
    const ref = doc(db, collection, targetId)

    try {
      // Remove any existing vote
      if (level > 0 || upvotes?.includes(user.uid)) {
        await updateDoc(ref, { upvotes: arrayRemove(user.uid) })
      }
      if (level < 0 || downvotes?.includes(user.uid)) {
        await updateDoc(ref, { downvotes: arrayRemove(user.uid) })
      }

      if (newLevel === level) {
        // Toggle off - return to neutral
        setLevel(0)
        return
      }

      // Apply new vote (extreme = 5 entries, regular = 1 entry)
      if (newLevel > 0) {
        // For extreme (love), we add the uid multiple times to weight it
        if (newLevel === 2) {
          // Add 5 entries for love
          for (let i = 0; i < 5; i++) {
            await updateDoc(ref, { upvotes: arrayUnion(user.uid + (i === 0 ? '' : `_x${i}`)) })
          }
          // Record extreme usage
          if (!isAdmin) {
            await setDoc(doc(db, 'userLimits', user.uid), { lastExtremeVote: new Date() }, { merge: true })
            setCanUseExtreme(false)
          }
        } else {
          await updateDoc(ref, { upvotes: arrayUnion(user.uid) })
        }
      } else if (newLevel < 0) {
        if (newLevel === -2) {
          // Add 5 entries for hate
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

  // Track fill width/direction for the visual bar
  const activeIdx = POSITIONS.indexOf(level)
  const centerIdx = 2 // index of 0 in POSITIONS array
  const fillLeft = level < 0
    ? `${NODE_PCT[level as SentimentLevel]}%`
    : '50%'
  const fillRight = level > 0
    ? `${100 - NODE_PCT[level as SentimentLevel]}%`
    : '50%'
  const fillWidth = level === 0
    ? '0%'
    : `${Math.abs(NODE_PCT[level as SentimentLevel] - 50)}%`

  return (
    <div className={`flex items-center gap-3 ${compact ? 'gap-2' : 'gap-3'}`}>
      {/* Score display */}
      <span className={`tabular-nums font-semibold min-w-[2ch] text-center ${
        level > 0 ? 'text-emerald-400' : level < 0 ? 'text-orange-400' : 'text-slate-500'
      } ${compact ? 'text-xs' : 'text-sm'}`}>
        {score > 0 ? `+${score}` : score}
      </span>

      {/* Slider track */}
      <div className={`relative flex-1 ${compact ? 'max-w-[120px]' : 'max-w-[180px]'}`}>
        <div className="sentiment-track">
          {/* Colored fill */}
          {level < 0 && (
            <div
              className="sentiment-fill-negative"
              style={{
                left: `${NODE_PCT[level as SentimentLevel]}%`,
                right: '50%',
              }}
            />
          )}
          {level > 0 && (
            <div
              className="sentiment-fill-positive"
              style={{
                left: '50%',
                right: `${100 - NODE_PCT[level as SentimentLevel]}%`,
              }}
            />
          )}
        </div>

        {/* Nodes */}
        {POSITIONS.map((pos) => {
          const isExtreme = pos === -2 || pos === 2
          const isVisible = !isExtreme || level === -1 || level === 1 || level === pos || isAdmin
          const isLocked = isExtreme && !isAdmin && !canUseExtreme

          // Extreme nodes only appear when you've voted in that direction
          if (isExtreme && level === 0) return null
          if (pos === -2 && level > 0) return null
          if (pos === 2 && level < 0) return null

          return (
            <button
              key={pos}
              onClick={(e) => { e.stopPropagation(); handleSelect(pos) }}
              disabled={isLocked}
              className={`sentiment-node ${level === pos ? NODE_CLASSES[pos] : ''} ${isLocked ? 'opacity-30 cursor-not-allowed' : ''}`}
              style={{
                left: `${NODE_PCT[pos]}%`,
                transform: 'translate(-50%, -50%)',
                width: compact ? '10px' : '12px',
                height: compact ? '10px' : '12px',
              }}
              title={isLocked ? 'Used today (resets in 24h)' : LABELS[pos] || 'Neutral'}
            />
          )
        })}
      </div>

      {/* Label */}
      {!compact && level !== 0 && (
        <span className={`text-[10px] font-medium min-w-[48px] ${
          level === -2 ? 'text-red-400' :
          level === -1 ? 'text-orange-400' :
          level === 1 ? 'text-emerald-400' :
          'text-emerald-300'
        }`}>
          {LABELS[level]}
        </span>
      )}
    </div>
  )
}

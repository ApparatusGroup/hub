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

// Fixed 5-position track layout
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
  const [expanded, setExpanded] = useState(false)
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

  const handleVote = useCallback(async (newLevel: SentimentLevel) => {
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

      // Toggle off if clicking same level
      if (newLevel === level) {
        setLevel(0)
        setExpanded(false)
        return
      }

      // Reset to neutral
      if (newLevel === 0) {
        setLevel(0)
        setExpanded(false)
        return
      }

      // Apply new vote
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

  const handleNodeClick = useCallback((pos: SentimentLevel) => {
    if (!user) return

    // Center node: expand options if not voted, remove vote if voted
    if (pos === 0) {
      if (level === 0) {
        setExpanded(!expanded)
      } else {
        handleVote(0)
      }
      return
    }

    // Extreme node
    if (pos === 2 || pos === -2) {
      if (!isAdmin && !canUseExtreme) return
      handleVote(pos)
      return
    }

    // Regular direction (-1 or +1)
    handleVote(pos)
  }, [user, level, expanded, handleVote, isAdmin, canUseExtreme])

  if (!user) return null

  // Progressive disclosure: determine which nodes are visible
  const visible = new Set<SentimentLevel>()

  if (level === 0) {
    // Not voted: show center, expand to show adjacent
    visible.add(0)
    if (expanded) {
      visible.add(-1)
      visible.add(1)
    }
  } else if (level === 1) {
    // Voted upvote: show center + upvote, reveal love if eligible
    visible.add(0)
    visible.add(1)
    if (isAdmin || canUseExtreme) visible.add(2)
  } else if (level === -1) {
    // Voted downvote: show center + downvote, reveal hate if eligible
    visible.add(-2)
    visible.add(-1)
    if (isAdmin || canUseExtreme) visible.add(-2)
    visible.add(0)
  } else if (level === 2) {
    // Voted love: show chain
    visible.add(0)
    visible.add(1)
    visible.add(2)
  } else if (level === -2) {
    // Voted hate: show chain
    visible.add(-2)
    visible.add(-1)
    visible.add(0)
  }

  const nodeSize = compact ? 14 : 18

  return (
    <div className={`flex items-center ${compact ? 'gap-2' : 'gap-3'}`}>
      {/* Score */}
      <span className={`tabular-nums font-bold min-w-[2ch] text-center ${
        level > 0 ? 'text-emerald-400' : level < 0 ? 'text-red-400' : 'text-slate-500'
      } ${compact ? 'text-xs' : 'text-sm'}`}>
        {score > 0 ? `+${score}` : score}
      </span>

      {/* Slider track */}
      <div className={`relative ${compact ? 'max-w-[130px]' : 'max-w-[180px]'} flex-1`}>
        <div className="sentiment-track">
          {level < 0 && (
            <div
              className="sentiment-fill-negative"
              style={{ left: `${NODE_PCT[level]}%`, right: '50%' }}
            />
          )}
          {level > 0 && (
            <div
              className="sentiment-fill-positive"
              style={{ left: '50%', right: `${100 - NODE_PCT[level]}%` }}
            />
          )}
        </div>

        {/* Nodes - only render visible ones */}
        {([-2, -1, 0, 1, 2] as SentimentLevel[]).map((pos) => {
          if (!visible.has(pos)) return null

          const isActive = level === pos
          const isExtreme = pos === -2 || pos === 2
          const isLocked = isExtreme && !isAdmin && !canUseExtreme
          // Faded: adjacent nodes when just expanded (not voted), or extreme nodes not yet selected
          const isFaded = (!isActive && level === 0 && pos !== 0) || (isExtreme && !isActive)

          return (
            <button
              key={pos}
              onClick={(e) => { e.stopPropagation(); handleNodeClick(pos) }}
              disabled={isLocked}
              className={`sentiment-node ${isActive ? NODE_CLASSES[pos] : ''} ${isLocked ? 'cursor-not-allowed' : ''}`}
              style={{
                left: `${NODE_PCT[pos]}%`,
                transform: 'translate(-50%, -50%)',
                width: `${nodeSize}px`,
                height: `${nodeSize}px`,
                opacity: isLocked ? 0.25 : isFaded ? 0.4 : 1,
                transition: 'all 0.25s ease, opacity 0.25s ease',
              }}
              title={isLocked ? 'Boost used today' : LABELS[pos] || 'Neutral'}
            />
          )
        })}
      </div>

      {/* Label */}
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

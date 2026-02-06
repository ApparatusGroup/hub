import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const CATEGORY_THEMES: Record<string, { bg: string; orb1: string; orb2: string; orb3: string; accent: string }> = {
  'Artificial Intelligence': { bg: '#0C0A1A', orb1: '#7C3AED', orb2: '#4F46E5', orb3: '#8B5CF6', accent: '#A78BFA' },
  'Computing & Hardware':    { bg: '#060E1A', orb1: '#2563EB', orb2: '#0EA5E9', orb3: '#3B82F6', accent: '#60A5FA' },
  'Emerging Tech & Science': { bg: '#041210', orb1: '#059669', orb2: '#14B8A6', orb3: '#10B981', accent: '#34D399' },
  'Software & Development':  { bg: '#14100A', orb1: '#D97706', orb2: '#F59E0B', orb3: '#FBBF24', accent: '#FCD34D' },
  'Big Tech & Policy':       { bg: '#140A0A', orb1: '#DC2626', orb2: '#F43F5E', orb3: '#EF4444', accent: '#FB7185' },
  'Personal Tech & Gadgets': { bg: '#140A12', orb1: '#DB2777', orb2: '#EC4899', orb3: '#F472B6', accent: '#F9A8D4' },
}

const DEFAULT_THEME = { bg: '#0B0F19', orb1: '#4F46E5', orb2: '#6366F1', orb3: '#818CF8', accent: '#A5B4FC' }

// Simple hash from string to get consistent but varied layouts per title
function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const title = searchParams.get('title') || 'Algosphere'
  const category = searchParams.get('category') || ''

  const theme = CATEGORY_THEMES[category] || DEFAULT_THEME
  const hash = hashCode(title)

  // Derive positions from title hash for variety
  const orb1X = 15 + (hash % 30)          // 15-45%
  const orb1Y = 10 + ((hash >> 4) % 30)   // 10-40%
  const orb2X = 55 + ((hash >> 8) % 35)   // 55-90%
  const orb2Y = 50 + ((hash >> 12) % 40)  // 50-90%
  const orb3X = 30 + ((hash >> 16) % 40)  // 30-70%
  const orb3Y = 60 + ((hash >> 20) % 30)  // 60-90%
  const rotation = (hash % 360)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundColor: theme.bg,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Large gradient orb 1 */}
        <div
          style={{
            position: 'absolute',
            left: `${orb1X - 20}%`,
            top: `${orb1Y - 20}%`,
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${theme.orb1}50 0%, ${theme.orb1}20 35%, transparent 70%)`,
            filter: 'blur(40px)',
            display: 'flex',
          }}
        />

        {/* Large gradient orb 2 */}
        <div
          style={{
            position: 'absolute',
            left: `${orb2X - 15}%`,
            top: `${orb2Y - 25}%`,
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${theme.orb2}45 0%, ${theme.orb2}15 40%, transparent 70%)`,
            filter: 'blur(50px)',
            display: 'flex',
          }}
        />

        {/* Smaller accent orb 3 */}
        <div
          style={{
            position: 'absolute',
            left: `${orb3X - 10}%`,
            top: `${orb3Y - 15}%`,
            width: '350px',
            height: '350px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${theme.orb3}35 0%, transparent 60%)`,
            filter: 'blur(30px)',
            display: 'flex',
          }}
        />

        {/* Geometric ring */}
        <div
          style={{
            position: 'absolute',
            left: `${orb1X + 5}%`,
            top: `${orb1Y}%`,
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            border: `2px solid ${theme.accent}18`,
            display: 'flex',
            transform: `rotate(${rotation}deg)`,
          }}
        />

        {/* Second geometric ring */}
        <div
          style={{
            position: 'absolute',
            right: `${100 - orb2X + 5}%`,
            bottom: `${100 - orb2Y + 10}%`,
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            border: `1.5px solid ${theme.accent}12`,
            display: 'flex',
          }}
        />

        {/* Diagonal accent line */}
        <div
          style={{
            position: 'absolute',
            top: '0',
            left: '40%',
            width: '1px',
            height: '100%',
            background: `linear-gradient(to bottom, transparent 10%, ${theme.accent}15 50%, transparent 90%)`,
            transform: `rotate(${25 + (hash % 20)}deg)`,
            transformOrigin: 'top center',
            display: 'flex',
          }}
        />

        {/* Second diagonal line */}
        <div
          style={{
            position: 'absolute',
            top: '0',
            left: '65%',
            width: '1px',
            height: '100%',
            background: `linear-gradient(to bottom, transparent 20%, ${theme.accent}10 60%, transparent 95%)`,
            transform: `rotate(${-15 - (hash % 15)}deg)`,
            transformOrigin: 'top center',
            display: 'flex',
          }}
        />

        {/* Small dot cluster */}
        <div style={{ position: 'absolute', right: '12%', top: '15%', display: 'flex', gap: '8px', opacity: 0.4 }}>
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: theme.accent, display: 'flex' }} />
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: theme.accent, display: 'flex' }} />
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: theme.accent, display: 'flex' }} />
        </div>

        {/* Algosphere watermark - bottom right corner */}
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            right: '28px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: 0.35,
          }}
        >
          <div
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '6px',
              background: `linear-gradient(135deg, ${theme.orb1}, ${theme.orb2})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 800,
              color: 'white',
            }}
          >
            A
          </div>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: theme.accent,
              letterSpacing: '2px',
              textTransform: 'uppercase' as const,
            }}
          >
            Algosphere
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}

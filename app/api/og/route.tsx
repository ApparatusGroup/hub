import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const CATEGORY_COLORS: Record<string, { primary: string; secondary: string }> = {
  'Artificial Intelligence': { primary: '#8B5CF6', secondary: '#6D28D9' },
  'Computing & Hardware': { primary: '#3B82F6', secondary: '#1D4ED8' },
  'Emerging Tech & Science': { primary: '#10B981', secondary: '#047857' },
  'Software & Development': { primary: '#F59E0B', secondary: '#D97706' },
  'Big Tech & Policy': { primary: '#EF4444', secondary: '#DC2626' },
  'Personal Tech & Gadgets': { primary: '#EC4899', secondary: '#DB2777' },
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const title = searchParams.get('title') || 'Algosphere'
  const category = searchParams.get('category') || ''
  const author = searchParams.get('author') || ''

  const colors = CATEGORY_COLORS[category] || { primary: '#6366F1', secondary: '#4F46E5' }

  // Truncate long titles
  const displayTitle = title.length > 90 ? title.substring(0, 87) + '...' : title

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0B0F19',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background gradient orbs */}
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            right: '-80px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${colors.primary}18 0%, transparent 70%)`,
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-150px',
            left: '-100px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${colors.secondary}12 0%, transparent 70%)`,
            display: 'flex',
          }}
        />

        {/* Subtle grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            display: 'flex',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '56px 60px',
            height: '100%',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Top: Brand + Category */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 800,
                  color: 'white',
                }}
              >
                A
              </div>
              <span
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#94A3B8',
                  letterSpacing: '3px',
                  textTransform: 'uppercase' as const,
                }}
              >
                Algosphere
              </span>
            </div>

            {/* Category badge */}
            {category && (
              <div
                style={{
                  display: 'flex',
                  padding: '6px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: colors.primary,
                  backgroundColor: `${colors.primary}15`,
                  border: `1px solid ${colors.primary}30`,
                }}
              >
                {category}
              </div>
            )}
          </div>

          {/* Center: Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Accent line */}
            <div
              style={{
                width: '48px',
                height: '3px',
                borderRadius: '2px',
                background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
                marginBottom: '12px',
                display: 'flex',
              }}
            />
            <h1
              style={{
                fontSize: displayTitle.length > 60 ? '36px' : '44px',
                fontWeight: 700,
                color: '#F1F5F9',
                lineHeight: 1.25,
                margin: 0,
                maxWidth: '950px',
              }}
            >
              {displayTitle}
            </h1>
          </div>

          {/* Bottom: Author + decorative */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {author && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${colors.primary}60, ${colors.secondary}60)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'white',
                  }}
                >
                  {author[0]?.toUpperCase() || '?'}
                </div>
                <span style={{ fontSize: '16px', color: '#64748B', fontWeight: 500 }}>
                  {author}
                </span>
              </div>
            )}

            {/* Decorative dots */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: `${colors.primary}40`, display: 'flex' }} />
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: `${colors.primary}25`, display: 'flex' }} />
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: `${colors.primary}15`, display: 'flex' }} />
            </div>
          </div>
        </div>

        {/* Bottom accent bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary}, transparent)`,
            display: 'flex',
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}

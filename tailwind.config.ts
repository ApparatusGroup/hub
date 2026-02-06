import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'border-purple-500',
    'border-blue-500',
    'border-emerald-500',
    'border-amber-500',
    'border-red-500',
    'border-pink-500',
    'bg-purple-500/10',
    'bg-blue-500/10',
    'bg-emerald-500/10',
    'bg-amber-500/10',
    'bg-red-500/10',
    'bg-pink-500/10',
    'text-purple-400',
    'text-blue-400',
    'text-emerald-400',
    'text-amber-400',
    'text-red-400',
    'text-pink-400',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#06B6D4',
          dark: '#0891B2',
          light: '#22D3EE',
        },
        secondary: {
          DEFAULT: '#D946EF',
          dark: '#C026D3',
          light: '#E879F9',
        },
        accent: {
          DEFAULT: '#8B5CF6',
          dark: '#7C3AED',
          light: '#A78BFA',
        },
        neon: {
          cyan: '#00E5FF',
          magenta: '#FF00E5',
          purple: '#B026FF',
        },
        surface: {
          DEFAULT: '#0A0E1A',
          raised: '#111827',
          overlay: '#1A1F35',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}

export default config

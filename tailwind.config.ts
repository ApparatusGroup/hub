import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    // Category border colors
    'border-purple-500',
    'border-blue-500',
    'border-emerald-500',
    'border-amber-500',
    'border-red-500',
    'border-pink-500',
    // Category badge backgrounds
    'bg-purple-500/10',
    'bg-blue-500/10',
    'bg-emerald-500/10',
    'bg-amber-500/10',
    'bg-red-500/10',
    'bg-pink-500/10',
    // Category badge text colors
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
          DEFAULT: '#6366f1',
          dark: '#4f46e5',
          light: '#818cf8',
        },
        secondary: {
          DEFAULT: '#ec4899',
          dark: '#db2777',
          light: '#f472b6',
        },
        accent: {
          DEFAULT: '#06b6d4',
          dark: '#0891b2',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f8fafc',
          dark: '#1e293b',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config

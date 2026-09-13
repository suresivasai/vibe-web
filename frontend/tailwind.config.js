/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#ff705f',
          50: '#fff4f1',
          100: '#ffe3de',
          200: '#ffc8bf',
          300: '#ffa396',
          400: '#ff8878',
          500: '#ff705f',
          600: '#e85a4c',
          700: '#c7473d',
          800: '#a33b34',
          900: '#84352f',
        },
        accent: {
          DEFAULT: '#7ce4c5',
          400: '#a1f0d9',
          500: '#7ce4c5',
          600: '#52c6a7',
        },
        danger: '#F43F5E',
        success: '#10B981',
        warning: '#F59E0B',
        bg: {
          light: '#F8FAFC',
          dark: '#101214',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#171a1c',
          elevated: '#202628',
        },
        text: {
          primary: {
            light: '#0F172A',
            dark: '#F8FAFC',
          },
          secondary: {
            light: '#64748B',
            dark: '#A1A1AA',
          },
          muted: {
            light: '#94A3B8',
            dark: '#71717A',
          },
        },
      },
      borderRadius: {
        card: '16px',
        control: '12px',
        pill: '9999px',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Space Grotesk', 'DM Sans', 'system-ui', 'sans-serif'],
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(255, 112, 95, 0.38)',
        'glow-lg': '0 0 60px -12px rgba(255, 112, 95, 0.42)',
        'glow-accent': '0 0 40px -10px rgba(124, 228, 197, 0.32)',
        soft: '0 12px 32px -12px rgba(0,0,0,0.6)',
        card: '0 18px 50px -18px rgba(0,0,0,0.7)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'scale-in': 'scaleIn 0.4s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.85)', opacity: '0.6' },
          '100%': { transform: 'scale(1.4)', opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}

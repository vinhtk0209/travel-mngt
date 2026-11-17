/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cream: 'rgb(var(--color-cream) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        raised: 'rgb(var(--color-raised) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--color-ink) / <alpha-value>)',
          soft: 'rgb(var(--color-ink-soft) / <alpha-value>)',
          muted: 'rgb(var(--color-ink-muted) / <alpha-value>)',
        },
        coral: {
          50: '#FFF1ED',
          100: '#FFE1D8',
          200: '#FFC8B8',
          300: '#FFA892',
          400: '#FF8A70',
          500: '#FF7059',
          600: '#EC5943',
          700: '#C74432',
        },
        mint: {
          50: '#EEFBF7',
          100: '#D5F5EA',
          200: '#AEEBD9',
          300: '#7CDCC4',
          400: '#4BC9AB',
          500: '#2FB79A',
          600: '#1F947D',
        },
        sky: {
          50: '#F0F7FF',
          100: '#DFEEFF',
          200: '#C4E1FF',
          300: '#9CCCFE',
          400: '#6FB3FB',
          500: '#4A99F5',
        },
        lavender: {
          50: '#F6F2FF',
          100: '#EDE5FF',
          200: '#DCCFFF',
          300: '#C4AEFF',
          400: '#A98CF6',
          500: '#8E6BE8',
        },
        butter: {
          100: '#FFF6D8',
          200: '#FFEDB4',
          300: '#FFE18A',
          400: '#FFD25E',
        },
        border: 'rgb(var(--color-border) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Baloo 2"', 'Nunito', 'ui-rounded', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 18px 40px -24px rgba(90, 60, 75, 0.35)',
        lift: '0 24px 50px -20px rgba(90, 60, 75, 0.4)',
        card: '0 10px 30px -18px rgba(90, 60, 75, 0.3)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'pop-in': 'pop-in 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
        'float-slow': 'float-slow 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

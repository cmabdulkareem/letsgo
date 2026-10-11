/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#08B981',
          50: '#E8FAF3',
          100: '#CFF5E7',
          200: '#9FEBCF',
          300: '#6FE0B7',
          400: '#3FD69F',
          500: '#08B981',
          600: '#069A6C',
          700: '#057A56',
          800: '#045B41',
          900: '#033B2B',
        },
        navy: '#10172A',
        ink: {
          DEFAULT: 'rgb(var(--c-text) / <alpha-value>)',
          soft: 'rgb(var(--c-text-soft) / <alpha-value>)',
        },
        border: 'rgb(var(--c-border) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        canvas: 'rgb(var(--c-bg) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '18px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.08)',
        lift: '0 8px 24px rgba(16, 24, 40, 0.12)',
      },
      maxWidth: {
        app: '480px',
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        neon: {
          pink: '#ff0080',
          purple: '#8000ff',
          glow: '#ff00ff',
        }
      },
      animation: {
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite alternate',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        'pulse-neon': {
          '0%': { textShadow: '0 0 5px #ff0080, 0 0 10px #ff0080, 0 0 20px #ff0080' },
          '100%': { textShadow: '0 0 10px #8000ff, 0 0 20px #8000ff, 0 0 40px #8000ff' }
        },
        'glow': {
          '0%': { boxShadow: '0 0 5px #ff0080, 0 0 10px #ff0080, 0 0 20px #ff0080' },
          '100%': { boxShadow: '0 0 10px #8000ff, 0 0 20px #8000ff, 0 0 40px #8000ff' }
        }
      }
    },
  },
  plugins: [],
}
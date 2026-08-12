/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#070B12',
          900: '#0C121E',
          850: '#111927',
          800: '#172234',
          700: '#1E2D45',
          600: '#2A3C5B',
        },
        amber: {
          glow: 'rgba(245, 158, 11, 0.25)',
          urgent: '#F59E0B',
          bright: '#FBBF24',
          deep: '#D97706',
        },
        emerald: {
          cta: '#10B981',
          bright: '#34D399',
          deep: '#059669',
          glow: 'rgba(16, 185, 129, 0.3)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glowPulse 2.5s ease-in-out infinite',
        'radar-sweep': 'radarSweep 3s linear infinite',
      },
      keyframes: {
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(16, 185, 129, 0.25)' },
          '50%': { boxShadow: '0 0 30px rgba(16, 185, 129, 0.55)' },
        },
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        }
      }
    },
  },
  plugins: [],
}

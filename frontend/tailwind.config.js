module.exports = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3f0f5c',
        },
        secondary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#145231',
          950: '#052e16',
        },
        accent: {
          50: '#fefce8',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b', // Changed to yellow-500 for better visibility
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        dark: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
      },
      backgroundColor: {
        'glow-purple': 'rgba(168, 85, 247, 0.1)',
        'glow-green': 'rgba(34, 197, 94, 0.1)',
        'glow-yellow': 'rgba(245, 158, 11, 0.1)',
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.5), 0 0 40px rgba(168, 85, 247, 0.3)',
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.5), 0 0 40px rgba(34, 197, 94, 0.3)',
        'glow-yellow': '0 0 20px rgba(245, 158, 11, 0.5), 0 0 40px rgba(245, 158, 11, 0.3)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3)',
        'glow-lg': '0 0 30px rgba(168, 85, 247, 0.5), 0 0 60px rgba(168, 85, 247, 0.3), 0 0 90px rgba(168, 85, 247, 0.2)',
      },
      textShadow: {
        'glow-purple': '0 0 10px rgba(168, 85, 247, 0.5)',
        'glow-green': '0 0 10px rgba(34, 197, 94, 0.5)',
        'glow-yellow': '0 0 10px rgba(245, 158, 11, 0.5)',
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'blink': 'blink 1.4s infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(168, 85, 247, 0.5), 0 0 40px rgba(168, 85, 247, 0.3)',
          },
          '50%': {
            boxShadow: '0 0 30px rgba(168, 85, 247, 0.8), 0 0 60px rgba(168, 85, 247, 0.5)',
          },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        'blink': {
          '0%, 20%, 50%, 80%, 100%': { opacity: '1' },
          '40%': { opacity: '0.5' },
          '60%': { opacity: '0.7' },
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      backgroundImage: {
        'gradient-glow': 'linear-gradient(90deg, rgba(168, 85, 247, 0.1), rgba(34, 197, 94, 0.1), rgba(245, 158, 11, 0.1))',
        'gradient-radial-glow': 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 70%)',
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar')({ nocompatible: true }),
    require('tailwindcss/plugin')(function ({ addUtilities }) {
      addUtilities({
        '.text-gradient': {
          'background': 'linear-gradient(to right, #a855f7, #22c55e, #f59e0b)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.glow-border': {
          'border': '1px solid',
          'border-image': 'linear-gradient(to right, #a855f7, #22c55e, #f59e0b) 1',
          'box-shadow': '0 0 15px rgba(168, 85, 247, 0.3), inset 0 0 15px rgba(34, 197, 94, 0.1)',
        },
        '.glass': {
          'background': 'rgba(255, 255, 255, 0.1)',
          'backdrop-filter': 'blur(10px)',
          'border': '1px solid rgba(255, 255, 255, 0.2)',
        },
        '.glass-dark': {
          'background': 'rgba(0, 0, 0, 0.3)',
          'backdrop-filter': 'blur(10px)',
          'border': '1px solid rgba(255, 255, 255, 0.1)',
        },
      });
    }),
  ],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Primary: Deep violet
        primary: {
          50: '#f3f0ff',
          100: '#e9e3ff',
          200: '#d5caff',
          300: '#b9a3ff',
          400: '#9770ff',
          500: '#7c3aed',
          600: '#6d28d9',
          700: '#5b21b6',
          800: '#4c1d95',
          900: '#2e1065',
          950: '#1a0040',
        },
        // Accent: Electric teal
        accent: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        // Success: Emerald
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        // Warning: Amber
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        // Danger: Rose
        danger: {
          50: '#fff1f2',
          100: '#ffe4e6',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
        },
        // Dark mode surfaces
        surface: {
          900: '#0a0a14',
          800: '#12121f',
          700: '#1a1a2e',
          600: '#22223b',
          500: '#2d2d4a',
          400: '#3d3d5c',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
        'gradient-income': 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
        'gradient-expense': 'linear-gradient(135deg, #f43f5e 0%, #f59e0b 100%)',
        'gradient-surface': 'linear-gradient(135deg, #12121f 0%, #1a1a2e 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounceSub 1s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        bounceSub: {
          '0%, 100%': { transform: 'translateY(-3px)' },
          '50%': { transform: 'translateY(0px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(124,58,237,0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(124,58,237,0.8), 0 0 40px rgba(6,182,212,0.4)' },
        },
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(124,58,237,0.4)',
        'glow-accent': '0 0 20px rgba(6,182,212,0.4)',
        'glow-success': '0 0 20px rgba(16,185,129,0.4)',
        'glow-danger': '0 0 20px rgba(244,63,94,0.4)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.6)',
        'glass': '0 8px 32px rgba(0,0,0,0.3)',
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}

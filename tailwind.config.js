/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Desktop application color scheme - now using CSS custom properties
        primary: {
          50: 'var(--color-primary-50, #f0f5ff)',
          100: 'var(--color-primary-100, #e0eaff)',
          200: 'var(--color-primary-200, #c7d9ff)',
          300: 'var(--color-primary-300, #a5c0ff)',
          400: 'var(--color-primary-400, #8ba2ff)',
          500: 'var(--color-primary-500, #2A5C8F)', // Main primary color
          600: 'var(--color-primary-600, #1e4a7a)',
          700: 'var(--color-primary-700, #1a3d63)',
          800: 'var(--color-primary-800, #163050)',
          900: 'var(--color-primary-900, #132740)',
        },
        secondary: {
          50: 'var(--color-secondary-50, #f2f7ff)',
          100: 'var(--color-secondary-100, #e6efff)',
          200: 'var(--color-secondary-200, #d0e1ff)',
          300: 'var(--color-secondary-300, #aec8ff)',
          400: 'var(--color-secondary-400, #8ba9ff)',
          500: 'var(--color-secondary-500, #3D7BB6)', // Main secondary color
          600: 'var(--color-secondary-600, #2d6599)',
          700: 'var(--color-secondary-700, #26517a)',
          800: 'var(--color-secondary-800, #20425c)',
          900: 'var(--color-secondary-900, #1b3443)',
        },
        accent: {
          50: '#fffbf0',
          100: '#fff6e0',
          200: '#ffecbd',
          300: '#ffdf8a',
          400: '#ffcd4d',
          500: '#FFA630', // Main accent color
          600: '#e6932b',
          700: '#cc8026',
          800: '#b36d21',
          900: '#995a1c',
        },
        success: {
          50: 'var(--color-success-50, #f0fdf4)',
          100: 'var(--color-success-100, #dcfce7)',
          200: 'var(--color-success-200, #bbf7d0)',
          300: 'var(--color-success-300, #86efac)',
          400: 'var(--color-success-400, #4ade80)',
          500: 'var(--color-success-500, #4CAF50)', // Main success color
          600: 'var(--color-success-600, #16a34a)',
          700: 'var(--color-success-700, #15803d)',
          800: 'var(--color-success-800, #166534)',
          900: 'var(--color-success-900, #14532d)',
        },
        warning: {
          50: 'var(--color-warning-50, #fffbeb)',
          100: 'var(--color-warning-100, #fef3c7)',
          200: 'var(--color-warning-200, #fed7aa)',
          300: 'var(--color-warning-300, #fdba74)',
          400: 'var(--color-warning-400, #fb923c)',
          500: 'var(--color-warning-500, #FFC107)', // Main warning color
          600: 'var(--color-warning-600, #ea580c)',
          700: 'var(--color-warning-700, #c2410c)',
          800: 'var(--color-warning-800, #9a3412)',
          900: 'var(--color-warning-900, #7c2d12)',
        },
        danger: {
          50: 'var(--color-danger-50, #fef2f2)',
          100: 'var(--color-danger-100, #fee2e2)',
          200: 'var(--color-danger-200, #fecaca)',
          300: 'var(--color-danger-300, #fca5a5)',
          400: 'var(--color-danger-400, #f87171)',
          500: 'var(--color-danger-500, #F44336)', // Main danger color
          600: 'var(--color-danger-600, #dc2626)',
          700: 'var(--color-danger-700, #b91c1c)',
          800: 'var(--color-danger-800, #991b1b)',
          900: 'var(--color-danger-900, #7f1d1d)',
        },
        info: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#17A2B8', // Main info color
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        light: {
          50: '#fafbfc',
          100: '#F5F7FA', // Main light color
          200: '#f1f5f9',
          300: '#e2e8f0',
          400: '#cbd5e1',
          500: '#94a3b8',
          600: '#64748b',
          700: '#475569',
          800: '#334155',
          900: '#1e293b',
        },
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#1A2E40', // Main dark color
        },
        // Text colors
        'text-primary': '#333333',
        'text-light': '#FFFFFF',
        'text-muted': '#6C757D',
        'border-color': '#DEE2E6',
        'bg-main': '#FFFFFF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Base sizes (scale with CSS custom properties)
        'xs': ['0.75rem', { lineHeight: '1rem', transform: 'scale(var(--font-scale, 1))' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem', transform: 'scale(var(--font-scale, 1))' }],
        'base': ['1rem', { lineHeight: '1.5rem', transform: 'scale(var(--font-scale, 1))' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem', transform: 'scale(var(--font-scale, 1))' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem', transform: 'scale(var(--font-scale, 1))' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', transform: 'scale(var(--font-scale, 1))' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', transform: 'scale(var(--font-scale, 1))' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', transform: 'scale(var(--font-scale, 1))' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem', // For sidebar width (220px equivalent)
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'bounce-subtle': 'bounceSubtle 0.6s ease-in-out',
        // Reduced motion alternatives
        'fade-in-reduced': 'fadeInReduced 0.1s ease-in-out',
        'slide-in-reduced': 'slideInReduced 0.1s ease-out',
        'bounce-reduced': 'bounceReduced 0.2s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-4px)' },
          '60%': { transform: 'translateY(-2px)' },
        },
        // Reduced motion alternatives
        fadeInReduced: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInReduced: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        bounceReduced: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      boxShadow: {
        'card': '0 2px 4px rgba(0,0,0,0.1)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.15)',
        'table': '0 2px 8px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
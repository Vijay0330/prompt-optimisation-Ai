/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh':   'radial-gradient(at 40% 20%, hsla(250,80%,60%,0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(210,80%,60%,0.1) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(270,80%,60%,0.08) 0px, transparent 50%)',
        'gradient-mesh-light': 'radial-gradient(at 40% 20%, hsla(250,80%,60%,0.06) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(210,80%,60%,0.05) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(270,80%,60%,0.04) 0px, transparent 50%)',
      },
      animation: {
        'fade-in':       'fadeIn 0.3s ease-out',
        'slide-up':      'slideUp 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.25s ease-out',
        'glow-pulse':    'glowPulse 2s ease-in-out infinite',
        'shimmer':       'shimmer 2s linear infinite',
        'float':         'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:      { from: { opacity: '0' },                  to: { opacity: '1' } },
        slideUp:     { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideInLeft: { from: { opacity: '0', transform: 'translateX(-8px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        glowPulse:   { '0%,100%': { boxShadow: '0 0 8px rgba(99,102,241,0.3)' }, '50%': { boxShadow: '0 0 20px rgba(99,102,241,0.6)' } },
        shimmer:     { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
        float:       { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
      },
      boxShadow: {
        'glow-sm':  '0 0 12px rgba(99,102,241,0.25)',
        'glow':     '0 0 24px rgba(99,102,241,0.35)',
        'glow-lg':  '0 0 40px rgba(99,102,241,0.4)',
        'card':     '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
        'card-lg':  '0 4px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
        'card-dark':'0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)',
        'input':    '0 0 0 3px rgba(99,102,241,0.15)',
      },
      typography: (theme) => ({
        invert: {
          css: {
            '--tw-prose-body':        theme('colors.gray.300'),
            '--tw-prose-headings':    theme('colors.gray.100'),
            '--tw-prose-code':        theme('colors.violet.300'),
            '--tw-prose-pre-bg':      theme('colors.gray.900'),
            '--tw-prose-bullets':     theme('colors.gray.500'),
            '--tw-prose-hr':          theme('colors.gray.700'),
            '--tw-prose-links':       theme('colors.brand.400'),
            '--tw-prose-bold':        theme('colors.gray.100'),
            '--tw-prose-blockquotes': theme('colors.gray.400'),
          },
        },
      }),
    },
  },
  plugins: [require('@tailwindcss/typography')],
}

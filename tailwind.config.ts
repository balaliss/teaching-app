import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1a1a1a',
        paper: '#faf9f7',
        accent: '#2f5d50',
      },
    },
  },
  plugins: [],
} satisfies Config

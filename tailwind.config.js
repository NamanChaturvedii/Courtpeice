/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        cinzel: ['var(--font-cinzel)', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        felt: {
          DEFAULT: '#1a5c32',
          dark: '#0e3d1f',
          light: '#1e7a40',
        },
        gold: {
          DEFAULT: '#d4af37',
          light: '#f0d060',
          dark: '#a0852a',
        },
      },
    },
  },
  plugins: [],
}

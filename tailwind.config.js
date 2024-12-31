/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'primary-dark': 'var(--color-primary-dark)',
        secondary: 'var(--color-secondary)',
        'secondary-dark': 'var(--color-secondary-dark)',
      },
      fontFamily: {
        primary: 'var(--font-primary)',
        playfair: 'var(--font-playfair)',
        opendyslexic: 'var(--font-opendyslexic)',
        atkinson: 'var(--font-atkinson)',
      },
    },
  },
  plugins: [],
}


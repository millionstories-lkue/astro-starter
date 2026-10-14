/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      // TODO pro Kunde: CI-Farben eintragen. Verwendung z. B. bg-brand, text-brand-dark
      colors: {
        brand: {
          DEFAULT: '#1e40af',
          dark: '#1e3a8a',
          light: '#dbeafe',
        },
      },
      // Lokale Schriften: Dateien in public/fonts/ ablegen, @font-face in
      // src/styles/global.css definieren und hier den Namen voranstellen.
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

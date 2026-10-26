/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      // TODO pro Kunde: CI-Farben eintragen. Verwendung z. B. bg-brand, text-brand-dark
      // Barrierefreiheit (Kontrast, WCAG 1.4.3): brand.DEFAULT und brand.dark brauchen zu Weiß
      // mindestens 4.5:1 (für Links, Text und weiße Schrift auf Buttons), brand.dark auf brand.light
      // ebenfalls 4.5:1 (Tags). Ist die CI-Farbe heller, DEFAULT etwas abdunkeln und die
      // Original-Farbe z. B. als brand.ci nur für Flächen, Linien und große Schrift nutzen.
      colors: {
        brand: {
          DEFAULT: '#1e40af',
          dark: '#1e3a8a',
          light: '#dbeafe',
        },
      },
      // Lokale Schriften: woff2-Dateien in src/assets/fonts/ ablegen (NICHT public/ – dort gibt es
      // keinen Versionsstempel), @font-face in src/styles/global.css definieren, die 1–2 wichtigsten
      // Schnitte in src/projekt.config.ts unter schriftenVorladen eintragen und hier den Namen voranstellen.
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

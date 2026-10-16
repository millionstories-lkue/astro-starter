import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from './src/integrations/sitemap.mjs';

export default defineConfig({
  // TODO pro Kunde: endgültige Domain eintragen (für Canonical-URLs, Open Graph und Sitemap)
  site: 'https://www.kundendomain.de',
  output: 'static',
  // Zwischenspeicher für optimierte Bilder (beim Veröffentlichen wiederverwendet)
  cacheDir: './.astro-cache',
  integrations: [tailwind(), sitemap()],
  image: {
    domains: [],
    remotePatterns: [],
  },
});

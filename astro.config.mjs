import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  // TODO pro Kunde: endgültige Domain eintragen (für Canonical-URLs und Open Graph)
  site: 'https://www.kundendomain.de',
  output: 'static',
  integrations: [tailwind()],
  image: {
    domains: [],
    remotePatterns: [],
  },
});

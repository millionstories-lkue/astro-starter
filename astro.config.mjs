import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import entwuerfe from './src/integrations/entwuerfe.mjs';
import sitemap from './src/integrations/sitemap.mjs';
import bilderAufraeumen from './src/integrations/bilder-aufraeumen.mjs';
import indexnow from './src/integrations/indexnow.mjs';

export default defineConfig({
  // TODO pro Kunde: endgültige Domain eintragen (für Canonical-URLs, Open Graph und Sitemap)
  site: 'https://www.kundendomain.de',
  output: 'static',
  // Zwischenspeicher für optimierte Bilder (beim Veröffentlichen wiederverwendet)
  cacheDir: './.astro-cache',
  // entwuerfe() nimmt Entwürfe aus der Website, Vorschau nur im CMS (muss vor sitemap() stehen),
  // indexnow() meldet geänderte Seiten an Suchmaschinen (muss nach sitemap() stehen)
  integrations: [tailwind(), entwuerfe(), sitemap(), bilderAufraeumen(), indexnow()],
  image: {
    domains: [],
    remotePatterns: [],
  },
});

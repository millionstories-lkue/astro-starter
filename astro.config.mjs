import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import entwuerfe from './src/integrations/entwuerfe.mjs';
import weiterleitungen from './src/integrations/weiterleitungen.mjs';
import sitemap from './src/integrations/sitemap.mjs';
import bilderAufraeumen from './src/integrations/bilder-aufraeumen.mjs';
import indexnow from './src/integrations/indexnow.mjs';
import seoPruefung from './src/integrations/seo-pruefung.mjs';

export default defineConfig({
  // TODO pro Kunde: endgültige Domain eintragen (für Canonical-URLs, Open Graph und Sitemap)
  site: 'https://www.kundendomain.de',
  output: 'static',
  // CSS direkt in die Seite schreiben: Der Browser muss nicht erst auf eine CSS-Datei warten (PageSpeed)
  build: { inlineStylesheets: 'always' },
  // Zwischenspeicher für optimierte Bilder (beim Veröffentlichen wiederverwendet)
  cacheDir: './.astro-cache',
  // entwuerfe() nimmt Entwürfe aus der Website, Vorschau nur im CMS (muss vor sitemap() stehen),
  // weiterleitungen() prüft die Weiterleitungen aus dem CMS (muss nach entwuerfe() stehen),
  // indexnow() meldet geänderte Seiten an Suchmaschinen (muss nach sitemap() stehen),
  // seoPruefung() prüft Titel, Beschreibungen, Überschriften, Bilder und Links → /seo-pruefung.json (immer zuletzt)
  integrations: [tailwind(), entwuerfe(), weiterleitungen(), sitemap(), bilderAufraeumen(), indexnow(), seoPruefung()],
  image: {
    domains: [],
    remotePatterns: [],
  },
});

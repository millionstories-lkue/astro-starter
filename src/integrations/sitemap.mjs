/**
 * Sitemap + robots.txt – ohne zusätzliches npm-Paket
 *
 * Erzeugt beim Build automatisch:
 *  - dist/sitemap.xml  mit allen gebauten Seiten (auch CMS-Projektseiten)
 *  - ergänzt dist/robots.txt um die Zeile "Sitemap: https://…/sitemap.xml"
 *
 * Voraussetzung: `site` ist in astro.config.mjs gesetzt.
 * Diese Datei nicht verändern.
 */
import { readFile, writeFile } from 'node:fs/promises';

const AUSGESCHLOSSEN = /^(404|500)\/?$/;

export default function sitemap() {
  let site;

  return {
    name: 'starter-sitemap',
    hooks: {
      'astro:config:done': ({ config }) => {
        site = config.site;
      },

      'astro:build:done': async ({ dir, pages, logger }) => {
        if (!site) {
          logger.warn('Kein `site` in astro.config.mjs – Sitemap wird nicht erzeugt.');
          return;
        }

        const basis = site.replace(/\/+$/, '');
        const pfade = [...new Set(pages.map((p) => p.pathname))]
          .filter((p) => !AUSGESCHLOSSEN.test(p))
          .sort((a, b) => a.length - b.length || a.localeCompare(b));

        const eintraege = pfade
          .map((p) => {
            const url = `${basis}/${p}`.replace(/&/g, '&amp;');
            const prioritaet = p === '' ? '1.0' : '0.7';
            return `  <url>\n    <loc>${url}</loc>\n    <priority>${prioritaet}</priority>\n  </url>`;
          })
          .join('\n');

        const xml =
          '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
          eintraege +
          '\n</urlset>\n';

        await writeFile(new URL('sitemap.xml', dir), xml, 'utf8');

        // robots.txt um den Sitemap-Hinweis ergänzen (oder anlegen)
        const robotsUrl = new URL('robots.txt', dir);
        let robots = '';
        try {
          robots = await readFile(robotsUrl, 'utf8');
        } catch {
          robots = 'User-agent: *\nAllow: /\n';
        }
        if (!/^sitemap:/im.test(robots)) {
          robots = robots.replace(/\s*$/, '\n') + `\nSitemap: ${basis}/sitemap.xml\n`;
          await writeFile(robotsUrl, robots, 'utf8');
        }

        logger.info(`Sitemap mit ${pfade.length} Seiten erzeugt.`);
      },
    },
  };
}

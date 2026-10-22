/**
 * Sitemap + robots.txt – ohne zusätzliches npm-Paket
 *
 * Erzeugt beim Build automatisch:
 *  - dist/sitemap.xml  mit allen gebauten Seiten (auch CMS-Projektseiten)
 *  - ergänzt dist/robots.txt um die Zeile "Sitemap: https://…/sitemap.xml"
 *
 * Nicht in die Sitemap kommen Seiten, die nicht in Google erscheinen sollen:
 * 404/500, Seiten mit <meta name="robots" content="noindex…"> und Weiterleitungsseiten
 * (Astro.redirect / meta refresh). Sonst meldet die Google Search Console
 * „Durch noindex ausgeschlossen“ bzw. „Seite mit Weiterleitung“.
 *
 * Voraussetzung: `site` ist in astro.config.mjs auf die echte Domain gesetzt
 * (steht dort noch die Platzhalter-Domain, erscheint beim Build eine Warnung).
 * Diese Datei ist Teil des Starter-Repos – nicht verändern.
 */
import { readFile, writeFile } from 'node:fs/promises';

const NOINDEX = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i;
const WEITERLEITUNG = /<meta[^>]+http-equiv=["']refresh["']/i;

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

        if (/kundendomain|example\.com/i.test(site)) {
          logger.warn('ACHTUNG: In astro.config.mjs steht noch die Platzhalter-Domain (' + site + '). Bitte `site` auf die echte Domain setzen – sonst zeigen Canonical-Adressen und Sitemap auf die falsche Seite.');
        }

        const basis = site.replace(/\/+$/, '');
        const alle = [...new Set(pages.map((p) => p.pathname))].filter((p) => !AUSGESCHLOSSEN.test(p));
        const ausgelassen = [];
        const pfade = [];
        for (const p of alle) {
          let html = '';
          try {
            html = await readFile(new URL(`${p}${p === '' || p.endsWith('/') ? '' : '/'}index.html`, dir), 'utf8');
          } catch {
            try {
              html = await readFile(new URL(p.replace(/\/$/, '') + '.html', dir), 'utf8');
            } catch {}
          }
          if (NOINDEX.test(html) || WEITERLEITUNG.test(html)) ausgelassen.push(p);
          else pfade.push(p);
        }
        pfade.sort((a, b) => a.length - b.length || a.localeCompare(b));

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

        logger.info(
          `Sitemap mit ${pfade.length} Seiten erzeugt` +
            (ausgelassen.length ? ` (${ausgelassen.length} Weiterleitungs- bzw. noindex-Seiten ausgelassen).` : '.'),
        );
      },
    },
  };
}

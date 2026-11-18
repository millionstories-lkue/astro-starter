/**
 * Sitemap + robots.txt – ohne zusätzliches npm-Paket
 *
 * Erzeugt beim Build automatisch:
 *  - dist/sitemap.xml  mit allen gebauten Seiten (auch CMS-Projektseiten)
 *  - ergänzt dist/robots.txt um die Zeile "Sitemap: https://…/sitemap.xml"
 *
 * Nicht in die Sitemap kommen Seiten, die nicht in Google erscheinen sollen:
 * 404/500, Seiten mit <meta name="robots" content="noindex…">, Weiterleitungsseiten
 * (Astro.redirect / meta refresh) und Entwürfe (Vorschau-Adresse, siehe entwuerfe.mjs). Sonst meldet die Google Search Console
 * „Durch noindex ausgeschlossen“ bzw. „Seite mit Weiterleitung“.
 *
 * „Zuletzt geändert“ (lastmod): Für jede Seite wird ein Fingerabdruck des Inhalts (Titel, Beschreibung,
 * Hauptbereich <main>) gebildet. Nur wenn sich der Inhalt wirklich ändert, bekommt die Seite das heutige
 * Datum – Änderungen an Kopf- oder Fußbereich, Gestaltung oder Bilddateinamen zählen nicht. Der Stand
 * wird im Zwischenspeicher (.astro-cache/seitenstand.json) und als dist/seitenstand.json gespeichert;
 * fehlt der Zwischenspeicher, wird der Stand der veröffentlichten Website geladen.
 * Dasselbe Datum steht als „dateModified“ in den strukturierten Daten der Seite (WebPage, src/lib/schema.ts).
 *
 * Sprachversionen (hreflang, ab Starter 1.5.0): Gibt es eine Seite in mehreren Sprachen unter gleichem
 * Unterpfad (z. B. /kontakt/, /it/kontakt/, /en/kontakt/ – erkannt an <html lang>), werden sie automatisch
 * verknüpft: <link rel="alternate" hreflang="…"> im Seitenkopf (plus x-default = Hauptsprache ohne Präfix)
 * und xhtml:link in der Sitemap. Seiten, die das schon selbst im Kopf haben, bleiben unverändert.
 * Sprachen, die noch nicht online sind (Entwürfe), sind nicht dabei.
 *
 * Voraussetzung: `site` ist in astro.config.mjs auf die echte Domain gesetzt
 * (steht dort noch die Platzhalter-Domain, erscheint beim Build eine Warnung).
 * Diese Datei ist Teil des Starter-Repos – nicht verändern.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const sha = (text) => createHash('sha256').update(text).digest('hex');
const heute = () => new Date().toISOString().slice(0, 10);

/** Fingerabdruck des Inhalts: Titel, Beschreibung und <main> – ohne Dateinamen-Stempel und Gestaltungs-Kennungen */
function inhaltFingerabdruck(html) {
  const titel = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '';
  const beschreibung = html.match(/<meta name="description" content="([^"]*)"/i)?.[1] ?? '';
  const main = html.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? html;
  const ohneStempel = main
    .replace(/\/_astro\/[^"'\s),]+/g, '/_astro/x')
    .replace(/\s?data-astro-[a-z-]+(="[^"]*")?/g, '')
    .replace(/\bastro-[a-z0-9]{8}\b/g, '')
    .replace(/\bfotos-[a-z0-9]{6}\b/g, 'fotos')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\s+/g, ' ');
  return sha(`${titel}|${beschreibung}|${ohneStempel}`);
}

/** Stand des letzten Builds: zuerst Zwischenspeicher, sonst die veröffentlichte Website */
async function vorigerStand(standDatei, basis, logger) {
  try {
    return JSON.parse(await readFile(standDatei, 'utf8'));
  } catch {}
  if (/kundendomain|example\.com/i.test(basis)) return null;
  try {
    const antwort = await fetch(`${basis}/seitenstand.json`, { signal: AbortSignal.timeout(8000) });
    if (antwort.ok) return await antwort.json();
  } catch {}
  logger.info('Sitemap: kein früherer Stand gefunden – alle Seiten bekommen das heutige Datum.');
  return null;
}

/** „dateModified“ in das Grundgerüst der strukturierten Daten eintragen (BaseLayout, data-ms-grundgeruest) */
function datumEintragen(html, datum) {
  return html.replace(
    /(<script type="application\/ld\+json" data-ms-grundgeruest[^>]*>)([\s\S]*?)(<\/script>)/,
    (ganz, anfang, json, ende) => {
      try {
        const daten = JSON.parse(json);
        const seite = daten['@graph']?.find((x) => x['@type'] === 'WebPage');
        if (!seite) return ganz;
        seite.dateModified = datum;
        return anfang + JSON.stringify(daten).replace(/</g, '\\u003c') + ende;
      } catch {
        return ganz;
      }
    },
  );
}

/** Sprache einer Seite aus <html lang="…"> (klein geschrieben, z. B. 'de', 'it', 'en-gb') */
const spracheVon = (html) => html.match(/<html[^>]*\slang=["']([a-zA-Z-]+)["']/i)?.[1]?.toLowerCase() ?? '';

/**
 * Sprachgruppen bilden: Seiten mit Präfix /<sprache>/ gehören zur Seite ohne Präfix mit gleichem Unterpfad.
 * Ergebnis: { pfad: [{ sprache, pfad }] } – nur für Seiten, die es in mindestens zwei Sprachen gibt.
 */
function sprachGruppen(pfade, dateien) {
  const gruppen = {};
  for (const p of pfade) {
    const sprache = spracheVon(dateien[p].html);
    if (!sprache) continue;
    const kurz = sprache.split('-')[0];
    const basis = p === kurz + '/' || p.startsWith(kurz + '/') ? p.slice(kurz.length + 1) : p;
    const vorn = basis !== p;
    (gruppen[basis] ??= []).push({ sprache, pfad: p, vorn });
  }
  const ergebnis = {};
  for (const liste of Object.values(gruppen)) {
    const sprachen = new Set(liste.map((x) => x.sprache));
    // nur echte Sprachgruppen: mindestens zwei verschiedene Sprachen, jede nur einmal
    if (sprachen.size < 2 || sprachen.size !== liste.length) continue;
    const haupt = liste.find((x) => !x.vorn);
    for (const x of liste) ergebnis[x.pfad] = { liste, haupt };
  }
  return ergebnis;
}

const HREFLANG_VORHANDEN = /<link[^>]+rel=["']alternate["'][^>]+hreflang=/i;

const NOINDEX = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i;
const WEITERLEITUNG = /<meta[^>]+http-equiv=["']refresh["']/i;

const AUSGESCHLOSSEN = /^(404|500)\/?$/;

export default function sitemap() {
  let site;
  let cacheDir;

  return {
    name: 'starter-sitemap',
    hooks: {
      'astro:config:done': ({ config }) => {
        site = config.site;
        cacheDir = config.cacheDir;
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
        const dateien = {};
        for (const p of alle) {
          if (p.startsWith('vorschau/')) continue;
          let html = null;
          let datei = new URL(`${p}${p === '' || p.endsWith('/') ? '' : '/'}index.html`, dir);
          try {
            html = await readFile(datei, 'utf8');
          } catch {
            try {
              datei = new URL(p.replace(/\/$/, '') + '.html', dir);
              html = await readFile(datei, 'utf8');
            } catch {}
          }
          // Datei nicht (mehr) da, z. B. Entwurf, der unter die Vorschau-Adresse verschoben wurde
          if (html === null) continue;
          if (NOINDEX.test(html) || WEITERLEITUNG.test(html)) ausgelassen.push(p);
          else {
            pfade.push(p);
            dateien[p] = { datei, html };
          }
        }
        pfade.sort((a, b) => a.length - b.length || a.localeCompare(b));

        // Zuletzt geändert: nur bei echter Inhaltsänderung neues Datum
        const standOrdner = cacheDir ? fileURLToPath(cacheDir) : path.resolve('.astro-cache');
        const standDatei = path.join(standOrdner, 'seitenstand.json');
        const vorher = await vorigerStand(standDatei, basis, logger);
        const gruppen = sprachGruppen(pfade, dateien);
        const stand = {};
        let geaendert = 0;
        for (const p of pfade) {
          const url = `${basis}/${p}`;
          const abdruck = inhaltFingerabdruck(dateien[p].html);
          const alt = vorher?.seiten?.[url];
          const datum = alt && alt.abdruck === abdruck && alt.datum ? alt.datum : heute();
          if (!alt || alt.abdruck !== abdruck) geaendert++;
          stand[url] = { abdruck, datum };
          let neu = datumEintragen(dateien[p].html, datum);
          const gruppe = gruppen[p];
          if (gruppe && !HREFLANG_VORHANDEN.test(neu)) {
            const links =
              gruppe.liste.map((x) => `<link rel="alternate" hreflang="${x.sprache}" href="${basis}/${x.pfad}">`).join('') +
              (gruppe.haupt ? `<link rel="alternate" hreflang="x-default" href="${basis}/${gruppe.haupt.pfad}">` : '');
            neu = neu.replace(/<\/head>/i, links + '</head>');
          }
          if (neu !== dateien[p].html) await writeFile(dateien[p].datei, neu, 'utf8');
        }
        const standJson = JSON.stringify({ seiten: stand });
        await writeFile(new URL('seitenstand.json', dir), standJson, 'utf8');
        try {
          await mkdir(standOrdner, { recursive: true });
          await writeFile(standDatei, standJson, 'utf8');
        } catch {}

        const eintraege = pfade
          .map((p) => {
            const url = `${basis}/${p}`;
            const prioritaet = p === '' ? '1.0' : '0.7';
            const gruppe = gruppen[p];
            const sprachLinks = gruppe
              ? gruppe.liste
                  .map((x) => `\n    <xhtml:link rel="alternate" hreflang="${x.sprache}" href="${`${basis}/${x.pfad}`.replace(/&/g, '&amp;')}"/>`)
                  .join('') +
                (gruppe.haupt ? `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${`${basis}/${gruppe.haupt.pfad}`.replace(/&/g, '&amp;')}"/>` : '')
              : '';
            return `  <url>\n    <loc>${url.replace(/&/g, '&amp;')}</loc>${sprachLinks}\n    <lastmod>${stand[url].datum}</lastmod>\n    <priority>${prioritaet}</priority>\n  </url>`;
          })
          .join('\n');

        const xml =
          '<?xml version="1.0" encoding="UTF-8"?>\n' +
          (Object.keys(gruppen).length
            ? '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
            : '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n') +
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
          `Sitemap mit ${pfade.length} Seiten erzeugt, ${geaendert} davon neu oder inhaltlich geändert` +
            (ausgelassen.length ? ` (${ausgelassen.length} Weiterleitungs- bzw. noindex-Seiten ausgelassen)` : '') +
            (Object.keys(gruppen).length ? `, ${Object.keys(gruppen).length} Seiten mit Sprachversionen verknüpft.` : '.'),
        );
      },
    },
  };
}

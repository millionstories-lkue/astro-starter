/**
 * SEO-Prüfung beim Build (ab Starter 1.5.0)
 *
 * Prüft nach jedem Build alle Seiten, die bei Google erscheinen sollen (ohne Entwürfe,
 * Weiterleitungen, noindex-Seiten, /admin und HTML-Dateien ohne <html>, z. B. die Google-Bestätigungsdatei), und schreibt das Ergebnis nach
 * dist/seo-pruefung.json – also online unter https://<domain>/seo-pruefung.json.
 * Der Build bricht dabei nie ab; die Ergebnisse stehen zusätzlich im Build-Protokoll.
 * Der Skill „seo-check“ liest die Datei als Erstes.
 *
 * Fehler (sollten behoben werden):
 *  - Seitentitel oder Beschreibung fehlt, doppelt auf mehreren Seiten
 *  - keine oder mehrere H1-Überschriften
 *  - Bild ohne alt-Angabe
 *  - interner Link auf eine Seite, die es nicht gibt
 *  - Platzhaltertexte (Lorem ipsum, TODO, kundendomain …)
 *  - strukturierte Daten (JSON-LD), die sich nicht lesen lassen
 * Hinweise (prüfen, ob es so gewollt ist):
 *  - Titel länger als 60 bzw. kürzer als 15 Zeichen, Beschreibung länger als 160 bzw. kürzer als 50
 *  - übersprungene Überschriftenebene (z. B. H2 → H4)
 *  - interner Link auf eine alte, weitergeleitete Adresse
 *  - automatisch erzeugte Bildbeschreibungen („… – Foto 3 von 12“) – besser in der Mediathek beschreiben
 *  - sehr wenig Text im Hauptbereich (unter 150 Wörter; nicht bei Startseite, Übersichten und Rechtstexten)
 *
 * In astro.config.mjs als letzte Integration einbinden.
 * Diese Datei ist Teil des Starter-Repos – nicht verändern.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const NOINDEX = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i;
const WEITERLEITUNG = /<meta[^>]+http-equiv=["']refresh["']/i;
const PLATZHALTER = /lorem ipsum|\bTODO\b|platzhaltertext|kundendomain|example\.com|xxx@|musterstra(ss|ß)e/i;
const AUTO_ALT = / – Foto \d+ von \d+$/;

const entities = (t) =>
  t
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;|&#160;/g, ' ');

const nurText = (html) =>
  entities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();

async function htmlDateien(ordner, basis = ordner) {
  const liste = [];
  for (const e of await readdir(ordner, { withFileTypes: true })) {
    const voll = path.join(ordner, e.name);
    const rel = path.relative(basis, voll).split(path.sep).join('/');
    if (e.isDirectory()) {
      if (/^(admin|_astro|vorschau)$/.test(rel)) continue;
      liste.push(...(await htmlDateien(voll, basis)));
    } else if (e.name.endsWith('.html')) liste.push(voll);
  }
  return liste;
}

/** Adresse einer HTML-Datei: dist/kontakt/index.html → /kontakt/ */
function adresseVon(datei, dist) {
  const rel = path.relative(dist, datei).split(path.sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'index.html'.length);
  return '/' + rel.replace(/\.html$/, '');
}

export default function seoPruefung() {
  let site = '';

  return {
    name: 'starter-seo-pruefung',
    hooks: {
      'astro:config:done': ({ config }) => {
        site = (config.site || '').replace(/\/+$/, '');
      },

      'astro:build:done': async ({ dir, logger }) => {
        const dist = fileURLToPath(dir);
        const fehler = [];
        const hinweise = [];
        const titel = {};
        const beschreibungen = {};
        const weiterleitungen = new Set();
        const seiten = [];

        for (const datei of await htmlDateien(dist)) {
          const adresse = adresseVon(datei, dist);
          if (/^\/(404|500)\/?$/.test(adresse)) continue;
          const html = await readFile(datei, 'utf8');
          // Keine richtige Seite (z. B. Google-Bestätigungsdatei google….html aus public/) → überspringen
          if (!/<html[\s>]/i.test(html)) continue;
          if (WEITERLEITUNG.test(html)) {
            weiterleitungen.add(adresse);
            continue;
          }
          if (NOINDEX.test(html)) continue;
          seiten.push({ adresse, html });
        }

        const f = (seite, text) => fehler.push({ seite, text });
        const hw = (seite, text) => hinweise.push({ seite, text });

        /** Gibt es das Ziel eines internen Links? */
        function linkZiel(href) {
          let p = href.split('#')[0].split('?')[0];
          if (!p || p === '/') return 'ok';
          try {
            p = decodeURIComponent(p);
          } catch {}
          if (/^\/(admin|_astro)\//.test(p)) return 'ok';
          const ohne = p.replace(/^\/+/, '');
          const kandidaten = [ohne, path.posix.join(ohne, 'index.html'), ohne.replace(/\/$/, '') + '.html'];
          const vorhanden = kandidaten.some((k) => k && existsSync(path.join(dist, k)));
          if (!vorhanden) return 'fehlt';
          const mitSchraegstrich = p.endsWith('/') || /\.[a-z0-9]{2,5}$/i.test(p) ? p : p + '/';
          if (weiterleitungen.has(mitSchraegstrich) || weiterleitungen.has(p)) return 'weiterleitung';
          return 'ok';
        }

        for (const { adresse, html } of seiten) {
          const t = entities(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim();
          const b = entities(html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1] ?? '').trim();

          if (!t) f(adresse, 'Seitentitel fehlt.');
          else {
            (titel[t] ??= []).push(adresse);
            if (t.length > 60) hw(adresse, `Seitentitel hat ${t.length} Zeichen (Google zeigt ca. 60): „${t}“`);
            if (t.length < 15) hw(adresse, `Seitentitel ist sehr kurz (${t.length} Zeichen): „${t}“`);
          }
          if (!b) f(adresse, 'Beschreibung für Google (meta description) fehlt.');
          else {
            (beschreibungen[b] ??= []).push(adresse);
            if (b.length > 160) hw(adresse, `Beschreibung hat ${b.length} Zeichen (Google zeigt ca. 155).`);
            if (b.length < 50) hw(adresse, `Beschreibung ist sehr kurz (${b.length} Zeichen): „${b}“`);
          }

          // Überschriften
          const ebenen = [...html.matchAll(/<h([1-6])[\s>]/gi)].map((m) => Number(m[1]));
          const h1 = ebenen.filter((e) => e === 1).length;
          if (h1 === 0) f(adresse, 'Keine H1-Überschrift.');
          if (h1 > 1) f(adresse, `${h1} H1-Überschriften (genau eine pro Seite).`);
          for (let i = 1; i < ebenen.length; i++) {
            if (ebenen[i] > ebenen[i - 1] + 1) {
              hw(adresse, `Überschriftenebene übersprungen (H${ebenen[i - 1]} → H${ebenen[i]}).`);
              break;
            }
          }

          // Bilder
          const main = html.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? html;
          let ohneAlt = 0;
          let autoAlt = 0;
          for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
            // alt="…", alt='…', alt=wert oder nur alt (= leer, Zierbild – so schreibt Astro alt="" beim Verkleinern)
            const alt = m[0].match(/\salt(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?(?=[\s>\/]|$)/i);
            if (!alt) ohneAlt++;
            else if (AUTO_ALT.test(entities(alt[1] ?? alt[2] ?? alt[3] ?? ''))) autoAlt++;
          }
          if (ohneAlt) f(adresse, `${ohneAlt} Bild(er) ohne alt-Angabe.`);
          if (autoAlt) hw(adresse, `${autoAlt} Bild(er) mit automatischer Beschreibung („… – Foto 3 von 12“). In der Mediathek beschreiben, was zu sehen ist.`);

          // Interne Links
          const gemeldet = new Set();
          for (const m of html.matchAll(/<a\b[^>]*\shref=(["'])([\s\S]*?)\1/gi)) {
            let href = entities(m[2]).trim();
            if (site && href.startsWith(site)) href = href.slice(site.length) || '/';
            if (!href.startsWith('/') || href.startsWith('//')) continue;
            if (gemeldet.has(href)) continue;
            const ziel = linkZiel(href);
            if (ziel === 'fehlt') f(adresse, `Link auf eine Seite, die es nicht gibt: ${href}`);
            if (ziel === 'weiterleitung') hw(adresse, `Link auf eine alte, weitergeleitete Adresse: ${href} – besser direkt auf das Ziel verlinken.`);
            if (ziel !== 'ok') gemeldet.add(href);
          }

          // Platzhalter und Textmenge
          const text = nurText(main);
          const platz = text.match(PLATZHALTER) || t.match(PLATZHALTER) || b.match(PLATZHALTER);
          if (platz) f(adresse, `Platzhaltertext gefunden: „${platz[0]}“`);
          const woerter = text.split(' ').filter((w) => /\p{L}{2,}/u.test(w)).length;
          const uebersicht = /"@type":"(CollectionPage|Blog)"/.test(html) || /^\/(impressum|datenschutz|barrierefreiheit)\//.test(adresse);
          if (adresse !== '/' && !uebersicht && woerter < 150) hw(adresse, `Wenig Text im Hauptbereich (${woerter} Wörter). Google und KI-Systeme zitieren Seiten mit konkreten, ausführlichen Antworten.`);

          // Strukturierte Daten
          for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
            try {
              JSON.parse(m[1]);
            } catch {
              f(adresse, 'Strukturierte Daten (JSON-LD) lassen sich nicht lesen.');
            }
          }
        }

        for (const [t, liste] of Object.entries(titel)) {
          if (liste.length > 1) f(liste.join(', '), `Gleicher Seitentitel auf ${liste.length} Seiten: „${t}“`);
        }
        for (const [b, liste] of Object.entries(beschreibungen)) {
          if (liste.length > 1) f(liste.join(', '), `Gleiche Beschreibung auf ${liste.length} Seiten: „${b.slice(0, 80)}${b.length > 80 ? '…' : ''}“`);
        }

        const ergebnis = {
          erstellt: new Date().toISOString(),
          website: site,
          geprueft: seiten.length,
          fehler,
          hinweise,
        };
        await writeFile(new URL('seo-pruefung.json', dir), JSON.stringify(ergebnis, null, 2), 'utf8');

        const zeile = `SEO-Prüfung: ${seiten.length} Seiten geprüft – ${fehler.length} Fehler, ${hinweise.length} Hinweise (Details: /seo-pruefung.json).`;
        if (fehler.length) {
          logger.warn(zeile);
          for (const x of fehler.slice(0, 20)) logger.warn(`  ${x.seite}: ${x.text}`);
          if (fehler.length > 20) logger.warn(`  … und ${fehler.length - 20} weitere`);
        } else logger.info(zeile);
      },
    },
  };
}

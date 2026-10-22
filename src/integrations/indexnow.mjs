/**
 * IndexNow – neue und geänderte Seiten automatisch an Suchmaschinen melden
 * (Bing und damit u. a. ChatGPT-Suche und Copilot, außerdem Yandex, Seznam, Naver …)
 *
 * Beim Build:
 *  - legt die Schlüssel-Datei dist/<schlüssel>.txt an (Schlüssel wird aus der Domain
 *    berechnet – nichts einzutragen, jede Website hat automatisch ihren eigenen)
 *  - vergleicht alle Seiten der Sitemap mit dem Stand des letzten Builds
 *    (gespeichert im Bilder-Zwischenspeicher .astro-cache, siehe Workflow)
 *  - schreibt die Liste der neuen, geänderten und entfernten Adressen nach dist/indexnow.json
 *
 * Gemeldet wird erst, wenn die Seite online ist: Das übernimmt der GitHub-Workflow
 * .github/workflows/indexnow.yaml (läuft nach „Deploy Now: Deploy to IONOS“).
 *
 * Muss in astro.config.mjs NACH sitemap() eingebunden sein.
 * Diese Datei ist Teil des Starter-Repos – nicht verändern.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const sha = (text) => createHash('sha256').update(text).digest('hex');

export default function indexnow() {
  let site;
  let cacheDir;

  return {
    name: 'starter-indexnow',
    hooks: {
      'astro:config:done': ({ config }) => {
        site = config.site;
        cacheDir = config.cacheDir;
      },

      'astro:build:done': async ({ dir, logger }) => {
        if (!site || /kundendomain|example\.com/i.test(site)) {
          logger.warn('IndexNow übersprungen: In astro.config.mjs ist keine echte Domain (`site`) eingetragen.');
          return;
        }
        const basis = new URL(site);
        const host = basis.host;
        const key = sha(`indexnow:${host}`).slice(0, 32);
        const keyLocation = new URL(`/${key}.txt`, basis).href;
        await writeFile(new URL(`${key}.txt`, dir), key, 'utf8');

        // Alle Adressen aus der Sitemap (ohne 404-, noindex- und Weiterleitungsseiten)
        let urls = [];
        try {
          const xml = await readFile(new URL('sitemap.xml', dir), 'utf8');
          urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
        } catch {
          logger.warn('IndexNow: keine sitemap.xml gefunden – sitemap() muss vor indexnow() stehen.');
          return;
        }

        // Fingerabdruck jeder Seite
        const jetzt = {};
        for (const url of urls) {
          const pfad = new URL(url).pathname.replace(/^\//, '');
          const datei = pfad === '' ? 'index.html' : pfad.endsWith('/') ? `${pfad}index.html` : `${pfad}/index.html`;
          try {
            jetzt[url] = sha(await readFile(new URL(datei, dir), 'utf8'));
          } catch {
            jetzt[url] = 'unbekannt';
          }
        }

        // Stand des letzten Builds (im Zwischenspeicher, wird von GitHub zwischen Builds aufbewahrt)
        const standOrdner = cacheDir ? fileURLToPath(cacheDir) : path.resolve('.astro-cache');
        const standDatei = path.join(standOrdner, 'indexnow-stand.json');
        let vorher = null;
        try {
          vorher = JSON.parse(await readFile(standDatei, 'utf8'));
        } catch {}

        let liste;
        if (!vorher || vorher.host !== host) {
          liste = urls; // erster Build mit IndexNow: alle Seiten melden
        } else {
          const neuOderGeaendert = urls.filter((u) => vorher.seiten?.[u] !== jetzt[u]);
          const entfernt = Object.keys(vorher.seiten || {}).filter((u) => !(u in jetzt));
          liste = [...neuOderGeaendert, ...entfernt];
        }

        await writeFile(
          new URL('indexnow.json', dir),
          JSON.stringify({ host, key, keyLocation, urlList: liste.slice(0, 10000), erstellt: new Date().toISOString() }, null, 2),
          'utf8',
        );
        try {
          await mkdir(standOrdner, { recursive: true });
          await writeFile(standDatei, JSON.stringify({ host, seiten: jetzt }), 'utf8');
        } catch {}

        logger.info(
          liste.length
            ? `IndexNow: ${liste.length} ${liste.length === 1 ? 'Adresse' : 'Adressen'} zum Melden vorbereitet.`
            : 'IndexNow: keine geänderten Seiten.',
        );
      },
    },
  };
}

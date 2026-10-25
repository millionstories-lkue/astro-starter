/**
 * Entwürfe mit Vorschaulink – ohne Server, ohne Login
 *
 * Seiten und Einträge mit dem Schalter „Veröffentlicht“ aus (BaseLayout-Prop `entwurf`)
 * werden beim Build ganz normal erzeugt und danach hier verschoben:
 *
 *   dist/<pfad>/index.html  →  dist/vorschau/<schlüssel>/<pfad>/index.html
 *
 * So gibt es jede Seite immer nur einmal: als Entwurf nur unter der geheimen Vorschau-Adresse,
 * veröffentlicht nur unter der normalen Adresse. Entwürfe sind für Suchmaschinen gesperrt
 * (noindex, nofollow), stehen nicht in Sitemap, IndexNow und llms.txt und sind nirgends verlinkt.
 * Oben links erscheint ein kleiner Hinweis „Vorschau · Entwurf“.
 *
 * Der Schlüssel steht in src/data/vorschau.json ({ "schluessel": "…" }, mind. 12 Zeichen
 * a–z/0–9). Die Datei liegt nicht auf der Website; das CMS liest sie über GitHub und zeigt
 * eingeloggten Personen den Knopf „Vorschaulink kopieren“. Neuer Schlüssel = alle alten
 * Vorschaulinks ungültig. Fehlt die Datei, werden Entwürfe gar nicht veröffentlicht.
 *
 * Muss in astro.config.mjs VOR sitemap() eingebunden sein.
 * Diese Datei ist Teil des Starter-Repos – nicht verändern.
 */
import { mkdir, readdir, readFile, rm, rmdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const MARKE = /<meta[^>]+name=["']ms-entwurf["'][^>]*>/i;

const HINWEIS =
  '<div role="note" style="position:fixed;left:12px;top:12px;z-index:2147483647;display:flex;align-items:center;gap:8px;' +
  'padding:7px 12px;border-radius:999px;background:#111;color:#fff;font:600 12px/1.2 system-ui,-apple-system,sans-serif;' +
  'letter-spacing:.04em;box-shadow:0 4px 16px rgba(0,0,0,.3);pointer-events:none">' +
  '<span aria-hidden="true" style="width:8px;height:8px;border-radius:50%;background:#f5a524"></span>' +
  'Vorschau · Entwurf – noch nicht veröffentlicht</div>';

async function htmlDateien(ordner, basis = ordner) {
  const liste = [];
  for (const e of await readdir(ordner, { withFileTypes: true })) {
    const voll = path.join(ordner, e.name);
    if (e.isDirectory()) {
      if (path.relative(basis, voll) === 'vorschau') continue;
      liste.push(...(await htmlDateien(voll, basis)));
    } else if (e.name.endsWith('.html')) liste.push(voll);
  }
  return liste;
}

async function leereOrdnerEntfernen(ordner, bis) {
  let o = ordner;
  while (o.startsWith(bis) && o !== bis) {
    try {
      await rmdir(o); // nur leere Ordner
    } catch {
      return;
    }
    o = path.dirname(o);
  }
}

export default function entwuerfe() {
  let root;

  return {
    name: 'starter-entwuerfe',
    hooks: {
      'astro:config:done': ({ config }) => {
        root = fileURLToPath(config.root);
      },

      'astro:build:done': async ({ dir, logger }) => {
        const dist = fileURLToPath(dir);

        let schluessel = '';
        try {
          const daten = JSON.parse(await readFile(path.join(root, 'src/data/vorschau.json'), 'utf8'));
          schluessel = String(daten.schluessel || '').trim();
        } catch {}
        const gueltig = /^[a-z0-9]{12,64}$/.test(schluessel);

        const entwurfsSeiten = [];
        for (const datei of await htmlDateien(dist)) {
          const html = await readFile(datei, 'utf8');
          if (MARKE.test(html)) entwurfsSeiten.push({ datei, html });
        }
        if (!entwurfsSeiten.length) return;

        for (const { datei, html } of entwurfsSeiten) {
          const rel = path.relative(dist, datei);
          if (gueltig) {
            const ziel = path.join(dist, 'vorschau', schluessel, rel);
            await mkdir(path.dirname(ziel), { recursive: true });
            await writeFile(ziel, html.replace(/<\/body>/i, HINWEIS + '</body>'), 'utf8');
          }
          await rm(datei);
          await leereOrdnerEntfernen(path.dirname(datei), dist);
        }

        if (gueltig) {
          logger.info(
            `${entwurfsSeiten.length} ${entwurfsSeiten.length === 1 ? 'Entwurf' : 'Entwürfe'} unter der Vorschau-Adresse abgelegt (nicht öffentlich verlinkt, noindex).`,
          );
        } else {
          logger.warn(
            `${entwurfsSeiten.length} ${entwurfsSeiten.length === 1 ? 'Entwurf' : 'Entwürfe'} nicht veröffentlicht: ` +
              'src/data/vorschau.json mit gültigem Schlüssel fehlt – Vorschaulinks sind deshalb nicht verfügbar.',
          );
        }
      },
    },
  };
}

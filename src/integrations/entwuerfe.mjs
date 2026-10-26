/**
 * Entwürfe – nur im CMS sichtbar, nie auf der Website
 *
 * Seiten und Einträge mit dem Schalter „Veröffentlicht“ aus (BaseLayout-Prop `entwurf`)
 * werden beim Build erzeugt und danach sofort wieder aus dist/ entfernt. Auf der Website
 * gibt es sie also gar nicht – auch nicht für Suchmaschinen oder KI.
 *
 * Für die Vorschau im CMS baut der GitHub-Ablauf .github/workflows/entwuerfe.yaml die Website
 * ein zweites Mal mit ENTWURF_ABLAGE=.entwuerfe. Dann landen die Entwürfe zusätzlich in diesem
 * Ordner und der Ablauf legt sie privat im Repo ab (Ref refs/vorschau/entwuerfe, kein Zweig –
 * Deploy Now reagiert darauf nicht), zusammen mit den Bildern, die sie verwenden (_astro/…).
 * Die Vorschauseite public/admin/entwurf.html holt sie
 * von dort mit der GitHub-Anmeldung des CMS: Sehen kann sie nur, wer im CMS angemeldet ist.
 *
 * Muss in astro.config.mjs VOR sitemap() eingebunden sein.
 * Diese Datei ist Teil des Starter-Repos – nicht verändern.
 */
import { copyFile, mkdir, readdir, readFile, rm, rmdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const MARKE = /<meta[^>]+name=["']ms-entwurf["'][^>]*>/i;
// Bilder, die eine Entwurfsseite verwendet (werden mit abgelegt – auf der Website entfernt sie
// bilder-aufraeumen.mjs, wenn nur Entwürfe sie nutzen)
const BILDER = /\/_astro\/[^"'\s),?#]+\.(?:webp|avif|jpe?g|png|gif|svg)/gi;

const HINWEIS =
  '<div role="note" style="position:fixed;left:12px;top:12px;z-index:2147483647;display:flex;align-items:center;gap:8px;' +
  'padding:7px 12px;border-radius:999px;background:#111;color:#fff;font:600 12px/1.2 system-ui,-apple-system,sans-serif;' +
  'letter-spacing:.04em;box-shadow:0 4px 16px rgba(0,0,0,.3);pointer-events:none">' +
  '<span aria-hidden="true" style="width:8px;height:8px;border-radius:50%;background:#f5a524"></span>' +
  'Vorschau · Entwurf – noch nicht veröffentlicht</div>';

async function htmlDateien(ordner) {
  const liste = [];
  for (const e of await readdir(ordner, { withFileTypes: true })) {
    const voll = path.join(ordner, e.name);
    if (e.isDirectory()) liste.push(...(await htmlDateien(voll)));
    else if (e.name.endsWith('.html')) liste.push(voll);
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
        const ablageName = (process.env.ENTWURF_ABLAGE || '').trim();
        const ablage = ablageName ? path.resolve(root, ablageName) : '';
        if (ablage) await rm(ablage, { recursive: true, force: true });

        let anzahl = 0;
        for (const datei of await htmlDateien(dist)) {
          const html = await readFile(datei, 'utf8');
          if (!MARKE.test(html)) continue;
          anzahl++;
          if (ablage) {
            const ziel = path.join(ablage, path.relative(dist, datei));
            await mkdir(path.dirname(ziel), { recursive: true });
            await writeFile(ziel, html.replace(/<\/body>/i, HINWEIS + '</body>'), 'utf8');
            for (const bild of new Set(html.match(BILDER) || [])) {
              const quelle = path.join(dist, bild);
              const kopie = path.join(ablage, bild);
              if (existsSync(quelle) && !existsSync(kopie)) {
                await mkdir(path.dirname(kopie), { recursive: true });
                await copyFile(quelle, kopie);
              }
            }
          }
          await rm(datei);
          await leereOrdnerEntfernen(path.dirname(datei), dist);
        }

        if (!anzahl) return;
        logger.info(
          `${anzahl} ${anzahl === 1 ? 'Entwurf' : 'Entwürfe'} nicht auf der Website veröffentlicht` +
            (ablage ? ` – für die Vorschau im CMS in ${ablageName}/ abgelegt.` : ' (Vorschau nur im CMS).'),
        );
      },
    },
  };
}

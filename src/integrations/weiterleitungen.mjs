/**
 * Prüft nach dem Build die Weiterleitungen aus dem CMS (src/data/weiterleitungen/*.json)
 * und meldet Probleme im Build-Protokoll:
 *  - Unter der alten Adresse gibt es eine echte Seite → die Seite hat Vorrang, die Weiterleitung greift nicht.
 *  - Das Ziel auf der eigenen Website gibt es nicht (z. B. Tippfehler oder Seite ist ein Entwurf).
 * Ändert nichts an der Website. Muss in astro.config.mjs NACH entwuerfe() stehen.
 * Teil des Starter-Repos – nicht verändern.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const pfadAus = (s) => {
  let p = String(s ?? '').trim().replace(/^[a-z]+:\/\/[^/]+/i, '').split(/[?#]/)[0];
  try {
    p = decodeURI(p);
  } catch {}
  return p.replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, '/');
};

function seiteDa(dist, p) {
  if (!p) return existsSync(path.join(dist, 'index.html'));
  return existsSync(path.join(dist, p, 'index.html')) || (existsSync(path.join(dist, p)) && !p.endsWith('/'));
}

export default function weiterleitungen() {
  let root;
  return {
    name: 'starter-weiterleitungen',
    hooks: {
      'astro:config:done': ({ config }) => {
        root = fileURLToPath(config.root);
      },
      'astro:build:done': ({ dir, logger }) => {
        const ordner = path.join(root, 'src/data/weiterleitungen');
        if (!existsSync(ordner)) return;
        const dist = fileURLToPath(dir);
        let ok = 0;
        for (const name of readdirSync(ordner).filter((n) => n.endsWith('.json')).sort()) {
          let d;
          try {
            d = JSON.parse(readFileSync(path.join(ordner, name), 'utf8'));
          } catch {
            logger.warn(`${name}: Datei ist kein gültiges JSON.`);
            continue;
          }
          if (d.aktiv === false) continue;
          const von = pfadAus(d.von);
          const nach = String(d.nach ?? '').trim();
          if (!von || !nach) continue;
          const datei = path.join(dist, von, 'index.html');
          const html = existsSync(datei) ? readFileSync(datei, 'utf8') : '';
          if (!/http-equiv=["']refresh["']/i.test(html)) {
            logger.warn(`/${von}: Unter dieser Adresse gibt es eine echte Seite – sie hat Vorrang, die Weiterleitung greift nicht.`);
            continue;
          }
          if (!/^https?:\/\//i.test(nach) && !seiteDa(dist, pfadAus(nach))) {
            logger.warn(`/${von} → ${nach}: Das Ziel gibt es auf der Website nicht (Tippfehler oder Entwurf?).`);
            continue;
          }
          ok++;
        }
        if (ok) logger.info(`${ok} ${ok === 1 ? 'Weiterleitung' : 'Weiterleitungen'} aktiv.`);
      },
    },
  };
}

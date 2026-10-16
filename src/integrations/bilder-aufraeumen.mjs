/**
 * Entfernt nach dem Build Original-Bilder aus dist/_astro, die keine Seite verwendet.
 *
 * Astro kopiert ein Originalbild zusätzlich in die fertige Website, sobald im Code seine
 * Breite oder Höhe gelesen wird (z. B. für Seitenverhältnisse). Ausgeliefert werden aber
 * nur die optimierten Fassungen (webp). Ohne Aufräumen wird die Website dadurch schnell
 * größer als das Speicherlimit von IONOS Deploy Now (ca. 50 MB).
 * Gelöscht wird nur, was in keiner HTML-, CSS-, JS-, XML-, JSON- oder TXT-Datei vorkommt.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BILD = /\.(jpe?g|png|webp|avif|gif)$/i;
const TEXT = /\.(html?|css|js|mjs|xml|json|txt|webmanifest|svg)$/i;

function alleDateien(ordner) {
  const liste = [];
  for (const eintrag of fs.readdirSync(ordner, { withFileTypes: true })) {
    const p = path.join(ordner, eintrag.name);
    if (eintrag.isDirectory()) liste.push(...alleDateien(p));
    else liste.push(p);
  }
  return liste;
}

export default function bilderAufraeumen() {
  return {
    name: 'bilder-aufraeumen',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const wurzel = fileURLToPath(dir);
        const assets = path.join(wurzel, '_astro');
        if (!fs.existsSync(assets)) return;
        const dateien = alleDateien(wurzel);
        const text = dateien
          .filter((d) => TEXT.test(d))
          .map((d) => fs.readFileSync(d, 'utf8'))
          .join('\n');
        let anzahl = 0;
        let bytes = 0;
        for (const d of dateien) {
          if (!d.startsWith(assets + path.sep) || !BILD.test(d)) continue;
          if (text.includes(path.basename(d))) continue;
          bytes += fs.statSync(d).size;
          fs.unlinkSync(d);
          anzahl++;
        }
        if (anzahl) logger.info(`${anzahl} ungenutzte Originalbilder entfernt (${(bytes / 1024 / 1024).toFixed(1)} MB gespart)`);
      },
    },
  };
}

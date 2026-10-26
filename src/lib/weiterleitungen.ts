/**
 * Weiterleitungen aus dem CMS (Menüpunkt „Weiterleitungen“, Dateien src/data/weiterleitungen/*.json).
 * Jede Datei: { "aktiv": true, "von": "/alte-adresse", "nach": "/neue-seite/", "notiz": "…" }
 *
 * - „von“: alte Adresse ab dem Schrägstrich (ohne Domain). Domain, ?… und #… werden ignoriert.
 * - „nach“: Seite der Website (/kontakt/, auch mit ?quelle=… oder #abschnitt) oder externe Adresse (https://…).
 * - Echte Seiten haben immer Vorrang: Gibt es unter „von“ eine Seite, bleibt sie erreichbar
 *   (der Build warnt, siehe src/integrations/weiterleitungen.mjs).
 * Erzeugt werden die Weiterleitungen von src/pages/[...weiterleitung].astro (dauerhaft, 301).
 * Weiterleitungen kommen nie in die Sitemap.
 * Teil des Starter-Repos – nicht verändern.
 */
export interface WeiterleitungDaten {
  aktiv?: boolean;
  von?: string;
  nach?: string;
  notiz?: string;
}

export interface Weiterleitung {
  /** Pfad ohne Schrägstriche am Anfang und Ende, z. B. „lulebt“ oder „alte-rubrik/seite“ */
  pfad: string;
  ziel: string;
}

const dateien = import.meta.glob<{ default: WeiterleitungDaten }>('/src/data/weiterleitungen/*.json', { eager: true });

/** Alte Adresse vereinheitlichen: ohne Domain, ohne ?… und #…, ohne Schrägstriche am Rand */
export function pfadAus(von?: string | null): string {
  let p = String(von ?? '').trim();
  p = p.replace(/^[a-z]+:\/\/[^/]+/i, '');
  p = p.split(/[?#]/)[0];
  try {
    p = decodeURI(p);
  } catch {}
  return p.replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, '/');
}

/** Ziel vereinheitlichen: externe Adressen bleiben, interne beginnen mit „/“ */
export function zielAus(nach?: string | null): string {
  const z = String(nach ?? '').trim();
  if (!z) return '';
  if (/^https?:\/\//i.test(z)) return z;
  return z.startsWith('/') ? z : `/${z}`;
}

const GESPERRT = /^(admin|_astro|fonts)(\/|$)|^(sitemap\.xml|robots\.txt|llms\.txt|404|500)$/i;

/** Alle aktiven, gültigen Weiterleitungen (doppelte alte Adressen: die erste gilt) */
export function weiterleitungen(): Weiterleitung[] {
  const gesehen = new Set<string>();
  const liste: Weiterleitung[] = [];
  for (const [datei, modul] of Object.entries(dateien).sort(([a], [b]) => a.localeCompare(b))) {
    const d = modul.default ?? {};
    if (d.aktiv === false) continue;
    const pfad = pfadAus(d.von);
    const ziel = zielAus(d.nach);
    if (!pfad || !ziel || GESPERRT.test(pfad) || !/^[\p{L}\p{N}._~\-/]+$/u.test(pfad)) {
      console.warn(`[weiterleitungen] ${datei}: ungültige alte Adresse oder fehlendes Ziel – übersprungen.`);
      continue;
    }
    if (pfadAus(ziel) === pfad && !/^https?:/i.test(ziel)) {
      console.warn(`[weiterleitungen] ${datei}: Ziel ist gleich der alten Adresse – übersprungen.`);
      continue;
    }
    if (gesehen.has(pfad.toLowerCase())) {
      console.warn(`[weiterleitungen] ${datei}: alte Adresse /${pfad} gibt es doppelt – übersprungen.`);
      continue;
    }
    gesehen.add(pfad.toLowerCase());
    liste.push({ pfad, ziel });
  }
  return liste;
}

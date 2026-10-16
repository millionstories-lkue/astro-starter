import type { ImageMetadata } from 'astro';

/**
 * Bilder aus dem CMS (Decap) für die Astro-Bildoptimierung auflösen.
 * Findet alle Bilder unter src/assets/cms/ – auch in Unterordnern (z. B. Galerien).
 * Diese Datei ist Teil des Starter-Repos – nicht verändern.
 */
const bilder = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/cms/**/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP}',
  { eager: true },
);

/**
 * Bildpfad vereinheitlichen. Das CMS speichert Pfade ohne Schrägstrich am Anfang
 * ("src/assets/cms/foto.jpg"), damit es Bildvorschauen anzeigen kann.
 * Ältere Inhalte mit Schrägstrich ("/src/assets/cms/foto.jpg") funktionieren weiterhin.
 */
export function cmsPfad(pfad?: string | null): string | undefined {
  if (!pfad) return undefined;
  const p = pfad.trim();
  return p.startsWith('/') ? p : `/${p}`;
}

/** Liefert zu einem Bildpfad aus dem CMS das optimierbare Bild – oder undefined (nie ein Build-Fehler). */
export function cmsBild(pfad?: string | null): ImageMetadata | undefined {
  const p = cmsPfad(pfad);
  return p ? bilder[p]?.default : undefined;
}

/**
 * Zentrale Bildbeschreibungen aus der Mediathek im CMS (src/data/medien.json, Feld „alt“).
 * Die Datei entsteht beim ersten Speichern einer Beschreibung – fehlt sie, gilt nur die Beschreibung am Bild.
 */
const medien = Object.values(
  import.meta.glob<{ alt?: Record<string, string> }>('/src/data/medien.json', { eager: true, import: 'default' }),
)[0];

/**
 * Beschreibung (Alt-Text) eines CMS-Bildes: die am Bild eingetragene Beschreibung,
 * sonst die zentrale aus der Mediathek, sonst ''. Eigene Ersatztexte danach mit || anhängen:
 *   alt={cmsAlt(bild, bildAlt) || `${titel} – Foto 1`}
 */
export function cmsAlt(pfad?: string | null, alt?: string | null): string {
  const eigen = alt?.trim();
  if (eigen) return eigen;
  const p = cmsPfad(pfad)?.slice(1);
  return (p && medien?.alt?.[p]?.trim()) || '';
}

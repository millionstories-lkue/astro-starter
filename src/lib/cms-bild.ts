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

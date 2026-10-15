/**
 * llms.txt – Zusammenfassung der Website für KI-Systeme (https://<domain>/llms.txt)
 *
 * PRO KUNDE ANPASSEN: nur den Kopfbereich (KOPF) und die festen Seiten (SEITEN).
 * Einträge der aktiven Bausteine (Portfolio, Blog, Events) werden automatisch ergänzt.
 */
import type { APIRoute } from 'astro';
import { projekt } from '@/projekt.config';
import { llmsAbschnitte } from '@/lib/bausteine';

const KOPF = `# ${projekt.firmenname}

> [Ein Satz: Leistung, Ort/Region, Zielgruppe]

[Optional: zwei bis drei Sätze mit den wichtigsten Fakten – Leistungen, Erfahrung, Einzugsgebiet.]`;

/** Feste Seiten: [Name, Pfad, ein Satz zum Inhalt] */
const SEITEN: [string, string, string][] = [
  ['Startseite', '/', '[Ein Satz zum Inhalt der Startseite]'],
  ['Impressum', '/impressum', 'Anbieterkennzeichnung und Kontaktangaben.'],
  ['Datenschutz', '/datenschutz', 'Datenschutzerklärung (keine Cookies, kein Tracking).'],
];

const KONTAKT = `## Kontakt

- E-Mail: [E-Mail-Adresse]
- Telefon: [Telefonnummer]`;

export const GET: APIRoute = async ({ site }) => {
  const basis = site ?? new URL('https://www.kundendomain.de');
  const seiten = SEITEN.map(([name, pfad, text]) => `- [${name}](${new URL(pfad, basis).href}): ${text}`).join('\n');
  const bausteine = await llmsAbschnitte(basis);
  const teile = [KOPF, `## Seiten\n\n${seiten}`, bausteine, KONTAKT].filter(Boolean);
  return new Response(teile.join('\n\n') + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

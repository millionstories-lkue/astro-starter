/**
 * Datenmodell der CMS-Bausteine (Portfolio, Blog, Events) und der Rechtstexte.
 * Teil des Starter-Repos – nicht verändern.
 *
 * Die Felder müssen exakt zu den Feldern in public/admin/config.yml passen
 * (Muster im Tech-Context, Punkt 9). Alle Zusatzfelder sind optional: Wird ein Feld
 * im CMS nicht angeboten, bleibt es leer und wird auf der Website nicht angezeigt.
 */
import { defineCollection, z } from 'astro:content';
import { glob, type Loader } from 'astro/loaders';
import { existsSync, readdirSync } from 'node:fs';

const bild = z.string().optional().nullable();
const text = z.string().optional().nullable();
const bilder = z
  .array(z.object({ bild: z.string().optional().nullable(), alt: z.string().optional().nullable() }))
  .optional()
  .nullable();
const tags = z.array(z.string()).optional().nullable();
/** Optionales Datum – das CMS speichert ein leeres Feld als "" */
const datumOptional = z.preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.date().optional());
/** Datum + Uhrzeit aus dem CMS ("2026-11-03 19:00"), als Ortszeit Deutschland gemeint */
const zeitpunkt = z.union([z.string(), z.date()]).optional().nullable();

/** Ordner unter src/data/ – fehlt er oder ist er leer, ist die Sammlung einfach leer (ohne Warnung) */
function ordner(name: string): Loader {
  const base = `./src/data/${name}`;
  const hatDateien = existsSync(base) && readdirSync(base, { recursive: true }).some((d) => String(d).endsWith('.md'));
  if (hatDateien) return glob({ pattern: '**/*.md', base });
  return { name: `leer-${name}`, load: async ({ store }) => store.clear() };
}

const portfolio = defineCollection({
  loader: ordner('portfolio'),
  schema: z.object({
    titel: z.string(),
    datum: z.coerce.date(),
    veroeffentlicht: z.boolean().default(true),
    tags,
    kurztext: text,
    titelbild: bild,
    titelbildAlt: text,
    bilder,
    // Zusatzfelder (pro Kunde im CMS ein- oder ausblenden)
    kunde: text,
    ort: text,
    leistungen: text,
    link: text,
  }),
});

const blog = defineCollection({
  loader: ordner('blog'),
  schema: z.object({
    titel: z.string(),
    datum: z.coerce.date(),
    aktualisiert: datumOptional,
    veroeffentlicht: z.boolean().default(true),
    tags,
    kurztext: text,
    titelbild: bild,
    titelbildAlt: text,
    bilder,
    autor: text,
  }),
});

const events = defineCollection({
  loader: ordner('events'),
  schema: z.object({
    titel: z.string(),
    beginn: z.union([z.string(), z.date()]),
    ende: zeitpunkt,
    ganztaegig: z.boolean().optional().nullable(),
    veroeffentlicht: z.boolean().default(true),
    abgesagt: z.boolean().optional().nullable(),
    tags,
    kurztext: text,
    titelbild: bild,
    titelbildAlt: text,
    bilder,
    // Ort und Anmeldung
    ortName: text,
    adresse: text,
    online: z.boolean().optional().nullable(),
    preis: text,
    anmeldeLink: text,
  }),
});

const rechtstexte = defineCollection({
  loader: ordner('rechtstexte'),
  schema: z.object({
    titel: z.string(),
    beschreibung: text,
    stand: datumOptional,
  }),
});

export const bausteinCollections = { portfolio, blog, events, rechtstexte };

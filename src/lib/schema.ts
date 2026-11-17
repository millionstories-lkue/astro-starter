/**
 * Strukturierte Daten (Schema.org) – zentral und verknüpft. Teil des Starter-Repos, nicht verändern.
 *
 * Jede Seite enthält automatisch (über BaseLayout) ein Grundgerüst:
 *   WebSite  (#website)      – die Website
 *   Unternehmen (#unternehmen) – aus src/projekt.config.ts → „unternehmen“
 *   WebPage  (<adresse>#webseite) – die einzelne Seite, mit „zuletzt geändert“ (trägt der Build ein)
 * Alles andere (Beiträge, Projekte, Termine, Leistungen, FAQ) verweist per @id darauf.
 * So erkennen Google und KI-Systeme eindeutig, wer hinter den Inhalten steht.
 *
 * Für eigene Seiten (z. B. Leistungsseiten, Team auf der Startseite):
 *   import { unternehmenRef, personSchema, schemaId } from '@/lib/schema';
 *   { '@type': 'Service', '@id': schemaId.inhalt(url, 'leistung'), provider: unternehmenRef(site), … }
 */
import { projekt } from '@/projekt.config';

type Site = URL | string;

export interface Unternehmen {
  /** Schema.org-Typ: 'Organization' oder ein LocalBusiness-Untertyp (z. B. 'ProfessionalService', 'Bakery') */
  typ?: string;
  /** Offizieller Name, falls anders als firmenname (z. B. mit GmbH) */
  rechtsname?: string;
  beschreibung?: string;
  /** Logo als Pfad in public/ (z. B. '/logo.png') */
  logo?: string;
  /** Titelbild/Foto als Pfad in public/ (z. B. '/default-og.jpg') */
  bild?: string;
  email?: string;
  telefon?: string;
  /** Einzugsgebiet, z. B. ['Mannheim', 'Rhein-Neckar'] */
  gebiet?: readonly string[];
  /** Google-Unternehmensprofil, Instagram, LinkedIn … (vollständige Adressen) */
  profile?: readonly string[];
  /** Nur bei echtem Standort mit Publikumsverkehr – keine c/o- oder Postfach-Adressen */
  adresse?: { strasse: string; plz: string; ort: string; land?: string } | null;
}

export interface Person {
  /** Genau so geschrieben wie im CMS-Feld „Autor/in“ */
  name: string;
  /** Rolle bzw. Beruf, z. B. 'Inhaberin & Fotografin' */
  rolle?: string;
  /** Foto als Pfad in public/ oder vollständige Adresse */
  bild?: string;
  /** Profile (LinkedIn, Instagram …), vollständige Adressen */
  profile?: readonly string[];
}

const p = projekt as { firmenname: string; unternehmen?: Unternehmen; personen?: readonly Person[] };
const leer = (v?: string | null) => !v || !String(v).trim();
const sprachen: Record<string, string> = { de: 'de-DE', it: 'it-IT', en: 'en-GB', fr: 'fr-FR' };

export const absolut = (pfad: string, site: Site) => new URL(pfad, site).href;
const startseite = (site: Site) => absolut('/', site);
const kennung = (text: string) =>
  text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Feste Kennungen (@id) – immer gleich, damit Verweise zusammenfinden */
export const schemaId = {
  website: (site: Site) => `${startseite(site)}#website`,
  unternehmen: (site: Site) => `${startseite(site)}#unternehmen`,
  person: (name: string, site: Site) => `${startseite(site)}#person-${kennung(name)}`,
  /** Die einzelne Seite: <adresse>#webseite */
  seite: (url: string) => `${url}#webseite`,
  /** Ein Inhalt auf einer Seite, z. B. schemaId.inhalt(url, 'faq') → <adresse>#faq */
  inhalt: (url: string, teil: string) => `${url}#${teil}`,
};

/** Sind Angaben zum Unternehmen in src/projekt.config.ts eingetragen? */
export const hatUnternehmen = () => !!p.unternehmen;

/** Vollständiges Unternehmen (steht automatisch auf jeder Seite). extra = zusätzliche Angaben, z. B. Öffnungszeiten */
export function unternehmenSchema(site: Site, extra: Record<string, unknown> = {}) {
  const u = p.unternehmen ?? {};
  const a = u.adresse;
  return {
    '@type': u.typ || 'Organization',
    '@id': schemaId.unternehmen(site),
    name: p.firmenname,
    url: startseite(site),
    ...(!leer(u.rechtsname) ? { legalName: u.rechtsname } : {}),
    ...(!leer(u.beschreibung) ? { description: u.beschreibung } : {}),
    ...(!leer(u.logo) ? { logo: { '@type': 'ImageObject', url: absolut(u.logo!, site) } } : {}),
    ...(!leer(u.bild) || !leer(u.logo) ? { image: absolut((u.bild || u.logo)!, site) } : {}),
    ...(!leer(u.email) ? { email: u.email } : {}),
    ...(!leer(u.telefon) ? { telephone: u.telefon } : {}),
    ...(u.gebiet?.length ? { areaServed: u.gebiet.map((name) => ({ '@type': 'Place', name })) } : {}),
    ...(u.profile?.length ? { sameAs: [...u.profile] } : {}),
    ...(a && !leer(a.strasse)
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: a.strasse,
            postalCode: a.plz,
            addressLocality: a.ort,
            addressCountry: a.land || 'DE',
          },
        }
      : {}),
    ...extra,
  };
}

/**
 * Verweis auf das Unternehmen. Sind in src/projekt.config.ts keine Angaben zum Unternehmen eingetragen
 * (ältere Projekte), steht stattdessen eine kurze Angabe mit Name und Adresse da.
 */
export function unternehmenRef(site: Site) {
  // Mit Typ, Name und Adresse, damit jede Angabe auch für sich allein gültig ist (z. B. Veranstalter eines Termins)
  return hatUnternehmen()
    ? { '@type': p.unternehmen?.typ || 'Organization', '@id': schemaId.unternehmen(site), name: p.firmenname, url: startseite(site) }
    : { '@type': 'Organization', name: p.firmenname, url: startseite(site) };
}

export function websiteSchema(site: Site, lang = 'de') {
  return {
    '@type': 'WebSite',
    '@id': schemaId.website(site),
    url: startseite(site),
    name: p.firmenname,
    inLanguage: sprachen[lang] ?? lang,
    publisher: unternehmenRef(site),
  };
}

/** Person aus src/projekt.config.ts → „personen“ suchen (Groß-/Kleinschreibung egal) */
export function personFinden(name?: string | null): Person | undefined {
  const n = name?.trim().toLowerCase();
  return n ? p.personen?.find((x) => x.name.trim().toLowerCase() === n) : undefined;
}

/** Vollständige Person (mit Rolle, Foto, Profilen) – verknüpft mit dem Unternehmen */
export function personSchema(person: Person, site: Site) {
  return {
    '@type': 'Person',
    '@id': schemaId.person(person.name, site),
    name: person.name,
    ...(!leer(person.rolle) ? { jobTitle: person.rolle } : {}),
    ...(!leer(person.bild) ? { image: absolut(person.bild!, site) } : {}),
    ...(person.profile?.length ? { sameAs: [...person.profile] } : {}),
    worksFor: unternehmenRef(site),
  };
}

/** Autor/in eines Beitrags: eingetragene Person vollständig, sonst nur der Name, ohne Angabe das Unternehmen */
export function autorSchema(name: string | null | undefined, site: Site) {
  if (leer(name)) return unternehmenRef(site);
  const person = personFinden(name);
  return person ? personSchema(person, site) : { '@type': 'Person', name: name!.trim() };
}

/**
 * Grundgerüst jeder Seite (BaseLayout): Website, Unternehmen und die Seite selbst.
 * „dateModified“ der Seite trägt src/integrations/sitemap.mjs nach dem Build ein
 * (Datum der letzten echten Inhaltsänderung).
 */
export function grundgeruest(site: Site, seite: { url: string; titel: string; beschreibung: string; lang?: string; bild?: string }) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      websiteSchema(site, seite.lang),
      ...(hatUnternehmen() ? [unternehmenSchema(site)] : []),
      {
        '@type': 'WebPage',
        '@id': schemaId.seite(seite.url),
        url: seite.url,
        name: seite.titel,
        description: seite.beschreibung,
        inLanguage: sprachen[seite.lang ?? 'de'] ?? seite.lang,
        isPartOf: { '@id': schemaId.website(site) },
        ...(seite.bild ? { primaryImageOfPage: { '@type': 'ImageObject', url: seite.bild } } : {}),
      },
    ],
  };
}

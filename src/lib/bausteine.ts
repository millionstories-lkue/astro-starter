/**
 * CMS-Bausteine (Portfolio, Blog, Events): Inhalte laden, sortieren, Tags prüfen,
 * Termine auswerten und Schema.org-Daten erzeugen.
 * Teil des Starter-Repos – nicht verändern. Das Aussehen steckt in src/components/bausteine/.
 */
import type { ImageMetadata } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { cmsAlt, cmsBild } from '@/lib/cms-bild';
import { projekt } from '@/projekt.config';

export type BausteinId = keyof typeof projekt.bausteine;
export const BAUSTEIN_IDS = Object.keys(projekt.bausteine) as BausteinId[];

export interface BausteinInfo {
  id: BausteinId;
  pfad: string;
  name: string;
  einzahl: string;
  tagFilter: boolean;
  url: string;
}

/** Einstellungen eines Bausteins aus src/projekt.config.ts */
export function baustein(id: BausteinId): BausteinInfo {
  const b = projekt.bausteine[id];
  const pfad = b.pfad.replace(/^\/+|\/+$/g, '');
  return { id, pfad, name: b.name, einzahl: b.einzahl, tagFilter: !!b.tagFilter, url: `/${pfad}/` };
}

/** Alle eingeschalteten Bausteine (z. B. für die Navigation) */
export function aktiveBausteine(): BausteinInfo[] {
  return BAUSTEIN_IDS.filter((id) => projekt.bausteine[id].aktiv).map(baustein);
}

export const istAktiv = (id: BausteinId) => !!projekt.bausteine[id].aktiv;

/* ---------- Texte der Übersichtsseiten (src/data/bausteine/<id>.json, im CMS pflegbar) ---------- */

export interface UebersichtTexte {
  titel: string;
  einleitung?: string;
  seoTitel?: string;
  seoBeschreibung?: string;
  leerText?: string;
}

const uebersichtDateien = import.meta.glob<{ default: Partial<UebersichtTexte> }>('/src/data/bausteine/*.json', {
  eager: true,
});

export function uebersichtTexte(id: BausteinId): UebersichtTexte {
  const b = baustein(id);
  const daten = uebersichtDateien[`/src/data/bausteine/${id}.json`]?.default ?? {};
  return {
    titel: daten.titel?.trim() || b.name,
    einleitung: daten.einleitung?.trim() || undefined,
    seoTitel: daten.seoTitel?.trim() || `${b.name} | ${projekt.firmenname}`,
    seoBeschreibung: daten.seoBeschreibung?.trim() || `${b.name} von ${projekt.firmenname}.`,
    leerText:
      daten.leerText?.trim() ||
      (id === 'events' ? 'Zurzeit sind keine Termine geplant.' : 'Hier erscheinen bald die ersten Einträge.'),
  };
}

/** Text mit Leerzeilen → Absätze */
export const absaetze = (text?: string | null) =>
  (text ?? '')
    .split(/\n\s*\n/)
    .map((a) => a.trim())
    .filter(Boolean);

/* ---------- Tags (src/data/listen/<id>-tags.json, im CMS unter „Listen“) ---------- */

const tagDateien = import.meta.glob<{ default: { tags?: { name: string }[] } }>('/src/data/listen/*-tags.json', {
  eager: true,
});

/** Tags in der Reihenfolge der Liste. Gelöschte Tags verschwinden automatisch von der Website. */
export function tagListe(id: BausteinId): string[] {
  const liste = tagDateien[`/src/data/listen/${id}-tags.json`]?.default?.tags ?? [];
  return liste.map((t) => t.name?.trim()).filter((t): t is string => !!t);
}

function nurGueltigeTags(id: BausteinId, tags?: string[] | null) {
  const gueltig = new Set(tagListe(id));
  return [...new Set((tags ?? []).map((t) => t.trim()))].filter((t) => gueltig.has(t));
}

/** Tag → Kennung für Filter (Kleinbuchstaben, Bindestrich) */
export const tagKennung = (tag: string) =>
  tag
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/* ---------- Datum und Uhrzeit ---------- */

const ZEITZONE = 'Europe/Berlin';

/** Datum ohne Uhrzeit, z. B. 28.05.2026 */
export const datumDE = (d: Date) =>
  d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

/** Datum als ISO-Tag, z. B. 2026-05-28 (für <time datetime> und Schema.org) */
export const datumISO = (d: Date) => d.toISOString().slice(0, 10);

export interface Zeit {
  jahr: number;
  monat: number;
  tag: number;
  stunde: number;
  minute: number;
  mitUhrzeit: boolean;
}

/** „2026-11-03 19:00“ (Ortszeit Deutschland) bzw. Datum aus YAML → Zeit */
export function leseZeit(wert?: string | Date | null): Zeit | undefined {
  if (!wert) return undefined;
  if (wert instanceof Date) {
    if (Number.isNaN(wert.getTime())) return undefined;
    const stunde = wert.getUTCHours();
    const minute = wert.getUTCMinutes();
    return {
      jahr: wert.getUTCFullYear(),
      monat: wert.getUTCMonth() + 1,
      tag: wert.getUTCDate(),
      stunde,
      minute,
      mitUhrzeit: stunde !== 0 || minute !== 0,
    };
  }
  const m = String(wert)
    .trim()
    .match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2}))?/);
  if (!m) return undefined;
  return {
    jahr: +m[1],
    monat: +m[2],
    tag: +m[3],
    stunde: m[4] ? +m[4] : 0,
    minute: m[5] ? +m[5] : 0,
    mitUhrzeit: m[4] !== undefined,
  };
}

/** Abstand der deutschen Ortszeit zu UTC in Minuten (Sommer-/Winterzeit) */
function zonenAbstand(utc: number) {
  const teile = new Intl.DateTimeFormat('en-US', {
    timeZone: ZEITZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(utc));
  const t = Object.fromEntries(teile.map((p) => [p.type, +p.value]));
  return (Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute) - utc) / 60000;
}

/** Zeit (Ortszeit Deutschland) → echter Zeitpunkt */
export function zeitpunkt(z: Zeit, tagesende = false): Date {
  const stunde = tagesende && !z.mitUhrzeit ? 23 : z.stunde;
  const minute = tagesende && !z.mitUhrzeit ? 59 : z.minute;
  const geschaetzt = Date.UTC(z.jahr, z.monat - 1, z.tag, stunde, minute);
  return new Date(geschaetzt - zonenAbstand(geschaetzt) * 60000);
}

const zz = (n: number) => String(n).padStart(2, '0');

/** ISO mit Zeitzone für Schema.org, z. B. 2026-11-03T19:00:00+01:00 (ganztägig: 2026-11-03) */
export function zeitISO(z: Zeit, ganztaegig = false) {
  const tag = `${z.jahr}-${zz(z.monat)}-${zz(z.tag)}`;
  if (ganztaegig || !z.mitUhrzeit) return tag;
  const abstand = zonenAbstand(zeitpunkt(z).getTime());
  const vz = abstand >= 0 ? '+' : '-';
  const a = Math.abs(abstand);
  return `${tag}T${zz(z.stunde)}:${zz(z.minute)}:00${vz}${zz(Math.floor(a / 60))}:${zz(a % 60)}`;
}

const wochentag = (z: Zeit) =>
  new Date(Date.UTC(z.jahr, z.monat - 1, z.tag)).toLocaleDateString('de-DE', { weekday: 'short', timeZone: 'UTC' });
const tagDE = (z: Zeit) => `${zz(z.tag)}.${zz(z.monat)}.${z.jahr}`;
const uhrDE = (z: Zeit) => `${zz(z.stunde)}:${zz(z.minute)}`;
const gleicherTag = (a: Zeit, b: Zeit) => a.jahr === b.jahr && a.monat === b.monat && a.tag === b.tag;

/** Lesbarer Zeitraum, z. B. „Di., 03.11.2026, 19:00–21:30 Uhr“ oder „03.11.2026 – 05.11.2026“ */
export function zeitraumDE(beginn: Zeit, ende?: Zeit, ganztaegig = false): string {
  const mitUhr = !ganztaegig && beginn.mitUhrzeit;
  if (!ende || gleicherTag(beginn, ende)) {
    let s = `${wochentag(beginn)}, ${tagDE(beginn)}`;
    if (mitUhr) {
      s += `, ${uhrDE(beginn)}`;
      if (ende && ende.mitUhrzeit && uhrDE(ende) !== uhrDE(beginn)) s += `–${uhrDE(ende)}`;
      s += ' Uhr';
    }
    return s;
  }
  const von = `${wochentag(beginn)}, ${tagDE(beginn)}${mitUhr ? `, ${uhrDE(beginn)} Uhr` : ''}`;
  const bis = `${wochentag(ende)}, ${tagDE(ende)}${!ganztaegig && ende.mitUhrzeit ? `, ${uhrDE(ende)} Uhr` : ''}`;
  return `${von} – ${bis}`;
}

/* ---------- Einträge ---------- */

export interface Foto {
  src: ImageMetadata;
  alt: string;
}

export interface TerminInfo {
  beginn: Zeit;
  ende?: Zeit;
  ganztaegig: boolean;
  /** Zeitpunkt, ab dem der Termin vorbei ist (für die automatische Einordnung) */
  endetUm: Date;
  vergangen: boolean;
  abgesagt: boolean;
  text: string;
}

type EintragDaten = CollectionEntry<'portfolio'> | CollectionEntry<'blog'> | CollectionEntry<'events'>;

export interface Eintrag {
  baustein: BausteinId;
  slug: string;
  url: string;
  titel: string;
  kurztext?: string;
  tags: string[];
  titelbild?: ImageMetadata;
  titelbildAlt: string;
  fotos: Foto[];
  /** Veröffentlichungsdatum (Portfolio, Blog) */
  datum?: Date;
  aktualisiert?: Date;
  termin?: TerminInfo;
  /** Rohdaten inkl. Zusatzfelder (kunde, ort, link, autor, ortName, adresse, preis …) */
  daten: Record<string, any>;
  /** Für render() aus astro:content (Fließtext) */
  eintrag: EintragDaten;
}

function fotosVon(titel: string, liste?: { bild?: string | null; alt?: string | null }[] | null): Foto[] {
  const gefunden = (liste ?? [])
    .map((b) => ({ src: cmsBild(b.bild), alt: cmsAlt(b.bild, b.alt) }))
    .filter((b): b is { src: ImageMetadata; alt: string } => !!b.src);
  return gefunden.map((f, i) => ({ src: f.src, alt: f.alt || `${titel} – Foto ${i + 1} von ${gefunden.length}` }));
}

function zuEintrag(id: BausteinId, e: EintragDaten): Eintrag {
  const d = e.data as Record<string, any>;
  const b = baustein(id);
  const fotos = fotosVon(d.titel, d.bilder);
  const titelbild = cmsBild(d.titelbild) ?? fotos[0]?.src;
  const eintrag: Eintrag = {
    baustein: id,
    slug: e.id,
    url: `${b.url}${e.id}/`,
    titel: d.titel,
    kurztext: d.kurztext?.trim() || undefined,
    tags: nurGueltigeTags(id, d.tags),
    titelbild,
    titelbildAlt: cmsAlt(d.titelbild, d.titelbildAlt) || (cmsBild(d.titelbild) ? d.titel : fotos[0]?.alt) || d.titel,
    fotos,
    datum: d.datum instanceof Date ? d.datum : undefined,
    aktualisiert: d.aktualisiert instanceof Date ? d.aktualisiert : undefined,
    daten: d,
    eintrag: e,
  };

  if (id === 'events') {
    const beginn = leseZeit(d.beginn);
    if (beginn) {
      const ende = leseZeit(d.ende);
      const ganztaegig = !!d.ganztaegig;
      // Ohne Ende gilt ein Termin bis zum Ende seines Tages als aktuell
      const endetUm = ende ? zeitpunkt(ende, true) : zeitpunkt({ ...beginn, mitUhrzeit: false }, true);
      eintrag.termin = {
        beginn,
        ende,
        ganztaegig,
        endetUm,
        vergangen: endetUm.getTime() < Date.now(),
        abgesagt: !!d.abgesagt,
        text: zeitraumDE(beginn, ende, ganztaegig),
      };
    }
  }
  return eintrag;
}

/**
 * Alle veröffentlichten Einträge eines Bausteins.
 * Portfolio und Blog: neueste zuerst. Events: kommende Termine zuerst (nächster oben),
 * danach vergangene (jüngster oben).
 */
/** Welche Bausteine überhaupt Einträge haben (vermeidet Warnungen bei leeren Sammlungen) */
const vorhandeneDateien = Object.keys(import.meta.glob('/src/data/{portfolio,blog,events}/**/*.md'));
const hatEintraege = (id: BausteinId) => vorhandeneDateien.some((p) => p.startsWith(`/src/data/${id}/`));

export async function getEintraege(id: BausteinId): Promise<Eintrag[]> {
  if (!hatEintraege(id)) return [];
  const roh = (await getCollection(id)) as EintragDaten[];
  const liste = roh.filter((e) => (e.data as any).veroeffentlicht !== false).map((e) => zuEintrag(id, e));

  if (id === 'events') {
    const mitTermin = liste.filter((e) => e.termin);
    const start = (e: Eintrag) => zeitpunkt(e.termin!.beginn).getTime();
    const kommend = mitTermin.filter((e) => !e.termin!.vergangen).sort((a, b) => start(a) - start(b));
    const vergangen = mitTermin.filter((e) => e.termin!.vergangen).sort((a, b) => start(b) - start(a));
    return [...kommend, ...vergangen];
  }

  return liste.sort(
    (a, b) => (b.datum?.getTime() ?? 0) - (a.datum?.getTime() ?? 0) || a.titel.localeCompare(b.titel, 'de'),
  );
}

/**
 * Entwürfe eines Bausteins (Schalter „Veröffentlicht“ aus). Sie erscheinen nirgends auf der
 * öffentlichen Website, werden aber unter der geheimen Vorschau-Adresse gebaut
 * (src/integrations/entwuerfe.mjs, Schlüssel in src/data/vorschau.json).
 */
export async function getEntwuerfe(id: BausteinId): Promise<Eintrag[]> {
  if (!hatEintraege(id)) return [];
  const roh = (await getCollection(id)) as EintragDaten[];
  return roh.filter((e) => (e.data as any).veroeffentlicht === false).map((e) => zuEintrag(id, e));
}

/** Die neuesten Einträge (Events: die nächsten kommenden Termine) – z. B. für die Startseite */
export async function neuesteEintraege(id: BausteinId, anzahl = 3): Promise<Eintrag[]> {
  if (!istAktiv(id)) return [];
  const alle = await getEintraege(id);
  return (id === 'events' ? alle.filter((e) => !e.termin?.vergangen) : alle).slice(0, anzahl);
}

/* ---------- Schema.org ---------- */

const absolut = (pfad: string, site: URL | string) => new URL(pfad, site).href;

export function organisation(site: URL | string) {
  return { '@type': 'Organization', name: projekt.firmenname, url: absolut('/', site) };
}

/** BreadcrumbList: Startseite → Übersicht → (Eintrag) */
export function brotkrumenSchema(id: BausteinId, site: URL | string, eintrag?: Eintrag) {
  const b = baustein(id);
  const stufen = [
    { name: 'Startseite', url: '/' },
    { name: b.name, url: b.url },
    ...(eintrag ? [{ name: eintrag.titel, url: eintrag.url }] : []),
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: stufen.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: s.name,
      item: absolut(s.url, site),
    })),
  };
}

/** Schema.org für eine Detailseite. bildUrls: absolute oder relative URLs der optimierten Bilder */
export function eintragSchema(e: Eintrag, site: URL | string, bildUrls: string[] = []) {
  const bilder = bildUrls.map((u) => absolut(u, site));
  const basis = {
    '@context': 'https://schema.org',
    name: e.titel,
    url: absolut(e.url, site),
    ...(e.kurztext ? { description: e.kurztext } : {}),
    ...(bilder.length ? { image: bilder } : {}),
    ...(e.tags.length ? { keywords: e.tags.join(', ') } : {}),
  };

  if (e.baustein === 'blog') {
    return {
      ...basis,
      '@type': 'BlogPosting',
      headline: e.titel,
      ...(e.datum ? { datePublished: datumISO(e.datum) } : {}),
      ...(e.aktualisiert || e.datum ? { dateModified: datumISO(e.aktualisiert ?? e.datum!) } : {}),
      author: e.daten.autor ? { '@type': 'Person', name: e.daten.autor } : organisation(site),
      publisher: organisation(site),
    };
  }

  if (e.baustein === 'events' && e.termin) {
    const t = e.termin;
    const d = e.daten;
    const ort = d.online
      ? { '@type': 'VirtualLocation', url: d.anmeldeLink || absolut(e.url, site) }
      : d.ortName || d.adresse
        ? { '@type': 'Place', ...(d.ortName ? { name: d.ortName } : {}), ...(d.adresse ? { address: d.adresse } : {}) }
        : undefined;
    return {
      ...basis,
      '@type': 'Event',
      startDate: zeitISO(t.beginn, t.ganztaegig),
      ...(t.ende ? { endDate: zeitISO(t.ende, t.ganztaegig) } : {}),
      eventStatus: t.abgesagt ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
      eventAttendanceMode: d.online
        ? 'https://schema.org/OnlineEventAttendanceMode'
        : 'https://schema.org/OfflineEventAttendanceMode',
      ...(ort ? { location: ort } : {}),
      organizer: organisation(site),
      ...(d.anmeldeLink && !t.abgesagt ? { offers: { '@type': 'Offer', url: d.anmeldeLink, availability: 'https://schema.org/InStock' } } : {}),
    };
  }

  // Portfolio
  return {
    ...basis,
    '@type': e.fotos.length > 1 ? 'ImageGallery' : 'CreativeWork',
    headline: e.titel,
    ...(e.datum ? { datePublished: datumISO(e.datum) } : {}),
    creator: organisation(site),
    ...(e.daten.kunde ? { sourceOrganization: { '@type': 'Organization', name: e.daten.kunde } } : {}),
    ...(e.daten.ort ? { locationCreated: { '@type': 'Place', name: e.daten.ort } } : {}),
  };
}

/** Schema.org für eine Übersichtsseite (Liste der Einträge) */
export function uebersichtSchema(id: BausteinId, site: URL | string, eintraege: Eintrag[]) {
  const texte = uebersichtTexte(id);
  return {
    '@context': 'https://schema.org',
    '@type': id === 'blog' ? 'Blog' : 'CollectionPage',
    name: texte.titel,
    url: absolut(baustein(id).url, site),
    ...(texte.seoBeschreibung ? { description: texte.seoBeschreibung } : {}),
    publisher: organisation(site),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: eintraege.map((e, i) => ({ '@type': 'ListItem', position: i + 1, url: absolut(e.url, site), name: e.titel })),
    },
  };
}

/* ---------- llms.txt ---------- */

/** Markdown-Abschnitte aller aktiven Bausteine für src/pages/llms.txt.ts */
export async function llmsAbschnitte(site: URL | string): Promise<string> {
  const teile: string[] = [];
  for (const b of aktiveBausteine()) {
    const eintraege = await getEintraege(b.id);
    const texte = uebersichtTexte(b.id);
    const zeilen = [`## ${b.name}`, '', `- [${texte.titel}](${absolut(b.url, site)}): ${texte.seoBeschreibung}`];
    for (const e of eintraege) {
      const info =
        b.id === 'events' && e.termin
          ? `${e.termin.text}${e.daten.ortName ? `, ${e.daten.ortName}` : ''}${e.termin.vergangen ? ' (vergangen)' : ''}${e.termin.abgesagt ? ' (abgesagt)' : ''}`
          : e.datum
            ? datumDE(e.datum)
            : '';
      zeilen.push(`- [${e.titel}](${absolut(e.url, site)})${info ? ` – ${info}` : ''}${e.kurztext ? `: ${e.kurztext}` : ''}`);
    }
    teile.push(zeilen.join('\n'));
  }
  return teile.join('\n\n');
}

/* ---------- Häufige Fragen aller Seiten (für llms.txt) ---------- */

const seitenDateien = import.meta.glob<{
  default: { veroeffentlicht?: boolean; faq?: { fragen?: { frage?: string; antwort?: string }[] } };
}>(
  '/src/data/seiten/*.json',
  { eager: true },
);

/**
 * Ist die Seite src/data/seiten/<name>.json veröffentlicht? Fehlt die Datei oder der Schalter
 * „veroeffentlicht“, gilt sie als veröffentlicht. Für Menü, Footer und Verlinkungen:
 *   {seiteVeroeffentlicht('aktion') && <a href="/aktion/">Aktion</a>}
 * Seiten im Entwurf werden so nirgends verlinkt (ihre Adresse gibt es öffentlich nicht).
 */
export function seiteVeroeffentlicht(name: string): boolean {
  return seitenDateien[`/src/data/seiten/${name}.json`]?.default?.veroeffentlicht !== false;
}

/** Markdown-Abschnitt mit allen FAQ-Fragen aus src/data/seiten/*.json (Feld „faq“) – leer, wenn es keine gibt.
 *  Seiten im Entwurf („veroeffentlicht“: false) werden übersprungen. */
export function llmsHaeufigeFragen(): string {
  const fragen = Object.values(seitenDateien)
    .filter((d) => d.default?.veroeffentlicht !== false)
    .flatMap((d) => d.default?.faq?.fragen ?? [])
    .map((f) => ({ frage: f.frage?.trim() ?? '', antwort: f.antwort?.trim() ?? '' }))
    .filter((f) => f.frage && f.antwort);
  if (!fragen.length) return '';
  return ['## Häufige Fragen', ...fragen.map((f) => `### ${f.frage}\n\n${f.antwort}`)].join('\n\n');
}

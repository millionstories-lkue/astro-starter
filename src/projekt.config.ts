/**
 * Projekt-Einstellungen – PRO KUNDE ANPASSEN
 *
 * Hier stehen der Firmenname und die Schalter für die CMS-Bausteine.
 * Ein Baustein erzeugt nur Seiten, wenn `aktiv: true` gesetzt ist.
 *
 *   pfad      Adresse der Übersicht, z. B. 'referenzen' → /referenzen/ und /referenzen/<eintrag>/
 *             (Kleinbuchstaben, Bindestrich, keine Umlaute; darf keiner anderen Seite gleichen)
 *   name      Anzeigename (Navigation, Überschrift-Vorgabe, Brotkrumen), z. B. 'Referenzen'
 *   einzahl   Bezeichnung eines Eintrags, z. B. 'Projekt', 'Artikel', 'Termin'
 *   tagFilter Filter-Knöpfe über der Übersicht anzeigen (nur sinnvoll bei mehreren Tags)
 */
export const projekt = {
  /** Firmen- bzw. Markenname (Seitentitel, Schema.org, llms.txt) */
  firmenname: 'Kundenname',

  /**
   * Schriften vorab laden (schnellerer Seitenaufbau): Dateinamen aus src/assets/fonts/,
   * höchstens 2 – meist Fließtext und Überschrift, z. B. ['inter-latin-400.woff2', 'inter-latin-700.woff2'].
   * Leer lassen, solange die Systemschrift genutzt wird.
   */
  schriftenVorladen: [] as string[],

  /**
   * Angaben zum Unternehmen für Google und KI-Suche (Schema.org). Erscheinen automatisch auf jeder Seite
   * und werden mit Beiträgen, Projekten, Terminen und häufigen Fragen verknüpft (src/lib/schema.ts).
   * Nur Angaben eintragen, die auch sichtbar auf der Website stehen. Leere Felder werden weggelassen.
   */
  unternehmen: {
    /** 'Organization' oder passender LocalBusiness-Untertyp, z. B. 'ProfessionalService', 'Bakery', 'Dentist' */
    typ: 'Organization',
    /** Offizieller Name, falls anders als firmenname (z. B. „Muster GmbH“) */
    rechtsname: '',
    /** Ein bis zwei Sätze: Leistung, Ort/Region, Zielgruppe */
    beschreibung: '',
    /** Logo als Pfad in public/ (PNG oder JPG, mindestens 112 × 112 px), z. B. '/logo.png' */
    logo: '',
    email: '',
    telefon: '',
    /** Einzugsgebiet, z. B. ['Mannheim', 'Ludwigshafen', 'Rhein-Neckar'] */
    gebiet: [] as string[],
    /** Google-Unternehmensprofil, Instagram, LinkedIn … (vollständige Adressen mit https://) */
    profile: [] as string[],
    /** Nur bei echtem Standort mit Publikumsverkehr, sonst null: { strasse: '…', plz: '…', ort: '…' } */
    adresse: null as null | { strasse: string; plz: string; ort: string; land?: string },
  },

  /**
   * Personen (Team, Autorinnen und Autoren von Beiträgen). Steht ein Name hier genau so wie im
   * CMS-Feld „Autor/in“, erscheinen Rolle und Profile automatisch beim Beitrag.
   * Beispiel: { name: 'Lena Kühnle', rolle: 'Webdesignerin & Fotografin', bild: '/team/lena.jpg', profile: ['https://…'] }
   */
  personen: [] as { name: string; rolle?: string; bild?: string; profile?: string[] }[],

  bausteine: {
    portfolio: { aktiv: false, pfad: 'portfolio', name: 'Portfolio', einzahl: 'Projekt', tagFilter: false },
    blog: { aktiv: false, pfad: 'blog', name: 'Blog', einzahl: 'Beitrag', tagFilter: false },
    events: { aktiv: false, pfad: 'events', name: 'Termine', einzahl: 'Termin', tagFilter: false },
  },
} as const;

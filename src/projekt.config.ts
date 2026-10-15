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

  bausteine: {
    portfolio: { aktiv: false, pfad: 'portfolio', name: 'Portfolio', einzahl: 'Projekt', tagFilter: false },
    blog: { aktiv: false, pfad: 'blog', name: 'Blog', einzahl: 'Beitrag', tagFilter: false },
    events: { aktiv: false, pfad: 'events', name: 'Termine', einzahl: 'Termin', tagFilter: false },
  },
} as const;

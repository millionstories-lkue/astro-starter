# Was ist neu im Starter

Die Versionsnummer steht auch in `package.json` („version“). So ist bei jeder Kundenseite sichtbar,
auf welchem Stand sie ist. Beim Nachziehen einer Kundenseite einfach alle Punkte seit ihrer Version übernehmen.
Neue Einträge immer oben anfügen.

## 1.5.3 – 19.11.2026 · SEO-Prüfung: Zierbilder richtig erkennen

- **`src/integrations/seo-pruefung.mjs`:** Astro schreibt beim Verkleinern des HTML ein leeres `alt=""` (Zierbild)
  als bloßes `alt`. Die Prüfung hat das als „Bild ohne alt-Angabe“ gemeldet – auf millionstories.de 62 falsche
  Fehler. Jetzt zählt `alt` ohne Wert korrekt als leere Beschreibung.

Geänderte Dateien: `src/integrations/seo-pruefung.mjs`, `docs/tech-context.md`, `package.json`, `CHANGELOG.md`.
Kundenprojekte nachziehen: `src/integrations/seo-pruefung.mjs` ersetzen (alle Projekte ab 1.5.0).

## 1.5.2 – 19.11.2026 · Arbeitsdateien nicht bei Google

- **`public/.htaccess`:** `/seo-pruefung.json`, `/seitenstand.json` und `/indexnow.json` bekommen den Header
  `X-Robots-Tag: noindex, nofollow`. Sie bleiben lesbar (für Claude beim SEO-GEO-Check und für den nächsten Build),
  erscheinen aber nicht in Suchergebnissen.

Geänderte Dateien: `public/.htaccess`, `docs/tech-context.md`, `package.json`, `CHANGELOG.md`.
Kundenprojekte nachziehen: `public/.htaccess` ersetzen.

## 1.5.1 – 19.11.2026 · Search Console über GitHub bestätigen

- **SEO-Start ohne IONOS-Konto des Kunden:** Die Google Search Console wird jetzt immer als „URL-Präfix“ mit einer
  Bestätigungsdatei `public/google….html` im Kunden-Repo bestätigt (Tech-Context Punkt 10, SEO-Start Schritt 4;
  Punkt 0 nennt die Datei bei den Dateien pro Kunde). Der TXT-Eintrag bei IONOS entfällt.
- **SEO-Prüfung:** überspringt HTML-Dateien ohne `<html>` (z. B. die Google-Bestätigungsdatei) – vorher wurden sie
  als Seite ohne Titel und H1 gemeldet.

Geänderte Dateien: `src/integrations/seo-pruefung.mjs`, `docs/tech-context.md`, `README.md`, `package.json`, `CHANGELOG.md`.
Kundenprojekte nachziehen: `src/integrations/seo-pruefung.mjs` ersetzen (nur nötig, wenn dort eine Google-Datei liegt).

## 1.5.0 – 18.11.2026 · SEO-Feinschliff: Sprachversionen, Termine, CMS-Hilfen und SEO-Prüfung

Sichtbar ändert sich auf der Website nichts – nur im CMS (Zeichenzähler, Hinweise in der Mediathek).

- **Sprachversionen automatisch verknüpft (hreflang):** Gibt es eine Seite in mehreren Sprachen unter gleichem
  Unterpfad (/kontakt/, /it/kontakt/ …), verknüpft der Build sie im Seitenkopf (`<link rel="alternate" hreflang>`,
  x-default = Hauptsprache) und in der Sitemap. Erkannt an `<html lang>`. Einsprachige Websites: keine Änderung.
- **Termine für Google vollständig:** Der Preis aus dem Feld „Preis“ („49 €“, „ab 19,50 €“, „kostenlos“) steht jetzt
  als Angebot mit Betrag und Währung in den strukturierten Daten – auch ohne Anmeldelink.
- **Bessere Google-Texte bei CMS-Einträgen:** Ohne Kurzbeschreibung nimmt die Seite den Anfang des Textes (ohne
  Zwischenüberschriften, am Satzende gekürzt) statt „Titel – Firmenname“. Ist „Titel | Firmenname“ länger als
  60 Zeichen, steht nur der Titel im Seitentitel. Neue Hilfen `seoTitel()`, `seoBeschreibung()`, `preisAusText()`
  in `src/lib/bausteine.ts`.
- **CMS: Zeichenzähler** unter „Titel für Google“, „Beschreibung für Google“ und „Kurzbeschreibung“ (grün = passt,
  orange = Google schneidet ab).
- **Mediathek:** verwendete Bilder ohne Beschreibung tragen die Marke „ohne Beschreibung“; neuer Filter
  „Nur ohne Beschreibung“.
- **Neu: SEO-Prüfung beim Build** (`src/integrations/seo-pruefung.mjs`): prüft alle Seiten auf fehlende oder doppelte
  Titel und Beschreibungen, H1, Bilder ohne alt, kaputte interne Links, Platzhaltertexte und lesbare strukturierte
  Daten. Ergebnis unter `https://<domain>/seo-pruefung.json` und im Build-Protokoll. Bricht den Build nie ab.
- **Anleitung (docs/tech-context.md):** Punkt 10 um Zahlen mit Quelle und Jahr, zitierbare Gliederung, interne
  Verlinkung, Handlungsaufforderung, SEO-Prüfung und „Nach dem Livegang“ (Skill „seo-geo-check“) ergänzt; Punkt 9f
  hreflang; Punkt 8 Prüfung vor der Lieferung; Anhang A/B aktualisiert.
- **SEO-Start in der Anleitung:** Punkt 10 „Nach dem Livegang“ beschreibt jetzt Schritt für Schritt den SEO-Start
  (Live-Grundcheck, Rich-Results-Test, PageSpeed, Search Console mit Bestätigung über IONOS-DNS, Sitemap, Bing-Import,
  IndexNow, Google-Unternehmensprofil) und die Regeln für SEO-GEO-Check und KI-Check auf Abruf: KI-Sichtbarkeit (Top 10 aus dem Search-Console-
  Bericht „Generative KI“ und Bings „AI Performance“) und KI-Stichprobe mit festem Fragenkatalog in ChatGPT,
  Perplexity und Google, Verlauf im Dokument „seo-geo“ des Kundenprojekts. Punkte 1, 2, 9a und 9e ergänzt.

Geänderte Dateien: `src/integrations/seo-pruefung.mjs` (neu), `src/integrations/sitemap.mjs`, `src/lib/bausteine.ts`,
`src/pages/[bereich]/[eintrag].astro`, `public/admin/cms-anpassungen.js`, `public/admin/mediathek.js`,
`astro.config.mjs`, `README.md`, `docs/tech-context.md`, `package.json`, `CHANGELOG.md`.
Kundenprojekte nachziehen: alle Dateien außer `astro.config.mjs` übernehmen. In der eigenen `astro.config.mjs`
die Zeile `import seoPruefung from './src/integrations/seo-pruefung.mjs';` ergänzen und `seoPruefung()` als
letzte Integration anhängen. In `public/admin/index.html` die Versionsnummern hochzählen
(`mediathek.js?v=6`, `cms-anpassungen.js?v=5`). Bei Terminen in `config.yml` die neuen Hinweise an
„Kurzbeschreibung“ und „Preis“ übernehmen (Anhang B, freiwillig). Mehrsprachige Seiten mit eigenen
hreflang-Links im Kopf: diese entfernen, damit der Build sie einheitlich setzt.

## 1.4.0 – 17.11.2026 · Strukturierte Daten für Google und KI-Suche verknüpft

Rein technisch – sichtbar ändert sich auf der Website nichts.

- **Verknüpfte strukturierte Daten (Schema.org):** Jede Seite enthält jetzt automatisch Website, Unternehmen
  und die Seite selbst, mit festen Kennungen (`#website`, `#unternehmen`, `<adresse>#webseite`). Beiträge,
  Projekte, Termine, Übersichten und häufige Fragen verweisen darauf (Herausgeber, Urheber, Veranstalter).
  So erkennen Google und KI-Systeme eindeutig, wer hinter den Inhalten steht.
- **Neu in `src/projekt.config.ts`:** `unternehmen` (Typ, Beschreibung, Logo, E-Mail, Telefon, Einzugsgebiet,
  Profile, Adresse) und `personen` (Name, Rolle, Foto, Profile). Steht der Name einer Person genau so im
  CMS-Feld „Autor/in“, erscheinen Rolle und Profile automatisch beim Beitrag. Ohne diese Angaben (ältere
  Projekte) funktioniert alles wie bisher.
- **Neu: `src/lib/schema.ts`** mit Hilfen für eigene Seiten (z. B. Leistungsseiten, Team auf der Startseite):
  `unternehmenRef()`, `unternehmenSchema()`, `personSchema()`, `schemaId`.
- **Sitemap mit „zuletzt geändert“ (lastmod):** Das Datum ändert sich nur, wenn sich der Inhalt einer Seite
  wirklich ändert (Titel, Beschreibung oder Hauptbereich) – nicht bei Änderungen an Kopf-, Fußbereich oder
  Gestaltung. Dasselbe Datum steht als „dateModified“ in den strukturierten Daten der Seite. Der Stand liegt
  im Bilder-Zwischenspeicher und als `/seitenstand.json` auf der Website.
- **Social-Media-Vorschauen:** Website-Name (`og:site_name`); Beiträge und Projekte als Artikel mit Datum
  (`article:published_time`, `article:modified_time`). BaseLayout hat dafür die neue, freiwillige Prop `artikel`.
- **Häufige Fragen:** feste Kennung (`<adresse>#faq`) und Verknüpfung mit der Seite.

Geänderte Dateien: `src/lib/schema.ts` (neu), `src/layouts/BaseLayout.astro`, `src/lib/bausteine.ts`,
`src/integrations/sitemap.mjs`, `src/pages/[bereich]/[eintrag].astro`, `src/components/Faq.astro`,
`src/projekt.config.ts`, `package.json`, `CHANGELOG.md`.
Kundenprojekte nachziehen: alle Dateien außer `projekt.config.ts` und `Faq.astro` übernehmen; in der
eigenen `projekt.config.ts` die Blöcke `unternehmen` und `personen` ergänzen und in der eigenen `Faq.astro`
die zwei Zeilen `@id` und `isPartOf` im Schema. Gibt die Startseite schon selbst ein Unternehmen aus
(Organization/LocalBusiness), diese Angaben in `unternehmen` übernehmen und auf der Startseite entfernen
oder per `@id` auf `#unternehmen` verweisen – sonst gibt es das Unternehmen doppelt.

## 1.3.0 – 16.11.2026 · Mediathek: Bildbeschreibungen in allen Sprachen

- **Mehrsprachige Bildbeschreibungen in der Mediathek:** Ist die Website mehrsprachig (`i18n` mit `locales` in
  `config.yml`), zeigt das Bildfenster der Mediathek unter der Beschreibung der Hauptsprache je weitere Sprache
  ein eigenes Feld. Gespeichert wird in `src/data/medien.json` unter `alt_sprachen`
  (`{ "it": { "<bildpfad>": "…" }, "en": { … } }`). Leere Felder = die Beschreibung der Hauptsprache gilt.
  Beim Löschen eines Bildes werden alle Sprachen mit entfernt. Einsprachige Websites: keine Änderung.
- `src/lib/cms-bild.ts`: `cmsAlt(pfad, alt, sprache)` – neue, freiwillige dritte Angabe `sprache`
  (z. B. `'it'`). Bisherige Aufrufe funktionieren unverändert.
- **CMS-Menü:** Bereiche mit nur einer Datei (z. B. „Kontakt & Öffnungszeiten“) öffnen beim Klick direkt die
  Bearbeitung statt einer Liste mit einem Eintrag. Abschalten pro Bereich mit `direkt_oeffnen: false`.

Geänderte Dateien: `public/admin/mediathek.js`, `public/admin/cms-anpassungen.js`, `src/lib/cms-bild.ts`,
`package.json`, `CHANGELOG.md`. In Kundenprojekten `admin/index.html` die Versionsnummern
(`mediathek.js?v=…`, `cms-anpassungen.js?v=…`) hochzählen, damit Browser die neuen Dateien laden.

## 1.2.2 – 16.11.2026 · Sprunglink und Menüknopf in der Sprache der Seite

- `src/layouts/BaseLayout.astro`: Der Link „Zum Inhalt springen“ folgt der Eigenschaft `lang`
  (Italienisch „Vai al contenuto“, Englisch „Skip to content“, Französisch „Aller au contenu“).
- `src/lib/menue.ts`: Die Beschriftung „Menü öffnen/schließen“ des mobilen Menüknopfs folgt `<html lang>`.
- Für deutsche Seiten ändert sich nichts.

Geänderte Dateien: `src/layouts/BaseLayout.astro`, `src/lib/menue.ts`, `package.json`, `CHANGELOG.md`.

## 1.2.1 – 16.11.2026 · Formulare: Fehlermeldungen in der Sprache der Seite

- `src/lib/formular-pruefung.ts` zeigt die Fehlermeldungen am Feld und die Zusammenfassung („Bitte prüfen Sie …“)
  in der Sprache der Seite (`<html lang>`): Deutsch, Italienisch oder Englisch. Eigene Texte über `data-fehler`
  gehen wie bisher vor. Für deutsche Seiten ändert sich nichts.

Geänderte Dateien: `src/lib/formular-pruefung.ts`, `package.json`, `CHANGELOG.md`.

## 1.2.0 – 16.11.2026 · CMS: Entwürfe auch für eigene Sammlungen und mehrsprachige Inhalte

- **„Als Entwurf kopieren“ auch für JSON-Sammlungen:** Eigene Sammlungen im JSON-Format (z. B. Pakete, Termine,
  Produkte) bekommen in der Übersicht den Kopier-Knopf, sobald sie in `config.yml` einen `vorschau_pfad` haben.
  Sammlungen ohne Vorschau (z. B. Weiterleitungen) weiterhin ohne Knopf.
- **Mehrsprachige Inhalte** (Decap-Sprachmodus `single_file`, Datei `{ "de": {…}, "it": {…} }`): Die Entwurfsleiste
  liest „Veröffentlicht“ aus dem Block der Hauptsprache (`default_locale`) und blendet das Feld in jeder Sprachspalte aus.
  Eine Kopie wird in allen Sprachen zum Entwurf; der neue Titel gilt für die Hauptsprache, in den anderen Sprachen
  fällt der alte Titel weg (bis zur Übersetzung zeigt die Website den Titel der Hauptsprache).
- `seiteVeroeffentlicht()` und die häufigen Fragen in der `llms.txt` (`src/lib/bausteine.ts`) verstehen mehrsprachige
  Seitendateien (Block `de`).
- **BaseLayout:** neue Eigenschaft `lang` (Standard `'de'`) für `<html lang>` und `og:locale` – Grundlage für
  italienische oder englische Seiten.
- In der Vorlage für `public/admin/index.html` (Tech-Context) steht jetzt `entwuerfe.js?v=7`.

Geänderte Dateien: `public/admin/entwuerfe.js`, `src/lib/bausteine.ts`, `src/layouts/BaseLayout.astro`,
`public/admin/index.html` (nur `?v=7`), `package.json`, `CHANGELOG.md`.

## 1.1.1 – 30.10.2026 · CMS: neue Einträge sind sofort Entwürfe

- **Fehler behoben:** Bei einem neu angelegten Eintrag (z. B. neues Projekt, neue Galerie) fehlte die Entwurfsleiste
  unten links und es erschien noch der alte Schalter „Veröffentlicht“. Die Leiste erscheint jetzt sofort,
  der Eintrag startet als Entwurf. Der Vorschaulink kommt nach dem ersten „Speichern“.
- In der Vorlage für `public/admin/index.html` (Tech-Context) steht jetzt `entwuerfe.js?v=6`,
  damit Browser die neue Fassung laden.

Geänderte Dateien: `public/admin/entwuerfe.js`, `public/admin/index.html` (nur `?v=6`), `package.json`, `CHANGELOG.md`.

## 1.1.0 – 26.10.2026 · Ladezeit (PageSpeed)

- **Zwischenspeicher im Browser:** neue Datei `public/.htaccess`. Bilder, Schriften und Skripte aus `/_astro/`
  bleiben 1 Jahr im Browser, Seiten und CMS werden immer frisch geholt.
- **CSS direkt in der Seite** (`astro.config.mjs` → `build.inlineStylesheets`): kein Warten auf eine CSS-Datei.
- **Schriften** liegen jetzt in `src/assets/fonts/` statt `public/fonts/` (mit Versionsstempel) und die wichtigsten
  Schnitte werden vorab geladen (Liste `schriftenVorladen` in `src/projekt.config.ts`).
- **Bilder:** feinere Größenstufen in Karte, Fotos und Detail. Jedes Gerät bekommt das kleinste Bild, das noch
  scharf ist (auch auf Retina-Bildschirmen). Die Bildqualität bleibt unverändert.

Geänderte Dateien: `astro.config.mjs`, `public/.htaccess` (neu), `src/layouts/BaseLayout.astro`,
`src/projekt.config.ts`, `src/styles/global.css`, `tailwind.config.mjs`, `src/components/bausteine/Karte.astro`, `Fotos.astro`, `Detail.astro`,
`package.json`, `CHANGELOG.md` (neu).

## 1.0.0 – Oktober 2026 · Grundstand

Astro + Tailwind für IONOS Deploy Now, Formular-Hub, Decap CMS mit Mediathek und Galerie,
Bausteine (Portfolio, Blog, Termine), Entwürfe mit privater Vorschau im CMS, Weiterleitungen,
Barrierefreiheit (WCAG 2.2 AA) mit Bewegungs-Hilfen, Sitemap, IndexNow, llms.txt.

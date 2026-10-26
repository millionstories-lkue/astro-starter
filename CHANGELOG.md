# Was ist neu im Starter

Die Versionsnummer steht auch in `package.json` („version“). So ist bei jeder Kundenseite sichtbar,
auf welchem Stand sie ist. Beim Nachziehen einer Kundenseite einfach alle Punkte seit ihrer Version übernehmen.
Neue Einträge immer oben anfügen.

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

<!-- Technisches Manifest für den Claude-Skill „website-astro“. Gehört zur Starter-Version in package.json.
Bei jeder Starter-Änderung mit aktualisieren. „Teil 0“ = Arbeitsweise im Skill (Starter-Code lesen, create-website, Formulare). -->

Technisches Manifest & Umgebungsspezifikationen
(Astro + IONOS Deploy Now + GitHub Workflow) · passend zu Starter-Version 1.5.0

KURZÜBERBLICK – die Regeln, die IMMER gelten (Details in den Punkten darunter)
1. Basis ist der Starter (Punkt 0). Nur anpassbare und neue Dateien liefern, immer vollständig, Ausgangscode aus dem Starter-Repo (Teil 0, „Starter-Code lesen“).
2. Lieferung als ZIP mit Checkliste in einfacher Sprache (Punkt 8). Vorher prüfen: Build, Barrierefreiheit (Punkt 11), Ladezeit (Punkt 12).
3. Bilder nur über <Image /> aus astro:assets mit widths und sizes passend zur angezeigten Größe – Qualität nie senken (Punkt 4, 12).
4. Schriften nur lokal als woff2 in src/assets/fonts/, die wichtigsten vorab laden (Punkt 4).
5. Animationen nur über transform und opacity, Daueranimationen enden nach 5 s (Punkt 11, 12).
6. Formulare nur über Kontaktformular.astro bzw. formhub-client.js, Hub-Eintrag mitliefern (Punkt 7).
7. CMS: pflegbare Inhalte als Dateien in src/data/, Entwürfe und Weiterleitungen sind fertig im Starter (Punkt 9).
8. SEO/GEO und llms.txt auf jeder Seite (Punkt 10). Unternehmen und Personen einmal in src/projekt.config.ts eintragen – die strukturierten Daten aller Seiten verknüpfen sich daraus automatisch. Vor jeder ZIP die SEO-Prüfung des Builds (dist/seo-pruefung.json) ansehen: 0 Fehler. Cookie- und trackingfrei, keine externen Dienste. Ca. 1 Woche nach dem Livegang der SEO-Start (Search Console, Bing, Sitemap – Punkt 10, „Nach dem Livegang“), weitere SEO-Checks nur auf Abruf (Skill „seo-check“).

AUFBAU DIESES DOKUMENTS
Teil 1 – Regeln (Nummern bleiben fest, Code und Starter-Referenz verweisen darauf):
  0 Starter-Repo und Dateiliste · 1 Deploy Now · 2 Astro- und Tailwind-Konfiguration · 3 Ordnerstruktur · 4 Bilder und Schriften
  5 BaseLayout · 6 Git · 7 Formulare · 8 ZIP-Lieferung und Checkliste · 9 CMS (9a Bausteine, 9b Ablage und Regeln,
  9c Entwürfe, 9d Weiterleitungen und Relaunch, 9e Mediathek und Galerie, 9f Mehrsprachige Websites) · 10 SEO & GEO (mit SEO-Prüfung, SEO-Start und SEO-Check nach dem Livegang) · 11 Barrierefreiheit · 12 Ladezeit
Teil 2 – Nachschlagen (Vorlagen zum Kopieren):
  Anhang A public/admin/index.html · Anhang B public/admin/config.yml · Anhang C Weiterleitungen in config.yml · Anhang D .github/workflows/indexnow.yaml

══════════════════════════════════════
TEIL 1 – REGELN
══════════════════════════════════════

# 0. Ausgangsbasis: Kunden-Starter-Repo (WICHTIG)
Jedes Kundenprojekt wird aus dem öffentlichen Template-Repo „millionstories-lkue/astro-starter“ erstellt – im eigenen GitHub-Konto des Kunden, veröffentlicht über das eigene IONOS Deploy Now des Kunden. Repo-Name = Kunden-ID.

Starter-Version: steht in package.json („version“) und in CHANGELOG.md („Was ist neu“). Bei Updates bestehender Kundenseiten anhand der Version im Kunden-Repo (package.json) nachsehen, welche Punkte aus CHANGELOG.md fehlen, und nur diese Dateien liefern. Ältere Kundenseiten ohne Versionsnummer gelten als 1.0.0.

Der vollständige Code aller Starter-Dateien steht im öffentlichen Starter-Repo (Teil 0, „Starter-Code lesen“). Anpassbare Dateien IMMER von diesem Code ausgehend als vollständige Datei liefern – nie aus dem Gedächtnis nachbauen. Folgende Dateien existieren BEREITS:

Niemals mitliefern oder verändern:
- package.json, package-lock.json, tsconfig.json, .gitignore
- src/layouts/BaseLayout.astro
- src/integrations/entwuerfe.mjs (entfernt Entwürfe beim Build von der Website; mit ENTWURF_ABLAGE legt es sie für die Vorschau im CMS ab, siehe Punkt 9c)
- public/admin/entwurf.html (Vorschau von Entwürfen, nur für im CMS angemeldete Personen, siehe Punkt 9c)
- .github/workflows/entwuerfe.yaml (baut die Entwürfe und legt sie privat im Repo ab, siehe Punkt 9c)
- src/lib/weiterleitungen.ts, src/pages/[...weiterleitung].astro, src/integrations/weiterleitungen.mjs (Weiterleitungen aus src/data/weiterleitungen/*.json, siehe Punkt 9d)
- src/integrations/sitemap.mjs (erzeugt sitemap.xml und ergänzt robots.txt beim Build; lässt 404-, noindex- und Weiterleitungsseiten automatisch aus; ab 1.4.0 mit „zuletzt geändert“ je Seite, ab 1.5.0 mit automatischer hreflang-Verknüpfung der Sprachversionen, siehe Punkt 10 und 9f; warnt, wenn `site` noch die Platzhalter-Domain ist)
- src/integrations/indexnow.mjs (bereitet beim Build die Liste neuer/geänderter Seiten für IndexNow vor und legt die Schlüssel-Datei an; Schlüssel wird aus der Domain berechnet, siehe Punkt 1)
- src/integrations/seo-pruefung.mjs (ab 1.5.0: prüft nach dem Build Titel, Beschreibungen, H1, Bilder ohne alt, interne Links und Platzhalter aller Seiten und schreibt das Ergebnis nach /seo-pruefung.json, siehe Punkt 10; bricht den Build nie ab)
- src/integrations/bilder-aufraeumen.mjs (entfernt nach dem Build ungenutzte Originalbilder aus dist/_astro – sonst überschreitet die Website schnell das Speicherlimit von Deploy Now, ca. 50 MB im kleinen Paket)
- src/lib/formhub-client.js
- src/lib/schema.ts (ab 1.4.0: strukturierte Daten zentral und verknüpft – Website, Unternehmen, Seite, Personen; Hilfen für eigene Seiten, siehe Punkt 10)
- src/lib/bewegung.ts (Barrierefreiheit: Daueranimationen enden nach max. 5 s sanft, „Bewegung reduzieren“, Hilfen data-bewegung, .einblenden, data-woerter, data-zahl, data-parallax – startet automatisch über BaseLayout, siehe Punkt 11)
- src/lib/formular-pruefung.ts (Fehlermeldungen direkt am Formularfeld, siehe Punkt 7 und 11)
- src/lib/menue.ts (barrierefreies mobiles Menü, Muster in der Datei, siehe Punkt 11)
- src/lib/cms-bild.ts (Bilder aus dem CMS auflösen: cmsBild(); zentrale Bildbeschreibungen: cmsAlt(); Dateien zum Herunterladen: cmsDatei(); siehe Punkt 9)
- src/components/Kontaktformular.astro
- src/components/Rechtstext.astro (Seite für Impressum/Datenschutz, Text aus src/data/rechtstexte/)
- src/lib/bausteine.ts und src/lib/bausteine-schema.ts (Logik und Datenmodell der Bausteine, siehe Punkt 9)
- src/pages/[bereich]/index.astro und src/pages/[bereich]/[eintrag].astro (Seiten der Bausteine)
- src/pages/impressum.astro, src/pages/datenschutz.astro, src/pages/barrierefreiheit.astro, src/pages/404.astro (holen Titel aus src/projekt.config.ts, Text aus src/data/rechtstexte/)
- public/robots.txt
- public/.htaccess (wie lange Browser Dateien zwischenspeichern: /_astro/ 1 Jahr, Seiten und CMS immer frisch, siehe Punkt 12)
- CHANGELOG.md
- public/admin/mediathek.js (Mediathek im CMS: alle Bilder an einem Ort, ersetzt Decaps Bildfeld und Bilder-Fenster, siehe Punkt 9)
- public/admin/cms-anpassungen.js (CMS-Oberfläche: ein einfacher Knopf „Speichern“ ohne Menü – nach dem Speichern „Gespeichert“, Etiketten Veröffentlicht/Entwurf, Feld „tagliste“, siehe Punkt 9)
- public/admin/entwuerfe.js (CMS: Leiste mit Schalter „Veröffentlicht“ und Vorschaulink, „Als Entwurf kopieren“ in der Übersicht, Rückfrage vor dem Offline-Nehmen, siehe Punkt 9c)
- public/admin/galerie-widget.js (CMS-Feld „galerie“: Mehrfach-Upload, Auswahl aus der Mediathek, Sortieren per Ziehen, siehe Punkt 9)
- public/admin/vorschau.js (nur noch für ältere Projekte ohne Mediathek – in neuen Projekten NICHT einbinden)

Pro Kunde ANPASSEN (in der ZIP-Lieferung jeweils als vollständige Datei, siehe Punkt 8):
- astro.config.mjs → `site` auf die Kundendomain setzen (Integrationen tailwind(), entwuerfe(), weiterleitungen(), sitemap(), bilderAufraeumen(), indexnow() und seoPruefung() – in dieser Reihenfolge – sowie cacheDir immer beibehalten)
- tailwind.config.mjs → CI-Farben unter `colors.brand` (DEFAULT, dark, light) und ggf. `fontFamily.sans`
- src/styles/global.css → ggf. @font-face-Regeln für lokale Schriften (Dateien in src/assets/fonts/, Punkt 4) und eigene Klassen; die vorhandenen Barrierefreiheits-Regeln (Fokus, Formularfehler, Bewegung, „Bewegung reduzieren“, lange Wörter) IMMER beibehalten
- src/projekt.config.ts → Firmenname, schriftenVorladen (1–2 Schriftdateien, Punkt 4), unternehmen und personen (strukturierte Daten, Punkt 10) und Schalter der Bausteine (IMMER mitliefern, Ausgangsinhalt unten)
- src/components/Header.astro und src/components/Footer.astro → im Starter nur Platzhalter; IMMER durch Header/Footer im Kundendesign ersetzen (Dateiname und Ort beibehalten, keine Pflicht-Props – sie werden von Impressum, Datenschutz, 404 und den Bausteinen eingebunden). Aktive Bausteine in die Navigation aufnehmen: aktiveBausteine() aus @/lib/bausteine liefert { name, url }. Seiten mit Schalter „Veröffentlicht“ nur verlinken, wenn seiteVeroeffentlicht('<seite>') aus @/lib/bausteine true liefert (Punkt 9c).
- src/components/Faq.astro → Häufige Fragen als Akkordeon inkl. Schema.org FAQPage (siehe Punkt 9b); Gestaltung ans Kundendesign anpassen, Props, <details>-Aufbau und JSON-LD (inkl. @id und isPartOf) beibehalten
- src/data/rechtstexte/impressum.md, datenschutz.md und barrierefreiheit.md → echte Angaben eintragen (Barrierefreiheit: Firmenname, Kontakt, Datum, ggf. bekannte Einschränkungen) (Markdown; Zeilenumbruch innerhalb eines Absatzes mit \ am Zeilenende)
- src/pages/llms.txt.ts → nur Kopfbereich (KOPF), feste Seiten (SEITEN) und Kontakt ausfüllen; Bausteine und FAQ-Fragen aller Seiten werden automatisch ergänzt
- src/content.config.ts → nur ändern, wenn der Kunde eigene Sammlungen braucht (Ausgangsinhalt unten)
- src/components/bausteine/*.astro und src/styles/bausteine.css → nur bei aktiven Bausteinen, Gestaltung ans Kundendesign anpassen (siehe Punkt 9)
- src/pages/index.astro → im Starter nur Platzhalter, wird durch die Startseite ersetzt
- public/favicon.svg → aus Logo/CI-Farbe ableiten
- public/default-og.jpg → Vorschaubild 1200 × 630 px in CI-Farbe mit Logo bzw. Firmenname (mit Code erzeugen)
- public/logo.png → Logo für die strukturierten Daten (PNG, mind. 112 × 112 px, quadratisch oder breit, heller Hintergrund), in projekt.config.ts unter unternehmen.logo eintragen
- .github/workflows/<projekt>-build.yaml → entsteht erst durch Deploy Now; um den Bilder-Zwischenspeicher ergänzen (siehe Punkt 1)

Neu erstellt werden: weitere Seiten in src/pages/ und weitere Komponenten in src/components/.
Nur bei CMS (siehe Punkt 9) zusätzlich: public/admin/index.html, public/admin/config.yml, src/data/… und src/assets/cms/.

Ausgangsinhalt aller anpassbaren Dateien: im Starter-Repo (Teil 0, „Starter-Code lesen“; Teil A = pro Kunde angepasste Dateien). Kurz zu den wichtigsten:
- src/projekt.config.ts: firmenname, schriftenVorladen (Dateinamen aus src/assets/fonts/, z. B. ['inter-latin-400.woff2']; leer bei Systemschrift), unternehmen { typ, rechtsname, beschreibung, logo, email, telefon, gebiet[], profile[], adresse } und personen [{ name, rolle, bild, profile[] }] (beides Punkt 10) und bausteine { portfolio | blog | events: { aktiv, pfad, name, einzahl, tagFilter } } (pfad = Adresse der Übersicht ohne Schrägstriche, Kleinbuchstaben/Bindestrich, darf keiner anderen Seite gleichen; name = Anzeigename; einzahl = Bezeichnung eines Eintrags; tagFilter = Filter-Knöpfe über der Übersicht).
- src/content.config.ts: bindet bausteinCollections ein. Eigene Sammlungen ergänzen: `const team = defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/data/team' }), schema: z.object({ … }) });` (Imports aus 'astro:content' und 'astro/loaders') und `export const collections = { ...bausteinCollections, team };`. Die Namen portfolio, blog, events, rechtstexte sind vergeben.
- tailwind.config.mjs: CI-Farben unter colors.brand (DEFAULT, dark, light), Schrift unter fontFamily.sans.

# 1. IONOS Deploy Now Build-Spezifikationen
- Node.js Version: 20.x oder 22.x (LTS)
- Package Manager: `npm`
- Build Command: `npm run build`
- Output Directory: `dist`
- Deployment Target: Static Site Generation (SSG) / Native Astro Build
- Environment Constraints: Keine Server-Side-Runtime erforderlich (rein statischer Export).
- Viele Bilder verlängern den Build (Astro optimiert jedes Bild beim Build): ca. 900 Fotos ≈ 5–10 Minuten. Fotos vor dem Hochladen auf max. 1800–2000 px verkleinern.
- Schnellere Updates (IMMER bei CMS oder vielen Bildern): In astro.config.mjs steht `cacheDir: './.astro-cache'` (siehe Punkt 2). Zusätzlich in der von Deploy Now angelegten Datei .github/workflows/<projekt>-build.yaml im Job build-project den Schritt „Setup Node“ um `cache: npm` ergänzen und direkt danach diesen Schritt einfügen (sonst nichts an der Datei ändern, v. a. nicht den Schritt „Store deployment content“):
```yaml
      - name: Bilder-Zwischenspeicher laden
        uses: actions/cache@v4
        with:
          path: .astro-cache
          key: astro-bilder-${{ github.sha }}
          restore-keys: |
            astro-bilder-
```
  Gemessen bei ca. 900 Fotos: Bildoptimierung 4,5 Minuten ohne → 7 Sekunden mit Zwischenspeicher. Der Zwischenspeicher enthält außerdem den Stand für IndexNow und für „zuletzt geändert“ in der Sitemap (fehlt er, lädt die Sitemap den Stand von der veröffentlichten Website, /seitenstand.json). Die Datei entsteht erst, wenn das Repo mit Deploy Now verbunden ist: den Benutzer dann bitten, sie hochzuladen (Repo → Ordner .github/workflows → Datei öffnen → „Download raw file“), und sie vollständig zurückgeben. Einspielen am einfachsten im Browser: Datei in GitHub öffnen → Stift-Symbol (Edit) → gesamten Inhalt ersetzen → Commit changes (der Ordner .github ist auf dem Mac nach dem Entpacken unsichtbar).

- IndexNow (IMMER, sobald das Repo mit Deploy Now verbunden ist): meldet nach jedem Veröffentlichen die neuen und geänderten Seiten an Bing & Co. (Grundlage u. a. für die ChatGPT-Suche). Der Build erzeugt /indexnow.json und die Schlüssel-Datei automatisch (src/integrations/indexnow.mjs). Zusätzlich eine eigene Datei .github/workflows/indexnow.yaml mit dem Inhalt aus Anhang D anlegen lassen (nur DOMAIN durch die Domain aus `site` ersetzen). Anleitung für den Benutzer: im Repo Add file → Create new file, als Namen `.github/workflows/indexnow.yaml` eintragen, Inhalt einfügen, Commit changes. Nach dem Verbinden der endgültigen Domain einmal unter Actions → „IndexNow melden“ → Run workflow starten (meldet alle Seiten) – gehört zum SEO-Start (Punkt 10, „Nach dem Livegang“). Kontrolle in den Bing Webmaster Tools unter „IndexNow“.

# 2. Astro- und Tailwind-Konfiguration (astro.config.mjs, tailwind.config.mjs, global.css)
- Output Mode: `output: 'static'` (Default für SSG)
- Bildoptimierung: Nutze das native Astro Assets API (Regeln in Punkt 4).
- Absolute Pfade & Imports: `@/` Aliase für `src/` Komponenten und Assets.
  Der Alias muss in der tsconfig.json eingerichtet sein:
  "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["src/*"] } }
- Trailing Slash Handling: Default (`ignore` oder `never`).

astro.config.mjs: exakt wie in der Starter-Referenz (site, output 'static', cacheDir './.astro-cache', build.inlineStylesheets: 'always', Integrationen tailwind(), entwuerfe(), weiterleitungen(), sitemap(), bilderAufraeumen(), indexnow(), seoPruefung()) – nur `site` anpassen. build.inlineStylesheets: 'always' beibehalten – CSS steht dann direkt in der Seite (Punkt 12).

Wichtig zu global.css: Im Starter ist Tailwind 3 (über @astrojs/tailwind) installiert. `@layer base` / `@layer components` in global.css führt dort zu einem Build-Fehler, weil die @tailwind-Direktiven in einer anderen Datei stehen. Eigene Komponenten-Klassen (z. B. .btn) deshalb ohne @layer schreiben. Nur wenn ein bestehendes Design zwingend @layer braucht (z. B. Übernahme eines Projekts mit Tailwind 4): in astro.config.mjs `tailwind({ applyBaseStyles: false })` setzen und in global.css oben `@tailwind base; @tailwind components; @tailwind utilities;` ergänzen.
Fehlermeldung „The deployment is larger than the allowed quota“ in Deploy Now: Die Website ist zu groß für das Paket. Erst prüfen, ob bilderAufraeumen() eingebunden ist; sonst Galerie-Bildgrößen verringern oder das Deploy-Now-Paket erweitern.

# 3. Ordner- & Dateistruktur Standards
Erstelle Code immer strikt passend zu folgender Projektstruktur:

Plaintext
├── .github/workflows/     # Bauanleitung von Deploy Now (entsteht beim Verbinden, siehe Punkt 1)
├── public/                # Statische Assets (favicon.svg, default-og.jpg, logo.png, robots.txt, .htaccess) – KEINE Schriften
│   └── admin/             # mediathek.js und galerie-widget.js (vorhanden); index.html + config.yml nur bei CMS
├── src/
│   ├── assets/images/     # Optimierte Bilder (für <Image/> Komponente)
│   ├── assets/fonts/      # Lokale Schriften (woff2, bekommen beim Build einen Versionsstempel)
│   ├── assets/cms/        # Bilder aus dem CMS (nur bei CMS)
│   ├── components/        # Astro UI-Komponenten (Kontaktformular, Rechtstext, Faq, Header/Footer-Platzhalter vorhanden)
│   │   └── bausteine/     # Aussehen von Portfolio, Blog, Events (vorhanden, anpassbar)
│   ├── data/              # Pflegbare Inhalte (rechtstexte/ immer; seiten/, bausteine/, listen/, portfolio/, blog/, events/ bei CMS)
│   ├── layouts/           # Globales Seiten-Layout (BaseLayout.astro, vorhanden)
│   ├── lib/               # formhub-client.js, cms-bild.ts, schema.ts, bausteine.ts, bausteine-schema.ts, weiterleitungen.ts, bewegung.ts, formular-pruefung.ts, menue.ts (vorhanden, niemals verändern)
│   ├── pages/             # index, impressum, datenschutz, barrierefreiheit, 404, llms.txt.ts, [bereich]/ (Bausteine)
│   ├── styles/            # global.css, bausteine.css (vorhanden)
│   ├── content.config.ts  # Inhalts-Sammlungen (vorhanden)
│   └── projekt.config.ts  # Firmenname, Unternehmen/Personen, Bausteine an/aus (vorhanden, pro Kunde anpassen)
├── astro.config.mjs       # Astro Konfiguration
├── tailwind.config.mjs    # Tailwind Konfiguration inkl. CI-Farben (brand)
├── package.json           # Abhängigkeiten
└── tsconfig.json          # TypeScript Konfiguration inkl. @/-Alias

# 4. Bild- & Asset-Handling (WICHTIG)
Verwende für lokale Bilder NIEMALS das normale <img>-Tag und NIEMALS Pfade aus dem /public/-Ordner für Inhaltsbilder.

Speichere Bilder in src/assets/images/.

Einbindung ausschließlich via Astro Assets API:

Code-Snippet
---
import { Image } from 'astro:assets';
import myImage from '../assets/images/hero.jpg';
---
<Image alt="Beschreibung" format="webp" height={630} loading="eager" fetchpriority="high" quality="high" src={myImage} width={1200}
  widths={[600, 900, 1200, 1800, 2400]} sizes="100vw" />

Größenstufen (WICHTIG für Ladezeit UND Schärfe): Jedes Bild bekommt `widths` und `sizes`, die zur tatsächlich angezeigten Breite passen. sizes beschreibt die Anzeigebreite je Bildschirm (z. B. "(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) 50vw, 440px"), widths die Stufen bis zur doppelten größten Anzeigebreite (Retina), ca. alle 150–300 px eine Stufe. Der Browser nimmt dann immer die kleinste Stufe, die noch scharf ist. Bildqualität (quality) NIE unter den Standard senken – die Benutzerin legt großen Wert auf scharfe Bilder; gespart wird nur über passende Größen.
Nur das erste große Bild oben (LCP) mit loading="eager" und fetchpriority="high"; alle anderen lazy (Standard).

Fehlende Bilder brechen den Build ab. Importiere deshalb NUR Bilder, die der Benutzer im Chat hochgeladen hat, und lege sie in der ZIP-Datei unter src/assets/images/ ab (sprechende Dateinamen in Kleinbuchstaben, z. B. hero-baeckerei.jpg). Fehlen Fotos, gestalte die Bereiche ohne Bild (Farbflächen, Typografie) und nenne am Ende, welche Fotos später sinnvoll wären. Logo als SVG oder PNG ebenfalls in src/assets/images/; ein SVG-Favicon als public/favicon.svg; für die strukturierten Daten zusätzlich ein PNG-Logo als public/logo.png (Punkt 10).

Schriften (DSGVO und Ladezeit): NIEMALS Google Fonts oder andere Schrift-CDNs einbinden. Schriften als .woff2 lokal in src/assets/fonts/ ablegen (NICHT public/fonts/ – dort gibt es keinen Versionsstempel und Browser dürfen sie nicht lange speichern), @font-face-Regeln mit font-display: swap und RELATIVEM Pfad in src/styles/global.css ergänzen (src: url('../assets/fonts/<datei>.woff2') format('woff2')) und den Namen in tailwind.config.mjs unter fontFamily voranstellen. Die 1–2 wichtigsten Schnitte (Fließtext, Überschrift) in src/projekt.config.ts unter schriftenVorladen eintragen – BaseLayout lädt sie dann automatisch vorab. Möglichst variable Schriften (eine Datei für alle Stärken) und nur latin + latin-ext. Freie Schriften (z. B. Montserrat, Inter) kannst du selbst aus dem npm-Paket „@fontsource-variable/<schrift>“ bzw. „@fontsource/<schrift>“ holen und die .woff2-Dateien (latin und latin-ext) in die ZIP legen – ohne das Paket in package.json einzutragen. Sonst bis zur Lieferung durch den Benutzer die Systemschrift nutzen und Schriftname, Schnitte und exakte Dateinamen nennen (Download z. B. über https://gwfh.mranftl.com).

# 5. Globales Base Layout Grundgerüst (src/layouts/BaseLayout.astro)
Das Layout ist im Starter-Repo vorhanden (dort zusätzlich mit „Zum Inhalt springen“-Link und <main id="inhalt">). Nicht neu ausgeben, sondern in jeder Seite importieren: import BaseLayout from '@/layouts/BaseLayout.astro'; – Header und Footer werden über slot="header" und slot="footer" übergeben: <Header slot="header" /> und <Footer slot="footer" /> (aus src/components/Header.astro bzw. Footer.astro). Der Footer enthält immer Links zu /impressum, /datenschutz und /barrierefreiheit.
Das Layout bringt die Barrierefreiheits-Grundlagen mit (Sprunglink, <main id="inhalt" tabindex="-1">, Klasse „js“ am <html>, src/lib/bewegung.ts) – siehe Punkt 11. Ab 1.4.0 gibt es außerdem auf jeder Seite (außer noindex) automatisch das Grundgerüst der strukturierten Daten aus (Website, Unternehmen, Seite – Punkt 10) sowie og:site_name.
Props: title, description, noindex (optional, NUR für die 404-Seite und kurze Weiterleitungsseiten, Punkt 9c), entwurf (optional: true = Seite ist ein Entwurf und kommt nicht auf die Website, Vorschau nur im CMS, Punkt 9c), lang (optional, ab 1.2.0: Sprache der Seite für <html lang> und og:locale, z. B. 'it' oder 'en'; Standard 'de', Punkt 9f), image (optional, Pfad zu einem Bild in public/ für die Social-Media-Vorschau; Standard /default-og.jpg), artikel (optional, ab 1.4.0: { veroeffentlicht, geaendert } als Datum – Social-Media-Vorschau als Artikel mit article:published_time/modified_time; die Bausteine setzen das für Beiträge und Projekte automatisch, für eigene Beitrags-Sammlungen ebenso übergeben). Für Beitrags-/Galerieseiten kann als image auch der Pfad eines mit getImage() erzeugten Bildes übergeben werden (og.src).
Schema.org (JSON-LD) über den Slot "head" einbinden: <script slot="head" type="application/ld+json" set:html={JSON.stringify(schema)} />
Mehrere Head-Ergänzungen gemeinsam: <Fragment slot="head"> … </Fragment>
Hinweis: Die body-Klasse des Layouts setzt text-slate-900 und bg-white. Andere Grund-Farben in global.css mit `body[class] { color: …; background: …; }` setzen.
Vollständiger Code: src/layouts/BaseLayout.astro im Starter-Repo (Teil 0).

# 6. GitHub Commit & Workflow Konventionen
Wenn du dem Benutzer Schritt-für-Schritt-Anweisungen zum Speichern oder Committen gibst, verwende saubere Git-Commit-Nachrichten (z. B. feat: add about page, fix: update hero styling).

# 7. Formular-Standard (Zentraler API-Hub)
Formulare nutzen KEIN PHP lokal und KEINE eigene fetch()-Logik. Sie senden ausschließlich über das Client-Skript `src/lib/formhub-client.js` (im Starter-Repo vorhanden) an den zentralen Hub `https://forms.millionstories.de/`.

Kontaktformulare: IMMER die vorhandene Komponente verwenden, nicht neu bauen:
---
import Kontaktformular from '@/components/Kontaktformular.astro';
---
<Kontaktformular kundeId="muster-gmbh" />
Optionale Props: formType (Standard 'kontakt'), datenschutzUrl (Standard '/datenschutz'), buttonText.

Andere Formulartypen (z. B. Bewerbung, Anfrage): neue Komponente nach dem Vorbild von Kontaktformular.astro erstellen – gleiches Grundgerüst, gleicher <script>-Block (inkl. formularPruefen(form) VOR verbindeFormular), nur Felder und formType anpassen. Pflichtfelder mit required und einem verständlichen data-fehler="…" (z. B. „Bitte geben Sie Ihren Namen ein.“), Feldrahmen mind. 3:1 Kontrast (z. B. border-slate-500), Checkbox/Radio mind. 24 × 24 px (h-6 w-6, accent-brand), kein focus:outline-none. Soll nach dem Senden statt der Statusmeldung eine eigene Erfolgsansicht erscheinen, verbindeFormular() mit der Option onStatus(status, meldung) aufrufen (keine eigene fetch()-Logik).

Das Client-Skript übernimmt automatisch:
- Abruf eines Spamschutz-Tokens beim Laden der Seite
- JSON-POST aller Formularfelder inkl. Steuerfelder `_kunde_id`, `_form_type`, `_token`, `_honeypot`
- Deaktivieren des Senden-Buttons während des Versands, Statusmeldung, Zurücksetzen nach Erfolg

Regeln für Formularfelder:
- name-Attribute klein, sprechend, OHNE Unterstrich am Anfang (z. B. `name`, `email`, `telefon`, `firma`, `nachricht`). Sie werden in der E-Mail automatisch zur Beschriftung.
- Das E-Mail-Feld heißt immer `email` (type="email", required) – daraus wird das Reply-To.
- Keine Datei-Uploads (vom Hub nicht unterstützt).
- Datenschutz-Checkbox: name="datenschutz", required, mit Link zur Datenschutzerklärung.

Honeypot-Markup (immer exakt so einbauen):
<div class="absolute -left-[9999px]" aria-hidden="true">
  <label for="hp-feld">Bitte leer lassen</label>
  <input type="text" id="hp-feld" name="_honeypot" tabindex="-1" autocomplete="off" />
</div>

Statusmeldung im Formular (Styling über [data-status="success"] und [data-status="error"]):
<p data-formhub-status role="status" aria-live="polite"></p>

Ladezustand: über `button:disabled` stylen (das Skript deaktiviert den Button beim Senden).

Grundgerüst eines Hub-Formulars (Kunde und Formulartyp als data-Attribute):
<form data-formhub data-kunde-id={kundeId} data-form-type="bewerbung" aria-label="Bewerbungsformular">
  … Felder, Honeypot, Button, Statusmeldung …
</form>

<script>
  import { verbindeFormular } from '@/lib/formhub-client.js';
  import { formularPruefen } from '@/lib/formular-pruefung';
  document.querySelectorAll<HTMLFormElement>('form[data-formhub]').forEach((form) => {
    if (form.dataset.formhubVerbunden) return;
    form.dataset.formhubVerbunden = 'true';
    formularPruefen(form); // Fehler am Feld, hält den Versand bis alles stimmt
    verbindeFormular(form, { kundeId: form.dataset.kundeId, formType: form.dataset.formType });
  });
</script>

# 8. Code-Ausgabe für den Upload ins Kunden-Repo (ZIP)
Der Benutzer ist keine Programmiererin und arbeitet nur im Browser. Liefere Code deshalb IMMER als herunterladbare ZIP-Datei:
- Die ZIP enthält ausschließlich neue und geänderte Dateien, in der Ordnerstruktur ab Repo-Wurzel (z. B. src/pages/index.astro, src/components/Header.astro, src/assets/images/logo.svg). KEIN übergeordneter Ordner in der ZIP – nach dem Entpacken liegen direkt src/, public/ usw. darin.
- Jede Datei vollständig. Geänderte Starter-Dateien (astro.config.mjs, tailwind.config.mjs, src/styles/global.css) als komplette Datei mitliefern, basierend auf dem Starter-Inhalt.
- Niemals mitliefern: die in Punkt 0 unter „Niemals mitliefern oder verändern“ genannten Dateien sowie node_modules und dist.
- Vor dem Packen Barrierefreiheit (Punkt 11), Ladezeit (Punkt 12) und SEO-Prüfung (Punkt 10, dist/seo-pruefung.json) prüfen. Erst bei 0 Fehlern liefern; Hinweise der SEO-Prüfung beheben oder in der Checkliste kurz begründen (z. B. „Termin-Seite bewusst kurz“).
- Versteckte Dateien (Name beginnt mit Punkt, z. B. public/.htaccess oder Dateien in .github/) sind auf dem Mac nach dem Entpacken unsichtbar und werden beim Hochladen oft nicht mitgenommen. Solche Dateien zusätzlich als Text in die Checkliste bzw. als <name>-inhalt.txt in die ZIP legen und erklären: im Repo Add file → Create new file → Pfad eintippen → Inhalt einfügen → Commit changes.
- Vor dem Packen prüfen: Jeder Import zeigt auf eine Datei, die in der ZIP oder im Starter-Repo existiert (Dateiliste in Teil 0, „Starter-Code lesen“). Keine unnötigen Dateien (keine Beispiel-, Test- oder Sicherungsdateien, keine leeren Ordner außer src/assets/cms mit mindestens einem Bild).
- Name der ZIP: <kundeId>-<inhalt>.zip, z. B. baeckerei-schmidt-startseite.zip.
- GitHub nimmt im Browser höchstens 100 Dateien pro Upload an. Bei mehr Dateien (z. B. viele Fotos) aufteilen: zuerst eine ZIP mit dem Code, dann Foto-ZIPs mit je höchstens 100 Dateien (gleiche Ordnerstruktur ab Repo-Wurzel, Name <kundeId>-fotos-1-von-N.zip). Hinweis an den Benutzer: immer den Ordner (src bzw. public) ins Upload-Fenster ziehen, nicht einzelne Dateien auswählen – sonst geht die Ordnerstruktur verloren.
- Updates an Kundenseiten mit CMS: Dateien in src/data/ werden im CMS gepflegt. Sollen solche Dateien überschrieben werden, vorher fragen, ob dort seit dem letzten Upload etwas geändert wurde (oder die aktuelle Datei hochladen lassen). Code-Dateien und Inhalts-Dateien dafür in getrennten ZIPs liefern.

Beende jede Lieferung mit einer kurzen Checkliste in einfacher Sprache:
  1. Was die ZIP enthält (eine Zeile pro Datei; bei vielen Dateien zusammengefasst nach Ordnern)
  2. Der PHP-Block für die index.php des Formular-Hubs (falls Formulare enthalten sind) – bietet an, die komplette index.php zu aktualisieren, wenn der Benutzer sie hochlädt
  3. Fotos oder Schriften, die noch fehlen
  4. Ein Satz: „Entpacken, im Repo unter Add file → Upload files hineinziehen, Commit changes.“
  5. Nur bei CMS: die Zeilen für $erlaubte_websites im Anmeldedienst (auth.millionstories.de, Datei index.php: Domain mit und ohne www sowie Deploy-Now-Vorschau-Adresse) und der Hinweis, wer als Redakteur ins Repo eingeladen werden muss. CMS-Adresse: https://<kundendomain>/admin
  6. Nach dem ersten Verbinden mit Deploy Now: um die Workflow-Datei bitten, um den Bilder-Zwischenspeicher einzubauen, und die Datei .github/workflows/indexnow.yaml mit der Kundendomain liefern (beides Punkt 1). Bei CMS prüfen, ob .github/workflows/entwuerfe.yaml im Repo ist (kommt mit dem Starter, Punkt 9c). Nach dem Livegang: auf den Skill „seo-check“ hinweisen (Befehl „seo-start“: Search Console, Bing Webmaster Tools, Sitemap einreichen, erster Check – Punkt 10, „Nach dem Livegang“).
Bei Fehlermeldungen aus Deploy Now: Ursache in einem Satz erklären und eine korrigierte ZIP liefern.
Relaunch: Die alten Adressen gehören als Weiterleitungen in die erste Lieferung (Punkt 9d).

# 9. CMS (Decap) und Bausteine
Grundprinzip: Pflegbare Inhalte liegen als Dateien im Repo. Decap CMS (unter /admin) bearbeitet sie über GitHub, jede Speicherung ist ein Commit, Deploy Now veröffentlicht automatisch (ca. 1–2 Minuten mit Bilder-Zwischenspeicher, siehe Punkt 1). Kein Server, keine Datenbank, keine neuen npm-Pakete (package.json bleibt unverändert).

Bei CMS IMMER pflegbar: Texte und Bilder der Seiten (Seitentexte) sowie Impressum, Datenschutz und Barrierefreiheit (Rechtstexte). Zusätzlich je nach Schritt 2 die Bausteine Portfolio, Blog, Events. Feldnamen und Beschriftungen auf Deutsch, mit kurzen Hinweisen (hint) in einfacher Sprache. Im CMS heißt der Bereich für Seiten „Seiten“ (nicht „Seitentexte“), damit klar ist, dass auch Bilder dazugehören.

Anmeldung: zentraler Anmeldedienst https://auth.millionstories.de (GitHub-OAuth). Das Repo liegt im eigenen GitHub-Konto des Kunden (Kontoname in Schritt 2 erfragt). Wer Inhalte pflegt, meldet sich mit diesem Konto an oder ist als Collaborator ins Repo eingeladen.

## 9a. Bausteine (Portfolio, Blog, Events) – fertig im Starter
Portfolio (auch als „Referenzen“, „Galerien“, „Projekte“), Blog und Events (Termine) sind im Starter fertig eingebaut: Übersichtsseite, Unterseite pro Eintrag, Tags mit Liste, Sortierung, „Veröffentlicht“-Schalter, Brotkrumen, Schema.org (BlogPosting, Event, CreativeWork/ImageGallery, BreadcrumbList – ab 1.4.0 mit dem Unternehmen verknüpft, Punkt 10), Sitemap und llms.txt. Diese Logik NICHT neu bauen.

Aktivieren:
1. In src/projekt.config.ts `aktiv: true` setzen, pfad und name passend zum Kunden wählen (z. B. Portfolio als „Referenzen“ unter /referenzen).
2. config.yml: Sammlung, Übersichtstexte und Tag-Liste aus der Vorlage unten übernehmen; label = name aus projekt.config.ts. Zusatzfelder (# optional), die der Kunde nicht braucht, entfernen.
3. Inhalte vorbefüllen: src/data/bausteine/<baustein>.json (Übersichtstexte), src/data/listen/<baustein>-tags.json, 1–2 echte oder Beispiel-Einträge (Beispiele mit veroeffentlicht: false). In jeder .md-Datei `veroeffentlicht` IMMER ausdrücklich setzen (fehlt es, zeigt das CMS den Schalter als „aus“ und speichert beim nächsten Mal false).
4. Header-Navigation: aktiveBausteine() nutzen. Startseite: optional Vorschau mit `<NeuesteEintraege baustein="blog" anzahl={3} ueberschrift="Aktuelles" />` (import aus @/components/bausteine/NeuesteEintraege.astro; Events zeigt die nächsten Termine; erscheint nur, wenn es Einträge gibt).
5. Gestaltung: Die Komponenten in src/components/bausteine/ sind schlicht und nutzen brand-Farben. Ans Kundendesign anpassen, indem du sie als vollständige Datei NEU schreibst – mit denselben Props und Daten (siehe unten). Aufbau, Reihenfolge, Klassen und Texte sind frei.
Ausgeschaltete Bausteine erzeugen keine Seiten; ihre Dateien bleiben einfach ungenutzt im Repo.

Dateien:
- src/data/portfolio/, src/data/blog/, src/data/events/: je Eintrag eine .md-Datei (Dateiname = Adresse). Fehlt der Ordner, ist der Baustein leer (kein Fehler).
- src/data/bausteine/<portfolio|blog|events>.json: { titel, einleitung, seoTitel, seoBeschreibung, leerText } (alles optional außer titel).
- src/data/listen/<portfolio|blog|events>-tags.json: { "tags": [ { "name": "…" } ] }. Nur Tags, die in dieser Liste stehen, erscheinen auf der Website.
- Bilder: src/assets/cms/<baustein>/<dateiname-des-eintrags>/

Datenmodell (src/lib/bausteine-schema.ts, Felder in config.yml müssen dazu passen):
- portfolio: titel, datum (YYYY-MM-DD), veroeffentlicht, tags[], kurztext, titelbild, titelbildAlt (nur Altbestand, nicht im CMS anbieten), bilder[{bild, alt}], optional kunde, ort, leistungen, link, body
- blog: titel, datum, aktualisiert (optional), veroeffentlicht, tags[], kurztext, titelbild, titelbildAlt, bilder, optional autor, body
- events: titel, beginn ("YYYY-MM-DD HH:mm", Ortszeit Deutschland), ende (optional), ganztaegig, veroeffentlicht, abgesagt, tags[], kurztext, titelbild, titelbildAlt, bilder, ortName, adresse, online, preis, anmeldeLink, body
- rechtstexte (impressum.md, datenschutz.md): titel, beschreibung, stand (optional), body
Termine: kommende zuerst (nächster oben), vergangene darunter; ein kleines Skript verschiebt Termine, die seit dem letzten Build vorbei sind, auch ohne neuen Build nach „Vergangene“.

Komponenten in src/components/bausteine/ (anpassbar, Props beibehalten; vollständiger Code im Starter-Repo, Teil 0):
- Uebersicht.astro – Props { id, eintraege }: Brotkrumen, H1 + Einleitung aus uebersichtTexte(id), optional Tag-Filter, Raster (Karte) bzw. Terminliste (TerminKarte, Abschnitte data-termine-kommend / data-termine-vergangen) und das <script> für Filter und vergangene Termine. Beim Neuschreiben die data-Attribute (data-baustein-uebersicht, data-liste, data-tags, data-tag-filter, data-filter, data-filter-status, data-termin, data-endet-um, data-leer) und das Skript übernehmen.
- Karte.astro – Props { eintrag, stufe?, sofortLaden? } (Projekt/Beitrag)
- TerminKarte.astro – Props { eintrag, stufe? }
- Detail.astro – Props { eintrag, vorher?, nachher? }: Fließtext mit `const { Content } = await render(eintrag.eintrag)` (aus astro:content) in einem Element mit class="inhalt"
- Fotos.astro – Props { fotos, ueberschrift? }: Raster + Großansicht (<dialog>)
- NeuesteEintraege.astro – Props { baustein, anzahl?, ueberschrift?, einleitung? }
Daten eines Eintrags (Typ Eintrag aus @/lib/bausteine): baustein, slug, url, titel, kurztext, tags[], titelbild (ImageMetadata, sonst erstes Foto), titelbildAlt, fotos[{src, alt}] (Alt-Text automatisch, wenn leer), datum, aktualisiert, termin { beginn, ende, ganztaegig, vergangen, abgesagt, text (z. B. „Sa, 21.11.2026, 10:00–16:30 Uhr“), endetUm }, daten (alle Rohfelder, z. B. daten.kunde, daten.ortName, daten.preis, daten.anmeldeLink), eintrag (für render()).
Hilfsfunktionen aus @/lib/bausteine: aktiveBausteine(), baustein(id), uebersichtTexte(id), getEintraege(id), neuesteEintraege(id, n), tagListe(id), tagKennung(tag), absaetze(text), datumDE(date), datumISO(date), zeitISO(zeit, ganztaegig); ab 1.5.0 seoTitel(eintrag), seoBeschreibung(eintrag), kuerzen(text, max), preisAusText(text) – auch für eigene Sammlungen (Punkt 10).
src/styles/bausteine.css: Gestaltung des Fließtexts (.inhalt), der Großansicht und [hidden] – darf angepasst werden (vollständige Datei).
Fotoraster (eigene Galerien): Masonry nie mit CSS columns bauen (Reihenfolge läuft dann spaltenweise und weicht von der CMS-Reihenfolge ab), sondern als Grid in Lesereihenfolge (z. B. grid-auto-rows: 4px und per Skript grid-row-end: span N nach Seitenverhältnis).
Keine zufälligen Kennungen (Math.random) in Seiteninhalten – sie ändern sich bei jedem Build und lassen „zuletzt geändert“ (Punkt 10) springen; stattdessen feste oder aus dem Inhalt abgeleitete ids (Fotos.astro des Starters ist dafür berücksichtigt).

## 9b. Ablage und Regeln
- Seitentexte: src/data/seiten/<seite>.json (eine JSON-Datei pro Seite), vorbefüllt mit den aktuellen Texten. In der Seite direkt importieren: import startseite from '@/data/seiten/startseite.json';
- FAQ ist KEIN eigener CMS-Bereich und keine eigene Datei, sondern gehört zur jeweiligen Seite: Objekt "faq" in src/data/seiten/<seite>.json mit { eyebrow, ueberschrift, einleitung, fragen: [{ frage, antwort }] } und im CMS als Objekt-Feld „Häufige Fragen“ im Eintrag dieser Seite (Muster in der Vorlage unten). Mehrere Seiten können je ein eigenes FAQ haben. Ausgabe IMMER mit src/components/Faq.astro (im Starter, gibt Schema.org FAQPage automatisch aus; ohne Fragen erscheint nichts):
  import Faq from '@/components/Faq.astro';
  <Faq eyebrow={seite.faq?.eyebrow} title={seite.faq?.ueberschrift} intro={seite.faq?.einleitung} items={seite.faq?.fragen} />
  Die Fragen landen automatisch in der llms.txt (alle src/data/seiten/*.json mit Feld „faq“). Navigation: Link auf #faq, wenn das FAQ auf der Startseite steht. Ohne CMS dieselbe Ablage nutzen (faq in der Seiten-JSON).
- Rechtstexte: src/data/rechtstexte/impressum.md, datenschutz.md und barrierefreiheit.md (auch ohne CMS die Quelle für Impressum, Datenschutz und die Erklärung zur Barrierefreiheit).
- Eigene Sammlungen (z. B. Team, Leistungen, Pakete, Produkte) nur, wenn kein Baustein passt: src/data/<sammlung>/<slug>.md (Schema in src/content.config.ts) oder als JSON src/data/<sammlung>/<slug>.json (in config.yml format: json, extension: json; im Code per import.meta.glob laden). Bei mehrsprachigen Websites immer JSON (Punkt 9f). Nicht src/content/ verwenden. Jede eigene Sammlung bekommt Schalter „Veröffentlicht“, vorschau_pfad und Vorschau-Adresse nach Punkt 9c.
- Bilder aus dem CMS: src/assets/cms/ – mindestens ein Bild mitliefern (z. B. ein Bild der Startseite), sonst fehlt der Ordner im Repo. Bildreiche Sammlungen bekommen einen eigenen Unterordner pro Eintrag (siehe Vorlage).
- Seitentexte nur mit den Widgets string, text, image, boolean, list, object, select. Mehrere Absätze im text-Widget: in der Seite mit absaetze() aus @/lib/bausteine aufteilen und als <p> ausgeben. Formatierter Text (markdown-Widget) nur im body von Einträgen und Rechtstexten.
- markdown-Widget IMMER mit editor_components: [] (keine Bilder im Fließtext – sie würden den Build abbrechen; Fotos über das Galerie-Feld).
- Optionale Datumsfelder im CMS mit default: '' ; Pflicht-Datumsfelder mit default: '{{now}}' (sonst ist das Feld bei neuen Einträgen leer und Speichern schlägt fehl).
- Tags: pro Baustein eine eigene Liste mit dem Feld `widget: tagliste` (aus cms-anpassungen.js, Option `eintraege` = Ordner der Einträge). Umbenennen und Löschen wird beim Speichern der Liste automatisch in allen Einträgen übernommen; Tags, die in Einträgen stehen, aber nicht in der Liste, werden angezeigt. In den Einträgen Auswahl per relation-Widget (multiple). Gelöschte Tags verschwinden automatisch von der Website.
- Veröffentlicht-Schalter: IMMER als erstes Feld, `default: false` (neue Einträge sind Entwürfe), summary beginnt mit "{{veroeffentlicht | ternary('Veröffentlicht', 'Entwurf')}} · " – cms-anpassungen.js macht daraus grüne/graue Etiketten in der Übersicht. Der Knopf oben heißt dank cms-anpassungen.js „Speichern“.

Bildpfade (WICHTIG, sonst zeigt das CMS keine Bildvorschauen):
- public_folder IMMER ohne Schrägstrich am Anfang (src/assets/cms). Mit Schrägstrich sucht Decap die Vorschau auf der Website statt im Repo – die Vorschau bleibt leer.
- Im Code Bilder IMMER über cmsBild() aus src/lib/cms-bild.ts auflösen (im Starter vorhanden). Die Funktion akzeptiert Pfade mit und ohne Schrägstrich und findet Bilder auch in Unterordnern von src/assets/cms/.
- Alt-Texte (Bildbeschreibungen) werden NUR zentral in der Mediathek gepflegt (src/data/medien.json). In config.yml KEINE Alt-Felder anlegen (kein alt, bildAlt, titelbildAlt). Im Code Alt-Texte von CMS-Bildern IMMER über cmsAlt(bild) aus src/lib/cms-bild.ts: liefert die zentrale Beschreibung, sonst eine ältere direkt am Bild gespeicherte (zweiter Parameter, nur für Altbestand), sonst ''. Eigene Ersatztexte mit || anhängen, z. B. cmsAlt(bild) || `${titel} – Foto 3 von 12`. Die Bausteine machen das bereits automatisch.
- Bild-Felder im Schema als z.string().optional().nullable() anlegen.

src/lib/cms-bild.ts: im Starter vorhanden, nicht ausgeben. Verwendung:
import { cmsAlt, cmsBild } from '@/lib/cms-bild';
const titelbild = cmsBild(startseite.bild); dann {titelbild && <Image src={titelbild} alt={cmsAlt(startseite.bild) || 'Ersatztext'} format="webp" />}. Fehlt das Bild, wird der Bereich ohne Bild dargestellt – nie ein Build-Fehler.

public/admin/index.html: exakt wie in Anhang A. Die Versionsnummern ?v= sorgen dafür, dass Browser neue Fassungen laden – bei JEDER Lieferung einer geänderten config.yml die Nummer im cms-config-url-Link erhöhen, sonst zeigt das CMS evtl. stundenlang die alte Fassung; bei Änderungen an den Skripten deren Nummer erhöhen.

public/admin/config.yml: Vorlage in Anhang B (getestet; nur benötigte Bereiche behalten, Seitentexte pro Kunde aufbauen).

## 9c. Entwürfe mit Vorschau nur im CMS (IMMER bei CMS)
Einträge (Portfolio, Blog, Termine, eigene Sammlungen) und Seiten mit Schalter „Veröffentlicht“ aus sind Entwürfe. Auf der Website gibt es sie NICHT: src/integrations/entwuerfe.mjs entfernt sie nach dem Build aus dist/ (auch Bilder, die nur Entwürfe nutzen, entfernt bilder-aufraeumen.mjs). Für Suchmaschinen und KI existieren sie also gar nicht, nicht in Sitemap, IndexNow oder llms.txt.
- Vorschau: Der GitHub-Ablauf .github/workflows/entwuerfe.yaml („Entwürfe für das CMS“, im Starter enthalten) baut nach jedem Speichern die Website mit ENTWURF_ABLAGE=.entwuerfe und legt die Entwurfsseiten samt ihrer Bilder privat im Repo ab: unter refs/vorschau/entwuerfe (kein Zweig – Deploy Now reagiert nicht darauf). Gibt es keine Entwürfe, braucht der Ablauf nur Sekunden. Die Seite /admin/entwurf.html#/<adresse>/ holt den Entwurf mit der GitHub-Anmeldung des CMS und zeigt ihn in voller Gestaltung. Sehen kann ihn nur, wer im CMS angemeldet ist und Zugriff aufs Repo hat (Kunde, Redakteure). Der Vorschaulink funktioniert 1–3 Minuten nach dem Speichern.
- Der Ablauf braucht Schreibrecht im Repo (permissions: contents: write steht in der Datei). Meldet er Fehler 403: Repo → Settings → Actions → General → Workflow permissions → „Read and write permissions“.
- Bausteine: fertig im Starter. Eigene Sammlungen (IMMER, auch JSON und mehrsprachig – Kopieren und Vorschau sollen überall gleich funktionieren): Feld „veroeffentlicht“ als ERSTES Feld (default: false, mehrsprachig mit i18n: duplicate), summary beginnt mit „{{veroeffentlicht | ternary('Veröffentlicht', 'Entwurf')}} · “, in config.yml `vorschau_pfad` mit '{{slug}}' und im Code eine Seite unter genau dieser Adresse. In Übersichten, Nachbar-Links und llms.txt nur veröffentlichte Einträge.
  - Einträge mit eigener Detailseite: Entwürfe zusätzlich in getStaticPaths ausgeben und `entwurf` an BaseLayout geben.
  - Einträge OHNE eigene Detailseite (z. B. Pakete als Kacheln im Shop, Termine als Liste auf der Events-Seite): Vorschau-Adresse <seite>/<slug>/ als eigene Seite (z. B. src/pages/shop/[paket].astro, getStaticPaths über ALLE Einträge). Ist der Eintrag ein Entwurf, zeigt sie die ganze Seite mit diesem Eintrag (Seite als Komponente auslagern, Prop fokus, `entwurf` an BaseLayout; Pop-up gleich öffnen bzw. zum Eintrag scrollen und hervorheben; im Vorschau-Modus die Adresse nicht per history/hash verändern – die Vorschau läuft unter /admin/entwurf.html#/<adresse>/). Ist er veröffentlicht, ist sie eine kurze Weiterleitung (BaseLayout noindex, <meta http-equiv="refresh"> im Slot head + sichtbarer Link) auf die Seite mit Anker, z. B. /shop/#paket-<slug> (Seite öffnet das Pop-up beim Laden) bzw. /events/#termin-<slug>. So funktionieren „Vorschau öffnen“ und „Auf der Website ansehen“ in beiden Zuständen, und Google sieht keine doppelten Seiten (noindex-Seiten kommen nicht in die Sitemap).
  - Muster: Gourmet Ladele (gourmetladele.com) – src/components/ShopSeite.astro, src/pages/shop/[paket].astro, src/components/EventsSeite.astro, src/pages/events/[termin].astro, src/components/Weiterleitungsseite.astro.
- Seiten: Startseite, Impressum und Datenschutz haben KEINEN Schalter (müssen immer online sein). Alle weiteren Seiten (Unterseiten wie Leistungen oder Shop, Landingpages, Aktionsseiten) bekommen in src/data/seiten/<seite>.json das Feld "veroeffentlicht" (neue Seiten zunächst false, damit sie vor dem Livegang in der Vorschau geprüft werden können) und im CMS das Feld als ERSTES (Muster in der Vorlage). In der Seite: `<BaseLayout … entwurf={seite.veroeffentlicht === false}>`. Links auf die Seite (Header, Footer, andere Seiten, llms.txt SEITEN) nur mit seiteVeroeffentlicht('<seite>') aus @/lib/bausteine. FAQ von Entwurfsseiten kommt automatisch nicht in die llms.txt. Mehrsprachige Seitendateien ({ "de": {…} }): "veroeffentlicht" steht im Block der Hauptsprache (im CMS i18n: duplicate); seiteVeroeffentlicht() und die FAQ der llms.txt lesen ab Starter 1.2.0 diesen Block.
- CMS-Bereiche mit nur einer Datei (files-Sammlung mit genau einem Eintrag, z. B. Kontakt & Öffnungszeiten) öffnen ab Starter 1.3.0 beim Klick im Menü direkt die Bearbeitung (cms-anpassungen.js). Bereich nach seinem Inhalt benennen, nicht „Einstellungen“. Abschalten pro Sammlung: `direkt_oeffnen: false`.
- config.yml: pro Sammlung bzw. pro Seite `vorschau_pfad` = Adresse auf der Website ohne Schrägstrich am Anfang (Sammlungen mit '{{slug}}', z. B. 'referenzen/{{slug}}/'; Seiten z. B. 'aktion/'). Daraus baut entwuerfe.js die Links. Ohne vorschau_pfad keine Leiste.
- Im CMS (public/admin/entwuerfe.js, in index.html einbinden): Leiste unten links im geöffneten Eintrag bzw. in der Seite – alles an einer Stelle: der Schalter „Veröffentlicht“ (das Feld im Formular wird dafür ausgeblendet; geänderter, noch nicht gespeicherter Schalter wird angezeigt), bei Entwürfen „Vorschaulink kopieren“ und „Vorschau öffnen“, bei Veröffentlichtem „Auf der Website ansehen“. In der Übersicht von Sammlungen hat jeder Eintrag rechts einen Knopf „Als Entwurf kopieren“ (Markdown-Sammlungen immer, JSON-Sammlungen ab 1.2.0, sobald sie einen vorschau_pfad haben – Weiterleitungen also nicht): fragt nach dem Titel der Kopie und bildet daraus die Adresse (wie beim Anlegen; später nicht mehr änderbar), legt sie als Entwurf an und öffnet sie. Mehrsprachig: Die Kopie wird in allen Sprachen Entwurf, der neue Titel gilt für die Hauptsprache, in den anderen Sprachen fällt der Titel weg (die Website zeigt bis zur Übersetzung den Titel der Hauptsprache). Das Feld „Veröffentlicht“ wird in jeder Sprachspalte ausgeblendet. In der Übersicht von Seiten zeigen Etiketten „Veröffentlicht“ / „Entwurf“ den Stand jeder Seite. Decaps „Duplizieren“ ist ausgeblendet. Auch ein neu angelegter, noch nicht gespeicherter Eintrag zeigt die Leiste sofort (Schalter steht auf „Entwurf“); den Vorschaulink gibt es nach dem ersten „Speichern“. Wer eine veröffentlichte Seite auf Entwurf stellt, wird vor dem Speichern gefragt, ob sie offline gehen soll.
- Für Erklärungen an den Benutzer: Eine veröffentlichte Seite auf „Entwurf“ zu stellen nimmt sie offline (alte Adresse → „Seite nicht gefunden“; Google entfernt sie nach Tagen bis Wochen, sofort über die Search Console → „Entfernen“). Zum Überarbeiten einer Seite, die live bleiben soll: bei Einträgen in der Übersicht „Als Entwurf kopieren“, Kopie bearbeiten, danach Inhalte ins Original übernehmen oder Kopie veröffentlichen und Original löschen.

## 9d. Weiterleitungen (IMMER – im CMS als Menüpunkt „Weiterleitungen“)
Alte oder kurze Adressen dauerhaft (301) auf eine Seite umleiten: nach einem Relaunch, für Kurzlinks (z. B. Instagram-Bio) oder wenn eine Seite umzieht. Fertig im Starter, NICHT neu bauen und keine eigenen Seiten mit Astro.redirect anlegen.
- Ablage: eine Datei pro Weiterleitung, src/data/weiterleitungen/<name>.json = { "aktiv": true, "von": "/alte-adresse/", "nach": "/neue-seite/", "notiz": "…" }. „von“ ohne Domain (mit Domain geht auch, wird entfernt); „nach“ = Seite der Website (auch mit ?quelle=… oder #abschnitt) oder externe Adresse https://…
- Erzeugt von src/pages/[...weiterleitung].astro (Funktion weiterleitungen() aus @/lib/weiterleitungen). Echte Seiten haben immer Vorrang. src/integrations/weiterleitungen.mjs warnt im Build-Protokoll, wenn unter „von“ eine echte Seite liegt oder das Ziel fehlt (z. B. Entwurf). Weiterleitungen kommen nie in die Sitemap.
- Kurzlinks mit Herkunft: „nach“ mit ?quelle=<kanal> (z. B. /aktion/?quelle=instagram) – Formulare auf der Zielseite können die Quelle als verstecktes Feld mitschicken (ohne Cookies).
- CMS: Sammlung „weiterleitungen“ (Vorlage in Anhang C, vor „rechtstexte“ einfügen; Beispiele in Hinweisen ggf. an die Kundenseite anpassen). In der Übersicht Etiketten „Aktiv“ / „Aus“ (cms-anpassungen.js), kein Kopier-Knopf.

Relaunch mit neuen Adressen: Alte URLs der bisherigen Seite IMMER auf die neuen Seiten weiterleiten (wichtig für Google und bestehende Links). Dafür KEINE eigenen Redirect-Seiten bauen, sondern je alte Adresse eine Datei src/data/weiterleitungen/<name>.json anlegen (Punkt 9d) – auch ohne CMS. Die alten Adressen der bisherigen Website (Sitemap, Google Search Console, Menü) in Schritt 1 selbst ermitteln bzw. erfragen und in der ersten Lieferung mitgeben (Notiz z. B. „Alte Adresse der früheren Website“).

## 9e. Mediathek, Galerie-Feld und Hinweise für Erklärungen
Mediathek (public/admin/mediathek.js im Starter, IMMER bei CMS; in config.yml `media_library: { name: mediathek }` wie in der Vorlage):
- Eine Bildverwaltung für die ganze Website: Menüpunkt „Medien“, jedes Bildfeld (widget: image – die Mediathek ersetzt Decaps Bildfeld und Bilder-Fenster) und der Knopf „Aus Mediathek wählen“ im Galerie-Feld.
- Zeigt alle Bilder unter src/assets/cms/ inkl. Unterordnern, mit Suche, Ordner-Filter, „Nur nicht verwendete“ und (ab 1.5.0) „Nur ohne Beschreibung“; verwendete Bilder ohne Beschreibung tragen die Marke „ohne Beschreibung“. Bilder des gerade geöffneten Eintrags stehen oben.
- Hochladen (mehrere, auch per Ziehen): neue Bilder landen im media_folder der Sammlung (z. B. src/assets/cms/portfolio/<eintrag>/), sonst im Hauptordner. Nur Bilder über 2560 px werden verkleinert (auf 2560 px, scharf auch auf hochauflösenden Bildschirmen); kleinere bleiben unverändert, PNG bleibt PNG (keine doppelte Komprimierung).
- Zeigt bei jedem Bild, wo es verwendet wird (alle Dateien unter src/ außer src/assets sowie gerade geöffnete, ungespeicherte Felder). Löschen nur für nicht verwendete Bilder, mit Rückfrage „Endgültig löschen?“; die Datei wird aus dem Repo entfernt.
- Beschreibung (Alt-Text) pro Bild NUR hier, zentral in src/data/medien.json ({ "alt": { "src/assets/cms/…": "…" } }, mehrsprachig zusätzlich "alt_sprachen", Punkt 9f); sie gilt überall, wo das Bild eingesetzt ist. Die Website liest sie über cmsAlt(). Die Datei entsteht beim ersten Speichern – nicht vorab anlegen. Ältere, direkt am Bild gespeicherte Beschreibungen zeigt die Mediathek als Vorschlag; „Bisherige Beschreibungen übernehmen“ überträgt sie mit einem Klick. `alt_texte: false` blendet die Beschreibungen aus (nur für Projekte, deren Code cmsAlt() noch nicht nutzt).
- Für Bildfelder gilt dieselbe Ordner-Logik wie fürs Galerie-Feld; die Feld-Option „ordner“ ist auch bei image-Feldern erlaubt.
- Dateien zum Herunterladen (PDF, max. 20 MB) liegen ebenfalls in der Mediathek (src/assets/cms/…, unverändert hochgeladen). Im CMS als Feld mit `widget: file` anbieten (die Mediathek zeigt dort nur PDFs, Bildfelder zeigen keine PDFs). Im Code mit cmsDatei(pfad) aus src/lib/cms-bild.ts auflösen → { url, name } oder undefined; Link: <a href={datei.url} download={datei.name}>…<span class="sr-only"> (PDF herunterladen)</span></a>.

Galerie-Feld (widget: galerie, aus public/admin/galerie-widget.js im Starter):
- Mehrere Fotos auf einmal hochladen (Auswahl oder Ziehen ins Feld) oder „Aus Mediathek wählen“, Sortieren per Ziehen, Entfernen mit ×. Keine Beschreibung pro Foto im Feld – Beschreibungen kommen aus der Mediathek, sonst gilt ein automatischer Text.
- Speichert eine Liste aus { bild, alt }. Ordner der Fotos: <ordner>/<dateiname-des-eintrags>/ (Feld-Option „ordner“) – passend zu media_folder der Sammlung.

Gut zu wissen (für Erklärungen an den Benutzer):
- „Medien“ oben im CMS öffnet die Mediathek mit allen Bildern der Website. Dort Beschreibungen vergeben (Filter „Nur ohne Beschreibung“ zeigt, was fehlt – wichtig für Google und Screenreader) und nicht mehr verwendete Bilder löschen.
- Unter „Titel für Google“, „Beschreibung für Google“ und „Kurzbeschreibung“ zählt das CMS die Zeichen mit: grün = passt, orange = Google schneidet ab.
- Entfernen aus einem Feld (× bzw. „Entfernen“) nimmt das Bild nur aus dem Eintrag; die Datei bleibt in der Mediathek, bis sie dort gelöscht wird. Ein Bild, das noch irgendwo verwendet wird, lässt sich nicht löschen – die Mediathek zeigt, wo es steckt.
- Gelöschte Bilder bleiben im Verlauf von GitHub erhalten (Wiederherstellung über GitHub möglich), sind aber auf der Website und im CMS weg.
- Nach Änderungen an den CMS-Skripten: CMS einmal mit Cmd + Shift + R (Mac) bzw. Strg + F5 (Windows) neu laden.
- Ältere Kundenprojekte (vor den Bausteinen gebaut, z. B. weddings.millionstories.de und millionstories.de) haben eigene Sammlungen und Seiten – dort nicht ungefragt auf Bausteine umstellen.

## 9f. Mehrsprachige Websites (z. B. Deutsch, Italienisch, Englisch)
Getestet mit Decap 3.x (Muster: Gourmet Ladele, gourmetladele.com). Deutsch ist die Hauptsprache, im CMS steht links Deutsch und rechts die gewählte Übersetzung („Aktuelle Sprache: IT/EN“, „Aus anderer Sprache übernehmen“).
- config.yml oben: `i18n: { structure: single_file, locales: [de, it, en], default_locale: de }`. Gespeichert wird pro Datei ein Block je Sprache: { "de": {…}, "it": {…}, "en": {…} } – immer JSON.
- Seiten (files-Sammlung): auf Sammlungsebene `i18n: { structure: single_file }` UND an jeder Datei `i18n: true`. Dateien ohne Sprachen (z. B. Kontakt & Öffnungszeiten) in eine EIGENE Sammlung ohne i18n legen – in einer i18n-Sammlung zeigt Decap sie sonst leer an. Hat diese Sammlung nur eine Datei, nach ihr benennen (label 'Kontakt & Öffnungszeiten', nicht „Einstellungen“).
- Felder: Texte `i18n: true`; Bilder, Links, Preise, Zahlen, Schalter `i18n: duplicate` (gelten für alle Sprachen). Objekte dürfen Unterfelder unterschiedlich markieren; Listen nur als Ganzes (`i18n: true`, Unterfelder ohne i18n).
- Eigene Sammlungen (folder) ebenso mit `i18n: { structure: single_file }`. Die Bausteine (Portfolio, Blog, Events) sind einsprachig – bei mehrsprachigen Websites stattdessen eigene JSON-Sammlungen (Punkt 9b, 9c).
- Im Code: Hilfsfunktion inSprache(daten, sprache) – Block der Sprache über den deutschen Block legen; leere Felder zeigen Deutsch (Seite nie leer). Kurze feste Bedienwörter (Menü, Knöpfe, Status) in einem kleinen Wörterbuch im Code, alles Inhaltliche im CMS.
- Adressen: Deutsch ohne Präfix, Übersetzungen unter /it/… und /en/… (gleiche Unterpfade). BaseLayout mit lang={sprache} (ab Starter 1.2.0), im Header ein Sprachumschalter (Links mit hreflang) erst, wenn die Sprache online ist. Alte Adressen der Vorgängerseite in anderen Sprachen per Weiterleitung (Punkt 9d) zuerst auf die deutschen Seiten, nach der Übersetzung auf /it/… bzw. /en/… umstellen.
- Starter-Texte in der Sprache der Seite: Formular-Fehlermeldungen (ab 1.2.1, formular-pruefung.ts), Sprunglink „Zum Inhalt springen“ und Menüknopf „Menü öffnen/schließen“ (ab 1.2.2, BaseLayout-Prop lang bzw. <html lang>). Für alle anderen festen Bedienwörter (Header, Footer, Status, aria-label) ein kleines Wörterbuch im Projekt; nie deutsche Texte fest in Komponenten, die auch für IT/EN genutzt werden.
- Formulare: Eigene Texte (data-fehler, Danke-Meldung, Beschriftungen) aus dem CMS je Sprache. Die E-Mail an den Kunden behält die deutschen Feldnamen.
- Neue Sprache vor dem Livegang prüfen: CMS-Sammlung „Sprachen online“ (eine Datei je Sprache mit Feld veroeffentlicht und vorschau_pfad 'it/'). Solange aus, sind alle Seiten der Sprache Entwürfe (Vorschau im CMS, Links darin führen weiter durch die Vorschau); einschalten = online, Sprachumschalter und hreflang erscheinen automatisch.
- hreflang (ab Starter 1.5.0, automatisch): Der Build verknüpft alle Seiten, die es in mehreren Sprachen unter gleichem Unterpfad gibt (/kontakt/, /it/kontakt/ …, erkannt an <html lang>), im Seitenkopf (<link rel="alternate" hreflang>, x-default = Hauptsprache) und in der Sitemap. Voraussetzung: gleiche Unterpfade und BaseLayout mit lang={sprache}. Keine eigenen hreflang-Links in den Seitenkopf schreiben (Seiten, die schon welche haben, lässt der Build unverändert). Der Sprachumschalter im Header bleibt trotzdem nötig (für Menschen).
- Bildbeschreibungen (ab Starter 1.3.0): alle Sprachen zentral in der Mediathek. Bei i18n mit locales zeigt das Bildfenster unter der deutschen Beschreibung je Sprache ein Feld; gespeichert in src/data/medien.json unter "alt_sprachen" ({ "it": { "<bildpfad>": "…" }, "en": { … } }). Im Code cmsAlt(bild, undefined, sprache) (für die Hauptsprache ohne dritte Angabe); leere Übersetzung = deutsche Beschreibung. Keine eigene Liste „Bildbeschreibungen IT/EN“ im CMS mehr anlegen.
- Rechtstexte: je Sprache eine eigene Datei src/data/rechtstexte/<name>-<sprache>.md und eine eigene Seiten-Komponente (Rechtstext.astro des Starters ist einsprachig).
- Übersetzung: Claude übersetzt, der Kunde liest gegen.

# 10. SEO & GEO (Suchmaschinen und KI-Suche) – IMMER umsetzen
Indexierung (WICHTIG – nie versehentlich aussperren):
- Jede Seite ist indexierbar (BaseLayout setzt „index, follow“). `noindex` NUR für die 404-Seite (Prop noindex am BaseLayout), für /admin (steht in public/admin/index.html). Entwürfe gibt es auf der Website gar nicht (Punkt 9c). Nie noindex auf Inhaltsseiten, nie `Disallow` für Inhalte in robots.txt.
- `site` in astro.config.mjs IMMER auf die endgültige Domain setzen, auch schon vor dem Livegang (sonst zeigen Canonical-Adressen, Sitemap und Social-Media-Vorschau auf die Platzhalter-Domain). Der Build warnt, solange dort „kundendomain“ steht.
- Weiterleitungen (Punkt 9d, z. B. alte URLs beim Relaunch) und noindex-Seiten kommen automatisch nicht in die Sitemap. Interne Links immer auf die endgültige Adresse mit Schrägstrich am Ende (/impressum/), nicht auf alte, weitergeleitete Adressen.
- „Zuletzt geändert“ (ab 1.4.0, automatisch): Die Sitemap enthält je Seite lastmod. Ein neues Datum gibt es nur, wenn sich Titel, Beschreibung oder der Hauptbereich (<main>) wirklich ändern – nicht bei Änderungen an Header, Footer, Gestaltung oder Bilddateinamen. Dasselbe Datum steht als dateModified in den strukturierten Daten der Seite. Nie Datumsangaben künstlich aktualisieren; Beiträge bekommen „Aktualisiert am“ nur bei echter Überarbeitung.
- Search Console: „Seite mit Weiterleitung“ für http://, www. oder Adressen ohne Schrägstrich am Ende ist normal und kein Fehler. „Durch noindex ausgeschlossen“ ist nur für /404 und /admin/ in Ordnung. „Gefunden – zurzeit nicht indexiert“ ist bei neuen Websites in den ersten Wochen normal; wichtige Seiten über die URL-Prüfung → „Indexierung beantragen“ anstoßen.

Technik (pro Seite):
- Eigener <title> (max. ca. 60 Zeichen, Muster: „Hauptthema – Ort | Firmenname“) und eigene description (max. ca. 155 Zeichen, mit Leistung und Ort). Nie zwei Seiten mit gleichem Titel oder gleicher Beschreibung.
- Genau eine H1 pro Seite, die sagt, was angeboten wird und – bei lokalem Geschäft – wo. Alle Abschnittsüberschriften als echte H2/H3, keine Überschriften nur als gestylter Text.
- Interne Links relativ (/kontakt), sprechende URLs in Kleinbuchstaben mit Bindestrich.
- Bilder: Größenstufen, Hero-Bild (loading="eager" und fetchpriority="high") und Lazy-Loading aller anderen Bilder siehe Punkt 4. Jedes inhaltliche Bild mit beschreibendem Alt-Text (was ist zu sehen + Kontext); rein dekorative Bilder alt="".
- Projekt-, Beitrags- und Event-Seiten: das eigene Titelbild als Social-Media-Vorschau (Prop image), sichtbares Datum („Veröffentlicht am“ bzw. „Stand“).
- CMS-Einträge (ab 1.5.0, automatisch): Seitentitel „Titel | Firmenname“, bei mehr als 60 Zeichen nur der Titel (seoTitel(eintrag) aus @/lib/bausteine). Beschreibung = Kurzbeschreibung, sonst der Anfang des Textes ohne Zwischenüberschriften, gekürzt am Satzende (seoBeschreibung(eintrag)). Termine: Preis aus dem Feld „Preis“ („49 €“, „ab 19,50 €“, „kostenlos“) als Offer mit price/priceCurrency. Eigene Sammlungen nutzen dieselben Hilfen.
- CMS-Hilfen (ab 1.5.0): Felder mit den Namen seoTitel, seoBeschreibung und kurztext zeigen einen Zeichenzähler (cms-anpassungen.js) – eigene Google-Felder deshalb genau so benennen. Die Mediathek markiert verwendete Bilder „ohne Beschreibung“ und hat den Filter „Nur ohne Beschreibung“.
- Interne Verlinkung: Beiträge, Projekte und FAQ-Antworten verlinken im Text auf die passende Leistungsseite und die Kontaktseite; jede Leistungsseite ist vom Menü oder der Startseite aus mit einem Klick erreichbar. Keine Seite ohne Link von einer anderen Seite.
- Klare Handlungsaufforderung: Jede Seite endet mit einem konkreten nächsten Schritt (z. B. „Jetzt Termin anfragen“ mit Link zum Kontakt, Telefonnummer als tel:-Link).
- Keine Platzhalter- oder Lorem-ipsum-Texte in Seiten, die veröffentlicht werden. Beispielbeiträge im CMS mit veroeffentlicht: false anlegen.

Strukturierte Daten (JSON-LD) – ab Starter 1.4.0 zentral und verknüpft (src/lib/schema.ts):
- Grundgerüst automatisch auf jeder Seite (BaseLayout, außer noindex): WebSite (#website), Unternehmen (#unternehmen) und die Seite selbst (WebPage, <adresse>#webseite, mit dateModified aus der Sitemap). Alle anderen Angaben verweisen per @id darauf. So erkennen Google und KI-Systeme eindeutig, wer hinter den Inhalten steht.
- Unternehmen IMMER in src/projekt.config.ts → unternehmen eintragen (Angaben aus Schritt 2): typ = Organization bzw. passender LocalBusiness-Untertyp (z. B. ProfessionalService, Bakery, Dentist), rechtsname (falls anders als firmenname), beschreibung (1–2 Sätze: Leistung, Ort/Region, Zielgruppe), logo ('/logo.png' in public/), email, telefon, gebiet (Einzugsgebiet, z. B. ['Mannheim', 'Rhein-Neckar']), profile (Google-Unternehmensprofil, Instagram, LinkedIn … als vollständige Adressen) und – nur bei echtem Ladengeschäft/Standort mit Publikumsverkehr – adresse { strasse, plz, ort }. Keine c/o- oder Postfach-Adressen als Standort. Den Link zum Google-Unternehmensprofil in Schritt 2 erfragen, in profile aufnehmen und sichtbar verlinken (z. B. „Google-Bewertungen“ im Footer).
- Die Startseite gibt das Unternehmen NICHT noch einmal selbst aus (sonst doppelt). Zusätzliche Angaben nur dort, wo sie sichtbar stehen – z. B. Öffnungszeiten oder Geo-Daten – über unternehmenSchema(site, { openingHoursSpecification: … }) aus @/lib/schema im Slot head (gleiche @id, wird zusammengeführt).
- Personen (Team, Autorinnen/Autoren) in src/projekt.config.ts → personen [{ name, rolle, bild, profile }]. Steht der Name genau so im CMS-Feld „Autor/in“ eines Beitrags, erscheinen Rolle und Profile automatisch beim Beitrag (BlogPosting.author). Team-Bereich auf der Startseite: personSchema(person, site) aus @/lib/schema (Person mit jobTitle, image, sameAs, worksFor → Unternehmen).
- Unterseiten: BreadcrumbList.
- Projekte, Beiträge, Termine, Übersichten: erzeugen die Bausteine automatisch (CreativeWork/ImageGallery, BlogPosting, Event, Blog/CollectionPage) – mit @id, mainEntityOfPage und Verweis aufs Unternehmen (creator, publisher, organizer). Nur bei eigenen Sammlungen selbst ergänzen, dann ebenso mit '@id': schemaId.inhalt(url, 'inhalt'), mainEntityOfPage: { '@id': schemaId.seite(url) } und unternehmenRef(site).
- Eigene Seiten mit eigenem Inhalts-Typ (z. B. Leistungsseiten als Service): '@id': schemaId.inhalt(url, 'leistung'), provider: unternehmenRef(site), areaServed aus dem Gebiet; Angebote (Offer) nur mit sichtbaren Preisen.
- FAQ-Bereich: FAQPage – erzeugt src/components/Faq.astro automatisch (mit @id <adresse>#faq und isPartOf der Seite); Fragen und Antworten stehen sichtbar auf der Seite.
- Alle Angaben im JSON-LD müssen auch sichtbar auf der Seite stehen.
- Social-Media-Vorschau: og:site_name kommt automatisch; Beiträge und Projekte als Artikel mit Datum (BaseLayout-Prop artikel, Punkt 5).
- Ältere Kundenprojekte ohne „unternehmen“ in projekt.config.ts funktionieren weiter (kurze Angabe mit Name und Adresse). Beim Update auf 1.4.0: unternehmen/personen ergänzen und eine bereits auf der Startseite ausgegebene Organization/LocalBusiness entfernen bzw. auf #unternehmen umstellen.

KI-Zusammenfassung:
- llms.txt: im Starter als src/pages/llms.txt.ts vorhanden. Pro Kunde KOPF („# Firmenname“, „> Kurzbeschreibung (Leistung, Ort, Zielgruppe)“, wichtigste Fakten), SEITEN (alle festen Seiten mit je einem Satz) und KONTAKT ausfüllen. Einträge aktiver Bausteine und die FAQ-Fragen aller Seiten werden automatisch ergänzt. Kein public/llms.txt anlegen.

Texte (so formulieren, dass Menschen, Google und KI-Systeme die Seite verstehen und zitieren):
- Antwort zuerst: Jeder Abschnitt beginnt mit der Kernaussage in einem Satz, danach Details.
- Konkret statt werblich: Leistungen, Ort und Einzugsgebiet, Zielgruppe, Erfahrung, Zahlen, Ablauf, Preisrahmen (falls vorhanden) – im sichtbaren Text, nicht nur in Meta-Angaben.
- Ort/Region (bei lokalem Geschäft) mindestens in H1 oder Einleitung und im Kontaktbereich nennen.
- Expertise zeigen: echte Personen mit Rolle und Erfahrung, Referenzen, Projekte mit Aufgabe → Lösung → Ergebnis.
- FAQ-Bereich mit 4–8 echten Kundenfragen (wenn sinnvoll), Antworten in 2–4 Sätzen.
- Zahlen mit Bezug: Kennzahlen immer mit Jahr bzw. Stand und – wenn nicht eigene Zahlen – mit Quelle als Link (z. B. „laut Statistischem Bundesamt, 2025“). Eigene Erfahrungswerte als solche kennzeichnen („seit 2012 über 300 Projekte“).
- Leicht zitierbar gliedern: kurze Absätze (2–4 Sätze), aussagekräftige Zwischenüberschriften (gern als Frage), Aufzählungen für Schritte und Merkmale, Tabellen für Vergleiche, Preise oder Abläufe. Im CMS-Fließtext (Markdown) gehen Zwischenüberschriften (##), Listen und Tabellen.
- Keine erfundenen Fakten, Zahlen, Bewertungen oder Zitate. Fehlende Angaben beim Benutzer erfragen oder weglassen.

SEO-Prüfung beim Build (ab Starter 1.5.0, automatisch – src/integrations/seo-pruefung.mjs):
- Nach jedem Build steht unter https://<domain>/seo-pruefung.json, was auffällt. Fehler: Titel/Beschreibung fehlt oder doppelt, keine oder mehrere H1, Bild ohne alt, Link auf eine Seite, die es nicht gibt, Platzhaltertext, kaputtes JSON-LD. Hinweise: Titel über 60 / Beschreibung über 160 Zeichen bzw. sehr kurz, übersprungene Überschriftenebene, Link auf eine weitergeleitete Adresse, automatische Bildbeschreibung („… – Foto 3 von 12“), wenig Text (unter 150 Wörter; nicht Startseite, Übersichten, Rechtstexte).
- Vor jeder Lieferung: Build laufen lassen, Fehler beheben (Ziel 0), Hinweise prüfen.
- Bei bestehenden Kundenseiten zuerst https://<domain>/seo-pruefung.json lesen – sie zeigt auch Probleme, die durch Inhalte aus dem CMS entstanden sind.

Nach dem Livegang: SEO-Start (einmal) und SEO-Check (auf Abruf):
Ablauf und Bericht macht der Skill „seo-check“ – die Regeln dafür stehen hier, damit sie mit jedem Kunden-Repo mitkommen. Nichts davon läuft automatisch; Claude schlägt den nächsten Termin nur vor.

SEO-Start (Befehl „seo-start“, ca. 1 Woche nach dem Livegang, sobald die endgültige Domain verbunden ist):
1. Live-Grundcheck: https://<domain>/robots.txt (Zeile „Sitemap:“, kein Disallow für Inhalte), /sitemap.xml (alle wichtigen Seiten, keine alten oder Vorschau-Adressen), /seo-pruefung.json (0 Fehler), /llms.txt (Kopf, Seiten und Kontakt ausgefüllt). Weiterleitungen prüfen: http → https, mit/ohne www auf eine Fassung (wie `site`), alte Adressen vom Relaunch (Punkt 9d).
2. Strukturierte Daten: Startseite und je eine Beitrags-, Termin- bzw. Projektseite im Rich-Results-Test (search.google.com/test/rich-results). Fehler beheben, Warnungen nur, wenn die Angabe sichtbar auf der Seite steht (Punkt 10, „Alle Angaben im JSON-LD …“).
3. Ladezeit: PageSpeed Insights mobil für die Startseite, Ziel ≥ 95 (Punkt 12).
4. Google Search Console (search.google.com/search-console):
   - Property-Typ „Domain“ (gilt für www, ohne www, http und https). Bestätigung per TXT-Eintrag bei IONOS: Domains & SSL → Domain auswählen → DNS → Eintrag hinzufügen → TXT, Hostname @, Wert aus der Search Console kopieren → Speichern. Danach in der Search Console „Bestätigen“ (kann bis zu einer Stunde dauern). Den TXT-Eintrag nie wieder löschen – sonst verliert das Konto den Zugriff.
   - Claude kann das im Browser übernehmen; vor dem Speichern des DNS-Eintrags immer kurz bestätigen lassen. Andere DNS-Einträge nie ändern.
   - Inhaberschaft klären: Property im Google-Konto von Millionstories oder des Kunden, die andere Seite über Einstellungen → Nutzer und Berechtigungen als Nutzer hinzufügen. In der Kundenakte festhalten.
   - Sitemaps → https://<domain>/sitemap.xml einreichen. Startseite und die 3–5 wichtigsten Seiten über „URL-Prüfung“ → „Indexierung beantragen“ anstoßen.
   - Relaunch: Gab es für die alte Website schon eine Property, die alte behalten (Verlauf) und die alten Adressen in der URL-Prüfung stichprobenartig prüfen – sie müssen auf die neuen Seiten weiterleiten.
5. Bing Webmaster Tools (bing.com/webmasters): „Aus der Google Search Console importieren“ (übernimmt Bestätigung und Sitemap). Danach im Kunden-Repo Actions → „IndexNow melden“ → Run workflow (meldet alle Seiten, Punkt 1). Bing ist Grundlage u. a. für die ChatGPT-Suche und Copilot.
6. Google-Unternehmensprofil (bei lokalem Geschäft): Name, Adresse, Telefon genau wie in src/projekt.config.ts und im Impressum, Website-Link auf die neue Domain, passende Hauptkategorie, Leistungen, Öffnungszeiten. Abweichungen auflisten – das Profil pflegt der Kunde bzw. die Benutzerin selbst. Den Profil-Link in unternehmen.profile und sichtbar auf der Website (z. B. „Google-Bewertungen“ im Footer) prüfen.
7. Abschluss: kurze Liste erledigt/offen in einfacher Sprache. In der Kundenakte (Abschnitt „Website“) eine Zeile „SEO-Start am <Datum>, Search Console: <Konto>“. Den ersten SEO-Check nach ca. 3 Monaten vorschlagen.
Normal in den ersten Wochen (kein Fehler): „Gefunden – zurzeit nicht indexiert“, „Seite mit Weiterleitung“ für http://, www. oder Adressen ohne Schrägstrich, „Durch noindex ausgeschlossen“ für /404 und /admin/.

SEO-Check (Befehl „seo-check“, nur auf Abruf – z. B. nach 3 Monaten, danach alle 6 Monate bei Kunden mit laufender Optimierung):
- Daten: /seo-pruefung.json und sitemap.xml der Live-Website, Search Console der letzten 3 Monate im Vergleich zum Zeitraum davor (Leistung: Suchanfragen und Seiten; Seitenindexierung) – im Browser oder als Export (Leistung → Exportieren), PageSpeed mobil, 10 typische Kundenfragen in Websuche bzw. ChatGPT/Perplexity (wird der Kunde genannt, wer stattdessen, welche Quellen).
- Größte Hebel: Suchbegriffe auf Position 8–20 mit spürbaren Impressionen (die passende Seite gezielt ausbauen), Seiten mit vielen Impressionen und Klickrate unter 2 % (Titel und Beschreibung verbessern), veraltete Inhalte (Jahreszahlen, Preise, Team, Termine; wichtige Seiten mit lastmod älter als 6 Monate), fehlende FAQ, Referenzen und Bildbeschreibungen.
- Ergebnis: Bericht von höchstens einer Seite mit den 5 wichtigsten Maßnahmen. Umgesetzt wird erst nach Freigabe – Code als ZIP (Punkt 8), CMS-Texte als fertiger Text zum Einfügen. Danach geänderte Seiten in der Search Console zur Indexierung einreichen (Bing meldet IndexNow automatisch).
- Geduld: Rankings reagieren nach 4–8 Wochen. Dieselbe Seite nicht innerhalb von 6 Wochen erneut umbauen; Adressen nur mit Weiterleitung ändern (Punkt 9d).
- In der Kundenakte nur eine Zeile „Letzter SEO-Check: <Datum> – <Klicks>/<Impressionen> in 3 Monaten, Ø-Position <x>“ (beim nächsten Check ersetzen) und dauerhafte Entscheidungen.

Außerhalb der Website (gehört zum Check, nicht zum Code): Google-Unternehmensprofil gepflegt und Bewertungen beantwortet, Name/Adresse/Telefon überall gleich wie in projekt.config.ts, Einträge in wichtigen Branchenverzeichnissen (z. B. Gelbe Seiten, Branchen- und Kammerverzeichnisse, regionale Portale), Erwähnungen und Links von Partnern, Verbänden, Kunden und lokaler Presse. Keine gekauften Links, keine erfundenen Bewertungen.

# 11. Barrierefreiheit (WCAG 2.2 AA) – IMMER, für jede Seite und Unterseite
Ziel: Jede Website erfüllt WCAG 2.2 Stufe AA (Grundlage von BFSG/EN 301 549) – unabhängig davon, ob das BFSG für den Kunden gilt. Barrierefreiheit schränkt das Design NICHT ein: Animationen, Bildflächen, Verläufe, große Typografie bleiben möglich – sie werden nur barrierefrei umgesetzt. Der Starter bringt die Technik mit; beim Gestalten nur die Regeln unten beachten.

Im Starter fertig (nicht neu bauen): Sprunglink „Zum Inhalt springen“ und <main id="inhalt" tabindex="-1"> (BaseLayout), sichtbarer Fokusrahmen in CI-Farbe (global.css, Variable --fokus), Fehlermeldungen am Formularfeld (src/lib/formular-pruefung.ts), Bewegungsregeln (src/lib/bewegung.ts), barrierefreies Menü (src/lib/menue.ts), Seite /barrierefreiheit (Text in src/data/rechtstexte/barrierefreiheit.md, im Footer verlinken), lange Wörter brechen auf schmalen Bildschirmen um.

Farben und Kontrast (1.4.3, 1.4.11):
- Fließtext und kleine Schrift mind. 4.5:1, große Schrift (ab 24 px bzw. 18,66 px fett) mind. 3:1. Bedienelemente, Feldrahmen, Icons mit Bedeutung, Fokusrahmen mind. 3:1 zum Hintergrund.
- brand.DEFAULT und brand.dark mind. 4.5:1 zu Weiß (Links, Buttons mit weißer Schrift), brand.dark auf brand.light mind. 4.5:1. Ist die CI-Farbe zu hell (z. B. Grün #54912e = 3.84:1), DEFAULT leicht abdunkeln (z. B. #47822a) und die Original-Farbe als brand.ci nur für Flächen, Linien, Verläufe und große Schrift verwenden. Kontraste immer nachrechnen, nicht schätzen.
- Text auf Fotos: Abdunklung/Verlauf so wählen, dass auch die hellste Bildstelle hinter dem Text 4.5:1 erreicht.
- Information nie nur über Farbe (z. B. Fehler zusätzlich mit Text, Links im Fließtext unterstrichen). Grautöne für Text nicht heller als slate-500 auf Weiß; keine Deckkraft-Abschwächung (opacity) bei Text.

Bewegung (2.2.2, 2.3.1, 2.3.3) – Standard „sanft aufhören“:
- Alles, was sich von selbst wiederholt (Wellen, Pulsieren, schwebende Bilder, Laufbänder), endet nach höchstens 5 Sekunden sanft am Ende eines Durchgangs. src/lib/bewegung.ts erzwingt das automatisch für CSS-Animationen und element.animate(); trotzdem gleich endlich planen, z. B. `animation: welle 2.5s ease-in-out 2` und mit data-bewegung erst beim Sichtbarwerden starten (`.welle.bewegt { … }`). Ausnahme nur für Ladeanzeigen: data-dauerhaft.
- Keine automatisch laufenden Karussells/Slider und kein Autoplay-Video mit Bewegung über 5 s; Karussells werden vom Nutzer bedient (Knöpfe mit aria-label, Wischen, Tastatur). Kein Blinken öfter als 3× pro Sekunde.
- „Bewegung reduzieren“ des Betriebssystems wird vom Starter beachtet (global.css + bewegung.ts). Eigene Effekte mit JavaScript nur über die Hilfen oder mit matchMedia('(prefers-reduced-motion: reduce)').
- Animierte Überschriften: data-woerter (Screenreader lesen den Satz am Stück). Hochzählende Zahlen: <span data-zahl>2019</span> (Screenreader hören nur den Endwert). Einblenden: class="einblenden" (ohne JavaScript immer sichtbar). Parallax: data-parallax="0.15". Nie Text in einzelne Buchstaben-/Wort-Spans zerlegen ohne diese Hilfen.

Aufbau und Semantik (1.3.1, 2.4.1, 2.4.6, 4.1.2):
- Landmarks: <header>, <nav aria-label="…">, <main> (vom Layout), <footer> – nie ineinander verschachtelt, kein <aside> innerhalb von <main> für normale Inhalte (dann <div>). Abschnitte als <section aria-labelledby="…"> mit Überschrift.
- Eine H1 pro Seite, Überschriften ohne Sprünge (H2 → H3). Dekorative Elemente (Pfeile →, Icons neben Text, Hintergrundformen) aria-hidden="true"; Icon-Buttons mit sichtbarem Text oder sr-only-Text.
- Listen als <ul>/<ol>, Kennzahlen als <dl> (dt = Beschriftung, dd = Wert; optisch umdrehen mit flex-col-reverse), Tabellen mit <th>.
- Links: Text sagt das Ziel („Leistungen ansehen“, nicht „Hier“). Neue Tabs nur wenn nötig, dann mit <span class="sr-only"> (öffnet in neuem Tab)</span>. Telefon und E-Mail als tel:/mailto:-Links.
- Bilder: inhaltliche Bilder mit beschreibendem Alt-Text, dekorative alt="". Logo-Link: alt bzw. aria-label „<Firmenname> – zur Startseite“.

Tastatur und Fokus (2.1.1, 2.4.3, 2.4.7, 2.4.11, 2.5.8):
- Alles mit Tastatur bedienbar, Reihenfolge = Lesereihenfolge, kein tabindex > 0. Nie outline: none / focus:outline-none ohne gleichwertigen Ersatz.
- Auf dunklen, farbigen oder Foto-Flächen den Bereich mit class="auf-dunkel" versehen (weißer Fokusrahmen) oder --fokus passend setzen (mind. 3:1).
- Fester (sticky/fixed) Header: in global.css `html { --kopf-hoehe: <Höhe>px; }`, damit Fokus und Sprungziele nicht verdeckt werden.
- Klickflächen mind. 24 × 24 px (Links in Navigation/Footer mit inline-block py-1 bzw. py-2, Checkboxen h-6 w-6, Icon-Buttons mind. h-11 w-11 empfohlen). Ausnahme: Links mitten im Fließtext.
- Mobiles Menü IMMER mit src/lib/menue.ts (aria-expanded, aria-controls, Esc schließt, Fokus zurück, Vollbild-Menü mit data-vollbild hält den Fokus). Dialoge/Lightboxen mit <dialog> und showModal(), Fokus nach dem Schließen zurück.
- Akkordeons mit <details>/<summary> (Faq.astro), Tabs mit role="tablist"/"tab"/"tabpanel" und Pfeiltasten.

Formulare (1.3.5, 3.3.1–3.3.3, 4.1.3): siehe Punkt 7. Sichtbare <label> (Platzhalter ersetzen keine Beschriftung), autocomplete, Pflichtfelder gekennzeichnet, Fehler am Feld (formularPruefen), Statusmeldung mit role="status". Auf dunklem Grund: Formular in class="auf-dunkel" (Fehlertext wird weiß).

Darstellung (1.4.4, 1.4.10, 1.4.12, 1.4.13):
- Bei 320 px Breite und 400 % Zoom kein seitliches Scrollen, nichts abgeschnitten. Keine festen Höhen für Textbehälter (min-h statt h), Schriftgrößen in rem.
- Erhöhte Zeilen-/Buchstabenabstände dürfen nichts abschneiden (kein overflow: hidden um Text mit fester Höhe).
- Inhalte, die bei Hover/Fokus erscheinen, bleiben sichtbar, solange man darauf zeigt, und sind mit Esc schließbar.

Seite /barrierefreiheit: Erklärung immer ausfüllen (Firmenname, Kontakt, Datum; bekannte Einschränkungen ehrlich nennen, z. B. „Fotos der Galerie haben teils automatische Beschreibungen“). Fällt der Kunde unter das BFSG (z. B. Online-Shop, Buchung, Verträge online – nicht bei reiner Info-Seite mit Kontaktformular): zusätzlich Hinweis auf die zuständige Marktüberwachungsbehörde (MLBF, Magdeburg – aktuelle Anschrift beim Erstellen prüfen) und eine Beschreibung der Dienstleistung ergänzen; den Benutzer darauf hinweisen, das rechtlich prüfen zu lassen.

Prüfen (vor JEDER Lieferung und bei jedem Vorschau-Artifact):
- Seiten bauen und automatisch prüfen: axe-core (wcag2a, wcag2aa, wcag21aa, wcag22aa, best-practice) bei 1280 px und 375 px, mobiles Menü geöffnet und geschlossen → 0 Fehler.
- Kontraste von Text über Bildern/Verläufen messen (hellste Stelle), Fokusrahmen auf jeder Hintergrundfarbe ansehen.
- 320 px Breite ohne seitliches Scrollen; Tab-Durchgang: Sprunglink zuerst, alles erreichbar, Fokus nie verdeckt.
- Nach 6 Sekunden darf keine Animation mehr laufen (document.getAnimations()); mit „Bewegung reduzieren“ ist alles sofort sichtbar.
- Formular leer absenden: Fehler am Feld, Fokus auf erstem Fehler, kein Versand.
- Ergebnis in der Lieferung in einem Satz nennen (z. B. „Barrierefreiheit geprüft: 0 Fehler (WCAG 2.2 AA)“).

# 12. Ladezeit (PageSpeed) – IMMER
Ziel: PageSpeed (mobil) mindestens 95 in „Leistung“, ohne Abstriche bei Bildqualität und Design. Der Starter bringt die Grundlagen mit; beim Gestalten nur diese Regeln beachten.

Im Starter fertig (nicht neu bauen): CSS direkt in der Seite (astro.config.mjs → build.inlineStylesheets: 'always'), Schriften vorab laden (schriftenVorladen in src/projekt.config.ts), Zwischenspeicher im Browser (public/.htaccess: /_astro/ 1 Jahr, Seiten und /admin/ immer frisch), automatische Bildformate über <Image />.

Bilder: siehe Punkt 4 (widths + sizes passend zur Anzeige, Qualität nie senken, nur das oberste große Bild eager + fetchpriority="high"). Bei Karussells/Reihen die sizes nach der Breite des größten Zustands richten. Hintergrundbilder ebenfalls über <Image /> bzw. getImage(), nie als CSS-url() auf Originaldateien.

Animationen (PageSpeed „nicht zusammengesetzte Animationen“): Nur transform und opacity animieren – nie width, height, top/left, margin, padding, box-shadow oder filter. Größenwechsel (z. B. Karussell, bei dem das mittlere Bild größer ist): alle Elemente in der großen Größe anlegen und per transform: scale() verkleinern, Platz in der Reihe über negative margin-inline ausgleichen, Nachbarn per translateX verschieben (Muster: .ms-stage/.ms-slide in millionstories.de, tailwind.config.mjs). Herunterskalieren bleibt scharf, nie kleine Bilder hochskalieren.

Layout-Verschiebungen (CLS): Bilder immer mit width und height (macht <Image /> automatisch), Schriften mit font-display: swap und vorab geladen, keine Inhalte nachträglich oben einschieben.

Skripte: Keine externen Skripte oder Bibliotheken. Eigene Skripte klein halten, nur im <script> der Komponente (Astro bündelt und lädt sie verzögert).

Zwischenspeicher (public/.htaccess): Deploy Now läuft auf Apache. Erscheint nach dem Hochladen eine Fehlerseite („Internal Server Error“), die Datei wieder löschen und Bescheid geben. Ob sie wirkt, zeigt PageSpeed unter „Effiziente Cache-Richtlinien“ (darf dort nicht mehr auftauchen).

Prüfen (vor jeder Lieferung, zusammen mit Punkt 11):
- Seite bauen und mit Lighthouse (mobil, nur „Leistung“) messen: Leistung ≥ 95, keine Meldung zu „nicht zusammengesetzten Animationen“ und „render-blockierenden Anfragen“, CLS < 0,1.
- Unter „Bildübermittlung verbessern“ dürfen nur noch Hinweise zur Komprimierung stehen (die werden bewusst nicht umgesetzt), keine zu großen Bilder.
- Ergebnis in der Lieferung in einem Satz nennen (z. B. „Ladezeit geprüft: PageSpeed mobil 98“).

══════════════════════════════════════
TEIL 2 – NACHSCHLAGEN: VORLAGEN
══════════════════════════════════════

## Anhang A – public/admin/index.html (Punkt 9b)
```html
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Inhalte bearbeiten</title>
  <!-- Einstellungen mit Versionsnummer laden (sonst nutzt der Browser evtl. eine alte, zwischengespeicherte Fassung). Bei jeder Änderung an config.yml erhöhen. -->
  <link href="/admin/config.yml?v=1" type="text/yaml" rel="cms-config-url" />
</head>
<body>
  <script src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"></script>
  <!-- Galerie-Feld: mehrere Fotos auf einmal hochladen, per Ziehen sortieren -->
  <script src="/admin/galerie-widget.js?v=6"></script>
  <!-- Mediathek: alle Bilder an einem Ort, für jedes Bildfeld und unter „Medien“ -->
  <script src="/admin/mediathek.js?v=6"></script>
  <!-- Einfacher Knopf „Speichern“, Status-Etiketten in Übersichten, Tag-Liste, Zeichenzähler für Google-Texte -->
  <script src="/admin/cms-anpassungen.js?v=5"></script>
  <!-- Entwürfe: Leiste unten links (Schalter „Veröffentlicht“, Vorschaulink), „Als Entwurf kopieren“ in der Übersicht, Rückfrage beim Offline-Nehmen -->
  <script src="/admin/entwuerfe.js?v=7"></script>
</body>
</html>
```

## Anhang B – public/admin/config.yml (Punkt 9, getestet)
```yaml
# Decap CMS – <Kundenname>
# Pflegeoberfläche: https://<kundendomain>/admin
# Vorlage aus dem Tech-Context (Punkt 9). Nur Bereiche behalten, die der Kunde pflegt:
#   seiten        – IMMER (Texte und Bilder der Seiten, pro Kunde aufbauen)
#   rechtstexte   – IMMER (Impressum, Datenschutz, Barrierefreiheit)
#   weiterleitungen – IMMER (Vorlage in Anhang C, vor rechtstexte einfügen)
#   portfolio / blog / events + passende Übersichtstexte und Tag-Listen – nur wenn in src/projekt.config.ts aktiv
# Mit „# optional“ markierte Felder dürfen entfernt werden (Website blendet leere Felder aus).

backend:
  name: github
  repo: <github-konto-des-kunden>/<kundeId>
  branch: main
  base_url: https://auth.millionstories.de
  auth_endpoint: index.php
  commit_messages:
    create: 'Inhalt angelegt: {{collection}} „{{slug}}“'
    update: 'Inhalt geändert: {{collection}} „{{slug}}“'
    delete: 'Inhalt gelöscht: {{collection}} „{{slug}}“'
    uploadMedia: 'Bild hochgeladen: {{path}}'
    deleteMedia: 'Bild gelöscht: {{path}}'

locale: de
site_url: https://www.kundendomain.de
display_url: https://www.kundendomain.de
media_folder: src/assets/cms
# Ohne Schrägstrich am Anfang, damit das CMS Bildvorschauen anzeigen kann
public_folder: src/assets/cms

# Mediathek (public/admin/mediathek.js): eine Bildverwaltung für alle Bildfelder,
# das Galerie-Feld und den Menüpunkt „Medien“. Zentrale Bildbeschreibungen in src/data/medien.json.
media_library:
  name: mediathek
  config:
    alt_texte: true

# Saubere Dateinamen (keine Umlaute oder Leerzeichen in Adressen)
slug:
  encoding: ascii
  clean_accents: true
  sanitize_replacement: '-'

collections:
  # ───────────── Seiten: Texte und Bilder (IMMER, Felder pro Seite anpassen) ─────────────
  - name: seiten
    label: Seiten
    label_singular: Seite
    editor: { preview: false }
    files:
      - name: startseite
        label: Startseite
        file: src/data/seiten/startseite.json
        fields:
          - { label: Überschrift, name: titel, widget: string }
          - { label: Einleitung, name: einleitung, widget: text, hint: 'Absätze mit einer Leerzeile trennen' }
          - { label: Titelbild, name: bild, widget: image, required: false, choose_url: false, hint: 'Querformat, mindestens 1600 Pixel breit' }
          # Häufige Fragen – gehören zur Seite (auf jeder Seite möglich, die ein FAQ hat)
          - label: Häufige Fragen
            name: faq
            widget: object
            collapsed: true
            required: false
            fields:
              - { label: Kleine Zeile oben, name: eyebrow, widget: string, required: false }
              - { label: Überschrift, name: ueberschrift, widget: string }
              - { label: Einleitung, name: einleitung, widget: text, required: false }
              - label: Fragen
                name: fragen
                label_singular: Frage
                widget: list
                summary: '{{fields.frage}}'
                hint: 'Reihenfolge per Ziehen ändern. 4–8 Fragen sind ideal. Ohne Fragen wird der Bereich ausgeblendet.'
                fields:
                  - { label: Frage, name: frage, widget: string }
                  - { label: Antwort, name: antwort, widget: text, hint: 'Absätze mit einer Leerzeile trennen' }

      # Weitere Seiten (z. B. Landingpages) mit Schalter „Veröffentlicht“ – Muster, Punkt 9c
      # - name: aktion
      #   label: Aktion
      #   file: src/data/seiten/aktion.json
      #   vorschau_pfad: 'aktion/'
      #   fields:
      #     - { label: Veröffentlicht, name: veroeffentlicht, widget: boolean, default: false, hint: 'Aus = Entwurf: nur über den Vorschaulink erreichbar. Einschalten und „Speichern“ = online.' }
      #     - …

      # Übersichtsseiten der Bausteine – nur für aktive Bausteine behalten
      - name: portfolio-uebersicht
        label: 'Portfolio – Übersichtsseite'
        file: src/data/bausteine/portfolio.json
        fields: &uebersicht
          - { label: Überschrift, name: titel, widget: string }
          - { label: Einleitung, name: einleitung, widget: text, required: false, hint: 'Absätze mit einer Leerzeile trennen' }
          - { label: 'Titel für Google', name: seoTitel, widget: string, required: false, hint: 'Max. ca. 60 Zeichen, z. B. „Referenzen – Webdesign in Würzburg | Firmenname“' }
          - { label: 'Beschreibung für Google', name: seoBeschreibung, widget: text, required: false, hint: 'Max. ca. 155 Zeichen' }
          - { label: 'Text, wenn es noch keine Einträge gibt', name: leerText, widget: string, required: false }
      - name: blog-uebersicht
        label: 'Blog – Übersichtsseite'
        file: src/data/bausteine/blog.json
        fields: *uebersicht
      - name: events-uebersicht
        label: 'Termine – Übersichtsseite'
        file: src/data/bausteine/events.json
        fields: *uebersicht

  # ───────────── Portfolio / Referenzen / Galerien ─────────────
  - name: portfolio
    label: Portfolio            # Anzeigename wie in src/projekt.config.ts (z. B. „Referenzen“)
    label_singular: Projekt
    folder: src/data/portfolio
    create: true
    slug: '{{slug}}'
    identifier_field: titel
    vorschau_pfad: 'portfolio/{{slug}}/'   # Adresse auf der Website (pfad aus src/projekt.config.ts) – für Vorschaulinks
    summary: "{{veroeffentlicht | ternary('Veröffentlicht', 'Entwurf')}} · {{titel}} ({{datum | date('DD.MM.YYYY')}})"
    sortable_fields: ['datum', 'titel']
    editor: { preview: false }
    description: 'So veröffentlichst du einen neuen Eintrag: Inhalte eintragen und oben auf „Speichern“ klicken – er bleibt zunächst ein Entwurf (grau) und ist auf der Website nicht zu sehen. Wenn alles fertig ist, ganz oben „Veröffentlicht“ einschalten und wieder „Speichern“: Nach 1–2 Minuten ist er online (grün).'
    media_folder: /src/assets/cms/portfolio/{{filename}}
    public_folder: src/assets/cms/portfolio/{{filename}}
    fields:
      - { label: Veröffentlicht, name: veroeffentlicht, widget: boolean, default: false, hint: 'Aus = Entwurf (nicht auf der Website). Erst einschalten, wenn alles fertig ist – danach oben auf „Speichern“ klicken.' }
      - { label: Titel, name: titel, widget: string }
      - { label: Datum, name: datum, widget: datetime, format: 'YYYY-MM-DD', date_format: 'DD.MM.YYYY', time_format: false, default: '{{now}}', hint: 'Neueste Projekte stehen oben.' }
      - label: Tags
        name: tags
        widget: relation
        collection: listen
        file: portfolio-tags
        search_fields: ['tags.*.name']
        display_fields: ['tags.*.name']
        value_field: 'tags.*.name'
        multiple: true
        required: false
        hint: 'Neue Tags unter „Listen → Tags Portfolio“ anlegen.'
      - { label: Kurzbeschreibung, name: kurztext, widget: text, required: false, hint: '1–2 Sätze. Erscheint in der Übersicht und bei Google.' }
      - { label: Titelbild, name: titelbild, widget: image, required: false, choose_url: false, hint: 'Ohne Titelbild wird das erste Foto verwendet.' }
      - { label: Kunde, name: kunde, widget: string, required: false }                 # optional
      - { label: Ort, name: ort, widget: string, required: false }                     # optional
      - { label: Leistungen, name: leistungen, widget: string, required: false, hint: 'z. B. Fotografie, Webdesign' }  # optional
      - { label: Link zum Projekt, name: link, widget: string, required: false, hint: 'Vollständige Adresse mit https://' }  # optional
      - { label: Fotos, name: bilder, widget: galerie, required: false, ordner: src/assets/cms/portfolio, hint: 'Mehrere Fotos auf einmal hochladen oder hierher ziehen. Reihenfolge per Ziehen ändern.' }
      - { label: Text, name: body, widget: markdown, required: false, editor_components: [], hint: 'Aufgabe → Lösung → Ergebnis. Fotos bitte über das Feld „Fotos“ einfügen.' }

  # ───────────── Blog ─────────────
  - name: blog
    label: Blog
    label_singular: Beitrag
    folder: src/data/blog
    create: true
    slug: '{{slug}}'
    identifier_field: titel
    vorschau_pfad: 'blog/{{slug}}/'   # Adresse auf der Website (pfad aus src/projekt.config.ts) – für Vorschaulinks
    summary: "{{veroeffentlicht | ternary('Veröffentlicht', 'Entwurf')}} · {{titel}} ({{datum | date('DD.MM.YYYY')}})"
    sortable_fields: ['datum', 'titel']
    editor: { preview: false }
    description: 'So veröffentlichst du einen neuen Beitrag: Inhalte eintragen und oben auf „Speichern“ klicken – er bleibt zunächst ein Entwurf (grau). Wenn alles fertig ist, ganz oben „Veröffentlicht“ einschalten und wieder „Speichern“: Nach 1–2 Minuten ist er online (grün).'
    media_folder: /src/assets/cms/blog/{{filename}}
    public_folder: src/assets/cms/blog/{{filename}}
    fields:
      - { label: Veröffentlicht, name: veroeffentlicht, widget: boolean, default: false, hint: 'Aus = Entwurf (nicht auf der Website). Erst einschalten, wenn alles fertig ist – danach oben auf „Speichern“ klicken.' }
      - { label: Titel, name: titel, widget: string }
      - { label: Datum, name: datum, widget: datetime, format: 'YYYY-MM-DD', date_format: 'DD.MM.YYYY', time_format: false, default: '{{now}}' }
      - { label: 'Aktualisiert am', name: aktualisiert, widget: datetime, format: 'YYYY-MM-DD', date_format: 'DD.MM.YYYY', time_format: false, required: false, default: '', hint: 'Nur ausfüllen, wenn der Beitrag später inhaltlich überarbeitet wurde.' }
      - label: Tags
        name: tags
        widget: relation
        collection: listen
        file: blog-tags
        search_fields: ['tags.*.name']
        display_fields: ['tags.*.name']
        value_field: 'tags.*.name'
        multiple: true
        required: false
      - { label: Kurzbeschreibung, name: kurztext, widget: text, required: false, hint: '1–2 Sätze. Erscheint in der Übersicht und bei Google.' }
      - { label: Titelbild, name: titelbild, widget: image, required: false, choose_url: false }
      - { label: Autor/in, name: autor, widget: string, required: false, hint: 'Name genau so wie im Team bzw. in den Projekt-Einstellungen – dann erscheinen Rolle und Profile automatisch für Google.' }   # optional
      - { label: Text, name: body, widget: markdown, editor_components: [], hint: 'Zwischenüberschriften helfen beim Lesen. Fotos bitte über das Feld „Fotos“ einfügen.' }
      - { label: Fotos, name: bilder, widget: galerie, required: false, ordner: src/assets/cms/blog }   # optional

  # ───────────── Events / Termine ─────────────
  - name: events
    label: Termine
    label_singular: Termin
    folder: src/data/events
    create: true
    slug: '{{slug}}'
    identifier_field: titel
    vorschau_pfad: 'events/{{slug}}/'   # Adresse auf der Website (pfad aus src/projekt.config.ts) – für Vorschaulinks
    summary: "{{veroeffentlicht | ternary('Veröffentlicht', 'Entwurf')}} · {{titel}} ({{beginn | date('DD.MM.YYYY')}})"
    sortable_fields: ['beginn', 'titel']
    editor: { preview: false }
    description: 'Neue Termine bleiben nach „Speichern“ zunächst ein Entwurf (grau). Wenn alles fertig ist, ganz oben „Veröffentlicht“ einschalten und wieder „Speichern“ (grün). Vergangene Termine rutschen auf der Website automatisch nach unten unter „Vergangene Termine“.'
    media_folder: /src/assets/cms/events/{{filename}}
    public_folder: src/assets/cms/events/{{filename}}
    fields:
      - { label: Veröffentlicht, name: veroeffentlicht, widget: boolean, default: false, hint: 'Aus = Entwurf (nicht auf der Website). Erst einschalten, wenn alles fertig ist – danach oben auf „Speichern“ klicken.' }
      - { label: Titel, name: titel, widget: string }
      - { label: Beginn, name: beginn, widget: datetime, format: 'YYYY-MM-DD HH:mm', date_format: 'DD.MM.YYYY', time_format: 'HH:mm', picker_utc: false }
      - { label: Ende, name: ende, widget: datetime, format: 'YYYY-MM-DD HH:mm', date_format: 'DD.MM.YYYY', time_format: 'HH:mm', picker_utc: false, required: false, default: '', hint: 'Optional. Bei mehrtägigen Terminen den letzten Tag eintragen.' }
      - { label: Ganztägig, name: ganztaegig, widget: boolean, default: false, required: false, hint: 'Uhrzeiten werden dann nicht angezeigt.' }
      - { label: Abgesagt, name: abgesagt, widget: boolean, default: false, required: false }
      - { label: Kurzbeschreibung, name: kurztext, widget: text, required: false, hint: '1–2 Sätze: Was, für wen, wo. Erscheint in der Übersicht und bei Google.' }
      - { label: Veranstaltungsort, name: ortName, widget: string, required: false }
      - { label: Adresse, name: adresse, widget: string, required: false, hint: 'Straße Hausnummer, PLZ Ort' }
      - { label: Online-Termin, name: online, widget: boolean, default: false, required: false }   # optional
      - { label: Preis, name: preis, widget: string, required: false, hint: 'z. B. 89 €, ab 19,50 € oder kostenlos – wird so auch an Google übergeben' }   # optional
      - { label: Link zur Anmeldung, name: anmeldeLink, widget: string, required: false, hint: 'Vollständige Adresse mit https://' }   # optional
      - label: Tags   # optional
        name: tags
        widget: relation
        collection: listen
        file: events-tags
        search_fields: ['tags.*.name']
        display_fields: ['tags.*.name']
        value_field: 'tags.*.name'
        multiple: true
        required: false
      - { label: Titelbild, name: titelbild, widget: image, required: false, choose_url: false }
      - { label: Text, name: body, widget: markdown, required: false, editor_components: [] }
      - { label: Fotos, name: bilder, widget: galerie, required: false, ordner: src/assets/cms/events }   # optional

  # ───────────── Listen (Tags je Baustein) ─────────────
  - name: listen
    label: Listen
    editor: { preview: false }
    files:
      - name: portfolio-tags
        label: Tags Portfolio
        file: src/data/listen/portfolio-tags.json
        fields:
          - { label: Tags, name: tags, label_singular: Tag, widget: tagliste, eintraege: src/data/portfolio }
      - name: blog-tags
        label: Tags Blog
        file: src/data/listen/blog-tags.json
        fields:
          - { label: Tags, name: tags, label_singular: Tag, widget: tagliste, eintraege: src/data/blog }
      - name: events-tags
        label: Tags Termine
        file: src/data/listen/events-tags.json
        fields:
          - { label: Tags, name: tags, label_singular: Tag, widget: tagliste, eintraege: src/data/events }

  # ───────────── Rechtstexte (IMMER) ─────────────
  - name: rechtstexte
    label: Rechtstexte
    editor: { preview: false }
    files:
      - name: impressum
        label: Impressum
        file: src/data/rechtstexte/impressum.md
        fields: &rechtstext
          - { label: Überschrift, name: titel, widget: string }
          - { label: 'Beschreibung für Google', name: beschreibung, widget: string, required: false }
          - { label: Stand, name: stand, widget: datetime, format: 'YYYY-MM-DD', date_format: 'DD.MM.YYYY', time_format: false, required: false, default: '' }
          - { label: Text, name: body, widget: markdown, editor_components: [], hint: 'Zeilenumbruch innerhalb eines Absatzes: Umschalt + Enter' }
      - name: datenschutz
        label: Datenschutzerklärung
        file: src/data/rechtstexte/datenschutz.md
        fields: *rechtstext
      - name: barrierefreiheit
        label: Erklärung zur Barrierefreiheit
        file: src/data/rechtstexte/barrierefreiheit.md
        fields: *rechtstext
```

## Anhang C – Weiterleitungen in config.yml (Punkt 9d, vor „rechtstexte“ einfügen)
```yaml
  # ------------------------------------------------------------------
  # Weiterleitungen – alte oder kurze Adressen auf eine Seite umleiten
  # (z. B. nach einem Relaunch oder als Kurzlink für Instagram)
  # ------------------------------------------------------------------
  - name: weiterleitungen
    label: Weiterleitungen
    label_singular: Weiterleitung
    description: 'Hier stehen alle Weiterleitungen der Website: Wer die alte Adresse aufruft, landet automatisch beim Ziel – z. B. alte Adressen nach einem Relaunch oder Kurzlinks für Instagram. Nach dem Speichern ist eine Weiterleitung in 1–2 Minuten aktiv. Echte Seiten haben immer Vorrang: Gibt es unter der alten Adresse eine Seite, bleibt diese erreichbar. Weiterleitungen erscheinen nicht bei Google, das Ziel übernimmt die Google-Platzierung der alten Adresse.'
    folder: src/data/weiterleitungen
    format: json
    extension: json
    create: true
    slug: '{{von}}'
    identifier_field: von
    summary: "{{aktiv | ternary('Aktiv', 'Aus')}} · {{von}} → {{nach}}"
    sortable_fields: ['von']
    editor: { preview: false }
    fields:
      - { label: Aktiv, name: aktiv, widget: boolean, default: true, hint: 'Aus = Weiterleitung vorübergehend abschalten, ohne sie zu löschen.' }
      - { label: Alte Adresse, name: von, widget: string, pattern: ['^\s*\S+\s*$', 'Bitte die Adresse ohne Leerzeichen eingeben, z. B. /lulebt'], hint: 'Die Adresse, die weitergeleitet werden soll – nur der Teil ab dem Schrägstrich, z. B. /lulebt oder /alte-seite/. Eine komplette Adresse mit Domain geht auch.' }
      - { label: Ziel, name: nach, widget: string, hint: 'Wohin es gehen soll: eine Seite dieser Website (z. B. /kontakt/ oder /webdesign-ludwigshafen/?quelle=instagram) oder eine komplette Adresse (https://…).' }
      - { label: Notiz, name: notiz, widget: text, required: false, hint: 'Nur für dich: Wofür gibt es die Weiterleitung, wo wird sie verwendet? (z. B. „Link in Instagram-Bio, Aktion Januar 2027“)' }
```

## Anhang D – .github/workflows/indexnow.yaml (Punkt 1, nur DOMAIN ersetzen)
```yaml
# IndexNow: geänderte Seiten an Suchmaschinen melden (Bing, Yandex, Seznam, Naver …)
# Läuft automatisch, sobald „Deploy Now: Deploy to IONOS“ erfolgreich fertig ist –
# also erst, wenn die neue Fassung der Website online ist.
# Die Liste der Adressen erzeugt der Build (src/integrations/indexnow.mjs → /indexnow.json).
# Von Hand starten (Actions → „IndexNow melden“ → Run workflow) meldet alle Seiten der Sitemap,
# z. B. einmal nach dem Verbinden der Domain.
name: IndexNow melden

on:
  workflow_run:
    workflows: ['Deploy Now: Deploy to IONOS']
    types: [completed]
  workflow_dispatch:

env:
  # Endgültige Domain der Website (wie `site` in astro.config.mjs, ohne Schrägstrich am Ende)
  SEITE: https://DOMAIN

jobs:
  melden:
    if: github.event_name == 'workflow_dispatch' || github.event.workflow_run.conclusion == 'success'
    runs-on: ubuntu-latest
    steps:
      - name: Geänderte Seiten melden
        run: |
          sleep 30
          if ! curl -fsS "$SEITE/indexnow.json?t=$(date +%s)" -o indexnow.json; then
            echo "Keine indexnow.json unter $SEITE gefunden (Domain noch nicht verbunden?) – nichts zu melden."
            exit 0
          fi
          if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
            curl -fsS "$SEITE/sitemap.xml" | grep -o '<loc>[^<]*' | sed 's/<loc>//; s/&amp;/\&/g' | jq -R . | jq -s . > liste.json
            jq --slurpfile l liste.json '{host, key, keyLocation, urlList: $l[0]}' indexnow.json > anfrage.json
          else
            jq '{host, key, keyLocation, urlList}' indexnow.json > anfrage.json
          fi
          ANZAHL=$(jq '.urlList | length' anfrage.json)
          if [ "$ANZAHL" = "0" ]; then
            echo "Keine geänderten Seiten – nichts zu melden."
            exit 0
          fi
          echo "Melde $ANZAHL Adressen:"; jq -r '.urlList[]' anfrage.json
          STATUS=$(curl -sS -o antwort.txt -w '%{http_code}' -X POST 'https://api.indexnow.org/indexnow' \
            -H 'Content-Type: application/json; charset=utf-8' --data @anfrage.json)
          echo "Antwort von IndexNow: $STATUS"; cat antwort.txt || true
          case "$STATUS" in
            200|202) echo "Gemeldet." ;;
            *) echo "::warning::IndexNow hat mit $STATUS geantwortet. Die Website ist davon nicht betroffen." ;;
          esac
```

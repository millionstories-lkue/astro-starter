# Astro Kunden-Starter

Grundgerüst für statische Kundenwebseiten mit Astro, Tailwind CSS und IONOS Deploy Now.
Formulare laufen über den zentralen Formular-Hub `https://forms.millionstories.de/`.

## Einmalige Einrichtung als Vorlage

1. Dieses Projekt in ein neues GitHub-Repository hochladen (z. B. `astro-kunden-starter`).
2. Lokal einmal `npm install` ausführen und die entstandene `package-lock.json` committen.
3. Lokal `npm run build` ausführen und prüfen, dass der Build fehlerfrei durchläuft.
4. Auf GitHub unter **Settings → General** die Option **Template repository** aktivieren.

## Neues Kundenprojekt anlegen

1. Im Starter-Repo auf **Use this template → Create a new repository** klicken,
   Repo nach dem Kunden benennen (z. B. `baeckerei-schmidt`).
2. Das neue Repo mit IONOS Deploy Now verbinden
   (Build Command `npm run build`, Output Directory `dist`).

## Checkliste pro Kunde

- [ ] `astro.config.mjs`: `site` auf die endgültige Domain setzen
- [ ] `tailwind.config.mjs`: CI-Farben (`brand`) und ggf. Schriften eintragen
- [ ] `public/favicon.svg` durch das Kunden-Favicon ersetzen
- [ ] `public/default-og.jpg` durch ein Vorschaubild (1200 × 630 px) ersetzen
- [ ] `src/pages/impressum.astro` und `src/pages/datenschutz.astro` ausfüllen und prüfen lassen
- [ ] Platzhalter „Kundenname“ in den Seitentiteln ersetzen
- [ ] Formular-Eintrag in der `index.php` des Formular-Hubs ergänzen (Domains inkl. Deploy-Now-Vorschau-URL)

## Formulare

`src/lib/formhub-client.js` **nicht verändern** – es ist auf den Formular-Hub abgestimmt
(Spamschutz-Token, Honeypot, Statusmeldungen).

Fertiges Kontaktformular einbinden:

```astro
---
import Kontaktformular from '@/components/Kontaktformular.astro';
---
<Kontaktformular kundeId="baeckerei-schmidt" />
```

`kundeId` und `formType` (Standard: `kontakt`) müssen exakt mit dem Eintrag in der
`index.php` des Hubs übereinstimmen.

## Befehle

| Befehl            | Wirkung                                    |
| ----------------- | ------------------------------------------ |
| `npm install`     | Abhängigkeiten installieren                |
| `npm run dev`     | Entwicklungsserver auf `localhost:4321`    |
| `npm run build`   | Statische Seite nach `dist/` bauen         |
| `npm run preview` | Gebaute Seite lokal ansehen                |

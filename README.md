# Astro Kunden-Starter

Vorlage für statische Kundenwebseiten (Astro + Tailwind CSS), veröffentlicht über IONOS Deploy Now.
Formulare laufen über den Formular-Hub `https://forms.millionstories.de/`, das optionale CMS (Decap) meldet sich über `https://auth.millionstories.de` an.

## Neue Kundenseite

1. **Vorbereitung:** Kunden-ID festlegen (z. B. `baeckerei-schmidt`), GitHub-Konto und IONOS Deploy Now des Kunden anlegen.
2. **Kundenchat:** Im Claude-Projekt `create-website` eingeben, Fragen beantworten, Logo und Fotos hochladen, ZIP herunterladen.
3. **Repo:** Mit dem Kundenkonto hier auf **Use this template → Create a new repository** klicken. Name = Kunden-ID, Private. Dann `millionstories-lkue` unter **Settings → Collaborators** einladen.
4. **Hochladen:** ZIP entpacken, im Kunden-Repo **Add file → Upload files**, Inhalt hineinziehen, **Commit changes**.
5. **Deploy Now:** Im IONOS-Konto des Kunden mit dem Kunden-Repo verbinden: NodeJS 22.x, `npm ci` und `npm run build`, Ausgabe `dist`.
6. **Formular-Hub:** PHP-Block von Claude in `/api/index.php` eintragen.
7. **CMS (optional):** Domains in `/auth/index.php` unter `$erlaubte_websites` eintragen, Pflege unter `/admin`.
   Die CMS-Helfer (`public/admin/vorschau.js`, `public/admin/galerie-widget.js`, `src/lib/cms-bild.ts`) sind schon im Starter;
   Claude liefert pro Kunde nur `public/admin/index.html`, `public/admin/config.yml` und die Inhalte.

Änderungen später: neue ZIP von Claude im Kunden-Repo hochladen, Deploy Now veröffentlicht automatisch.

## Nicht verändern

- `src/lib/formhub-client.js` – Verbindung zum Formular-Hub
- `src/lib/cms-bild.ts` – Bilder aus dem CMS für die Bildoptimierung (auch Unterordner)
- `public/admin/vorschau.js` – sorgt dafür, dass das CMS Bildvorschauen zuverlässig anzeigt
- `public/admin/galerie-widget.js` – CMS-Feld „Galerie“: mehrere Fotos auf einmal hochladen, per Ziehen sortieren
- `src/components/Kontaktformular.astro`, `src/layouts/BaseLayout.astro`
- `package.json`, `package-lock.json`, `tsconfig.json`

# Astro Kunden-Starter

Vorlage für statische Kundenwebseiten (Astro + Tailwind CSS), veröffentlicht über IONOS Deploy Now.
Formulare laufen über den zentralen Formular-Hub `https://forms.millionstories.de/`.

## Neue Kundenseite

1. Im Claude-Projekt einen neuen Chat starten und `create-website` eingeben.
2. Hier auf **Use this template → Create a new repository** klicken. Name = Kunden-ID (z. B. `baeckerei-schmidt`), Private.
3. ZIP von Claude entpacken, im neuen Repo **Add file → Upload files**, Inhalt hineinziehen, **Commit changes**.
4. Kunden im Formular-Hub eintragen (PHP-Block von Claude in die `index.php`).
5. Repo in IONOS Deploy Now verbinden: Node 22, Build `npm run build`, Ausgabe `dist`.

Änderungen später: neue ZIP von Claude im Kunden-Repo hochladen, Deploy Now veröffentlicht automatisch.

## Nicht verändern

- `src/lib/formhub-client.js` – Verbindung zum Formular-Hub
- `package.json`, `package-lock.json`, `tsconfig.json`

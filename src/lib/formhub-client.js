/**
 * Formular-Hub Client für Astro-Seiten
 * Verbindet ein <form> mit https://forms.millionstories.de/
 *
 * Kümmert sich um: Spamschutz-Token (inkl. Zeitfalle), Honeypot,
 * optional Cloudflare Turnstile, JSON-Versand und Statusmeldung.
 *
 * ---------------------------------------------------------------------------
 * Verwendung in einer Astro-Komponente:
 *
 *   <form id="kontakt">
 *     <input name="name" required>
 *     <input name="email" type="email" required>
 *     <textarea name="nachricht" required></textarea>
 *
 *     <!-- Honeypot: für Menschen unsichtbar, NICHT type="hidden" -->
 *     <div style="position:absolute;left:-9999px" aria-hidden="true">
 *       <input name="_honeypot" tabindex="-1" autocomplete="off">
 *     </div>
 *
 *     <button type="submit">Senden</button>
 *     <p data-formhub-status role="status"></p>
 *   </form>
 *
 *   <script>
 *     import { verbindeFormular } from '../lib/formhub-client.js';
 *     verbindeFormular(document.getElementById('kontakt'), {
 *       kundeId: 'muster-gmbh',
 *       formType: 'kontakt',
 *     });
 *   </script>
 *
 * Optional Turnstile (nur wenn beim Kunden 'turnstile_secret' gesetzt ist):
 *   <div class="cf-turnstile" data-sitekey="0x4AAAA…"></div>
 *   <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
 * Das Skript übernimmt das Turnstile-Feld automatisch als _turnstile.
 * ---------------------------------------------------------------------------
 */

const HUB_URL = 'https://forms.millionstories.de/';
const TOKEN_ERNEUERN_MS = 45 * 60 * 1000; // Token läuft serverseitig nach 2 h ab

export function verbindeFormular(form, { kundeId, formType, onStatus } = {}) {
  if (!form) return;

  let token = null;

  // Holt ein frisches Token. Die Zeitfalle startet ab diesem Moment.
  async function holeToken() {
    try {
      const antwort = await fetch(HUB_URL + '?token', { headers: { Accept: 'application/json' } });
      const daten = await antwort.json();
      if (daten.status === 'success') return daten.token;
    } catch (_) { /* Netzwerkfehler – beim Absenden erneut versuchen */ }
    return null;
  }

  holeToken().then((t) => { token = t; });

  // Bei lange geöffneten Seiten Token regelmäßig erneuern. Das neue Token wird
  // erst nach 10 s übernommen, damit es die Zeitfalle sicher passiert hat.
  setInterval(async () => {
    const neu = await holeToken();
    if (neu) setTimeout(() => { token = neu; }, 10_000);
  }, TOKEN_ERNEUERN_MS);

  const statusElement = form.querySelector('[data-formhub-status]');
  const zeigeStatus = onStatus ?? ((status, meldung) => {
    if (!statusElement) return;
    statusElement.textContent = status === 'success'
      ? 'Vielen Dank! Ihre Nachricht wurde versendet.'
      : meldung;
    statusElement.dataset.status = status;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const button = form.querySelector('[type="submit"]');
    if (button) button.disabled = true;

    // Formularfelder sammeln (Mehrfachauswahl wird zum Array)
    const daten = {};
    for (const [name, wert] of new FormData(form)) {
      if (wert instanceof File) continue; // Datei-Uploads werden nicht unterstützt
      daten[name] = name in daten ? [].concat(daten[name], wert) : wert;
    }

    // Turnstile-Feld in ein Steuerfeld umbenennen (erscheint nicht in der Mail)
    if ('cf-turnstile-response' in daten) {
      daten._turnstile = daten['cf-turnstile-response'];
      delete daten['cf-turnstile-response'];
    }

    if (!token) token = await holeToken();

    Object.assign(daten, { _kunde_id: kundeId, _form_type: formType, _token: token ?? '' });

    let httpStatus = 0;
    try {
      const antwort = await fetch(HUB_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(daten),
      });
      httpStatus = antwort.status;
      const ergebnis = await antwort.json();
      zeigeStatus(ergebnis.status, ergebnis.message);
      if (ergebnis.status === 'success') form.reset();
    } catch (_) {
      zeigeStatus('error', 'Verbindungsfehler. Bitte versuchen Sie es erneut.');
    } finally {
      // Nach Erfolg oder Serverfehler ist das Token verbraucht → neues holen.
      // Nach Eingabefehlern (z. B. ungültige E-Mail) bleibt es gültig.
      if (httpStatus === 200 || httpStatus >= 500) token = await holeToken();
      if (window.turnstile) window.turnstile.reset();
      if (button) button.disabled = false;
    }
  });
}

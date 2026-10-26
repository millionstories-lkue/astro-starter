/**
 * Barrierefreie Fehlermeldungen für Formulare (WCAG 3.3.1, 3.3.3, 4.1.3) – Teil des Starter-Repos, nicht verändern.
 *
 * Statt der Browser-Sprechblasen (verschwinden, schlecht lesbar, nicht gestaltbar) erscheint der
 * Fehler als Text direkt unter dem Feld, ist mit dem Feld verknüpft (aria-describedby, aria-invalid),
 * der Fokus springt auf das erste fehlerhafte Feld und die Statusmeldung fasst zusammen.
 * Sobald ein Feld korrigiert ist, verschwindet sein Fehler.
 *
 * Verwendung (VOR verbindeFormular aufrufen, siehe Kontaktformular.astro):
 *   import { formularPruefen } from '@/lib/formular-pruefung';
 *   formularPruefen(form);
 *
 * Geprüft werden die normalen HTML-Regeln: required, type="email", pattern, minlength …
 * Eigener Fehlertext pro Feld: data-fehler="Bitte geben Sie Ihren Namen ein."
 * Ort der Meldung: hinter dem Element mit data-feld (sonst hinter dem Feld bzw. seinem Elternelement).
 * Gestaltung: .feld-fehler und [aria-invalid='true'] in src/styles/global.css.
 */

type Feld = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function beschriftung(feld: Feld): string {
  const label = feld.labels?.[0];
  const text = (label?.textContent ?? feld.getAttribute('aria-label') ?? feld.name ?? '')
    .replace(/\*/g, '')
    .replace(/\(optional\)/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 40 ? '' : text;
}

function meldung(feld: Feld): string {
  const v = feld.validity;
  if (feld.dataset.fehler && (v.valueMissing || v.typeMismatch || v.patternMismatch)) return feld.dataset.fehler;
  const name = beschriftung(feld);
  if (v.valueMissing) {
    if (feld instanceof HTMLInputElement && (feld.type === 'checkbox' || feld.type === 'radio'))
      return name ? `Bitte bestätigen Sie: ${name}.` : 'Bitte setzen Sie hier ein Häkchen.';
    if (feld instanceof HTMLSelectElement) return name ? `Bitte wählen Sie „${name}“ aus.` : 'Bitte wählen Sie etwas aus.';
    return name ? `Bitte füllen Sie das Feld „${name}“ aus.` : 'Bitte füllen Sie dieses Feld aus.';
  }
  if (v.typeMismatch && feld.type === 'email') return 'Bitte geben Sie eine gültige E-Mail-Adresse ein, z. B. name@beispiel.de.';
  if (v.typeMismatch && feld.type === 'url') return 'Bitte geben Sie eine vollständige Adresse mit https:// ein.';
  if (v.tooShort) return `Bitte geben Sie mindestens ${(feld as HTMLInputElement).minLength} Zeichen ein.`;
  if (v.tooLong) return `Bitte geben Sie höchstens ${(feld as HTMLInputElement).maxLength} Zeichen ein.`;
  if (v.rangeUnderflow || v.rangeOverflow) return 'Bitte geben Sie einen Wert im erlaubten Bereich ein.';
  return feld.dataset.fehler || feld.validationMessage || 'Bitte prüfen Sie Ihre Eingabe.';
}

function fehlerElement(feld: Feld): HTMLElement {
  const id = `${feld.id || feld.name}-fehler`;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('p');
    el.id = id;
    el.className = 'feld-fehler';
    const ort = feld.closest('[data-feld]');
    if (ort) ort.append(el);
    else if (feld.type === 'checkbox' || feld.type === 'radio') (feld.parentElement ?? feld).after(el);
    else feld.after(el);
    const beschrieben = (feld.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean);
    if (!beschrieben.includes(id)) feld.setAttribute('aria-describedby', [...beschrieben, id].join(' '));
  }
  return el;
}

function pruefeFeld(feld: Feld): boolean {
  const ok = feld.checkValidity();
  if (ok) {
    feld.removeAttribute('aria-invalid');
    const el = document.getElementById(`${feld.id || feld.name}-fehler`);
    if (el) el.textContent = '';
  } else {
    feld.setAttribute('aria-invalid', 'true');
    fehlerElement(feld).textContent = meldung(feld);
  }
  return ok;
}

export function formularPruefen(form: HTMLFormElement) {
  if (form.dataset.pruefungAktiv) return;
  form.dataset.pruefungAktiv = 'true';
  form.noValidate = true;
  const felder = () =>
    [...form.querySelectorAll<Feld>('input, textarea, select')].filter(
      (f) => f.name !== '_honeypot' && !f.disabled && f.type !== 'hidden' && f.willValidate,
    );

  // Läuft vor dem Versand (capture) und hält ihn bei Fehlern an
  form.addEventListener(
    'submit',
    (ev) => {
      const fehlerhaft = felder().filter((f) => !pruefeFeld(f));
      if (!fehlerhaft.length) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      const status = form.querySelector<HTMLElement>('[data-formhub-status]');
      if (status) {
        status.dataset.status = 'error';
        status.textContent =
          fehlerhaft.length === 1
            ? 'Bitte prüfen Sie das markierte Feld.'
            : `Bitte prüfen Sie die ${fehlerhaft.length} markierten Felder.`;
      }
      fehlerhaft[0].focus();
    },
    { capture: true },
  );

  // Korrigierte Felder sofort entlasten; neue Fehler erst beim Verlassen des Feldes zeigen
  const nachKorrektur = (ev: Event) => {
    const f = ev.target as Feld;
    if (f.getAttribute?.('aria-invalid') === 'true') pruefeFeld(f);
  };
  form.addEventListener('input', nachKorrektur);
  form.addEventListener('change', nachKorrektur);
  form.addEventListener('focusout', (ev) => {
    const f = ev.target as Feld;
    if (f.getAttribute?.('aria-invalid') === 'true' || (f.value && !f.checkValidity?.())) {
      if (f.willValidate && f.name !== '_honeypot') pruefeFeld(f);
    }
  });
  form.addEventListener('reset', () =>
    felder().forEach((f) => {
      f.removeAttribute('aria-invalid');
      const el = document.getElementById(`${f.id || f.name}-fehler`);
      if (el) el.textContent = '';
    }),
  );
}

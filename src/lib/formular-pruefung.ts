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
 * Sprache der Meldungen: nach <html lang> (Deutsch, Italienisch, Englisch; sonst Deutsch).
 */

type Feld = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** Meldungen je Sprache (Sprache der Seite aus <html lang>) */
const TEXTE = {
  de: {
    haekchenName: (n: string) => `Bitte bestätigen Sie: ${n}.`,
    haekchen: 'Bitte setzen Sie hier ein Häkchen.',
    auswahlName: (n: string) => `Bitte wählen Sie „${n}“ aus.`,
    auswahl: 'Bitte wählen Sie etwas aus.',
    feldName: (n: string) => `Bitte füllen Sie das Feld „${n}“ aus.`,
    feld: 'Bitte füllen Sie dieses Feld aus.',
    email: 'Bitte geben Sie eine gültige E-Mail-Adresse ein, z. B. name@beispiel.de.',
    url: 'Bitte geben Sie eine vollständige Adresse mit https:// ein.',
    kurz: (n: number) => `Bitte geben Sie mindestens ${n} Zeichen ein.`,
    lang: (n: number) => `Bitte geben Sie höchstens ${n} Zeichen ein.`,
    bereich: 'Bitte geben Sie einen Wert im erlaubten Bereich ein.',
    pruefen: 'Bitte prüfen Sie Ihre Eingabe.',
    einFeld: 'Bitte prüfen Sie das markierte Feld.',
    mehrere: (n: number) => `Bitte prüfen Sie die ${n} markierten Felder.`,
  },
  it: {
    haekchenName: (n: string) => `Si prega di confermare: ${n}.`,
    haekchen: 'Si prega di spuntare questa casella.',
    auswahlName: (n: string) => `Si prega di selezionare «${n}».`,
    auswahl: 'Si prega di effettuare una scelta.',
    feldName: (n: string) => `Si prega di compilare il campo «${n}».`,
    feld: 'Si prega di compilare questo campo.',
    email: 'Si prega di inserire un indirizzo e-mail valido, ad es. nome@esempio.it.',
    url: 'Si prega di inserire un indirizzo completo con https://.',
    kurz: (n: number) => `Si prega di inserire almeno ${n} caratteri.`,
    lang: (n: number) => `Si prega di inserire al massimo ${n} caratteri.`,
    bereich: 'Si prega di inserire un valore consentito.',
    pruefen: 'Si prega di verificare i dati inseriti.',
    einFeld: 'Si prega di verificare il campo evidenziato.',
    mehrere: (n: number) => `Si prega di verificare i ${n} campi evidenziati.`,
  },
  en: {
    haekchenName: (n: string) => `Please confirm: ${n}.`,
    haekchen: 'Please tick this box.',
    auswahlName: (n: string) => `Please select “${n}”.`,
    auswahl: 'Please make a selection.',
    feldName: (n: string) => `Please fill in “${n}”.`,
    feld: 'Please fill in this field.',
    email: 'Please enter a valid email address, e.g. name@example.com.',
    url: 'Please enter a full address starting with https://.',
    kurz: (n: number) => `Please enter at least ${n} characters.`,
    lang: (n: number) => `Please enter no more than ${n} characters.`,
    bereich: 'Please enter a value within the allowed range.',
    pruefen: 'Please check your entry.',
    einFeld: 'Please check the highlighted field.',
    mehrere: (n: number) => `Please check the ${n} highlighted fields.`,
  },
};
function texte() {
  const sprache = (document.documentElement.lang || 'de').slice(0, 2).toLowerCase();
  return TEXTE[sprache as keyof typeof TEXTE] ?? TEXTE.de;
}

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
  const x = texte();
  if (v.valueMissing) {
    if (feld instanceof HTMLInputElement && (feld.type === 'checkbox' || feld.type === 'radio'))
      return name ? x.haekchenName(name) : x.haekchen;
    if (feld instanceof HTMLSelectElement) return name ? x.auswahlName(name) : x.auswahl;
    return name ? x.feldName(name) : x.feld;
  }
  if (v.typeMismatch && feld.type === 'email') return x.email;
  if (v.typeMismatch && feld.type === 'url') return x.url;
  if (v.tooShort) return x.kurz((feld as HTMLInputElement).minLength);
  if (v.tooLong) return x.lang((feld as HTMLInputElement).maxLength);
  if (v.rangeUnderflow || v.rangeOverflow) return x.bereich;
  return feld.dataset.fehler || feld.validationMessage || x.pruefen;
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
        status.textContent = fehlerhaft.length === 1 ? texte().einFeld : texte().mehrere(fehlerhaft.length);
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

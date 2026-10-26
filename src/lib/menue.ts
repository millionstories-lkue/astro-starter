/**
 * Barrierefreies Aufklapp-Menü (mobiles Menü, auch als Vollbild) – Teil des Starter-Repos, nicht verändern.
 *
 * Markup im Header (Gestaltung frei):
 *   <button type="button" data-menue-knopf aria-controls="hauptmenue" aria-expanded="false">
 *     <span class="sr-only">Menü öffnen</span> …Symbol mit aria-hidden="true"…
 *   </button>
 *   <div id="hauptmenue" hidden data-vollbild> … Links … <button data-menue-schliessen>…</button> </div>
 *   <script> import { menueVerbinden } from '@/lib/menue'; menueVerbinden(); </script>
 *
 * Erledigt automatisch: aria-expanded und Beschriftung des Knopfs, Öffnen/Schließen per Klick,
 * Esc schließt und setzt den Fokus zurück auf den Knopf, ein Klick auf einen Link schließt das Menü,
 * Fokus springt beim Öffnen auf den ersten Link. Mit data-vollbild: Rest der Seite ist solange
 * nicht erreichbar (inert) und scrollt nicht; Tab bleibt im Menü.
 * Das mobile Menü ist ein eigenes Element; die Desktop-Navigation steht getrennt daneben
 * (das Attribut hidden lässt sich per CSS nicht zuverlässig überschreiben). Knopf ab Desktop
 * ausblenden, z. B. class="lg:hidden" – ein offenes Menü schließt sich dann beim Vergrößern.
 * Zum Gestalten: [data-menue-offen] am <html>, aria-expanded="true" am Knopf.
 */
export function menueVerbinden() {
  document.querySelectorAll<HTMLButtonElement>('[data-menue-knopf]').forEach((knopf) => {
    if (knopf.dataset.menueVerbunden) return;
    knopf.dataset.menueVerbunden = 'ja';
    const menue = document.getElementById(knopf.getAttribute('aria-controls') ?? '');
    if (!menue) return;
    const vollbild = menue.hasAttribute('data-vollbild');
    const text = knopf.querySelector('.sr-only');
    const header = knopf.closest('header');
    let offen = false;

    const ausserhalb = () =>
      [...document.body.children].filter(
        (el) => el !== header && !el.contains(menue) && el.tagName !== 'SCRIPT' && !el.classList.contains('skip-link'),
      ) as HTMLElement[];

    const setzen = (auf: boolean, fokusZurueck = true) => {
      offen = auf;
      menue.hidden = !auf;
      knopf.setAttribute('aria-expanded', String(auf));
      if (text) text.textContent = auf ? 'Menü schließen' : 'Menü öffnen';
      document.documentElement.toggleAttribute('data-menue-offen', auf);
      if (vollbild) {
        ausserhalb().forEach((el) => (el.inert = auf));
        document.documentElement.style.overflow = auf ? 'hidden' : '';
      }
      if (auf) menue.querySelector<HTMLElement>('a[href], button:not([disabled])')?.focus();
      else if (fokusZurueck) knopf.focus();
    };

    knopf.addEventListener('click', () => setzen(!offen));
    menue.querySelectorAll('[data-menue-schliessen]').forEach((b) => b.addEventListener('click', () => setzen(false)));
    menue.addEventListener('click', (ev) => {
      if ((ev.target as Element).closest('a[href]')) setzen(false, false);
    });
    document.addEventListener('keydown', (ev) => {
      if (!offen) return;
      if (ev.key === 'Escape') return setzen(false);
      if (ev.key !== 'Tab' || !vollbild) return;
      // Tab im Vollbild-Menü halten (Knopf + Menü)
      const ziele = [knopf, ...menue.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea')]
        .filter((el) => el.offsetParent !== null || el === knopf);
      const erstes = ziele[0];
      const letztes = ziele[ziele.length - 1];
      if (ev.shiftKey && document.activeElement === erstes) {
        ev.preventDefault();
        letztes.focus();
      } else if (!ev.shiftKey && document.activeElement === letztes) {
        ev.preventDefault();
        erstes.focus();
      }
    });
    // Beim Wechsel auf Desktop-Breite geschlossenen Zustand herstellen
    window.addEventListener('resize', () => {
      if (offen && getComputedStyle(knopf).display === 'none') setzen(false, false);
    });
  });
}

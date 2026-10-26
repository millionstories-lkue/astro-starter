/**
 * Bewegung barrierefrei (WCAG 2.2 AA) – Teil des Starter-Repos, nicht verändern.
 * Wird von src/layouts/BaseLayout.astro auf jeder Seite automatisch gestartet.
 *
 * 1. Sicherheitsnetz für Daueranimationen (WCAG 2.2.2 „Pausieren, Beenden, Ausblenden“):
 *    Jede Animation, die sich wiederholt und länger als 5 Sekunden laufen würde (z. B.
 *    `animation: welle 6s infinite`), hört nach höchstens 5 Sekunden SANFT auf – immer am
 *    Ende eines Durchgangs, nie mitten in der Bewegung. Gilt für CSS-Animationen und
 *    element.animate(). Die Gestaltung bleibt frei: einfach normal animieren.
 *    Ausnahme (nur für Ladeanzeigen u. Ä.): Attribut data-dauerhaft am Element oder einem Elternelement.
 *    Ein einzelner Durchgang sollte höchstens 5 Sekunden dauern.
 *
 * 2. „Bewegung reduzieren“ im Betriebssystem: alle Animationen springen sofort ans Ende,
 *    Zahlen zählen nicht hoch, Parallax ist aus, eingeblendete Inhalte sind sofort sichtbar.
 *
 * 3. Hilfen für typische Effekte (alle barrierefrei, ohne weitere Programmierung):
 *    data-bewegung     → Element bekommt die Klasse „bewegt“, sobald es sichtbar ist.
 *                        Animationen damit erst starten, wenn man sie sieht:
 *                        .welle.bewegt { animation: welle 2.5s ease-in-out 2; }
 *    class="einblenden" → Element erscheint beim Scrollen weich (Ausblendung nur mit JavaScript,
 *                        ohne JavaScript oder bei „Bewegung reduzieren“ ist es immer sichtbar).
 *    data-woerter      → Überschrift Wort für Wort einblenden. Screenreader lesen den Text
 *                        normal am Stück (versteckte Textfassung + aria-hidden-Kopie mit Wörtern).
 *    data-zahl         → Zahl zählt hoch, sobald sichtbar: <span data-zahl>2019</span>,
 *                        auch „100+“, „8+“, „1.250 m²“. Screenreader hören nur den Endwert.
 *    data-parallax="0.15" → Element bewegt sich beim Scrollen leicht (Faktor 0.05–0.3).
 */

const MAX_MS = 5000;
const wenigerBewegung = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 1 + 2: Sicherheitsnetz ---------- */

const geprueft = new WeakSet<Animation>();

function zielVon(a: Animation): Element | null {
  const effekt = a.effect as KeyframeEffect | null;
  return effekt?.target ?? null;
}

function begrenzen(a: Animation) {
  if (geprueft.has(a)) return;
  const effekt = a.effect;
  if (!effekt) return;
  const ziel = zielVon(a);
  if (ziel?.closest('[data-dauerhaft]')) {
    geprueft.add(a);
    return;
  }
  const t = effekt.getTiming();
  const dauer = typeof t.duration === 'number' ? t.duration : Number.parseFloat(String(t.duration)) || 0;
  const wdh = t.iterations ?? 1;

  if (wenigerBewegung()) {
    geprueft.add(a);
    try {
      if (!Number.isFinite(wdh)) effekt.updateTiming({ iterations: 1 });
      a.finish();
    } catch {
      a.cancel();
    }
    return;
  }

  // Nur Animationen, die sich wiederholen und insgesamt länger als 5 s laufen würden
  if (dauer <= 0 || wdh <= 1 || dauer * wdh <= MAX_MS) {
    geprueft.add(a);
    return;
  }
  geprueft.add(a);
  // Ganze Durchgänge behalten → endet weich am Ende eines Durchgangs
  const erlaubt = Math.max(1, Math.floor(MAX_MS / dauer));
  try {
    effekt.updateTiming({ iterations: erlaubt });
  } catch {
    /* ältere Browser: Animation läuft weiter */
  }
}

function allePruefen() {
  if (typeof document.getAnimations !== 'function') return;
  document.getAnimations().forEach(begrenzen);
}

function sicherheitsnetz() {
  allePruefen();
  // CSS-Animationen, die später starten (z. B. durch .bewegt oder :hover)
  document.addEventListener('animationstart', () => requestAnimationFrame(allePruefen), true);
  // Animationen aus Skripten (element.animate) haben kein Ereignis → regelmäßig nachsehen
  window.setInterval(() => {
    if (!document.hidden) allePruefen();
  }, 1000);
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', allePruefen);
}

/* ---------- 3: Hilfen ---------- */

let beobachter: IntersectionObserver | null = null;
const beimSichtbarwerden = new WeakMap<Element, () => void>();

function wennSichtbar(el: Element, fn: () => void) {
  if (!('IntersectionObserver' in window)) return fn();
  if (!beobachter) {
    beobachter = new IntersectionObserver(
      (eintraege) =>
        eintraege.forEach((e) => {
          if (!e.isIntersecting) return;
          beobachter!.unobserve(e.target);
          beimSichtbarwerden.get(e.target)?.();
        }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.15 },
    );
  }
  beimSichtbarwerden.set(el, fn);
  beobachter.observe(el);
}

function bewegtSetzen() {
  document.querySelectorAll('[data-bewegung], .einblenden').forEach((el) => {
    if (wenigerBewegung()) return el.classList.add('bewegt');
    wennSichtbar(el, () => el.classList.add('bewegt'));
  });
  // Mit der Tastatur angesteuerte Inhalte sofort zeigen
  document.addEventListener('focusin', (ev) => {
    (ev.target as Element | null)?.closest?.('.einblenden')?.classList.add('bewegt');
  });
}

/** Text einer Überschrift in Wörter zerlegen – Aufbau (z. B. <br>, farbige <span>) bleibt erhalten */
function woerterVorbereiten() {
  document.querySelectorAll<HTMLElement>('[data-woerter]').forEach((el) => {
    if (el.dataset.woerterFertig) return;
    el.dataset.woerterFertig = 'ja';
    const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    const kopie = document.createElement('span');
    kopie.setAttribute('aria-hidden', 'true');
    kopie.append(...[...el.childNodes].map((n) => n.cloneNode(true)));

    let i = 0;
    const zerlegen = (knoten: Node) => {
      [...knoten.childNodes].forEach((kind) => {
        if (kind.nodeType === Node.TEXT_NODE) {
          const teile = (kind.textContent ?? '').split(/(\s+)/);
          const frag = document.createDocumentFragment();
          teile.forEach((teil) => {
            if (!teil) return;
            if (/^\s+$/.test(teil)) return frag.append(document.createTextNode(teil));
            const wort = document.createElement('span');
            wort.className = 'wort';
            wort.style.setProperty('--i', String(i++));
            wort.textContent = teil;
            frag.append(wort);
          });
          kind.replaceWith(frag);
        } else if (kind.nodeType === Node.ELEMENT_NODE) {
          zerlegen(kind);
        }
      });
    };
    zerlegen(kopie);

    const lesbar = document.createElement('span');
    lesbar.className = 'sr-only';
    lesbar.textContent = text;
    el.replaceChildren(lesbar, kopie);
    if (wenigerBewegung()) el.classList.add('bewegt');
    else wennSichtbar(el, () => el.classList.add('bewegt'));
  });
}

function zahlenVorbereiten() {
  document.querySelectorAll<HTMLElement>('[data-zahl]').forEach((el) => {
    if (el.dataset.zahlFertig) return;
    el.dataset.zahlFertig = 'ja';
    const original = (el.textContent ?? '').trim();
    const m = original.match(/^(\D*?)(\d[\d.]*)(.*)$/s);
    if (!m) return;
    const [, vor, zahlText, nach] = m;
    const ziel = Number.parseInt(zahlText.replace(/\./g, ''), 10);
    if (!Number.isFinite(ziel)) return;
    const mitPunkt = zahlText.includes('.');
    const format = (n: number) => (mitPunkt ? n.toLocaleString('de-DE') : String(n));
    // Jahreszahlen zählen nur die letzten Jahre hoch, sonst von 0
    const start = Number(el.dataset.zahlStart ?? (ziel >= 1900 && ziel <= 2100 ? ziel - 25 : 0));

    const anzeige = document.createElement('span');
    anzeige.setAttribute('aria-hidden', 'true');
    anzeige.textContent = original;
    const lesbar = document.createElement('span');
    lesbar.className = 'sr-only';
    lesbar.textContent = original;
    el.replaceChildren(anzeige, lesbar);
    if (wenigerBewegung()) return;

    anzeige.textContent = `${vor}${format(start)}${nach}`;
    wennSichtbar(el, () => {
      const dauer = 1400;
      const beginn = performance.now();
      const schritt = (jetzt: number) => {
        const p = Math.min(1, (jetzt - beginn) / dauer);
        const weich = 1 - Math.pow(1 - p, 3);
        anzeige.textContent = `${vor}${format(Math.round(start + (ziel - start) * weich))}${nach}`;
        if (p < 1) requestAnimationFrame(schritt);
      };
      requestAnimationFrame(schritt);
    });
  });
}

function parallax() {
  const elemente = [...document.querySelectorAll<HTMLElement>('[data-parallax]')];
  if (!elemente.length) return;
  let geplant = false;
  const setzen = () => {
    geplant = false;
    const aus = wenigerBewegung();
    const h = window.innerHeight;
    elemente.forEach((el) => {
      if (aus) return void (el.style.transform = '');
      const faktor = Number(el.dataset.parallax) || 0.15;
      const r = el.getBoundingClientRect();
      const abstand = r.top + r.height / 2 - h / 2;
      el.style.transform = `translate3d(0, ${(-abstand * faktor).toFixed(1)}px, 0)`;
    });
  };
  const planen = () => {
    if (!geplant) {
      geplant = true;
      requestAnimationFrame(setzen);
    }
  };
  window.addEventListener('scroll', planen, { passive: true });
  window.addEventListener('resize', planen);
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', planen);
  setzen();
}

/** Startet alles – wird vom BaseLayout auf jeder Seite aufgerufen */
export function bewegungStarten() {
  woerterVorbereiten();
  zahlenVorbereiten();
  bewegtSetzen();
  parallax();
  sicherheitsnetz();
}

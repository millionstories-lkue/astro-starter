/**
 * Entwürfe im CMS (Decap): Vorschaulink, „Als Entwurf kopieren“, Rückfrage beim Offline-Nehmen
 * ------------------------------------------------------------
 * Im geöffneten Eintrag bzw. in der geöffneten Seite erscheint unten links eine Leiste – alles an
 * einer Stelle. Sie enthält den Schalter „Veröffentlicht“ (bedient das Feld „veroeffentlicht“,
 * das im Formular dafür ausgeblendet wird) und je nach gespeichertem Stand:
 *   - Entwurf:        „Vorschaulink kopieren“ und „Vorschau öffnen“ – die Vorschau
 *                     (/admin/entwurf.html#/<adresse>/) sehen nur Personen, die im CMS angemeldet
 *                     sind und Zugriff aufs Repo haben (siehe src/integrations/entwuerfe.mjs)
 *   - Veröffentlicht: „Auf der Website ansehen“
 * In der Übersicht von Einträgen (Projekte, Blog …) hat jeder Eintrag rechts einen Knopf
 * „Als Entwurf kopieren“: fragt nach dem Titel der Kopie, bildet daraus die Adresse (wie
 * beim Anlegen), legt die Kopie des gespeicherten Stands als Entwurf an und öffnet sie.
 * In der Übersicht von Seiten zeigt ein Etikett „Veröffentlicht“ / „Entwurf“, welche Seite live ist. Decaps eigenes „Duplizieren“ im
 * Speichern-Menü ist ausgeblendet (es würde die Kopie mit Schalter „Veröffentlicht“ übernehmen).
 * Wer eine veröffentlichte Seite auf „Entwurf“ stellt, wird vor dem Speichern gefragt,
 * ob sie wirklich offline gehen soll.
 *
 * Einrichtung in public/admin/config.yml – pro Sammlung bzw. pro Seite die Adresse auf der Website:
 *   - name: portfolio
 *     folder: src/data/portfolio
 *     vorschau_pfad: 'portfolio/{{slug}}/'      # wie pfad in src/projekt.config.ts
 *   files:
 *     - name: aktion
 *       file: src/data/seiten/aktion.json
 *       vorschau_pfad: 'aktion/'
 *
 * Benötigt mediathek.js (GitHub-Zugriff). Diese Datei ist Teil des Starter-Repos – nicht verändern.
 */
(function () {
  if (!window.CMS) return;

  function m() {
    return window.MSMediathek;
  }

  /* =====================================================================
   * config.yml lesen (Sammlungen mit vorschau_pfad)
   * ===================================================================== */
  var konfig = null;
  function ohneQuotes(w) {
    return String(w || '')
      .replace(/\s+#.*$/, '')
      .trim()
      .replace(/^['"]|['"]$/g, '');
  }
  function ladeKonfig() {
    if (konfig) return konfig;
    konfig = fetch('/admin/config.yml', { cache: 'no-store' })
      .then(function (r) {
        return r.text();
      })
      .then(function (t) {
        var site = ohneQuotes((t.match(/^site_url:\s*(.+)$/m) || [])[1]) || location.origin;
        var sammlungen = {};
        var s = null;
        var datei = null;
        t.split(/\r?\n/).forEach(function (zeile) {
          var mm;
          if ((mm = zeile.match(/^ {2}- name:\s*(.+)$/))) {
            s = sammlungen[ohneQuotes(mm[1])] = { name: ohneQuotes(mm[1]), dateien: {} };
            datei = null;
            return;
          }
          if (!s) return;
          if ((mm = zeile.match(/^ {6}- name:\s*(.+)$/))) {
            datei = s.dateien[ohneQuotes(mm[1])] = {};
            return;
          }
          if ((mm = zeile.match(/^ {4}(folder|extension|identifier_field|vorschau_pfad):\s*(.+)$/))) {
            s[mm[1]] = ohneQuotes(mm[2]);
            datei = null;
            return;
          }
          if (datei && (mm = zeile.match(/^ {8}(file|vorschau_pfad):\s*(.+)$/))) datei[mm[1]] = ohneQuotes(mm[2]);
        });
        return { site: site.replace(/\/+$/, ''), sammlungen: sammlungen };
      });
    return konfig;
  }

  /** Datei im Repo lesen (null, wenn es sie nicht gibt) */
  function lesen(pfad) {
    return m()
      .einstellungen()
      .then(function (e) {
        return m().gh('/repos/' + e.repo + '/contents/' + pfad.split('/').map(encodeURIComponent).join('/') + '?ref=' + encodeURIComponent(e.branch), { roh: 'text' });
      })
      .catch(function (f) {
        if (f && f.status === 404) return null;
        throw f;
      });
  }

  /** Wert von „veroeffentlicht“ (fehlt das Feld, gilt die Seite als veröffentlicht – wie beim Build) */
  function istVeroeffentlicht(text, pfad) {
    if (/\.json$/i.test(pfad)) {
      try {
        return JSON.parse(text).veroeffentlicht !== false;
      } catch (e) {
        return true;
      }
    }
    var fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    var w = fm && fm[1].match(/^veroeffentlicht:\s*(\S+)/m);
    return !(w && /^false$/i.test(w[1]));
  }

  /* =====================================================================
   * Aktuell geöffneter Eintrag
   * ===================================================================== */
  function aktuelleAdresse() {
    var mm = location.hash.match(/^#\/collections\/([^/]+)\/entries\/(.+?)\/?$/);
    return mm ? { sammlung: decodeURIComponent(mm[1]), slug: decodeURIComponent(mm[2]) } : null;
  }

  function eintragInfo(k, adr) {
    var s = k.sammlungen[adr.sammlung];
    if (!s) return null;
    if (s.folder) {
      if (!s.vorschau_pfad) return null;
      return {
        sammlung: s.name,
        slug: adr.slug,
        ordner: s.folder.replace(/^\/+|\/+$/g, ''),
        pfad: s.folder.replace(/^\/+|\/+$/g, '') + '/' + adr.slug + '.' + (s.extension || 'md'),
        adresse: s.vorschau_pfad.replace(/\{\{\s*slug\s*\}\}/g, adr.slug).replace(/^\/+/, ''),
        titelFeld: s.identifier_field || 'title',
        kopierbar: true,
      };
    }
    var d = s.dateien[adr.slug];
    if (!d || !d.vorschau_pfad || !d.file) return null;
    return { sammlung: s.name, slug: adr.slug, pfad: d.file.replace(/^\/+/, ''), adresse: d.vorschau_pfad.replace(/^\/+/, ''), kopierbar: false };
  }

  /* =====================================================================
   * Leiste
   * ===================================================================== */
  var stil = document.createElement('style');
  stil.textContent =
    '.ms-entwurf-leiste{position:fixed;left:16px;bottom:16px;z-index:100000;display:flex;flex-wrap:wrap;align-items:center;gap:8px;max-width:calc(100vw - 32px);' +
    'padding:10px 12px;border-radius:10px;background:#fff;border:1px solid #dfe3ea;box-shadow:0 8px 28px rgba(0,0,0,.16);font:13px/1.4 system-ui,-apple-system,sans-serif;color:#313d3e}' +
    '.ms-entwurf-leiste[hidden]{display:none}' +
    '.ms-entwurf-leiste .ms-el-status{display:inline-flex;align-items:center;gap:6px;font-weight:600;margin-right:4px}' +
    '.ms-entwurf-leiste .ms-el-punkt{width:9px;height:9px;border-radius:50%}' +
    '.ms-entwurf-leiste button,.ms-entwurf-leiste a{display:inline-flex;align-items:center;min-height:32px;padding:0 11px;border-radius:6px;border:0;background:#eceef2;color:#313d3e;font:600 13px system-ui,-apple-system,sans-serif;cursor:pointer;text-decoration:none}' +
    '.ms-entwurf-leiste button:hover,.ms-entwurf-leiste a:hover{background:#dfe3ea}' +
    '.ms-entwurf-leiste .ms-el-haupt{background:#3a69c7;color:#fff}' +
    '.ms-entwurf-leiste .ms-el-haupt:hover{background:#2f58ab}' +
    '.ms-entwurf-leiste .ms-el-info{flex-basis:100%;margin:2px 0 0;font-size:12px;color:#6b7280}' +
    '.ms-entwurf-leiste input{flex:1 1 220px;min-width:0;min-height:30px;padding:0 8px;border:1px solid #cfd3da;border-radius:6px;font:12px ui-monospace,monospace;color:#313d3e}' +
    '@media (max-width:600px){.ms-entwurf-leiste{left:8px;right:8px;bottom:8px;max-width:none}}' +
    '.ms-entwurf-leiste .ms-el-schalter{display:inline-flex;align-items:center;gap:8px;min-height:32px;padding:0 10px 0 4px;margin-right:4px;border-radius:6px;background:transparent;font-weight:600}' +
    '.ms-entwurf-leiste .ms-el-schalter:hover{background:#f1f3f6}' +
    '.ms-el-spur{position:relative;width:38px;height:22px;border-radius:11px;background:#c9ced6;transition:background .15s}' +
    '.ms-el-spur::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}' +
    '.ms-el-schalter[aria-checked="true"] .ms-el-spur{background:#1b7f3b}' +
    '.ms-el-schalter[aria-checked="true"] .ms-el-spur::after{transform:translateX(16px)}' +
    '.ms-entwurf-leiste .ms-el-trenner{width:1px;align-self:stretch;margin:2px 4px;background:#dfe3ea}' +
    '.ms-entwurf-leiste .ms-el-geaendert{flex-basis:100%;margin:2px 0 0;font-size:12px;font-weight:600;color:#9a5b00}' +
    '.ms-hat-kopie{position:relative}' +
    'body.ms-mit-leiste [class*="ControlPaneContainer"]{padding-bottom:150px}' +
    '.ms-hat-kopie > a h2{padding-right:52px}' +
    '.ms-kopie-knopf{position:absolute;right:14px;top:50%;transform:translateY(-50%);z-index:2;display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;padding:0;border:1px solid #dfe3ea;border-radius:8px;background:#fff;color:#5f6673;cursor:pointer}' +
    '.ms-kopie-knopf:hover,.ms-kopie-knopf:focus-visible{background:#3a69c7;border-color:#3a69c7;color:#fff}' +
    '.ms-kopie-knopf[disabled]{opacity:.5;cursor:wait}' +
    '.ms-kopie-knopf.ist-oben{top:10px;transform:none}';
  document.head.appendChild(stil);

  var leiste = document.createElement('div');
  leiste.className = 'ms-entwurf-leiste';
  leiste.setAttribute('role', 'region');
  leiste.setAttribute('aria-label', 'Vorschau und Entwurf');
  leiste.hidden = true;
  function anhaengen() {
    if (document.body && leiste.parentNode !== document.body) document.body.appendChild(leiste);
  }

  /* ---------- Schalter „Veröffentlicht“ in der Leiste ---------- */
  function originalSchalter() {
    return document.querySelector('button[id^="veroeffentlicht-field"][role="switch"]');
  }
  var schalterEl = document.createElement('button');
  schalterEl.type = 'button';
  schalterEl.className = 'ms-el-schalter';
  schalterEl.setAttribute('role', 'switch');
  schalterEl.innerHTML = '<span class="ms-el-spur" aria-hidden="true"></span><span>Veröffentlicht</span>';
  schalterEl.addEventListener('click', function () {
    var o = originalSchalter();
    if (o) o.click();
    setTimeout(abgleichen, 0);
  });
  var geaendertEl = document.createElement('p');
  geaendertEl.className = 'ms-el-geaendert';
  geaendertEl.textContent = 'Geändert – oben auf „Speichern“ klicken, damit es gilt.';

  /** Leisten-Schalter mit dem Feld abgleichen, Feld im Formular ausblenden */
  function abgleichen() {
    var o = originalSchalter();
    var feld = o && o.closest('[class*="ControlContainer"]');
    if (!zustand || !o) {
      schalterEl.hidden = true;
      geaendertEl.hidden = true;
      if (feld && feld.dataset.msVersteckt) {
        feld.style.display = '';
        delete feld.dataset.msVersteckt;
      }
      return;
    }
    if (feld && !feld.dataset.msVersteckt) {
      feld.style.display = 'none';
      feld.dataset.msVersteckt = '1';
    }
    var an = o.getAttribute('aria-checked') === 'true';
    schalterEl.hidden = false;
    schalterEl.setAttribute('aria-checked', String(an));
    var gespeichert = zustand.neu ? false : zustand.veroeffentlicht;
    geaendertEl.hidden = zustand.laedt || zustand.fehler || an === gespeichert;
  }

  var zustand = null; // { info, veroeffentlicht, text, url, schluessel }
  var lauf = 0;

  function knopf(text, klasse, fn) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    if (klasse) b.className = klasse;
    b.addEventListener('click', fn);
    return b;
  }
  function link(text, href, klasse) {
    var a = document.createElement('a');
    a.textContent = text;
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    if (klasse) a.className = klasse;
    return a;
  }
  function status(text, farbe) {
    var s = document.createElement('span');
    s.className = 'ms-el-status';
    var p = document.createElement('span');
    p.className = 'ms-el-punkt';
    p.style.background = farbe;
    s.appendChild(p);
    s.appendChild(document.createTextNode(text));
    return s;
  }
  function info(text) {
    var p = document.createElement('p');
    p.className = 'ms-el-info';
    p.textContent = text;
    return p;
  }

  function zeichnen() {
    anhaengen();
    leiste.textContent = '';
    var z = zustand;
    if (!z) {
      leiste.hidden = true;
      if (document.body) document.body.classList.remove('ms-mit-leiste');
      return;
    }
    leiste.hidden = false;
    document.body.classList.add('ms-mit-leiste');
    leiste.appendChild(schalterEl);
    var trenner = document.createElement('span');
    trenner.className = 'ms-el-trenner';
    leiste.appendChild(trenner);
    abgleichen();
    if (z.laedt) {
      leiste.appendChild(status('Status wird geladen …', '#c0c4cc'));
      return;
    }
    if (z.fehler) {
      leiste.appendChild(status('Status unbekannt', '#c0c4cc'));
      leiste.appendChild(info(z.fehler));
      return;
    }
    if (z.neu) {
      leiste.appendChild(info('Noch nicht gespeichert. Nach dem ersten Speichern gibt es hier den Vorschaulink.'));
      leiste.appendChild(geaendertEl);
      return;
    }
    if (z.veroeffentlicht) {
      leiste.appendChild(link('Auf der Website ansehen ↗', z.url));
    } else {
      leiste.appendChild(
        knopf('Vorschaulink kopieren', 'ms-el-haupt', function () {
          kopieren(z.url, this);
        }),
      );
      leiste.appendChild(link('Vorschau öffnen ↗', z.url));
    }
    leiste.appendChild(
      info(
        z.veroeffentlicht
          ? 'Gespeichert als veröffentlicht. Ausschalten und speichern nimmt die Seite offline.'
          : 'Gespeichert als Entwurf – nicht auf der Website. Die Vorschau sehen nur Personen, die im CMS angemeldet sind (nach „Speichern“ in 1–3 Minuten aktuell). Einschalten und speichern = online.',
      ),
    );
    leiste.appendChild(geaendertEl);
  }

  function kopieren(text, knopfEl) {
    function fertig() {
      var alt = knopfEl.textContent;
      knopfEl.textContent = 'Kopiert ✓';
      setTimeout(function () {
        knopfEl.textContent = alt;
      }, 1800);
    }
    function ausweich() {
      var feld = document.createElement('input');
      feld.value = text;
      feld.readOnly = true;
      feld.setAttribute('aria-label', 'Vorschaulink');
      leiste.appendChild(feld);
      feld.focus();
      feld.select();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(fertig, ausweich);
    else ausweich();
  }

  function aktualisieren(ruhig) {
    var adr = aktuelleAdresse();
    var nr = ++lauf;
    if (!adr || !m()) {
      zustand = null;
      zeichnen();
      return Promise.resolve();
    }
    return ladeKonfig().then(function (k) {
      if (nr !== lauf) return;
      var inf = eintragInfo(k, adr);
      if (!inf) {
        zustand = null;
        zeichnen();
        return;
      }
      if (!ruhig || !zustand || zustand.info.pfad !== inf.pfad) {
        zustand = { info: inf, laedt: true };
        zeichnen();
      }
      return lesen(inf.pfad).then(
        function (text) {
          if (nr !== lauf) return;
          if (text === null) {
            zustand = { info: inf, neu: true };
          } else {
            var veroeffentlicht = istVeroeffentlicht(text, inf.pfad);
            var url = veroeffentlicht ? k.site + '/' + inf.adresse : location.origin + '/admin/entwurf.html#/' + inf.adresse;
            zustand = { info: inf, text: text, veroeffentlicht: veroeffentlicht, url: url };
          }
          zeichnen();
        },
        function (f) {
          if (nr !== lauf) return;
          zustand = { info: inf, fehler: f.message };
          zeichnen();
        },
      );
    });
  }

  /* =====================================================================
   * Als Entwurf kopieren
   * ===================================================================== */
  function frontmatterSetzen(text, feld, wertText) {
    var fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) return '---\n' + feld + ': ' + wertText + '\n---\n' + text;
    var kopf = fm[1];
    var re = new RegExp('^' + feld + ':.*$', 'm');
    kopf = re.test(kopf) ? kopf.replace(re, function () {
      return feld + ': ' + wertText;
    }) : feld + ': ' + wertText + '\n' + kopf;
    return '---\n' + kopf + '\n---' + text.slice(fm[0].length);
  }
  function titelLesen(text, feld) {
    var fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    var w = fm && fm[1].match(new RegExp('^' + feld + ':\\s*(.*)$', 'm'));
    if (!w) return '';
    var roh = w[1].trim();
    if (/^".*"$/.test(roh)) {
      try {
        return JSON.parse(roh);
      } catch (e) {}
    }
    return roh.replace(/^'(.*)'$/, '$1').replace(/''/g, "'");
  }

  /** Adresse aus dem Titel bilden – wie Decap (slug: ascii, clean_accents, Ersatz „-“) */
  function slugAus(titel) {
    return String(titel || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/ß/g, 'ss')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
      .replace(/-+$/, '');
  }

  /** Kopie eines gespeicherten Eintrags als Entwurf anlegen und öffnen */
  function alsEntwurfKopieren(inf, knopfEl) {
    if (knopfEl) knopfEl.disabled = true;
    function ende() {
      if (knopfEl) knopfEl.disabled = false;
    }
    var ext = inf.pfad.slice(inf.pfad.lastIndexOf('.'));
    var text = null;
    var titel = '';
    lesen(inf.pfad)
      .then(function (t) {
        if (t === null) throw new Error('Der Eintrag ist noch nicht gespeichert.');
        text = t;
        var alt = titelLesen(t, inf.titelFeld);
        var eingabe = window.prompt(
          'Kopie als Entwurf anlegen\n\nTitel der Kopie – daraus entsteht auch die Adresse der Seite (sie lässt sich später nicht mehr ändern). Kopiert wird der zuletzt gespeicherte Stand, das Original bleibt unverändert.',
          alt,
        );
        if (eingabe === null || !eingabe.trim()) return null;
        titel = eingabe.trim();
        var basis = slugAus(titel) || inf.slug + '-kopie';
        hinweis('Kopie wird angelegt …');
        function freierName(n) {
          var slug = n === 1 ? basis : basis + '-' + n;
          return lesen(inf.ordner + '/' + slug + ext).then(function (x) {
            return x === null ? slug : n < 50 ? freierName(n + 1) : Promise.reject(new Error('Kein freier Dateiname gefunden.'));
          });
        }
        return freierName(1);
      })
      .then(function (slug) {
        if (!slug) return null;
        var neu = frontmatterSetzen(text, 'veroeffentlicht', 'false');
        neu = frontmatterSetzen(neu, inf.titelFeld, JSON.stringify(titel));
        return m()
          .commit([{ pfad: inf.ordner + '/' + slug + ext, text: neu }], 'Entwurf kopiert: ' + inf.sammlung + ' „' + slug + '“')
          .then(function () {
            return slug;
          });
      })
      .then(
        function (slug) {
          if (!slug) return ende();
          hinweis('Kopie angelegt (Adresse: ' + slug + ') – sie wird geöffnet …');
          setTimeout(function () {
            location.hash = '#/collections/' + encodeURIComponent(inf.sammlung) + '/entries/' + encodeURIComponent(slug);
            location.reload();
          }, 600);
        },
        function (f) {
          ende();
          hinweis('Die Kopie konnte nicht angelegt werden: ' + f.message, true, 15000);
        },
      );
  }

  /* =====================================================================
   * Rückfrage: veröffentlichte Seite auf „Entwurf“ stellen
   * ===================================================================== */
  if (window.CMS.registerEventListener) {
    window.CMS.registerEventListener({
      name: 'preSave',
      handler: function (daten) {
        var z = zustand;
        var entry = daten && daten.entry;
        if (!z || !z.veroeffentlicht || !entry || !entry.get) return undefined;
        if (entry.get('path') && entry.get('path') !== z.info.pfad) return undefined;
        var neu = entry.getIn(['data', 'veroeffentlicht']);
        if (neu !== false) return undefined;
        var ok = window.confirm(
          'Diese Seite ist gerade öffentlich.\n\nWenn du sie auf „Entwurf“ stellst, ist sie nach dem Speichern in 1–2 Minuten nicht mehr auf der Website (auch Links darauf funktionieren dann nicht mehr). Sie ist dann nur noch über den Vorschaulink zu sehen.\n\nWirklich offline nehmen?',
        );
        if (!ok) throw new Error('Nicht gespeichert – die Seite bleibt veröffentlicht. Schalte „Veröffentlicht“ wieder ein.');
        return undefined;
      },
    });
    window.CMS.registerEventListener({
      name: 'postSave',
      handler: function () {
        setTimeout(function () {
          aktualisieren(true);
        }, 1500);
        return undefined;
      },
    });
  }

  /* =====================================================================
   * Übersicht: Knopf „Als Entwurf kopieren“ an jedem Eintrag
   * ===================================================================== */
  var KOPIE_ICON =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>';

  function uebersichtKnoepfe() {
    var mm = location.hash.match(/^#\/collections\/([^/?]+)\/?(\?.*)?$/);
    if (!mm || !m()) return;
    var name = decodeURIComponent(mm[1]);
    ladeKonfig().then(function (k) {
      var s = k.sammlungen[name];
      if (s && !s.folder) return seitenEtiketten(s);
      if (!s || !s.folder) return;
      var links = document.querySelectorAll('a[href^="#/collections/' + name + '/entries/"]');
      Array.prototype.forEach.call(links, function (a) {
        var karte = a.parentElement;
        if (!karte || karte.querySelector(':scope > .ms-kopie-knopf')) return;
        var slug = decodeURIComponent(a.getAttribute('href').split('/entries/')[1] || '').replace(/\/$/, '');
        if (!slug) return;
        var inf = eintragInfo(k, { sammlung: name, slug: slug }) || {
          sammlung: name,
          slug: slug,
          ordner: s.folder.replace(/^\/+|\/+$/g, ''),
          pfad: s.folder.replace(/^\/+|\/+$/g, '') + '/' + slug + '.' + (s.extension || 'md'),
          titelFeld: s.identifier_field || 'title',
          kopierbar: true,
        };
        var titel = (a.textContent || slug).replace(/^(Veröffentlicht|Entwurf)/, '').trim();
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ms-kopie-knopf' + (a.querySelector('img') ? ' ist-oben' : '');
        b.title = 'Als Entwurf kopieren';
        b.setAttribute('aria-label', '„' + titel + '“ als Entwurf kopieren');
        b.innerHTML = KOPIE_ICON;
        b.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          alsEntwurfKopieren(inf, b);
        });
        karte.classList.add('ms-hat-kopie');
        karte.appendChild(b);
      });
    });
  }

  /** Seiten (feste Dateien): Etikett „Veröffentlicht“ / „Entwurf“ vor dem Namen */
  var seitenStatus = {}; // Pfad → Promise<boolean>
  function seitenEtiketten(s) {
    var mitSchalter = Object.keys(s.dateien).some(function (n) {
      return s.dateien[n].vorschau_pfad;
    });
    if (!mitSchalter) return;
    var links = document.querySelectorAll('a[href^="#/collections/' + s.name + '/entries/"]');
    Array.prototype.forEach.call(links, function (a) {
      var h2 = a.querySelector('h2') || a;
      if (h2.dataset.msStatus) return;
      var name = decodeURIComponent(a.getAttribute('href').split('/entries/')[1] || '').replace(/\/$/, '');
      var d = s.dateien[name];
      if (!d || !d.file) return;
      h2.dataset.msStatus = '1';
      var pfad = d.file.replace(/^\/+/, '');
      if (!seitenStatus[pfad]) {
        seitenStatus[pfad] = lesen(pfad).then(function (t) {
          return t === null ? null : istVeroeffentlicht(t, pfad);
        });
      }
      seitenStatus[pfad].then(function (an) {
        if (an === null || h2.querySelector('.ms-status')) return;
        var marke = document.createElement('span');
        marke.className = 'ms-status';
        marke.textContent = an ? 'Veröffentlicht' : 'Entwurf';
        marke.style.color = an ? '#1b7f3b' : '#5f6673';
        marke.style.background = an ? '#e3f4e8' : '#eceef2';
        h2.style.justifyContent = 'flex-start';
        h2.style.alignItems = 'center';
        h2.insertBefore(marke, h2.firstChild);
      }, function () {});
    });
  }

  /** Decaps „Duplizieren“ im Speichern-Menü ausblenden (Kopien sollen immer Entwürfe sein) */
  function duplizierenAusblenden() {
    var items = document.querySelectorAll('[role="menuitem"]');
    Array.prototype.forEach.call(items, function (el) {
      if (/^\s*(Duplizieren|Speichern und duplizieren|Veröffentlichen und duplizieren)\s*$/i.test(el.textContent || '')) el.style.display = 'none';
    });
  }

  var geplant = false;
  new MutationObserver(function () {
    if (geplant) return;
    geplant = true;
    requestAnimationFrame(function () {
      geplant = false;
      duplizierenAusblenden();
      uebersichtKnoepfe();
      abgleichen();
    });
  }).observe(document.documentElement, { childList: true, subtree: true });

  /* =====================================================================
   * Hinweis unten rechts
   * ===================================================================== */
  var hinweisEl = null;
  function hinweis(text, fehler, dauer) {
    if (!hinweisEl) {
      hinweisEl = document.createElement('div');
      hinweisEl.setAttribute('role', 'status');
      hinweisEl.style.cssText =
        'position:fixed;right:20px;bottom:20px;z-index:100001;max-width:420px;padding:14px 16px;border-radius:8px;font:14px/1.45 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.25)';
      document.body.appendChild(hinweisEl);
    }
    hinweisEl.textContent = text;
    hinweisEl.style.background = fehler ? '#fdecea' : '#e3f4e8';
    hinweisEl.style.color = fehler ? '#8a1c1c' : '#14532d';
    hinweisEl.style.display = 'block';
    clearTimeout(hinweisEl._t);
    if (dauer) hinweisEl._t = setTimeout(function () {
      hinweisEl.style.display = 'none';
    }, dauer);
  }

  window.addEventListener('hashchange', function () {
    seitenStatus = {};
    aktualisieren(false);
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () {
    aktualisieren(false);
  });
  else aktualisieren(false);
})();

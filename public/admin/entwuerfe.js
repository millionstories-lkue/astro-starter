/**
 * Entwürfe im CMS (Decap): Vorschaulink, „Als Entwurf kopieren“, Rückfrage beim Offline-Nehmen
 * ------------------------------------------------------------
 * Im geöffneten Eintrag bzw. in der geöffneten Seite erscheint unten links eine kleine Leiste:
 *   - Entwurf:        „Vorschaulink kopieren“ und „Vorschau öffnen“ (geheime Adresse
 *                     /vorschau/<schlüssel>/…, siehe src/integrations/entwuerfe.mjs)
 *   - Veröffentlicht: „Auf der Website ansehen“
 *   - Einträge (Projekte, Blog …): „Als Entwurf kopieren“ – legt eine Kopie des gespeicherten
 *     Stands als Entwurf an (Titel „… (Kopie)“, Adresse „…-kopie“) und öffnet sie.
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
 * Der Schlüssel steht in src/data/vorschau.json ({ "schluessel": "…" }) und wird über GitHub
 * gelesen – nur angemeldete Personen sehen ihn.
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

  var schluesselVersprechen = null;
  function ladeSchluessel() {
    if (schluesselVersprechen) return schluesselVersprechen;
    schluesselVersprechen = m()
      .einstellungen()
      .then(function (e) {
        return m().gh('/repos/' + e.repo + '/contents/src/data/vorschau.json?ref=' + encodeURIComponent(e.branch), { roh: 'text' });
      })
      .then(
        function (t) {
          var k = String((JSON.parse(t) || {}).schluessel || '').trim();
          return /^[a-z0-9]{12,64}$/.test(k) ? k : '';
        },
        function () {
          return '';
        },
      );
    return schluesselVersprechen;
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
    '@media (max-width:600px){.ms-entwurf-leiste{left:8px;right:8px;bottom:8px;max-width:none}}';
  document.head.appendChild(stil);

  var leiste = document.createElement('div');
  leiste.className = 'ms-entwurf-leiste';
  leiste.setAttribute('role', 'region');
  leiste.setAttribute('aria-label', 'Vorschau und Entwurf');
  leiste.hidden = true;
  function anhaengen() {
    if (!leiste.parentNode && document.body) document.body.appendChild(leiste);
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
      return;
    }
    leiste.hidden = false;
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
      leiste.appendChild(status('Noch nicht gespeichert', '#c0c4cc'));
      leiste.appendChild(info('Nach dem ersten Speichern gibt es hier den Vorschaulink.'));
      return;
    }
    if (z.veroeffentlicht) {
      leiste.appendChild(status('Veröffentlicht', '#1b7f3b'));
      leiste.appendChild(link('Auf der Website ansehen ↗', z.url));
    } else {
      leiste.appendChild(status('Entwurf', '#8a93a3'));
      if (z.url) {
        leiste.appendChild(
          knopf('Vorschaulink kopieren', 'ms-el-haupt', function () {
            kopieren(z.url, this);
          }),
        );
        leiste.appendChild(link('Vorschau öffnen ↗', z.url));
      } else {
        leiste.appendChild(info('Vorschaulinks sind für diese Website noch nicht eingerichtet (src/data/vorschau.json fehlt).'));
      }
    }
    if (z.info.kopierbar) leiste.appendChild(knopf('Als Entwurf kopieren', '', alsEntwurfKopieren));
    if (!z.veroeffentlicht && z.url) leiste.appendChild(info('Nur wer den Link hat, sieht die Seite. Nach „Speichern“ ist die Vorschau in 1–2 Minuten aktuell.'));
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
      return Promise.all([lesen(inf.pfad), ladeSchluessel()]).then(
        function (r) {
          if (nr !== lauf) return;
          var text = r[0];
          if (text === null) {
            zustand = { info: inf, neu: true };
          } else {
            var veroeffentlicht = istVeroeffentlicht(text, inf.pfad);
            var url = veroeffentlicht ? k.site + '/' + inf.adresse : r[1] ? k.site + '/vorschau/' + r[1] + '/' + inf.adresse : '';
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

  function alsEntwurfKopieren() {
    var z = zustand;
    if (!z || !z.text || !z.info.kopierbar) return;
    var inf = z.info;
    if (!window.confirm('Kopie als Entwurf anlegen?\n\nKopiert wird der zuletzt gespeicherte Stand. Das Original bleibt unverändert' + (z.veroeffentlicht ? ' online.' : '.'))) return;
    hinweis('Kopie wird angelegt …');
    var basis = inf.slug.replace(/-kopie(-\d+)?$/, '') + '-kopie';
    var ext = inf.pfad.slice(inf.pfad.lastIndexOf('.'));
    function freierName(n) {
      var slug = n === 1 ? basis : basis + '-' + n;
      return lesen(inf.ordner + '/' + slug + ext).then(function (t) {
        return t === null ? slug : n < 50 ? freierName(n + 1) : Promise.reject(new Error('Kein freier Dateiname gefunden.'));
      });
    }
    freierName(1)
      .then(function (slug) {
        var text = frontmatterSetzen(z.text, 'veroeffentlicht', 'false');
        var titel = titelLesen(text, inf.titelFeld);
        if (titel) text = frontmatterSetzen(text, inf.titelFeld, JSON.stringify(titel.replace(/\s*\(Kopie\)$/, '') + ' (Kopie)'));
        return m()
          .commit([{ pfad: inf.ordner + '/' + slug + ext, text: text }], 'Entwurf kopiert: ' + inf.sammlung + ' „' + slug + '“')
          .then(function () {
            return slug;
          });
      })
      .then(
        function (slug) {
          hinweis('Kopie angelegt – sie wird geöffnet …');
          setTimeout(function () {
            location.hash = '#/collections/' + encodeURIComponent(inf.sammlung) + '/entries/' + encodeURIComponent(slug);
            location.reload();
          }, 600);
        },
        function (f) {
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
    aktualisieren(false);
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () {
    aktualisieren(false);
  });
  else aktualisieren(false);
})();

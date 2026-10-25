/**
 * Anpassungen der CMS-Oberfläche (Decap CMS)
 * ------------------------------------------------------------
 * 1. Der Knopf oben links heißt „Speichern“ statt „Veröffentlichen“ – so ist er nicht mit
 *    dem Schalter „Veröffentlicht“ in Einträgen zu verwechseln.
 * 2. In den Übersichten (Projekte, Galerien, Blog …) erscheint vor jedem Eintrag ein
 *    farbiges Etikett: „Veröffentlicht“ (grün) oder „Entwurf“ (grau).
 *    Voraussetzung in config.yml: summary beginnt mit
 *    "{{veroeffentlicht | ternary('Veröffentlicht', 'Entwurf')}} · …"
 * 3. CMS-Feld „Tag-Liste“ (widget: tagliste): Tags anlegen, umbenennen, sortieren, löschen.
 *    Beim Speichern der Liste werden umbenannte und gelöschte Tags automatisch in allen
 *    Einträgen angepasst (Option `eintraege`: Ordner der Einträge, Option `feld`: Name des
 *    Tag-Felds, Standard „tags“). Zeigt außerdem Tags, die in Einträgen stehen, aber nicht
 *    (mehr) in der Liste – zum Aufnehmen oder Entfernen.
 *
 * Verwendung in public/admin/config.yml (Listen-Datei):
 *   - { label: Tags, name: tags, label_singular: Tag, widget: tagliste, eintraege: src/data/portfolio }
 * Benötigt mediathek.js (GitHub-Zugriff). Diese Datei ist Teil des Starter-Repos – nicht verändern.
 */
(function () {
  if (!window.CMS) return;
  var h = window.h;

  /* =====================================================================
   * 1. Texte: „Speichern“ statt „Veröffentlichen“
   * ===================================================================== */
  function texteAnpassen(obj) {
    if (!obj || typeof obj !== 'object') return;
    Object.keys(obj).forEach(function (k) {
      var v = obj[k];
      if (k === 'editorToolbar' && v && typeof v === 'object') {
        Object.assign(v, {
          publishing: 'Speichert …',
          publish: 'Speichern',
          published: 'Gespeichert',
          publishNow: 'Jetzt speichern',
          publishAndCreateNew: 'Speichern und neuen Eintrag anlegen',
          publishAndDuplicate: 'Speichern und duplizieren',
          deleteEntry: 'Eintrag löschen',
          deletePublishedEntry: 'Eintrag löschen',
        });
      } else if (k === 'toast' && v && typeof v === 'object' && 'entryPublished' in v) {
        Object.assign(v, { entryPublished: 'Gespeichert – in 1–2 Minuten auf der Website', entrySaved: 'Gespeichert' });
      } else if (k === 'editor' && v && typeof v === 'object' && 'onDeletePublishedEntry' in v) {
        Object.assign(v, { onDeletePublishedEntry: 'Soll dieser Eintrag wirklich gelöscht werden?' });
      } else texteAnpassen(v);
    });
  }
  try {
    var de = window.CMS.getLocale && window.CMS.getLocale('de');
    if (de) texteAnpassen(de);
  } catch (e) {}

  /* =====================================================================
   * 2. Etiketten „Veröffentlicht“ / „Entwurf“ in den Übersichten
   * ===================================================================== */
  var ETIKETTEN = { 'Veröffentlicht · ': ['Veröffentlicht', '#1b7f3b', '#e3f4e8'], 'Entwurf · ': ['Entwurf', '#5f6673', '#eceef2'] };
  var stil = document.createElement('style');
  stil.textContent =
    '.ms-status{display:inline-block;margin-right:8px;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;letter-spacing:.02em;vertical-align:middle;line-height:1.6}';
  document.head.appendChild(stil);

  function etikettieren(wurzel) {
    var gehe = document.createTreeWalker(wurzel || document.body, NodeFilter.SHOW_TEXT);
    var knoten;
    var liste = [];
    while ((knoten = gehe.nextNode())) {
      var t = knoten.nodeValue || '';
      if (t.indexOf('Veröffentlicht · ') === 0 || t.indexOf('Entwurf · ') === 0) liste.push(knoten);
    }
    liste.forEach(function (k) {
      if (!k.parentNode || k.parentNode.closest('input,textarea,[contenteditable]')) return;
      var praefix = k.nodeValue.indexOf('Entwurf · ') === 0 ? 'Entwurf · ' : 'Veröffentlicht · ';
      var e = ETIKETTEN[praefix];
      k.nodeValue = k.nodeValue.slice(praefix.length);
      var vorher = k.previousSibling;
      var marke = vorher && vorher.nodeType === 1 && vorher.classList.contains('ms-status') ? vorher : document.createElement('span');
      marke.className = 'ms-status';
      marke.textContent = e[0];
      marke.style.color = e[1];
      marke.style.background = e[2];
      if (marke !== vorher) k.parentNode.insertBefore(marke, k);
      // Etikett direkt vor dem Titel (Decap verteilt die Inhalte der Zeile sonst über die volle Breite)
      var eltern = k.parentNode;
      if (getComputedStyle(eltern).display.indexOf('flex') >= 0) {
        eltern.style.justifyContent = 'flex-start';
        eltern.style.alignItems = 'center';
      }
    });
  }
  var geplant = false;
  new MutationObserver(function () {
    if (geplant) return;
    geplant = true;
    requestAnimationFrame(function () {
      geplant = false;
      etikettieren(document.body);
    });
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  /* =====================================================================
   * 2b. Ein einfacher Knopf „Speichern“ (ohne Menü und Pfeil)
   * Decap zeigt „Speichern ▾“ mit Menü („Jetzt speichern“, „… und duplizieren“ …).
   * Hier speichert ein Klick sofort; nach dem Speichern steht dort „Gespeichert“.
   * ===================================================================== */
  var knopfStil = document.createElement('style');
  knopfStil.textContent =
    '[class*="StyledDropdownButton"][class*="PublishButton"]::after,[class*="StyledDropdownButton"][class*="PublishedToolbarButton"]::after{display:none!important}' +
    '[class*="StyledDropdownButton"][class*="PublishButton"],[class*="StyledDropdownButton"][class*="PublishedToolbarButton"]{padding-right:20px!important}' +
    '[class*="StyledDropdownButton"][class*="PublishedToolbarButton"]{cursor:default!important}' +
    'body.ms-speichert [class*="DropdownList"]{visibility:hidden!important}';
  document.head.appendChild(knopfStil);

  function speichernKnopf(ziel) {
    return ziel && ziel.closest && ziel.closest('[class*="StyledDropdownButton"][class*="PublishButton"],[class*="StyledDropdownButton"][class*="PublishedToolbarButton"]');
  }
  function sofortSpeichern(ev) {
    var k = speichernKnopf(ev.target);
    if (!k) return;
    if (ev.type === 'keydown' && ev.key !== 'Enter' && ev.key !== ' ') return;
    // „Gespeichert“: nichts zu tun
    if (/PublishedToolbarButton/.test(k.className)) {
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
    // Menü unsichtbar öffnen lassen und sofort „Jetzt speichern“ wählen
    document.body.classList.add('ms-speichert');
    var versuche = 0;
    (function waehlen() {
      var punkt = Array.prototype.find.call(document.querySelectorAll('[role="menuitem"]'), function (el) {
        return /^\s*Jetzt speichern\s*$/.test(el.textContent || '');
      });
      if (punkt) {
        punkt.click();
        setTimeout(function () {
          document.body.classList.remove('ms-speichert');
        }, 50);
      } else if (versuche++ < 20) setTimeout(waehlen, 25);
      else document.body.classList.remove('ms-speichert');
    })();
  }
  document.addEventListener('click', sofortSpeichern, true);
  document.addEventListener('keydown', sofortSpeichern, true);

  /* =====================================================================
   * 3. Tag-Liste
   * ===================================================================== */
  if (!window.createClass || !h) return;

  function m() {
    return window.MSMediathek;
  }

  // --- Tags in Markdown-Dateien (Frontmatter) lesen und schreiben ---
  function frontmatter(text) {
    if (text.indexOf('---') !== 0) return null;
    var ende = text.indexOf('\n---', 3);
    if (ende < 0) return null;
    return { start: text.indexOf('\n') + 1, ende: ende + 1 };
  }
  function wert(roh) {
    var w = String(roh || '').trim();
    if (/^".*"$/.test(w)) {
      try {
        return JSON.parse(w);
      } catch (e) {
        return w.slice(1, -1);
      }
    }
    if (/^'.*'$/.test(w)) return w.slice(1, -1).replace(/''/g, "'");
    return w;
  }
  /** → { zeilen, von, bis, tags } oder null, wenn das Feld fehlt */
  function tagsFinden(text, feld) {
    var fm = frontmatter(text);
    if (!fm) return null;
    var zeilen = text.slice(fm.start, fm.ende).split('\n');
    var re = new RegExp('^' + feld + ':\\s*(.*)$');
    for (var i = 0; i < zeilen.length; i++) {
      var mm = zeilen[i].match(re);
      if (!mm) continue;
      var rest = mm[1].trim();
      var tags = [];
      var bis = i + 1;
      if (rest.indexOf('[') === 0) {
        tags = rest
          .replace(/^\[|\]$/g, '')
          .split(',')
          .map(wert)
          .filter(Boolean);
      } else {
        while (bis < zeilen.length && /^\s*- /.test(zeilen[bis])) {
          tags.push(wert(zeilen[bis].replace(/^\s*- /, '')));
          bis++;
        }
      }
      return { fm: fm, zeilen: zeilen, von: i, bis: bis, tags: tags };
    }
    return null;
  }
  function tagsSchreiben(text, fund, tags, feld) {
    var neu = tags.length
      ? [feld + ':'].concat(
          tags.map(function (t) {
            return '  - ' + JSON.stringify(t);
          }),
        )
      : [feld + ': []'];
    var zeilen = fund.zeilen.slice(0, fund.von).concat(neu, fund.zeilen.slice(fund.bis));
    return text.slice(0, fund.fm.start) + zeilen.join('\n') + text.slice(fund.fm.ende);
  }

  /** Alle Einträge eines Ordners mit ihren Tags laden */
  function eintraegeLaden(ordner, feld) {
    var mm = m();
    if (!mm || !mm.gh) return Promise.reject(new Error('Die Mediathek (mediathek.js) fehlt.'));
    return mm.einstellungen().then(function (e) {
      return mm.gh('/repos/' + e.repo + '/git/trees/' + encodeURIComponent(e.branch) + '?recursive=1').then(function (baum) {
        var dateien = (baum.tree || []).filter(function (x) {
          return x.type === 'blob' && x.path.indexOf(ordner.replace(/\/+$/, '') + '/') === 0 && /\.mdx?$/i.test(x.path);
        });
        return Promise.all(
          dateien.map(function (d) {
            return mm.gh('/repos/' + e.repo + '/git/blobs/' + d.sha, { roh: 'text', cache: 'default' }).then(function (text) {
              var fund = tagsFinden(text, feld);
              return { pfad: d.path, text: text, fund: fund, tags: fund ? fund.tags : [] };
            });
          }),
        );
      });
    });
  }

  // Ausstehende Änderungen je Listen-Datei (werden beim Speichern übertragen)
  var offen = {};

  function aenderungenAnwenden(datei) {
    var a = offen[datei];
    if (!a) return Promise.resolve();
    var umbenennen = a.umbenennen();
    var loeschen = a.loeschen;
    var hatWas = Object.keys(umbenennen).length || Object.keys(loeschen).length;
    delete offen[datei];
    delete zustaende[datei]; // nach dem Speichern gilt der neue Stand als Ausgangspunkt
    if (!hatWas) return Promise.resolve();
    hinweis('Tags werden in allen Einträgen angepasst …');
    return eintraegeLaden(a.eintraege, a.feld)
      .then(function (eintraege) {
        var aenderungen = [];
        eintraege.forEach(function (e) {
          if (!e.fund) return;
          var neu = [];
          e.tags.forEach(function (t) {
            if (loeschen[t]) return;
            var n = umbenennen[t] !== undefined ? umbenennen[t] : t;
            if (n && neu.indexOf(n) < 0) neu.push(n);
          });
          if (neu.join('\u0000') !== e.tags.join('\u0000')) aenderungen.push({ pfad: e.pfad, text: tagsSchreiben(e.text, e.fund, neu, a.feld) });
        });
        if (!aenderungen.length) return 0;
        return m()
          .commit(aenderungen, 'Tags in ' + aenderungen.length + (aenderungen.length === 1 ? ' Eintrag' : ' Einträgen') + ' angepasst')
          .then(function () {
            return aenderungen.length;
          });
      })
      .then(
        function (n) {
          hinweis(n ? 'Tags in ' + n + (n === 1 ? ' Eintrag' : ' Einträgen') + ' angepasst. Bitte das CMS einmal neu laden, damit überall der neue Stand angezeigt wird.' : 'Tag-Liste gespeichert.', false, 9000);
        },
        function (f) {
          hinweis('Die Tags konnten in den Einträgen nicht angepasst werden: ' + f.message, true, 15000);
        },
      );
  }

  window.CMS.registerEventListener &&
    window.CMS.registerEventListener({
      name: 'postSave',
      handler: function (daten) {
        var pfad = daten && daten.entry && daten.entry.get && daten.entry.get('path');
        if (pfad && offen[pfad]) aenderungenAnwenden(pfad);
        return undefined;
      },
    });

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

  var knopf = { padding: '6px 10px', borderRadius: '5px', border: 0, background: '#dfdfe3', color: '#313d3e', fontSize: '13px', fontWeight: 600, cursor: 'pointer' };
  var knopfBlau = Object.assign({}, knopf, { background: '#3a69c7', color: '#fff' });
  var knopfRot = Object.assign({}, knopf, { background: '#fdecea', color: '#a01818' });

  var zustaende = {};

  var TagListe = window.createClass({
    getInitialState: function () {
      return { neu: '', unbekannt: null, fehler: '' };
    },
    datei: function () {
      var e = this.props.entry;
      return (e && e.get && e.get('path')) || 'liste';
    },
    namen: function () {
      var v = this.props.value;
      v = v && v.toJS ? v.toJS() : v || [];
      return v
        .map(function (x) {
          return typeof x === 'string' ? x : (x && x.name) || '';
        })
        .filter(function (x) {
          return x !== undefined;
        });
    },
    zustand: function () {
      var d = this.datei();
      var namen = this.namen();
      var z = zustaende[d];
      if (!z || z.zeilen.length !== namen.length || z.zeilen.some(function (r, i) {
        return r.name !== namen[i];
      })) {
        z = zustaende[d] = {
          zeilen: namen.map(function (n) {
            return { name: n, original: n };
          }),
          loeschen: {},
        };
      }
      return z;
    },
    opt: function (name, std) {
      var f = this.props.field;
      return (f && f.get && f.get(name)) || std;
    },
    melden: function (z) {
      var d = this.datei();
      var self = this;
      offen[d] = {
        eintraege: this.opt('eintraege', ''),
        feld: this.opt('feld', 'tags'),
        loeschen: z.loeschen,
        umbenennen: function () {
          var u = {};
          z.zeilen.forEach(function (r) {
            if (r.original && r.name.trim() !== r.original) u[r.original] = r.name.trim();
          });
          return u;
        },
      };
      if (!offen[d].eintraege) delete offen[d];
      this.props.onChange(
        z.zeilen.map(function (r) {
          return { name: r.name };
        }),
      );
      self.forceUpdate();
    },
    componentDidMount: function () {
      var self = this;
      var ordner = this.opt('eintraege', '');
      if (!ordner) return;
      eintraegeLaden(ordner, this.opt('feld', 'tags')).then(
        function (eintraege) {
          if (self.weg) return;
          var zaehler = {};
          eintraege.forEach(function (e) {
            e.tags.forEach(function (t) {
              zaehler[t] = (zaehler[t] || 0) + 1;
            });
          });
          self.setState({ unbekannt: zaehler });
        },
        function (f) {
          if (!self.weg) self.setState({ fehler: 'Einträge konnten nicht geprüft werden: ' + f.message });
        },
      );
    },
    componentWillUnmount: function () {
      this.weg = true;
    },
    render: function () {
      var self = this;
      var z = this.zustand();
      var einzahl = this.opt('label_singular', 'Tag');
      var zaehler = this.state.unbekannt;
      var inListe = {};
      z.zeilen.forEach(function (r) {
        if (r.original) inListe[r.original] = true;
        inListe[r.name.trim()] = true;
      });
      var fremd = zaehler
        ? Object.keys(zaehler).filter(function (t) {
            return !inListe[t] && !z.loeschen[t];
          })
        : [];

      function aendern(fn) {
        fn();
        self.melden(z);
      }

      return h(
        'div',
        { id: this.props.forID, className: this.props.classNameWrapper, style: { padding: '12px' } },
        h(
          'p',
          { style: { margin: '0 0 10px', fontSize: '13px', color: '#5f6673' } },
          'Umbenennen oder Löschen wird beim Speichern automatisch in allen Einträgen übernommen. Reihenfolge = Reihenfolge im Filter auf der Website.',
        ),
        h(
          'ul',
          { style: { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '6px' } },
          z.zeilen.map(function (r, i) {
            var anzahl = zaehler && r.original ? zaehler[r.original] || 0 : null;
            var umbenannt = r.original && r.name.trim() !== r.original;
            return h(
              'li',
              { key: i, style: { display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' } },
              h('input', {
                type: 'text',
                value: r.name,
                'aria-label': einzahl + ' ' + (i + 1),
                style: { flex: '1 1 200px', minWidth: 0, padding: '7px 9px', border: '1px solid #cfd3da', borderRadius: '5px', fontSize: '14px' },
                onChange: function (ev) {
                  var v = ev.target.value;
                  aendern(function () {
                    r.name = v;
                  });
                },
              }),
              h(
                'span',
                { style: { fontSize: '12px', color: umbenannt ? '#a35c00' : '#798291', minWidth: '90px' } },
                umbenannt ? 'wird umbenannt' : anzahl === null ? '' : anzahl === 1 ? 'in 1 Eintrag' : 'in ' + anzahl + ' Einträgen',
              ),
              h('button', { type: 'button', style: knopf, disabled: i === 0, 'aria-label': einzahl + ' nach oben', onClick: function () {
                aendern(function () {
                  z.zeilen.splice(i - 1, 0, z.zeilen.splice(i, 1)[0]);
                });
              } }, '↑'),
              h('button', { type: 'button', style: knopf, disabled: i === z.zeilen.length - 1, 'aria-label': einzahl + ' nach unten', onClick: function () {
                aendern(function () {
                  z.zeilen.splice(i + 1, 0, z.zeilen.splice(i, 1)[0]);
                });
              } }, '↓'),
              h('button', { type: 'button', style: knopfRot, 'aria-label': einzahl + ' „' + r.name + '“ löschen', onClick: function () {
                aendern(function () {
                  if (r.original) z.loeschen[r.original] = true;
                  z.zeilen.splice(i, 1);
                });
              } }, 'Löschen'),
            );
          }),
        ),
        h(
          'div',
          { style: { display: 'flex', gap: '6px', marginTop: '10px' } },
          h('input', {
            type: 'text',
            value: this.state.neu,
            placeholder: 'Neuer ' + einzahl,
            'aria-label': 'Neuer ' + einzahl,
            style: { flex: '1 1 200px', padding: '7px 9px', border: '1px solid #cfd3da', borderRadius: '5px', fontSize: '14px' },
            onChange: function (ev) {
              self.setState({ neu: ev.target.value });
            },
            onKeyDown: function (ev) {
              if (ev.key === 'Enter') {
                ev.preventDefault();
                self.hinzufuegen(z);
              }
            },
          }),
          h('button', { type: 'button', style: knopfBlau, onClick: function () {
            self.hinzufuegen(z);
          } }, '+ Hinzufügen'),
        ),
        Object.keys(z.loeschen).length
          ? h('p', { style: { margin: '10px 0 0', fontSize: '12px', color: '#a01818' } }, 'Wird beim Speichern aus allen Einträgen entfernt: ' + Object.keys(z.loeschen).join(', '))
          : null,
        fremd.length
          ? h(
              'div',
              { style: { marginTop: '14px', padding: '10px 12px', background: '#fff8e1', borderRadius: '6px', fontSize: '13px' } },
              h('strong', null, 'In Einträgen, aber nicht in der Liste:'),
              h(
                'ul',
                { style: { listStyle: 'none', margin: '6px 0 0', padding: 0, display: 'grid', gap: '6px' } },
                fremd.map(function (t) {
                  return h(
                    'li',
                    { key: t, style: { display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' } },
                    h('span', { style: { flex: '1 1 160px' } }, '„' + t + '“ – ' + (zaehler[t] === 1 ? '1 Eintrag' : zaehler[t] + ' Einträge')),
                    h('button', { type: 'button', style: knopf, onClick: function () {
                      aendern(function () {
                        z.zeilen.push({ name: t, original: t });
                      });
                    } }, 'In Liste aufnehmen'),
                    h('button', { type: 'button', style: knopfRot, onClick: function () {
                      aendern(function () {
                        z.loeschen[t] = true;
                      });
                    } }, 'Aus Einträgen entfernen'),
                  );
                }),
              ),
            )
          : null,
        this.state.fehler ? h('p', { role: 'alert', style: { color: '#c00', fontSize: '13px' } }, this.state.fehler) : null,
      );
    },
    hinzufuegen: function (z) {
      var n = this.state.neu.trim();
      if (!n) return;
      if (
        z.zeilen.some(function (r) {
          return r.name.trim() === n;
        })
      ) {
        this.setState({ neu: '' });
        return;
      }
      z.zeilen.push({ name: n, original: null });
      this.setState({ neu: '' });
      this.melden(z);
    },
  });

  window.CMS.registerWidget('tagliste', TagListe);
})();

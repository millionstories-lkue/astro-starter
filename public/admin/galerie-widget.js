/**
 * Eigenes CMS-Feld „Galerie“ für Decap CMS
 * ------------------------------------------------------------
 * - Mehrere Fotos auf einmal hochladen (Auswahl oder Ziehen in das Feld)
 * - Große Fotos werden vor dem Hochladen verkleinert (max. 2000 px); mit der Mediathek
 *   (mediathek.js) bleiben kleinere Bilder unverändert und PNG bleibt PNG
 * - „Aus Mediathek wählen“: vorhandene Bilder der Website übernehmen (mediathek.js)
 * - Reihenfolge per Ziehen ändern, einzelne Fotos entfernen
 * - Optional eine Beschreibung (Alt-Text) pro Foto
 *
 * Gespeichert wird eine Liste aus { bild, alt }. Die Fotos landen im Ordner
 * <ordner>/<dateiname-des-eintrags>/ des GitHub-Repos (Standard-Ordner:
 * src/assets/cms/galerien, änderbar über die Feld-Option „ordner“ in config.yml).
 * Zum Hochladen wird die Anmeldung des CMS (GitHub) verwendet.
 *
 * Verwendung in public/admin/config.yml:
 *   - { label: Fotos, name: bilder, widget: galerie, required: false, ordner: src/assets/cms/galerien }
 * Diese Datei ist Teil des Starter-Repos – nicht verändern.
 */
(function () {
  if (!window.CMS || !window.createClass || !window.h) return;
  var h = window.h;

  var MAX_KANTE = 2000;
  var QUALITAET = 0.85;
  var PRO_COMMIT = 20; // Fotos pro Speicherung in GitHub
  var GH = 'https://api.github.com';

  /* ---------- Einstellungen aus config.yml (Repo und Branch) ---------- */
  var einstellungen = null;
  function ladeEinstellungen() {
    if (einstellungen) return einstellungen;
    einstellungen = fetch('/admin/config.yml', { cache: 'no-store' })
      .then(function (r) {
        return r.text();
      })
      .then(function (t) {
        var repo = (t.match(/^\s*repo:\s*['"]?([^'"\s#]+)/m) || [])[1];
        var branch = (t.match(/^\s*branch:\s*['"]?([^'"\s#]+)/m) || [])[1] || 'main';
        return { repo: repo, branch: branch };
      });
    return einstellungen;
  }

  function token() {
    try {
      var u = JSON.parse(localStorage.getItem('decap-cms-user') || localStorage.getItem('netlify-cms-user') || 'null');
      return u && u.token;
    } catch (e) {
      return null;
    }
  }

  function gh(pfad, optionen) {
    optionen = optionen || {};
    var t = token();
    if (!t) return Promise.reject(new Error('Nicht angemeldet. Bitte das CMS neu laden und anmelden.'));
    var headers = Object.assign(
      { Authorization: 'token ' + t, Accept: optionen.roh ? 'application/vnd.github.raw' : 'application/vnd.github+json' },
      optionen.body ? { 'Content-Type': 'application/json' } : {},
    );
    // cache: 'no-store' – sonst liefert der Browser bis zu 60 Sekunden alte Antworten von GitHub
    return fetch(GH + pfad, { method: optionen.method || 'GET', headers: headers, body: optionen.body, cache: 'no-store' }).then(function (r) {
      if (!r.ok) {
        return r.text().then(function (txt) {
          var fehler = new Error('GitHub meldet ' + r.status + ': ' + txt.slice(0, 200));
          fehler.status = r.status;
          throw fehler;
        });
      }
      if (optionen.roh) return r.blob();
      return r.status === 204 ? null : r.json();
    });
  }

  /* ---------- Hilfen ---------- */
  function slugify(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function zuListe(wert) {
    if (!wert) return [];
    var js = wert.toJS ? wert.toJS() : wert;
    if (!Array.isArray(js)) return [];
    return js
      .map(function (e) {
        if (typeof e === 'string') return { bild: e, alt: '' };
        return { bild: (e && e.bild) || '', alt: (e && e.alt) || '' };
      })
      .filter(function (e) {
        return e.bild;
      });
  }

  function ohneSchraegstrich(p) {
    return String(p || '').replace(/^\/+/, '');
  }

  function verkleinern(datei) {
    var laden = window.createImageBitmap
      ? createImageBitmap(datei, { imageOrientation: 'from-image' }).catch(function () {
          return createImageBitmap(datei);
        })
      : Promise.reject(new Error('Browser zu alt'));
    return laden.then(function (bmp) {
      var f = Math.min(1, MAX_KANTE / Math.max(bmp.width, bmp.height));
      var c = document.createElement('canvas');
      c.width = Math.round(bmp.width * f);
      c.height = Math.round(bmp.height * f);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      return new Promise(function (ok) {
        c.toBlob(ok, 'image/jpeg', QUALITAET);
      });
    });
  }

  function alsBase64(blob) {
    return new Promise(function (ok, fehler) {
      var r = new FileReader();
      r.onload = function () {
        ok(String(r.result).split(',')[1]);
      };
      r.onerror = fehler;
      r.readAsDataURL(blob);
    });
  }

  /* ---------- Vorschaubilder (aus GitHub, mit Zwischenspeicher) ---------- */
  var vorschauCache = {};
  var warteschlange = [];
  var aktiv = 0;
  function vorschau(pfad) {
    pfad = ohneSchraegstrich(pfad);
    if (vorschauCache[pfad]) return vorschauCache[pfad];
    vorschauCache[pfad] = new Promise(function (ok, fehler) {
      warteschlange.push({ pfad: pfad, ok: ok, fehler: fehler });
      weiter();
    });
    vorschauCache[pfad].catch(function () {
      delete vorschauCache[pfad];
    });
    return vorschauCache[pfad];
  }
  function weiter() {
    while (aktiv < 4 && warteschlange.length) {
      var auftrag = warteschlange.shift();
      aktiv++;
      (function (a) {
        ladeEinstellungen()
          .then(function (e) {
            var url = '/repos/' + e.repo + '/contents/' + a.pfad.split('/').map(encodeURIComponent).join('/') + '?ref=' + encodeURIComponent(e.branch);
            return gh(url, { roh: true });
          })
          .then(function (blob) {
            a.ok(URL.createObjectURL(blob));
          }, a.fehler)
          .then(function () {
            aktiv--;
            weiter();
          });
      })(auftrag);
    }
  }

  /* ---------- Hochladen: viele Dateien in wenigen Commits ---------- */
  var letzterCommit = null;
  function commitDateien(dateien, nachricht) {
    // dateien: [{ pfad, base64 }]
    return ladeEinstellungen().then(function (e) {
      var basis = '/repos/' + e.repo + '/git';
      function versuch(nr) {
        var refSha, baumSha;
        return gh(basis + '/ref/heads/' + e.branch)
          .then(function (ref) {
            refSha = ref.object.sha;
            // GitHub liefert direkt nach einem Commit manchmal noch den alten Stand –
            // dann auf unserem eigenen letzten Commit aufbauen.
            if (letzterCommit && nr === 0 && refSha !== letzterCommit) refSha = letzterCommit;
            return gh(basis + '/commits/' + refSha);
          })
          .then(function (commit) {
            baumSha = commit.tree.sha;
            return Promise.all(
              dateien.map(function (d) {
                if (d.blobSha) return d;
                return gh(basis + '/blobs', { method: 'POST', body: JSON.stringify({ content: d.base64, encoding: 'base64' }) }).then(function (b) {
                  d.blobSha = b.sha;
                  return d;
                });
              }),
            );
          })
          .then(function () {
            return gh(basis + '/trees', {
              method: 'POST',
              body: JSON.stringify({
                base_tree: baumSha,
                tree: dateien.map(function (d) {
                  return { path: d.pfad, mode: '100644', type: 'blob', sha: d.blobSha };
                }),
              }),
            });
          })
          .then(function (baum) {
            return gh(basis + '/commits', { method: 'POST', body: JSON.stringify({ message: nachricht, tree: baum.sha, parents: [refSha] }) });
          })
          .then(function (neu) {
            return gh(basis + '/refs/heads/' + e.branch, { method: 'PATCH', body: JSON.stringify({ sha: neu.sha }) }).then(function (r) {
              letzterCommit = neu.sha;
              return r;
            });
          })
          .catch(function (fehler) {
            // Gleichzeitige Änderung im Repo oder GitHub noch nicht aktuell → kurz warten, neu versuchen
            if (nr < 4 && (fehler.status === 422 || fehler.status === 409)) {
              return new Promise(function (ok) {
                setTimeout(ok, 1500 * (nr + 1));
              }).then(function () {
                return versuch(nr + 1);
              });
            }
            throw fehler;
          });
      }
      return versuch(0);
    });
  }

  /* ---------- Ein Foto im Raster ---------- */
  var Kachel = window.createClass({
    getInitialState: function () {
      return { url: this.props.lokaleUrl || null, fehler: false };
    },
    componentDidMount: function () {
      var self = this;
      if (this.state.url) return;
      if (!('IntersectionObserver' in window)) return this.laden();
      this.beobachter = new IntersectionObserver(
        function (eintraege) {
          if (eintraege.some(function (x) { return x.isIntersecting; })) {
            self.beobachter.disconnect();
            self.laden();
          }
        },
        { rootMargin: '300px' },
      );
      if (this.el) this.beobachter.observe(this.el);
    },
    componentWillUnmount: function () {
      if (this.beobachter) this.beobachter.disconnect();
      this.weg = true;
    },
    laden: function () {
      var self = this;
      vorschau(this.props.bild).then(
        function (url) {
          if (!self.weg) self.setState({ url: url });
        },
        function () {
          if (!self.weg) self.setState({ fehler: true });
        },
      );
    },
    render: function () {
      var p = this.props;
      var self = this;
      var name = ohneSchraegstrich(p.bild).split('/').pop();
      return h(
        'li',
        {
          ref: function (el) {
            self.el = el;
          },
          draggable: true,
          onDragStart: p.onDragStart,
          onDragOver: p.onDragOver,
          onDrop: p.onDrop,
          onDragEnd: p.onDragEnd,
          title: name + ' – zum Verschieben ziehen',
          style: {
            position: 'relative',
            listStyle: 'none',
            borderRadius: '6px',
            overflow: 'hidden',
            background: '#eff0f4',
            outline: p.ziel ? '3px solid #3a69c7' : 'none',
            opacity: p.gezogen ? 0.4 : 1,
            cursor: 'grab',
          },
        },
        h(
          'div',
          { style: { aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#798291' } },
          this.state.url
            ? h('img', { src: this.state.url, alt: p.alt || '', draggable: false, style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' } })
            : this.state.fehler
              ? 'Vorschau fehlt'
              : 'lädt …',
        ),
        h(
          'span',
          { style: { position: 'absolute', left: '6px', top: '6px', background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: '11px', borderRadius: '4px', padding: '1px 6px' } },
          String(p.nr),
        ),
        h(
          'button',
          {
            type: 'button',
            'aria-label': 'Foto ' + p.nr + ' entfernen',
            title: 'Aus der Galerie entfernen',
            onClick: p.onEntfernen,
            style: { position: 'absolute', right: '6px', top: '6px', width: '26px', height: '26px', borderRadius: '50%', border: 0, background: '#fff', color: '#c00', fontSize: '16px', lineHeight: '26px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,.3)' },
          },
          '×',
        ),
        p.mitBeschreibung
          ? h('input', {
              type: 'text',
              value: p.alt || '',
              placeholder: 'Beschreibung (optional)',
              onChange: p.onAlt,
              style: { width: '100%', boxSizing: 'border-box', border: 0, borderTop: '1px solid #dfdfe3', padding: '6px', fontSize: '12px' },
            })
          : null,
      );
    },
  });

  /* ---------- Das Feld ---------- */
  var galerieNr = 0;
  var GalerieFeld = window.createClass({
    getInitialState: function () {
      this.nr = 'galerie-' + ++galerieNr;
      return { status: '', fehler: '', laeuft: false, gezogen: null, ziel: null, mitBeschreibung: false, ueberFeld: false };
    },
    liste: function () {
      return zuListe(this.props.value);
    },
    // Der Mediathek melden, welche Bilder hier gerade stehen (auch ungespeichert)
    componentDidMount: function () {
      this.melden();
    },
    componentDidUpdate: function () {
      this.melden();
    },
    componentWillUnmount: function () {
      if (window.MSMediathek) window.MSMediathek.abmelden(this.nr);
    },
    melden: function () {
      if (window.MSMediathek)
        window.MSMediathek.melde(
          this.nr,
          this.liste().map(function (e) {
            return ohneSchraegstrich(e.bild);
          }),
        );
    },
    ausMediathek: function () {
      var self = this;
      var m = window.MSMediathek;
      if (!m) return;
      var oeffnen = function (ordner) {
        m.oeffne({
          modus: 'auswahl',
          mehrfach: true,
          ordner: ordner || undefined,
          onAuswahl: function (pfade) {
            var liste = self.liste();
            var da = {};
            liste.forEach(function (e) {
              da[ohneSchraegstrich(e.bild)] = true;
            });
            var neu = pfade.filter(function (p) {
              return !da[p];
            });
            if (!neu.length) return;
            self.speichern(
              liste.concat(
                neu.map(function (p) {
                  return { bild: p, alt: '' };
                }),
              ),
            );
            self.setState({ fehler: '', status: neu.length + (neu.length === 1 ? ' Foto' : ' Fotos') + ' aus der Mediathek übernommen. Jetzt oben speichern bzw. veröffentlichen.' });
          },
        });
      };
      var ordner = this.ordner();
      if (ordner) oeffnen(ordner);
      else m.zielOrdner(this.props.entry, this.props.field).then(oeffnen, function () {
        oeffnen(null);
      });
    },
    speichern: function (liste) {
      this.props.onChange(liste.length ? liste : []);
    },
    ordner: function () {
      var entry = this.props.entry;
      var pfad = entry && entry.get && entry.get('path');
      var slug = pfad ? pfad.split('/').pop().replace(/\.md$/, '') : '';
      if (!slug) slug = slugify(entry && entry.getIn && entry.getIn(['data', 'titel']));
      if (!slug) return null;
      var basis = (this.props.field && this.props.field.get && this.props.field.get('ordner')) || 'src/assets/cms/galerien';
      return ohneSchraegstrich(basis).replace(/\/+$/, '') + '/' + slug;
    },
    dateienGewaehlt: function (dateiListe) {
      var self = this;
      var dateien = Array.prototype.filter.call(dateiListe || [], function (f) {
        return /^image\//.test(f.type);
      });
      if (!dateien.length || this.state.laeuft) return;
      var ordner = this.ordner();
      if (!ordner) {
        this.setState({ fehler: 'Bitte zuerst oben einen Titel für die Galerie eintragen.' });
        return;
      }
      var vorhanden = {};
      this.liste().forEach(function (e) {
        vorhanden[ohneSchraegstrich(e.bild).toLowerCase()] = true;
      });
      var m = window.MSMediathek;
      // Dateiname erst nach dem Vorbereiten festlegen (Endung jpg/png/webp)
      function pfadFuer(f, endung) {
        var basis = slugify(f.name.replace(/\.[^.]+$/, '')) || 'foto';
        var name = basis + '.' + endung;
        var i = 2;
        while (vorhanden[(ordner + '/' + name).toLowerCase()]) name = basis + '-' + i++ + '.' + endung;
        vorhanden[(ordner + '/' + name).toLowerCase()] = true;
        return ordner + '/' + name;
      }
      var auftraege = dateien.map(function (f) {
        return { datei: f, pfad: null };
      });

      this.setState({ laeuft: true, fehler: '', status: 'Bereite ' + auftraege.length + ' Fotos vor …' });
      var fertig = 0;
      var neu = [];

      function stapel(start) {
        var teil = auftraege.slice(start, start + PRO_COMMIT);
        if (!teil.length) return Promise.resolve();
        return Promise.all(
          teil.map(function (a) {
            var vorbereitet = m
              ? m.vorbereiten(a.datei)
              : verkleinern(a.datei).then(function (blob) {
                  return { blob: blob, endung: 'jpg' };
                });
            return vorbereitet
              .then(function (v) {
                a.pfad = pfadFuer(a.datei, v.endung);
                a.blob = v.blob;
                a.lokaleUrl = URL.createObjectURL(v.blob);
                return alsBase64(v.blob);
              })
              .then(function (b64) {
                a.base64 = b64;
              });
          }),
        )
          .then(function () {
            self.setState({ status: 'Lade hoch: ' + fertig + ' von ' + auftraege.length + ' …' });
            var nachricht = 'Fotos hochgeladen: ' + ordner.split('/').pop() + ' (' + teil.length + ')';
            if (m)
              return m.commit(
                teil.map(function (a) {
                  return { pfad: a.pfad, base64: a.base64 };
                }),
                nachricht,
              );
            return commitDateien(teil, nachricht);
          })
          .then(function () {
            teil.forEach(function (a) {
              vorschauCache[a.pfad] = Promise.resolve(a.lokaleUrl);
              if (m) {
                m.lokaleVorschau(a.pfad, a.blob);
                m.bekannt(a.pfad, a.blob.size);
              }
              neu.push({ bild: a.pfad, alt: '' });
              a.base64 = null;
              a.blob = null;
            });
            fertig += teil.length;
            // Sofort in die Liste übernehmen, damit nichts verloren geht
            self.speichern(self.liste().concat(neu.splice(0)));
            self.setState({ status: 'Lade hoch: ' + fertig + ' von ' + auftraege.length + ' …' });
            return stapel(start + PRO_COMMIT);
          });
      }

      stapel(0).then(
        function () {
          self.setState({ laeuft: false, status: fertig + ' Fotos hochgeladen. Jetzt oben auf „Veröffentlichen“ bzw. „Speichern“ klicken.' });
        },
        function (fehler) {
          self.setState({ laeuft: false, status: '', fehler: 'Hochladen hat nicht geklappt (' + fertig + ' von ' + auftraege.length + ' geschafft). ' + fehler.message });
        },
      );
    },
    verschieben: function (von, nach) {
      if (von === null || nach === null || von === nach) return;
      var liste = this.liste();
      var eintrag = liste.splice(von, 1)[0];
      liste.splice(nach, 0, eintrag);
      this.speichern(liste);
    },
    render: function () {
      var self = this;
      var liste = this.liste();
      var s = this.state;
      var eingabeId = 'galerie-upload-' + (this.props.forID || 'feld');

      var knopf = {
        display: 'inline-block',
        padding: '8px 14px',
        borderRadius: '5px',
        border: 0,
        background: '#3a69c7',
        color: '#fff',
        fontWeight: 600,
        fontSize: '14px',
        cursor: s.laeuft ? 'wait' : 'pointer',
        opacity: s.laeuft ? 0.6 : 1,
      };
      var knopf2 = Object.assign({}, knopf, { background: '#dfdfe3', color: '#313d3e' });

      return h(
        'div',
        {
          id: this.props.forID,
          className: this.props.classNameWrapper,
          onDragOver: function (e) {
            if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0) {
              e.preventDefault();
              if (!s.ueberFeld) self.setState({ ueberFeld: true });
            }
          },
          onDragLeave: function () {
            if (s.ueberFeld) self.setState({ ueberFeld: false });
          },
          onDrop: function (e) {
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
              e.preventDefault();
              self.setState({ ueberFeld: false });
              self.dateienGewaehlt(e.dataTransfer.files);
            }
          },
          style: { padding: '12px', background: s.ueberFeld ? '#eaf0fb' : undefined },
        },
        h(
          'div',
          { style: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '10px' } },
          h('label', { htmlFor: eingabeId, style: knopf }, '+ Fotos hochladen'),
          h('input', {
            id: eingabeId,
            type: 'file',
            accept: 'image/*',
            multiple: true,
            disabled: s.laeuft,
            style: { position: 'absolute', width: '1px', height: '1px', opacity: 0, overflow: 'hidden' },
            onChange: function (e) {
              self.dateienGewaehlt(e.target.files);
              e.target.value = '';
            },
          }),
          window.MSMediathek
            ? h('button', { type: 'button', style: knopf2, disabled: s.laeuft, onClick: self.ausMediathek }, 'Aus Mediathek wählen')
            : null,
          h(
            'button',
            {
              type: 'button',
              style: knopf2,
              onClick: function () {
                self.setState({ mitBeschreibung: !s.mitBeschreibung });
              },
            },
            s.mitBeschreibung ? 'Beschreibungen ausblenden' : 'Beschreibungen bearbeiten',
          ),
          h('span', { style: { fontSize: '13px', color: '#798291' } }, liste.length + ' Fotos · Fotos auch einfach hierher ziehen · Reihenfolge per Ziehen ändern'),
        ),
        s.status ? h('p', { role: 'status', style: { margin: '0 0 10px', fontSize: '13px', color: '#005614' } }, s.status) : null,
        s.fehler ? h('p', { role: 'alert', style: { margin: '0 0 10px', fontSize: '13px', color: '#c00' } }, s.fehler) : null,
        h(
          'ul',
          { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px', margin: 0, padding: 0 } },
          liste.map(function (e, i) {
            return h(Kachel, {
              key: e.bild,
              bild: e.bild,
              alt: e.alt,
              nr: i + 1,
              lokaleUrl: null,
              mitBeschreibung: s.mitBeschreibung,
              gezogen: s.gezogen === i,
              ziel: s.ziel === i && s.gezogen !== i,
              onDragStart: function (ev) {
                ev.dataTransfer.effectAllowed = 'move';
                try {
                  ev.dataTransfer.setData('text/plain', String(i));
                } catch (x) {}
                self.setState({ gezogen: i });
              },
              onDragOver: function (ev) {
                if (s.gezogen === null) return;
                ev.preventDefault();
                ev.stopPropagation();
                if (s.ziel !== i) self.setState({ ziel: i });
              },
              onDrop: function (ev) {
                if (s.gezogen === null) return;
                ev.preventDefault();
                ev.stopPropagation();
                self.verschieben(s.gezogen, i);
                self.setState({ gezogen: null, ziel: null });
              },
              onDragEnd: function () {
                self.setState({ gezogen: null, ziel: null });
              },
              onEntfernen: function () {
                var l = self.liste();
                l.splice(i, 1);
                self.speichern(l);
              },
              onAlt: function (ev) {
                var l = self.liste();
                l[i].alt = ev.target.value;
                self.speichern(l);
              },
            });
          }),
        ),
      );
    },
  });

  var GalerieVorschau = window.createClass({
    render: function () {
      return h('p', null, zuListe(this.props.value).length + ' Fotos');
    },
  });

  window.CMS.registerWidget('galerie', GalerieFeld, GalerieVorschau);
})();

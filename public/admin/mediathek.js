/**
 * Mediathek für Decap CMS
 * ------------------------------------------------------------
 * Eine zentrale Bildverwaltung für die ganze Website:
 * - zeigt ALLE Bilder unter src/assets/cms/ (auch in Unterordnern, z. B. pro Projekt)
 * - Suche, Filter nach Ordner, „Nur nicht verwendete“
 * - auch Dateien zum Herunterladen (PDF), auswählbar über Dateifelder (widget: file)
 * - Hochladen (mehrere auf einmal, Ziehen ins Fenster). Große Bilder werden auf max.
 *   2000 px verkleinert, PNG bleibt PNG, kleinere Bilder bleiben unverändert (keine
 *   doppelte Komprimierung).
 * - zeigt bei jedem Bild, wo es verwendet wird; Löschen nur, wenn es nirgends mehr
 *   verwendet wird, mit Rückfrage „Endgültig löschen?“
 * - zentrale Bildbeschreibung (Alt-Text) pro Bild in src/data/medien.json. Sie ist die
 *   einzige Stelle für Beschreibungen und gilt überall, wo das Bild eingesetzt ist.
 *   Beschreibungen aus der Zeit davor (direkt am Bild gespeichert) werden als Vorschlag
 *   angezeigt und lassen sich mit einem Klick übernehmen.
 *
 * Eingebunden wird die Mediathek
 * - im Menü oben unter „Medien“,
 * - in jedem Bildfeld (widget: image) – ersetzt Decaps eigenes Bildfenster,
 * - im Galerie-Feld (Knopf „Aus Mediathek wählen“, siehe galerie-widget.js).
 *
 * Einrichtung in public/admin/config.yml (oberste Ebene):
 *   media_library:
 *     name: mediathek
 *     config:
 *       alt_texte: true   # false = zentrale Beschreibungen ausblenden (Website liest medien.json nicht)
 *
 * Neue Bilder landen im Ordner der Sammlung (media_folder, z. B. src/assets/cms/projekte/<eintrag>)
 * bzw. im Hauptordner (media_folder oben in config.yml).
 * Diese Datei ist Teil des Starter-Repos – nicht verändern.
 */
(function () {
  if (!window.CMS || !window.createClass || !window.h) return;
  var h = window.h;

  var GH = 'https://api.github.com';
  var MAX_KANTE = 2000;
  var JPEG_QUALITAET = 0.9;
  var PRO_COMMIT = 20;
  var ALT_DATEI = 'src/data/medien.json';
  var BILD_RE = /\.(jpe?g|png|webp|avif)$/i;
  var DOK_RE = /\.pdf$/i; // Dateien zum Herunterladen
  function istDok(pfad) {
    return DOK_RE.test(pfad);
  }
  var TEXT_RE = /\.(md|mdx|json|ya?ml|astro|ts|js|mjs)$/i;

  var optionen = { altTexte: true };

  /* =====================================================================
   * Hilfen
   * ===================================================================== */
  function ohneSchraegstrich(p) {
    return String(p || '').trim().replace(/^\/+/, '');
  }

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

  function ordnerVon(pfad) {
    var i = pfad.lastIndexOf('/');
    return i < 0 ? '' : pfad.slice(0, i);
  }

  function dateiname(pfad) {
    return String(pfad || '').split('/').pop();
  }

  function kb(bytes) {
    if (!bytes && bytes !== 0) return '';
    return bytes > 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB' : Math.round(bytes / 1024) + ' KB';
  }

  function warte(ms) {
    return new Promise(function (ok) {
      setTimeout(ok, ms);
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

  /* =====================================================================
   * Einstellungen aus config.yml
   * ===================================================================== */
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
        var wurzel = ohneSchraegstrich((t.match(/^media_folder:\s*['"]?([^'"\s#]+)/m) || [])[1] || 'src/assets/cms').replace(/\/+$/, '');
        // media_folder je Sammlung (z. B. /src/assets/cms/projekte/{{filename}})
        var sammlungen = {};
        var aktuell = null;
        t.split(/\r?\n/).forEach(function (zeile) {
          var m = zeile.match(/^ {2}- name:\s*['"]?([\w-]+)/);
          if (m) {
            aktuell = m[1];
            return;
          }
          var mf = zeile.match(/^ {4}media_folder:\s*['"]?([^'"\s#]+)/);
          if (mf && aktuell) sammlungen[aktuell] = ohneSchraegstrich(mf[1]).replace(/\/+$/, '');
        });
        if (/^\s*alt_texte:\s*false/m.test(t)) optionen.altTexte = false;
        return { repo: repo, branch: branch, wurzel: wurzel, sammlungen: sammlungen };
      });
    return einstellungen;
  }

  /* =====================================================================
   * GitHub
   * ===================================================================== */
  function token() {
    try {
      var u = JSON.parse(localStorage.getItem('decap-cms-user') || localStorage.getItem('netlify-cms-user') || 'null');
      return u && u.token;
    } catch (e) {
      return null;
    }
  }

  function gh(pfad, opt) {
    opt = opt || {};
    var t = token();
    if (!t) return Promise.reject(new Error('Nicht angemeldet. Bitte das CMS neu laden und anmelden.'));
    var headers = Object.assign(
      { Authorization: 'token ' + t, Accept: opt.roh ? 'application/vnd.github.raw' : 'application/vnd.github+json' },
      opt.body ? { 'Content-Type': 'application/json' } : {},
    );
    // Standard: immer frisch fragen (sonst liefert der Browser bis zu 60 Sekunden alte Antworten).
    // Inhalte mit fester Kennung (Blobs) dürfen aus dem Zwischenspeicher kommen.
    return fetch(GH + pfad, { method: opt.method || 'GET', headers: headers, body: opt.body, cache: opt.cache || 'no-store' }).then(function (r) {
      if (!r.ok) {
        return r.text().then(function (txt) {
          var fehler = new Error('GitHub meldet ' + r.status + ': ' + txt.slice(0, 200));
          fehler.status = r.status;
          throw fehler;
        });
      }
      if (opt.roh === 'text') return r.text();
      if (opt.roh) return r.blob();
      return r.status === 204 ? null : r.json();
    });
  }

  function repoPfad(e, rest) {
    return '/repos/' + e.repo + rest;
  }

  /** Mehrere Änderungen in einem Commit: [{ pfad, base64 } | { pfad, text } | { pfad, loeschen: true }] */
  var letzterCommit = null;
  function commit(aenderungen, nachricht) {
    return ladeEinstellungen().then(function (e) {
      var basis = repoPfad(e, '/git');
      function versuch(nr) {
        var refSha, baumSha;
        return gh(basis + '/ref/heads/' + e.branch)
          .then(function (ref) {
            refSha = ref.object.sha;
            // GitHub liefert direkt nach einem Commit manchmal noch den alten Stand
            if (letzterCommit && nr === 0 && refSha !== letzterCommit) refSha = letzterCommit;
            return gh(basis + '/commits/' + refSha);
          })
          .then(function (c) {
            baumSha = c.tree.sha;
            return Promise.all(
              aenderungen.map(function (a) {
                if (a.loeschen || a.blobSha) return a;
                var body = a.text !== undefined ? { content: a.text, encoding: 'utf-8' } : { content: a.base64, encoding: 'base64' };
                return gh(basis + '/blobs', { method: 'POST', body: JSON.stringify(body) }).then(function (b) {
                  a.blobSha = b.sha;
                  return a;
                });
              }),
            );
          })
          .then(function () {
            return gh(basis + '/trees', {
              method: 'POST',
              body: JSON.stringify({
                base_tree: baumSha,
                tree: aenderungen.map(function (a) {
                  return { path: a.pfad, mode: '100644', type: 'blob', sha: a.loeschen ? null : a.blobSha };
                }),
              }),
            });
          })
          .then(function (baum) {
            return gh(basis + '/commits', { method: 'POST', body: JSON.stringify({ message: nachricht, tree: baum.sha, parents: [refSha] }) });
          })
          .then(function (neu) {
            return gh(basis + '/refs/heads/' + e.branch, { method: 'PATCH', body: JSON.stringify({ sha: neu.sha }) }).then(function () {
              letzterCommit = neu.sha;
              return neu.sha;
            });
          })
          .catch(function (fehler) {
            if (nr < 4 && (fehler.status === 422 || fehler.status === 409)) {
              return warte(1500 * (nr + 1)).then(function () {
                return versuch(nr + 1);
              });
            }
            throw fehler;
          });
      }
      return versuch(0);
    });
  }

  /* =====================================================================
   * Bilder vorbereiten (nur große Bilder verkleinern, PNG bleibt PNG)
   * ===================================================================== */
  /** EXIF-Ausrichtung eines JPEG (1 = normal) */
  function jpegAusrichtung(buffer) {
    try {
      var v = new DataView(buffer);
      if (v.getUint16(0) !== 0xffd8) return 1;
      var o = 2;
      while (o < v.byteLength - 4) {
        var marker = v.getUint16(o);
        var laenge = v.getUint16(o + 2);
        if (marker === 0xffe1 && v.getUint32(o + 4) === 0x45786966) {
          var t = o + 10;
          var klein = v.getUint16(t) === 0x4949;
          var ifd = t + v.getUint32(t + 4, klein);
          var anzahl = v.getUint16(ifd, klein);
          for (var i = 0; i < anzahl; i++) {
            var eintrag = ifd + 2 + i * 12;
            if (v.getUint16(eintrag, klein) === 0x0112) return v.getUint16(eintrag + 8, klein);
          }
          return 1;
        }
        if ((marker & 0xff00) !== 0xff00) break;
        o += 2 + laenge;
      }
    } catch (e) {}
    return 1;
  }

  /** Liefert { blob, endung } – Original, wenn klein genug, sonst verkleinert */
  function vorbereiten(datei) {
    var typ = (datei.type || '').toLowerCase();
    if (typ === 'application/pdf' || /\.pdf$/i.test(datei.name)) {
      if (datei.size > 20 * 1024 * 1024) return Promise.reject(new Error('„' + datei.name + '“ ist größer als 20 MB.'));
      return Promise.resolve({ blob: datei, endung: 'pdf' });
    }
    var istPng = typ === 'image/png';
    var istJpeg = typ === 'image/jpeg' || typ === 'image/jpg';
    var istWebp = typ === 'image/webp';
    var bitmap = window.createImageBitmap
      ? createImageBitmap(datei, { imageOrientation: 'from-image' }).catch(function () {
          return createImageBitmap(datei);
        })
      : Promise.reject(new Error('Dieser Browser ist zu alt zum Hochladen.'));
    return Promise.all([bitmap, istJpeg ? datei.arrayBuffer() : Promise.resolve(null)])
      .catch(function () {
        throw new Error('„' + datei.name + '“ kann nicht gelesen werden. Bitte als JPG oder PNG speichern (z. B. iPhone-Fotos im Format HEIC umwandeln).');
      })
      .then(function (r) {
        var bmp = r[0];
        var gross = Math.max(bmp.width, bmp.height) > MAX_KANTE;
        var gedreht = istJpeg && jpegAusrichtung(r[1]) !== 1;
        if (!gross && !gedreht && (istJpeg || istPng || istWebp)) {
          return { blob: datei, endung: istPng ? 'png' : istWebp ? 'webp' : 'jpg' };
        }
        var f = Math.min(1, MAX_KANTE / Math.max(bmp.width, bmp.height));
        var c = document.createElement('canvas');
        c.width = Math.round(bmp.width * f);
        c.height = Math.round(bmp.height * f);
        var ctx = c.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bmp, 0, 0, c.width, c.height);
        var ausgabe = istPng ? 'image/png' : 'image/jpeg';
        return new Promise(function (ok) {
          c.toBlob(
            function (b) {
              ok({ blob: b, endung: istPng ? 'png' : 'jpg' });
            },
            ausgabe,
            JPEG_QUALITAET,
          );
        });
      });
  }

  /* =====================================================================
   * Daten: Bilderliste, Vorschaubilder, Beschreibungen, Verwendung
   * ===================================================================== */
  var bekannt = {}; // gerade hochgeladene Bilder (falls GitHub sie noch nicht listet)
  var geloescht = {};

  function ladeBaum() {
    return ladeEinstellungen().then(function (e) {
      return gh(repoPfad(e, '/git/trees/' + encodeURIComponent(e.branch) + '?recursive=1')).then(function (antwort) {
        var bilder = [];
        var texte = [];
        var gesehen = {};
        (antwort.tree || []).forEach(function (x) {
          if (x.type !== 'blob') return;
          if (x.path.indexOf(e.wurzel + '/') === 0 && (BILD_RE.test(x.path) || DOK_RE.test(x.path))) {
            if (geloescht[x.path]) return;
            bilder.push({ pfad: x.path, sha: x.sha, groesse: x.size });
            gesehen[x.path] = true;
          } else if (x.path.indexOf('src/') === 0 && x.path.indexOf('src/assets/') !== 0 && x.path !== ALT_DATEI && TEXT_RE.test(x.path)) {
            texte.push({ pfad: x.path, sha: x.sha });
          }
        });
        Object.keys(bekannt).forEach(function (p) {
          if (!gesehen[p]) bilder.push(bekannt[p]);
        });
        return { bilder: bilder, texte: texte, wurzel: e.wurzel };
      });
    });
  }

  // Vorschaubilder (begrenzt gleichzeitig, mit Zwischenspeicher)
  var vorschauCache = {};
  var warteschlange = [];
  var aktiv = 0;
  function vorschau(pfad, sha) {
    pfad = ohneSchraegstrich(pfad);
    var schluessel = pfad + '@' + (sha || '');
    if (vorschauCache[pfad + '@lokal']) return vorschauCache[pfad + '@lokal'];
    if (vorschauCache[schluessel]) return vorschauCache[schluessel];
    vorschauCache[schluessel] = new Promise(function (ok, fehler) {
      warteschlange.push({ pfad: pfad, sha: sha, ok: ok, fehler: fehler });
      weiter();
    });
    vorschauCache[schluessel].catch(function () {
      delete vorschauCache[schluessel];
    });
    return vorschauCache[schluessel];
  }
  function weiter() {
    while (aktiv < 6 && warteschlange.length) {
      var a = warteschlange.shift();
      aktiv++;
      (function (a) {
        ladeEinstellungen()
          .then(function (e) {
            if (a.sha) return gh(repoPfad(e, '/git/blobs/' + a.sha), { roh: true, cache: 'default' });
            var url = repoPfad(e, '/contents/' + a.pfad.split('/').map(encodeURIComponent).join('/') + '?ref=' + encodeURIComponent(e.branch));
            return gh(url, { roh: true, cache: 'default' });
          })
          .then(function (blob) {
            var typ = /\.png$/i.test(a.pfad) ? 'image/png' : /\.webp$/i.test(a.pfad) ? 'image/webp' : /\.avif$/i.test(a.pfad) ? 'image/avif' : 'image/jpeg';
            a.ok(URL.createObjectURL(new Blob([blob], { type: typ })));
          }, a.fehler)
          .then(function () {
            aktiv--;
            weiter();
          });
      })(a);
    }
  }
  function lokaleVorschau(pfad, blob) {
    vorschauCache[ohneSchraegstrich(pfad) + '@lokal'] = Promise.resolve(URL.createObjectURL(blob));
  }

  // Zentrale Beschreibungen (src/data/medien.json)
  var altStand = { daten: { alt: {} }, geladen: false };
  function ladeAlt() {
    return ladeEinstellungen().then(function (e) {
      var url = repoPfad(e, '/contents/' + ALT_DATEI + '?ref=' + encodeURIComponent(e.branch));
      return gh(url, { roh: 'text' }).then(
        function (txt) {
          var d = {};
          try {
            d = JSON.parse(txt) || {};
          } catch (x) {}
          if (!d.alt || typeof d.alt !== 'object') d.alt = {};
          altStand = { daten: d, geladen: true };
          return altStand;
        },
        function (fehler) {
          if (fehler.status === 404) {
            altStand = { daten: { alt: {} }, geladen: true };
            return altStand;
          }
          throw fehler;
        },
      );
    });
  }
  function altJson(daten) {
    var sortiert = {};
    Object.keys(daten.alt || {})
      .sort()
      .forEach(function (k) {
        if (daten.alt[k]) sortiert[k] = daten.alt[k];
      });
    var aus = Object.assign({}, daten, { alt: sortiert });
    return JSON.stringify(aus, null, 2) + '\n';
  }
  function zentralerAlt(pfad) {
    return (altStand.daten.alt || {})[ohneSchraegstrich(pfad)] || '';
  }

  // Wo wird ein Bild verwendet? (gespeicherte Inhalte + gerade geöffnete Felder)
  var textCache = {};
  function ladeVerwendung(baum) {
    return ladeEinstellungen().then(function (e) {
      var liste = baum.texte.slice();
      var ergebnisse = [];
      var i = 0;
      function naechster() {
        if (i >= liste.length) return Promise.resolve();
        var t = liste[i++];
        var p = textCache[t.sha]
          ? Promise.resolve(textCache[t.sha])
          : gh(repoPfad(e, '/git/blobs/' + t.sha), { roh: 'text', cache: 'default' }).then(function (txt) {
              textCache[t.sha] = txt;
              return txt;
            });
        return p.then(function (txt) {
          ergebnisse.push({ pfad: t.pfad, text: txt });
          return naechster();
        });
      }
      var laeufer = [];
      for (var n = 0; n < 6; n++) laeufer.push(naechster());
      return Promise.all(laeufer).then(function () {
        var verwendung = {};
        var vorschlaege = {};
        baum.bilder.forEach(function (b) {
          var orte = [];
          ergebnisse.forEach(function (r) {
            if (r.text.indexOf(b.pfad) < 0) return;
            orte.push(ortName(r.pfad));
            if (!vorschlaege[b.pfad]) {
              var alt = altAusText(r.text, b.pfad, r.pfad);
              if (alt) vorschlaege[b.pfad] = alt;
            }
          });
          verwendung[b.pfad] = orte;
        });
        return { verwendung: verwendung, vorschlaege: vorschlaege };
      });
    });
  }
  /**
   * Bisherige Beschreibung eines Bildes aus einer Inhaltsdatei lesen (aus der Zeit, als
   * Beschreibungen noch direkt am Bild gepflegt wurden): { bild, alt }, bild + bildAlt,
   * titelbild + titelbildAlt. Dient nur als Vorschlag für die zentrale Beschreibung.
   */
  function altAusText(text, bildPfad, dateiPfad) {
    var i = text.indexOf(bildPfad);
    while (i >= 0) {
      var alt = /\.json$/i.test(dateiPfad) ? altAusJson(text, i) : altAusYaml(text, i);
      if (alt) return alt;
      i = text.indexOf(bildPfad, i + bildPfad.length);
    }
    return '';
  }
  function altAusJson(text, pos) {
    var start = text.lastIndexOf('{', pos);
    var ende = text.indexOf('}', pos);
    if (start < 0 || ende < 0) return '';
    var m = text.slice(start, ende).match(/"(?:alt|[A-Za-z]*Alt)"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (!m) return '';
    try {
      return JSON.parse('"' + m[1] + '"').trim();
    } catch (e) {
      return m[1].trim();
    }
  }
  function altAusYaml(text, pos) {
    var zeilen = text.split('\n');
    var nr = text.slice(0, pos).split('\n').length - 1;
    var bildZeile = zeilen[nr] || '';
    var einzug = bildZeile.match(/^(\s*)(?:- )?/)[0].length;
    var schluessel = (bildZeile.match(/^\s*(?:- )?([A-Za-z]+):/) || [])[1] || '';
    for (var k = nr + 1; k < Math.min(zeilen.length, nr + 6); k++) {
      var z = zeilen[k];
      if (/^\s*- /.test(z) && z.match(/^\s*/)[0].length <= einzug) break;
      var m = z.match(/^(\s*)(alt|[A-Za-z]*Alt):\s*(.*)$/);
      if (!m) continue;
      if (m[2] !== 'alt' && m[2] !== schluessel + 'Alt' && m[2] !== 'bildAlt') continue;
      var wert = m[3];
      var eigenerEinzug = m[1].length;
      // Fortsetzungszeilen (lange Texte bricht das CMS um)
      for (var f = k + 1; f < zeilen.length; f++) {
        var naechste = zeilen[f];
        var nEinzug = naechste.match(/^\s*/)[0].length;
        var offen = /^"/.test(wert) ? !/^"(?:[^"\\]|\\.)*"\s*$/.test(wert) : /^'/.test(wert) ? !/^'(?:[^']|'')*'\s*$/.test(wert) : false;
        if (!offen && (nEinzug <= eigenerEinzug || /^\s*(- |[\w-]+:\s)/.test(naechste) || !naechste.trim())) break;
        if (!naechste.trim()) break;
        wert += ' ' + naechste.trim();
      }
      wert = wert.trim();
      if (/^".*"$/.test(wert)) {
        try {
          wert = JSON.parse(wert);
        } catch (e) {
          wert = wert.slice(1, -1);
        }
      } else if (/^'.*'$/.test(wert)) wert = wert.slice(1, -1).replace(/''/g, "'");
      wert = String(wert).trim();
      if (wert && wert !== '""' && wert !== "''") return wert;
    }
    return '';
  }

  function ortName(pfad) {
    if (pfad.indexOf('src/data/') === 0) {
      return pfad
        .slice(9)
        .replace(/\.(md|mdx|json|ya?ml)$/i, '')
        .split('/')
        .map(function (s) {
          return s.charAt(0).toUpperCase() + s.slice(1);
        })
        .join(' › ');
    }
    return 'Code: ' + pfad;
  }

  // Gerade geöffnete Felder melden ihre Bilder (auch noch nicht gespeicherte)
  var geoeffnet = {};
  function melde(id, pfade) {
    geoeffnet[id] = (pfade || []).map(ohneSchraegstrich).filter(Boolean);
  }
  function abmelden(id) {
    delete geoeffnet[id];
  }
  function imEditor(pfad) {
    return Object.keys(geoeffnet).some(function (id) {
      return geoeffnet[id].indexOf(pfad) >= 0;
    });
  }

  /** Zielordner für neue Bilder eines Eintrags */
  function zielOrdner(entry, field) {
    return ladeEinstellungen().then(function (e) {
      // Sammlung und Eintrag aus der Adresse des CMS (#/collections/<sammlung>/entries/<eintrag>)
      var adresse = (location.hash || '').match(/#\/collections\/([^/?]+)\/(?:entries\/([^/?]+)|new)/);
      var pfad = entry && entry.get && entry.get('path');
      var slug = adresse && adresse[2] ? decodeURIComponent(adresse[2]) : pfad ? dateiname(pfad).replace(/\.[^.]+$/, '') : '';
      if (!slug) slug = slugify(entry && entry.getIn && entry.getIn(['data', 'titel']));
      var feldOrdner = field && field.get && field.get('ordner');
      if (feldOrdner) return slug ? ohneSchraegstrich(feldOrdner).replace(/\/+$/, '') + '/' + slug : e.wurzel;
      var sammlung = adresse ? decodeURIComponent(adresse[1]) : entry && entry.get && entry.get('collection');
      var vorlage = sammlung && e.sammlungen[sammlung];
      if (vorlage) {
        if (/\{\{\s*(filename|slug)\s*\}\}/.test(vorlage)) {
          return slug ? vorlage.replace(/\{\{\s*(filename|slug)\s*\}\}/g, slug) : e.wurzel;
        }
        return vorlage;
      }
      return e.wurzel;
    });
  }

  /* =====================================================================
   * Oberfläche
   * ===================================================================== */
  var CSS =
    '.mt-overlay{position:fixed;inset:0;background:rgba(20,24,32,.55);z-index:100000;display:flex;align-items:center;justify-content:center;font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#313d3e}' +
    '.mt-dialog{background:#fff;width:min(1240px,96vw);height:min(860px,92vh);border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.35);display:flex;flex-direction:column;overflow:hidden}' +
    '.mt-kopf{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid #e3e5ea}' +
    '.mt-kopf h2{margin:0;font-size:18px;font-weight:600}.mt-kopf p{margin:0;color:#798291;font-size:13px}' +
    '.mt-x{margin-left:auto;width:36px;height:36px;border-radius:50%;border:0;background:#eff0f4;font-size:20px;cursor:pointer}' +
    '.mt-leiste{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:10px 18px;border-bottom:1px solid #e3e5ea;background:#fafbfc}' +
    '.mt-leiste input[type=search],.mt-leiste select{height:36px;border:1px solid #cfd3da;border-radius:6px;padding:0 10px;font:inherit;background:#fff}' +
    '.mt-leiste input[type=search]{width:220px}.mt-leiste label.mt-check{display:flex;gap:6px;align-items:center;cursor:pointer}' +
    '.mt-ziel{font-size:12px;color:#798291;flex-basis:100%}' +
    '.mt-k{display:inline-flex;align-items:center;justify-content:center;height:36px;padding:0 14px;border-radius:6px;border:0;font:inherit;font-weight:600;cursor:pointer;background:#dfe2e8;color:#313d3e}' +
    '.mt-k[hidden]{display:none}.mt-k:disabled{opacity:.5;cursor:not-allowed}.mt-k-blau{background:#3a69c7;color:#fff}.mt-k-rot{background:#c62828;color:#fff}' +
    '.mt-k:focus-visible,.mt-kachel:focus-visible,.mt-x:focus-visible{outline:3px solid #3a69c7;outline-offset:2px}' +
    '.mt-haupt{flex:1;display:flex;min-height:0}' +
    '.mt-raster{flex:1;overflow:auto;padding:14px 18px;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;align-content:start;grid-auto-rows:max-content}' +
    '.mt-raster.mt-drop{background:#eaf0fb}' +
    '.mt-gruppe{grid-column:1/-1;font-size:12px;font-weight:600;color:#798291;text-transform:uppercase;letter-spacing:.04em;margin-top:6px}' +
    '.mt-kachel{position:relative;display:block;width:100%;padding:0;border:2px solid transparent;border-radius:8px;background:#eff0f4;cursor:pointer;text-align:left;overflow:hidden}' +
    '.mt-kachel[aria-pressed=true]{border-color:#3a69c7;box-shadow:0 0 0 2px #3a69c7}' +
    '.mt-bild{aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;color:#9aa1ad;font-size:11px;background:#e7e9ee}' +
    '.mt-bild img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.mt-dok{font-size:22px !important;font-weight:700;color:#c62828 !important;background:#fbe9e9 !important;letter-spacing:.06em}' +
    '.mt-name{display:block;padding:5px 7px 6px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:#fff}' +
    '.mt-haken{position:absolute;top:6px;left:6px;width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.9);border:2px solid #9aa1ad;display:flex;align-items:center;justify-content:center;font-size:13px;color:#fff}' +
    '.mt-kachel[aria-pressed=true] .mt-haken{background:#3a69c7;border-color:#3a69c7}' +
    '.mt-marke{position:absolute;top:6px;right:6px;font-size:10px;font-weight:600;padding:2px 6px;border-radius:10px;background:rgba(0,0,0,.6);color:#fff}' +
    '.mt-marke-frei{background:#fff3cd;color:#7a5a00}' +
    '.mt-detail{width:320px;border-left:1px solid #e3e5ea;overflow:auto;padding:16px 18px;display:flex;flex-direction:column;gap:12px}' +
    '.mt-detail-bild{background:#eff0f4;border-radius:8px;height:220px;display:flex;align-items:center;justify-content:center;overflow:hidden;color:#9aa1ad}' +
    '.mt-detail-bild img{max-width:100%;max-height:100%;object-fit:contain}' +
    '.mt-detail h3{margin:0;font-size:15px;word-break:break-all}.mt-meta{margin:0;color:#798291;font-size:12px}' +
    '.mt-detail textarea{width:100%;box-sizing:border-box;min-height:80px;border:1px solid #cfd3da;border-radius:6px;padding:8px;font:inherit;resize:vertical}' +
    '.mt-detail ul{margin:4px 0 0;padding-left:18px}.mt-hinweis{font-size:12px;color:#798291;margin:0}' +
    '.mt-fuss{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:12px 18px;border-top:1px solid #e3e5ea}' +
    '.mt-status{flex:1;min-width:200px;font-size:13px;color:#005614}.mt-status.mt-fehler{color:#c00}' +
    '.mt-leer{grid-column:1/-1;color:#798291;padding:30px 0;text-align:center}' +
    '.mt-frage{position:absolute;inset:0;background:rgba(20,24,32,.45);display:flex;align-items:center;justify-content:center}' +
    '.mt-frage-box{background:#fff;border-radius:10px;padding:22px;width:min(480px,92vw);box-shadow:0 10px 40px rgba(0,0,0,.3)}' +
    '.mt-frage-box h3{margin:0 0 10px;font-size:17px}.mt-frage-box ul{max-height:200px;overflow:auto}' +
    '.mt-frage-knoepfe{display:flex;gap:10px;justify-content:flex-end;margin-top:16px}' +
    '.mt-nur-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}' +
    '@media (max-width:820px){.mt-haupt{flex-direction:column;overflow:auto}.mt-raster{flex:none;overflow:visible;grid-template-columns:repeat(auto-fill,minmax(110px,1fr))}.mt-detail{width:auto;border-left:0;border-top:1px solid #e3e5ea;overflow:visible}.mt-leiste input[type=search]{width:100%}.mt-overlay{align-items:stretch}.mt-dialog{width:100vw;height:100%;border-radius:0}}';

  function stil() {
    if (document.getElementById('mediathek-stil')) return;
    var s = document.createElement('style');
    s.id = 'mediathek-stil';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function el(tag, attr, kinder) {
    var e = document.createElement(tag);
    Object.keys(attr || {}).forEach(function (k) {
      var v = attr[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') e.textContent = v;
      else if (k === 'class') e.className = v;
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    });
    (kinder || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  var offen = null;

  /**
   * Mediathek öffnen.
   * opt.modus     'verwalten' (Menü „Medien“) oder 'auswahl'
   * opt.mehrfach  mehrere Bilder auswählbar
   * opt.nur       'bilder' oder 'dateien' (PDF) – sonst alles
   * opt.ordner    Zielordner für neue Bilder (Standard: Hauptordner)
   * opt.aktuell   bereits gewählte Pfade (werden markiert)
   * opt.onAuswahl function(pfade[])
   */
  function oeffne(opt) {
    opt = opt || {};
    if (offen) offen.schliessen();
    stil();
    var auswahlModus = opt.modus === 'auswahl';
    var vorher = document.activeElement;
    var st = {
      baum: null,
      verwendung: null,
      gewaehlt: {},
      reihenfolge: [],
      detail: null,
      suche: '',
      ordner: '',
      nurFrei: false,
      laeuft: false,
      wurzel: 'src/assets/cms',
      ziel: opt.ordner || null,
      eintrag: opt.ordner || null,
    };
    (opt.aktuell || []).forEach(function (p) {
      p = ohneSchraegstrich(p);
      if (p) {
        st.gewaehlt[p] = true;
        st.reihenfolge.push(p);
        st.detail = p;
      }
    });

    // ---------- Grundgerüst ----------
    var suche = el('input', { type: 'search', id: 'mt-suche', placeholder: 'Suchen …', 'aria-label': 'Bilder suchen' });
    var ordnerWahl = el('select', { 'aria-label': 'Ordner' });
    var nurFrei = el('input', { type: 'checkbox' });
    var annehmen = opt.nur === 'bilder' ? 'image/jpeg,image/png,image/webp' : opt.nur === 'dateien' ? 'application/pdf,.pdf' : 'image/jpeg,image/png,image/webp,application/pdf,.pdf';
    var dateiEingabe = el('input', { type: 'file', accept: annehmen, multiple: true, id: 'mt-datei', class: 'mt-nur-sr' });
    var zielText = el('span', { class: 'mt-ziel' });
    var raster = el('div', { class: 'mt-raster', role: 'list', 'aria-label': 'Bilder' });
    var detail = el('aside', { class: 'mt-detail', 'aria-label': 'Details zum Bild' });
    var status = el('p', { class: 'mt-status', role: 'status', 'aria-live': 'polite' });
    var knopfLoeschen = el('button', { type: 'button', class: 'mt-k mt-k-rot', text: 'Löschen' });
    var knopfUebernehmen = auswahlModus ? el('button', { type: 'button', class: 'mt-k mt-k-blau', text: 'Übernehmen' }) : null;
    var knopfSchliessen = el('button', { type: 'button', class: 'mt-k', text: auswahlModus ? 'Abbrechen' : 'Schließen' });
    var knopfX = el('button', { type: 'button', class: 'mt-x', 'aria-label': 'Mediathek schließen', text: '×' });
    var knopfUebernahme = el('button', { type: 'button', class: 'mt-k', hidden: true });

    var dialog = el('div', { class: 'mt-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mt-titel' }, [
      el('div', { class: 'mt-kopf' }, [
        el('div', null, [
          el('h2', { id: 'mt-titel', text: 'Mediathek' }),
          el('p', {
            text: auswahlModus
              ? opt.mehrfach
                ? 'Bilder anklicken und „Übernehmen“ wählen – oder neue hochladen.'
                : 'Ein Bild anklicken und „Übernehmen“ wählen (oder doppelt klicken) – oder ein neues hochladen.'
              : 'Alle Bilder und Dateien (PDF) der Website. Beschreibungen vergeben, nicht mehr verwendete löschen.',
          }),
        ]),
        knopfX,
      ]),
      el('div', { class: 'mt-leiste' }, [
        suche,
        ordnerWahl,
        el('label', { class: 'mt-check' }, [nurFrei, 'Nur nicht verwendete']),
        el('label', { for: 'mt-datei', class: 'mt-k mt-k-blau', tabindex: '0', role: 'button' }, [opt.nur === 'dateien' ? '+ Datei hochladen' : opt.nur === 'bilder' ? '+ Bilder hochladen' : '+ Hochladen']),
        knopfUebernahme,
        dateiEingabe,
        zielText,
      ]),
      el('div', { class: 'mt-haupt' }, [raster, detail]),
      el('div', { class: 'mt-fuss' }, [status, knopfLoeschen, knopfSchliessen, knopfUebernehmen]),
    ]);
    var overlay = el('div', { class: 'mt-overlay' }, [dialog]);
    document.body.appendChild(overlay);

    function meldung(text, istFehler) {
      status.textContent = text || '';
      status.className = 'mt-status' + (istFehler ? ' mt-fehler' : '');
    }

    function schliessen() {
      document.removeEventListener('keydown', tasten, true);
      if (beobachter) beobachter.disconnect();
      overlay.remove();
      offen = null;
      if (vorher && vorher.focus) {
        try {
          vorher.focus();
        } catch (e) {}
      }
    }
    offen = { schliessen: schliessen };

    function tasten(ev) {
      if (ev.key === 'Escape') {
        ev.stopPropagation();
        ev.preventDefault();
        var frage = dialog.querySelector('.mt-frage');
        if (frage) frage.remove();
        else schliessen();
      }
    }
    document.addEventListener('keydown', tasten, true);
    overlay.addEventListener('mousedown', function (ev) {
      if (ev.target === overlay) schliessen();
    });
    knopfX.addEventListener('click', schliessen);
    knopfSchliessen.addEventListener('click', schliessen);

    // ---------- Anzeige ----------
    function gefiltert() {
      if (!st.baum) return [];
      var q = st.suche.toLowerCase();
      return st.baum.bilder.filter(function (b) {
        if (opt.nur === 'bilder' && istDok(b.pfad)) return false;
        if (opt.nur === 'dateien' && !istDok(b.pfad)) return false;
        if (st.ordner && ordnerVon(b.pfad) !== st.ordner) return false;
        if (q && b.pfad.toLowerCase().indexOf(q) < 0 && zentralerAlt(b.pfad).toLowerCase().indexOf(q) < 0) return false;
        if (st.nurFrei && (!st.verwendung || istVerwendet(b.pfad))) return false;
        return true;
      });
    }

    function istVerwendet(pfad) {
      return imEditor(pfad) || !!(st.verwendung && st.verwendung[pfad] && st.verwendung[pfad].length);
    }

    function ordnerLabel(o) {
      var rel = o === st.wurzel ? '' : o.slice(st.wurzel.length + 1);
      return rel ? rel.split('/').join(' › ') : 'Allgemein';
    }

    function zielOrdnerJetzt() {
      return st.ordner || st.ziel || st.wurzel;
    }

    function zeichneLeiste() {
      var zaehler = {};
      (st.baum ? st.baum.bilder : []).forEach(function (b) {
        var o = ordnerVon(b.pfad);
        zaehler[o] = (zaehler[o] || 0) + 1;
      });
      if (st.ziel && !zaehler[st.ziel]) zaehler[st.ziel] = 0;
      var ordner = Object.keys(zaehler).sort(function (a, b) {
        if (a === st.ziel) return -1;
        if (b === st.ziel) return 1;
        return a.localeCompare(b, 'de');
      });
      ordnerWahl.innerHTML = '';
      ordnerWahl.appendChild(el('option', { value: '', text: 'Alle Ordner (' + (st.baum ? st.baum.bilder.length : 0) + ')' }));
      ordner.forEach(function (o) {
        ordnerWahl.appendChild(el('option', { value: o, text: ordnerLabel(o) + ' (' + zaehler[o] + ')' + (o === st.eintrag ? ' – dieser Eintrag' : '') }));
      });
      ordnerWahl.value = st.ordner;
      zielText.textContent = 'Neue Bilder landen im Ordner „' + ordnerLabel(zielOrdnerJetzt()) + '“.';
    }

    var beobachter =
      'IntersectionObserver' in window
        ? new IntersectionObserver(
            function (eintraege) {
              eintraege.forEach(function (x) {
                if (!x.isIntersecting) return;
                beobachter.unobserve(x.target);
                ladeKachelBild(x.target);
              });
            },
            { rootMargin: '300px' },
          )
        : null;

    function ladeKachelBild(box) {
      var pfad = box.getAttribute('data-pfad');
      var sha = box.getAttribute('data-sha') || '';
      vorschau(pfad, sha).then(
        function (url) {
          box.innerHTML = '';
          box.appendChild(el('img', { src: url, alt: '', loading: 'lazy', draggable: 'false' }));
        },
        function () {
          box.textContent = 'Vorschau fehlt';
        },
      );
    }

    function zeichneRaster() {
      raster.innerHTML = '';
      if (!st.baum) {
        raster.appendChild(el('p', { class: 'mt-leer', text: 'Bilder werden geladen …' }));
        return;
      }
      var liste = gefiltert();
      if (!liste.length) {
        raster.appendChild(
          el('p', {
            class: 'mt-leer',
            text: st.baum.bilder.length ? 'Keine Bilder gefunden.' : 'Noch keine Bilder. Mit „+ Bilder hochladen“ oder per Ziehen ins Fenster hinzufügen.',
          }),
        );
        return;
      }
      // Ordner des aktuellen Eintrags zuerst, sonst alphabetisch
      liste.sort(function (a, b) {
        var oa = ordnerVon(a.pfad);
        var ob = ordnerVon(b.pfad);
        if (oa !== ob) {
          if (oa === st.ziel) return -1;
          if (ob === st.ziel) return 1;
          return oa.localeCompare(ob, 'de');
        }
        return a.pfad.localeCompare(b.pfad, 'de', { numeric: true });
      });
      var letzterOrdner = null;
      liste.forEach(function (b) {
        var o = ordnerVon(b.pfad);
        if (!st.ordner && o !== letzterOrdner) {
          raster.appendChild(el('p', { class: 'mt-gruppe', role: 'presentation', text: ordnerLabel(o) + (o === st.eintrag ? ' (dieser Eintrag)' : '') }));
          letzterOrdner = o;
        }
        var dok = istDok(b.pfad);
        var box = dok
          ? el('span', { class: 'mt-bild mt-dok', 'aria-hidden': 'true' }, ['PDF'])
          : el('span', { class: 'mt-bild', 'data-pfad': b.pfad, 'data-sha': b.sha || '' }, ['lädt …']);
        var verwendet = istVerwendet(b.pfad);
        var marke = st.verwendung ? (verwendet ? null : el('span', { class: 'mt-marke mt-marke-frei', text: 'nicht verwendet' })) : null;
        var kachel = el(
          'button',
          {
            type: 'button',
            class: 'mt-kachel',
            role: 'listitem',
            'aria-pressed': st.gewaehlt[b.pfad] ? 'true' : 'false',
            title: b.pfad,
            onclick: function (ev) {
              waehle(b.pfad, ev);
            },
            ondblclick: function () {
              if (auswahlModus && !opt.mehrfach) {
                st.gewaehlt = {};
                st.gewaehlt[b.pfad] = true;
                st.reihenfolge = [b.pfad];
                uebernehmen();
              }
            },
          },
          [box, el('span', { class: 'mt-haken', 'aria-hidden': 'true', text: '✓' }), marke, el('span', { class: 'mt-name', text: dateiname(b.pfad) })],
        );
        raster.appendChild(kachel);
        if (dok) return;
        if (beobachter) beobachter.observe(box);
        else ladeKachelBild(box);
      });
    }

    function waehle(pfad, ev) {
      var mehrfach = !auswahlModus || opt.mehrfach;
      if (mehrfach) {
        if (st.gewaehlt[pfad] && st.detail === pfad) {
          delete st.gewaehlt[pfad];
          st.reihenfolge = st.reihenfolge.filter(function (p) {
            return p !== pfad;
          });
        } else if (!st.gewaehlt[pfad]) {
          st.gewaehlt[pfad] = true;
          st.reihenfolge.push(pfad);
        }
      } else {
        st.gewaehlt = {};
        st.gewaehlt[pfad] = true;
        st.reihenfolge = [pfad];
      }
      st.detail = pfad;
      Array.prototype.forEach.call(raster.querySelectorAll('.mt-kachel'), function (k) {
        k.setAttribute('aria-pressed', st.gewaehlt[k.title] ? 'true' : 'false');
      });
      zeichneDetail();
      zeichneFuss();
    }

    function zeichneDetail() {
      detail.innerHTML = '';
      var b =
        st.baum &&
        st.baum.bilder.filter(function (x) {
          return x.pfad === st.detail;
        })[0];
      if (!b) {
        detail.appendChild(el('p', { class: 'mt-hinweis', text: 'Bild oder Datei anklicken, um Details, Beschreibung und Verwendung zu sehen.' }));
        return;
      }
      var dokument = istDok(b.pfad);
      var bildBox = el('div', { class: 'mt-detail-bild' + (dokument ? ' mt-dok' : '') }, [dokument ? 'PDF' : 'lädt …']);
      var masse = el('p', { class: 'mt-meta' });
      if (!dokument) vorschau(b.pfad, b.sha).then(function (url) {
        bildBox.innerHTML = '';
        var img = el('img', { src: url, alt: '' });
        img.addEventListener('load', function () {
          masse.textContent = img.naturalWidth + ' × ' + img.naturalHeight + ' px' + (b.groesse ? ' · ' + kb(b.groesse) : '');
        });
        bildBox.appendChild(img);
      });
      detail.appendChild(bildBox);
      detail.appendChild(el('h3', { text: dateiname(b.pfad) }));
      detail.appendChild(el('p', { class: 'mt-meta', text: 'Ordner: ' + ordnerLabel(ordnerVon(b.pfad)) }));
      masse.textContent = b.groesse ? kb(b.groesse) : '';
      detail.appendChild(masse);

      if (optionen.altTexte && !dokument) {
        var feld = el('textarea', { id: 'mt-alt', placeholder: 'Was ist auf dem Bild zu sehen?' });
        var vorschlag = !zentralerAlt(b.pfad) && st.vorschlaege && st.vorschlaege[b.pfad];
        feld.value = zentralerAlt(b.pfad) || vorschlag || '';
        var speichern = el('button', { type: 'button', class: 'mt-k mt-k-blau', text: 'Beschreibung speichern' });
        speichern.addEventListener('click', function () {
          speichereAlt(b.pfad, feld.value.trim(), speichern);
        });
        detail.appendChild(
          el('div', null, [
            el('label', { for: 'mt-alt', style: 'font-weight:600;display:block;margin-bottom:4px', text: 'Beschreibung (Alt-Text)' }),
            feld,
            el('p', {
              class: 'mt-hinweis',
              text: vorschlag
                ? 'Vorschlag aus der bisherigen Beschreibung im Eintrag – mit „Beschreibung speichern“ übernehmen. Gilt dann überall, wo das Bild eingesetzt ist.'
                : 'Gilt überall auf der Website, wo das Bild eingesetzt ist.',
            }),
            speichern,
          ]),
        );
      }

      var orte = (st.verwendung && st.verwendung[b.pfad]) || [];
      var verwendungBox = el('div', null, [el('strong', { text: 'Verwendet in' })]);
      if (!st.verwendung) verwendungBox.appendChild(el('p', { class: 'mt-hinweis', text: 'Wird geprüft …' }));
      else if (!orte.length && !imEditor(b.pfad)) verwendungBox.appendChild(el('p', { class: 'mt-hinweis', text: 'Nirgends – das Bild kann gelöscht werden.' }));
      else {
        var ul = el('ul');
        orte.forEach(function (o) {
          ul.appendChild(el('li', { text: o }));
        });
        if (imEditor(b.pfad) && !orte.length) ul.appendChild(el('li', { text: 'Im gerade geöffneten Eintrag (noch nicht gespeichert)' }));
        verwendungBox.appendChild(ul);
      }
      detail.appendChild(verwendungBox);
    }

    function zeichneFuss() {
      var n = st.reihenfolge.length;
      knopfLoeschen.disabled = !n || st.laeuft || !st.verwendung;
      knopfLoeschen.textContent = n > 1 ? n + ' Bilder löschen' : 'Löschen';
      knopfLoeschen.title = !st.verwendung ? 'Verwendung wird noch geprüft …' : '';
      if (knopfUebernehmen) {
        knopfUebernehmen.disabled = !n || st.laeuft;
        knopfUebernehmen.textContent = opt.mehrfach && n > 1 ? n + ' Bilder übernehmen' : 'Übernehmen';
      }
    }

    function offeneVorschlaege() {
      if (!optionen.altTexte || !st.vorschlaege || !st.baum) return [];
      return st.baum.bilder
        .map(function (b) {
          return b.pfad;
        })
        .filter(function (p) {
          return st.vorschlaege[p] && !zentralerAlt(p);
        });
    }

    function zeichneUebernahme() {
      var offen = offeneVorschlaege();
      knopfUebernahme.hidden = !offen.length || st.laeuft;
      knopfUebernahme.textContent = 'Bisherige Beschreibungen übernehmen (' + offen.length + ')';
      knopfUebernahme.title = 'Beschreibungen, die bisher direkt an den Bildern in Seiten und Projekten standen, zentral in die Mediathek übernehmen';
    }

    knopfUebernahme.addEventListener('click', function () {
      var offen = offeneVorschlaege();
      if (!offen.length) return;
      st.laeuft = true;
      zeichneUebernahme();
      zeichneFuss();
      meldung(offen.length + ' Beschreibungen werden übernommen …');
      ladeAlt()
        .then(function (stand) {
          offen.forEach(function (p) {
            if (!stand.daten.alt[p]) stand.daten.alt[p] = st.vorschlaege[p];
          });
          return commit([{ pfad: ALT_DATEI, text: altJson(stand.daten) }], 'Bildbeschreibungen in die Mediathek übernommen (' + offen.length + ')');
        })
        .then(
          function () {
            st.laeuft = false;
            alles();
            meldung(offen.length + ' Beschreibungen übernommen. Ab jetzt pflegst du sie hier in der Mediathek.');
          },
          function (f) {
            st.laeuft = false;
            alles();
            meldung('Übernehmen hat nicht geklappt. ' + f.message, true);
          },
        );
    });

    function alles() {
      zeichneUebernahme();
      zeichneLeiste();
      zeichneRaster();
      zeichneDetail();
      zeichneFuss();
    }

    // ---------- Aktionen ----------
    function uebernehmen() {
      if (!st.reihenfolge.length) return;
      var pfade = st.reihenfolge.slice();
      schliessen();
      if (opt.onAuswahl) opt.onAuswahl(pfade);
    }
    if (knopfUebernehmen) knopfUebernehmen.addEventListener('click', uebernehmen);

    function speichereAlt(pfad, text, knopf) {
      knopf.disabled = true;
      meldung('Beschreibung wird gespeichert …');
      ladeAlt()
        .then(function (stand) {
          var d = stand.daten;
          if (text) d.alt[pfad] = text;
          else delete d.alt[pfad];
          return commit([{ pfad: ALT_DATEI, text: altJson(d) }], 'Bildbeschreibung geändert: ' + dateiname(pfad));
        })
        .then(
          function () {
            meldung('Beschreibung gespeichert. Sie erscheint nach dem nächsten Veröffentlichen auf der Website.');
            knopf.disabled = false;
          },
          function (f) {
            meldung('Speichern hat nicht geklappt. ' + f.message, true);
            knopf.disabled = false;
          },
        );
    }

    function frage(titel, kinder, bestaetigen, knopfText) {
      var box = el('div', { class: 'mt-frage-box', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'mt-frage-titel' });
      var ja = el('button', { type: 'button', class: 'mt-k mt-k-rot', text: knopfText || 'Endgültig löschen' });
      var nein = el('button', { type: 'button', class: 'mt-k', text: 'Abbrechen' });
      var huelle = el('div', { class: 'mt-frage' }, [box]);
      box.appendChild(el('h3', { id: 'mt-frage-titel', text: titel }));
      kinder.forEach(function (k) {
        box.appendChild(k);
      });
      box.appendChild(el('div', { class: 'mt-frage-knoepfe' }, [nein, bestaetigen ? ja : null]));
      nein.addEventListener('click', function () {
        huelle.remove();
        knopfLoeschen.focus();
      });
      ja.addEventListener('click', function () {
        huelle.remove();
        bestaetigen();
      });
      dialog.style.position = 'relative';
      dialog.appendChild(huelle);
      nein.focus();
    }

    knopfLoeschen.addEventListener('click', function () {
      if (!st.verwendung) return;
      var auswahl = st.reihenfolge.slice();
      var frei = auswahl.filter(function (p) {
        return !istVerwendet(p);
      });
      var belegt = auswahl.filter(function (p) {
        return istVerwendet(p);
      });
      var teile = [];
      if (belegt.length) {
        var ul = el('ul');
        belegt.forEach(function (p) {
          var orte = (st.verwendung[p] || []).slice();
          if (imEditor(p)) orte.push('gerade geöffneter Eintrag');
          ul.appendChild(el('li', { text: dateiname(p) + ' – ' + orte.join(', ') }));
        });
        teile.push(
          el('p', {
            text:
              (belegt.length === 1 ? 'Dieses Bild wird' : 'Diese ' + belegt.length + ' Bilder werden') +
              ' noch verwendet und ' +
              (belegt.length === 1 ? 'kann' : 'können') +
              ' nicht gelöscht werden. Nimm ' +
              (belegt.length === 1 ? 'es' : 'sie') +
              ' dort zuerst heraus und speichere:',
          }),
        );
        teile.push(ul);
      }
      if (!frei.length) {
        frage('Löschen nicht möglich', teile, null);
        return;
      }
      teile.unshift(
        el('p', {
          text:
            (frei.length === 1 ? '„' + dateiname(frei[0]) + '“ wird' : frei.length + ' Bilder werden') +
            ' endgültig aus dem System gelöscht. Das lässt sich hier nicht rückgängig machen.',
        }),
      );
      frage(frei.length === 1 ? 'Bild endgültig löschen?' : frei.length + ' Bilder endgültig löschen?', teile, function () {
        loesche(frei);
      });
    });

    function loesche(pfade) {
      st.laeuft = true;
      zeichneFuss();
      meldung('Wird gelöscht …');
      var mitAlt = pfade.some(function (p) {
        return zentralerAlt(p);
      });
      (mitAlt ? ladeAlt() : Promise.resolve(null))
        .then(function (stand) {
          var aenderungen = pfade.map(function (p) {
            return { pfad: p, loeschen: true };
          });
          if (stand) {
            pfade.forEach(function (p) {
              delete stand.daten.alt[p];
            });
            aenderungen.push({ pfad: ALT_DATEI, text: altJson(stand.daten) });
          }
          return commit(aenderungen, pfade.length === 1 ? 'Bild gelöscht: ' + dateiname(pfade[0]) : pfade.length + ' Bilder gelöscht');
        })
        .then(
          function () {
            pfade.forEach(function (p) {
              geloescht[p] = true;
              delete bekannt[p];
              delete st.gewaehlt[p];
            });
            st.baum.bilder = st.baum.bilder.filter(function (b) {
              return pfade.indexOf(b.pfad) < 0;
            });
            st.reihenfolge = st.reihenfolge.filter(function (p) {
              return pfade.indexOf(p) < 0;
            });
            if (pfade.indexOf(st.detail) >= 0) st.detail = null;
            st.laeuft = false;
            alles();
            meldung(pfade.length === 1 ? 'Bild gelöscht.' : pfade.length + ' Bilder gelöscht.');
          },
          function (f) {
            st.laeuft = false;
            zeichneFuss();
            meldung('Löschen hat nicht geklappt. ' + f.message, true);
          },
        );
    }

    function hochladen(dateiListe) {
      var dateien = Array.prototype.filter.call(dateiListe || [], function (f) {
        var dok = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
        if (dok) return opt.nur !== 'bilder';
        return /^image\//.test(f.type) && opt.nur !== 'dateien';
      });
      if (!dateien.length || st.laeuft || !st.baum) return;
      var ordner = zielOrdnerJetzt();
      var vorhanden = {};
      st.baum.bilder.forEach(function (b) {
        vorhanden[b.pfad.toLowerCase()] = true;
      });
      st.laeuft = true;
      zeichneFuss();
      var fertig = 0;
      var neu = [];
      meldung('Bereite ' + dateien.length + (dateien.length === 1 ? ' Bild' : ' Bilder') + ' vor …');

      function stapel(start) {
        var teil = dateien.slice(start, start + PRO_COMMIT);
        if (!teil.length) return Promise.resolve();
        var auftraege = [];
        return Promise.all(
          teil.map(function (f) {
            return vorbereiten(f).then(function (v) {
              var basis = slugify(f.name.replace(/\.[^.]+$/, '')) || 'bild';
              var name = basis + '.' + v.endung;
              var i = 2;
              while (vorhanden[(ordner + '/' + name).toLowerCase()]) name = basis + '-' + i++ + '.' + v.endung;
              vorhanden[(ordner + '/' + name).toLowerCase()] = true;
              return alsBase64(v.blob).then(function (b64) {
                auftraege.push({ pfad: ordner + '/' + name, base64: b64, blob: v.blob });
              });
            });
          }),
        )
          .then(function () {
            meldung('Lade hoch: ' + fertig + ' von ' + dateien.length + ' …');
            return commit(
              auftraege.map(function (a) {
                return { pfad: a.pfad, base64: a.base64 };
              }),
              'Bilder hochgeladen: ' + ordnerLabel(ordner) + ' (' + auftraege.length + ')',
            );
          })
          .then(function () {
            auftraege.forEach(function (a) {
              lokaleVorschau(a.pfad, a.blob);
              var eintrag = { pfad: a.pfad, sha: '', groesse: a.blob.size };
              bekannt[a.pfad] = eintrag;
              delete geloescht[a.pfad];
              st.baum.bilder.push(eintrag);
              if (st.verwendung) st.verwendung[a.pfad] = [];
              neu.push(a.pfad);
            });
            fertig += auftraege.length;
            return stapel(start + PRO_COMMIT);
          });
      }

      stapel(0).then(
        function () {
          st.laeuft = false;
          // Neue Bilder gleich auswählen
          if (auswahlModus && !opt.mehrfach) {
            st.gewaehlt = {};
            st.reihenfolge = [];
          }
          (auswahlModus && !opt.mehrfach ? neu.slice(0, 1) : neu).forEach(function (p) {
            if (!st.gewaehlt[p]) {
              st.gewaehlt[p] = true;
              st.reihenfolge.push(p);
            }
          });
          st.detail = neu[0] || st.detail;
          alles();
          meldung(
            fertig +
              (fertig === 1 ? ' Bild hochgeladen' : ' Bilder hochgeladen') +
              (auswahlModus ? ' und ausgewählt. Mit „Übernehmen“ einsetzen.' : '.'),
          );
        },
        function (f) {
          st.laeuft = false;
          alles();
          meldung('Hochladen hat nicht geklappt (' + fertig + ' von ' + dateien.length + ' geschafft). ' + f.message, true);
        },
      );
    }

    // ---------- Ereignisse ----------
    suche.addEventListener('input', function () {
      st.suche = suche.value.trim();
      zeichneRaster();
    });
    ordnerWahl.addEventListener('change', function () {
      st.ordner = ordnerWahl.value;
      zeichneLeiste();
      zeichneRaster();
    });
    nurFrei.addEventListener('change', function () {
      st.nurFrei = nurFrei.checked;
      zeichneRaster();
    });
    dateiEingabe.addEventListener('change', function () {
      hochladen(dateiEingabe.files);
      dateiEingabe.value = '';
    });
    dialog.querySelector('label[for=mt-datei]').addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        dateiEingabe.click();
      }
    });
    raster.addEventListener('dragover', function (ev) {
      if (ev.dataTransfer && Array.prototype.indexOf.call(ev.dataTransfer.types || [], 'Files') >= 0) {
        ev.preventDefault();
        raster.classList.add('mt-drop');
      }
    });
    raster.addEventListener('dragleave', function () {
      raster.classList.remove('mt-drop');
    });
    raster.addEventListener('drop', function (ev) {
      if (ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files.length) {
        ev.preventDefault();
        raster.classList.remove('mt-drop');
        hochladen(ev.dataTransfer.files);
      }
    });

    // ---------- Laden ----------
    alles();
    suche.focus();
    meldung('Bilder werden geladen …');
    Promise.all([ladeBaum(), optionen.altTexte ? ladeAlt().catch(function () {}) : null])
      .then(function (r) {
        st.baum = r[0];
        st.wurzel = r[0].wurzel;
        if (!st.ziel) st.ziel = st.wurzel;
        // bereits gewählte Bilder, die es nicht (mehr) gibt, ignorieren
        st.reihenfolge = st.reihenfolge.filter(function (p) {
          return st.baum.bilder.some(function (b) {
            return b.pfad === p;
          });
        });
        alles();
        meldung('Verwendung der Bilder wird geprüft …');
        return ladeVerwendung(st.baum).then(function (v) {
          st.verwendung = v.verwendung;
          st.vorschlaege = v.vorschlaege;
          alles();
          meldung(st.baum.bilder.length + (st.baum.bilder.length === 1 ? ' Bild' : ' Bilder') + ' in der Mediathek.');
        });
      })
      .catch(function (f) {
        meldung('Die Mediathek konnte nicht geladen werden. ' + f.message, true);
      });
  }

  /* =====================================================================
   * Bildfeld (ersetzt Decaps „image“-Feld)
   * ===================================================================== */
  var bildfeldNr = 0;
  var original = window.CMS.getWidget && window.CMS.getWidget('image');

  function feldFuer(art) {
  var istDatei = art === 'datei';
  var W = istDatei
    ? { waehlen: 'Datei wählen', anders: 'Andere Datei wählen', keins: 'Keine Datei ausgewählt', fehlt: 'Datei fehlt', entfernen: 'Datei entfernen' }
    : { waehlen: 'Bild wählen', anders: 'Anderes Bild wählen', keins: 'Kein Bild ausgewählt', fehlt: 'Bild fehlt', entfernen: 'Bild entfernen' };
  return window.createClass({
    getInitialState: function () {
      this.nr = art + '-' + ++bildfeldNr;
      return { url: null, fehler: false, fuer: null };
    },
    pfad: function () {
      var v = this.props.value;
      if (v && v.toJS) v = v.toJS();
      return typeof v === 'string' ? ohneSchraegstrich(v) : '';
    },
    componentDidMount: function () {
      this.aktualisieren();
    },
    componentDidUpdate: function () {
      this.aktualisieren();
    },
    componentWillUnmount: function () {
      this.weg = true;
      abmelden(this.nr);
    },
    aktualisieren: function () {
      var self = this;
      var p = this.pfad();
      melde(this.nr, p ? [p] : []);
      if (p === this.state.fuer) return;
      this.setState({ fuer: p, url: null, fehler: false });
      if (!p || istDatei) return;
      vorschau(p).then(
        function (url) {
          if (!self.weg && self.pfad() === p) self.setState({ url: url });
        },
        function () {
          if (!self.weg && self.pfad() === p) self.setState({ fehler: true });
        },
      );
    },
    waehlen: function () {
      var self = this;
      zielOrdner(this.props.entry, this.props.field).then(function (ordner) {
        oeffne({
          modus: 'auswahl',
          mehrfach: false,
          nur: istDatei ? 'dateien' : 'bilder',
          ordner: ordner,
          aktuell: self.pfad() ? [self.pfad()] : [],
          onAuswahl: function (pfade) {
            if (pfade[0]) self.props.onChange(pfade[0]);
          },
        });
      });
    },
    render: function () {
      var self = this;
      var p = this.pfad();
      var feldName = this.props.field && this.props.field.get ? this.props.field.get('label') || '' : '';
      var knopf = { display: 'inline-block', padding: '8px 14px', borderRadius: '5px', border: 0, background: '#3a69c7', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer' };
      var knopf2 = Object.assign({}, knopf, { background: '#dfdfe3', color: '#313d3e' });
      return h(
        'div',
        { className: this.props.classNameWrapper, style: { padding: '12px', display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' } },
        p
          ? h(
              'div',
              { style: { width: '120px', height: '90px', borderRadius: '6px', overflow: 'hidden', background: '#eff0f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#798291', flex: 'none' } },
              istDatei
                ? h('span', { style: { fontSize: '20px', fontWeight: 700, color: '#c62828' } }, 'PDF')
                : this.state.url
                  ? h('img', { src: this.state.url, alt: '', style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' } })
                  : this.state.fehler
                    ? W.fehlt
                    : 'lädt …',
            )
          : null,
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 } },
          p ? h('span', { style: { fontSize: '13px', color: '#313d3e', wordBreak: 'break-all' }, title: p }, dateiname(p)) : h('span', { style: { fontSize: '13px', color: '#798291' } }, W.keins),
          h(
            'div',
            { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
            h(
              'button',
              {
                id: this.props.forID,
                type: 'button',
                style: knopf,
                onClick: this.waehlen,
                'aria-label': (p ? W.anders : W.waehlen) + (feldName ? ' – ' + feldName : ''),
              },
              p ? W.anders : W.waehlen,
            ),
            p
              ? h(
                  'button',
                  {
                    type: 'button',
                    style: knopf2,
                    'aria-label': W.entfernen + (feldName ? ' – ' + feldName : ''),
                    onClick: function () {
                      self.props.onChange('');
                    },
                  },
                  'Entfernen',
                )
              : null,
          ),
        ),
      );
    },
  });

  }

  var originalDatei = window.CMS.getWidget && window.CMS.getWidget('file');
  window.CMS.registerWidget('image', feldFuer('bild'), original && original.preview);
  // Dateifeld (z. B. PDF zum Herunterladen) – ebenfalls über die Mediathek
  window.CMS.registerWidget('file', feldFuer('datei'), originalDatei && originalDatei.preview);

  /* =====================================================================
   * Als Decap-Mediathek anmelden (Menü „Medien“)
   * ===================================================================== */
  if (window.CMS.registerMediaLibrary) {
    window.CMS.registerMediaLibrary({
      name: 'mediathek',
      init: function (o) {
        var c = (o && o.options && o.options.config) || {};
        if (c.alt_texte === false) optionen.altTexte = false;
        var einfuegen = o && o.handleInsert;
        return Promise.resolve({
          show: function (a) {
            a = a || {};
            if (a.id && einfuegen) {
              oeffne({
                modus: 'auswahl',
                mehrfach: !!a.allowMultiple,
                onAuswahl: function (pfade) {
                  einfuegen(a.allowMultiple ? pfade : pfade[0]);
                },
              });
            } else {
              oeffne({ modus: 'verwalten' });
            }
          },
          hide: function () {
            if (offen) offen.schliessen();
          },
          enableStandalone: function () {
            return true;
          },
        });
      },
    });
  }

  /* Für das Galerie-Feld */
  window.MSMediathek = {
    oeffne: oeffne,
    vorbereiten: vorbereiten,
    commit: commit,
    vorschau: vorschau,
    lokaleVorschau: lokaleVorschau,
    melde: melde,
    abmelden: abmelden,
    zielOrdner: zielOrdner,
    bekannt: function (pfad, groesse) {
      pfad = ohneSchraegstrich(pfad);
      bekannt[pfad] = { pfad: pfad, sha: '', groesse: groesse };
      delete geloescht[pfad];
    },
  };
})();

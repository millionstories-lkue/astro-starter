/**
 * Bildvorschauen im CMS zuverlässig anzeigen.
 * Decap lädt die Vorschaubilder aus GitHub nach, zeichnet das Feld danach aber nicht
 * immer neu – die Vorschau bleibt dann leer. Dieses kleine Skript erneuert die
 * Bildfelder nach dem Öffnen ein paar Sekunden lang, bis die Vorschauen da sind.
 * Diese Datei ist Teil des Starter-Repos – nicht verändern.
 */
(function () {
  if (!window.CMS || !window.createClass || !window.h) return;
  var bild = window.CMS.getWidget('image');
  if (!bild || !bild.control) return;
  var Original = bild.control;

  var Bildfeld = window.createClass({
    getInitialState: function () {
      return { runde: 0 };
    },
    componentDidMount: function () {
      var self = this;
      this.timer = setInterval(function () {
        var runde = self.state.runde + 1;
        self.setState({ runde: runde });
        if (runde >= 20) clearInterval(self.timer);
      }, 750);
    },
    componentWillUnmount: function () {
      clearInterval(this.timer);
    },
    render: function () {
      var props = this.props;
      // Neue Funktion bei jedem Zeichnen → Decap fragt das Vorschaubild erneut ab
      var getAsset = function (pfad, feld) {
        return props.getAsset(pfad, feld);
      };
      return window.h(Original, Object.assign({}, props, { getAsset: getAsset }));
    },
  });

  window.CMS.registerWidget('image', Bildfeld, bild.preview);
})();

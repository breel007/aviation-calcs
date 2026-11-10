/**
 * UI for the TAF decoder.
 * Parsing lives in calc.js (TafDecoder), using MetarDecoder for weather groups.
 */
(function () {
  "use strict";

  var T = window.TafDecoder;
  if (!T) return;

  var elRaw = document.getElementById("raw");
  var warnings = document.getElementById("warnings");
  var plain = document.getElementById("plain");
  var groupsEl = document.getElementById("groups");

  var EXAMPLE = [
    "TAF KLAX 100520Z 1006/1112 25008KT P6SM FEW015 SCT250",
    "FM101000 23012KT P6SM SCT020",
    "TEMPO 1016/1020 23015G25KT 5SM -SHRA BKN015",
    "FM110200 21008KT P6SM SKC"
  ].join("\n");

  var EXAMPLE_PROB = [
    "TAF AMD KJFK 101145Z 1012/1118 05012KT 1/2SM FG BKN002",
    "FM101600 05015KT 3SM BR BKN008",
    "BECMG 1020/1022 5SM SCT015",
    "PROB30 1100/1104 1SM -RA BR BKN005"
  ].join("\n");

  function showWarnings(notes) {
    if (!notes || !notes.length) { warnings.hidden = true; warnings.innerHTML = ""; return; }
    warnings.hidden = false;
    warnings.innerHTML = notes.map(function (n) { return "<p>" + n + "</p>"; }).join("");
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function periodText(g) {
    if (g.kind === "FM" && g.from) return T.formatFrom(g.from);
    if (g.period) return T.formatPeriod(g.period);
    return "";
  }

  function render() {
    var raw = elRaw.value;
    if (!String(raw).trim()) {
      showWarnings([]);
      plain.textContent = "";
      groupsEl.innerHTML = "";
      return;
    }
    var r = T.parseTaf(raw);
    if (r.error) {
      showWarnings([r.error]);
      plain.textContent = "";
      groupsEl.innerHTML = "";
      return;
    }
    showWarnings([]);
    plain.textContent = r.plainEnglish || "";

    if (r.cancelled) {
      groupsEl.innerHTML = '<div class="group-card"><h3>Cancelled</h3><p>This TAF has been cancelled (CNL).</p></div>';
      return;
    }

    groupsEl.innerHTML = (r.groups || []).map(function (g, i) {
      var cat = g.flightCategory && g.flightCategory !== "UNKNOWN" ? g.flightCategory : "";
      var pill = cat ? '<span class="cat-pill cat-' + cat + '">' + esc(cat) + "</span>" : "";
      var title = g.kind === "INITIAL" ? "Prevailing forecast" : (g.label || g.kind);
      var when = periodText(g);
      return '<article class="group-card">' +
        '<p class="group-kicker">Group ' + (i + 1) + (when ? " · " + esc(when) : "") + "</p>" +
        "<h3>" + esc(title) + pill + "</h3>" +
        "<p>" + esc(g.plainEnglish || "") + "</p>" +
        (g.rawTokens && g.rawTokens.length ? '<p class="cite">' + esc(g.rawTokens.join(" ")) + "</p>" : "") +
        "</article>";
    }).join("");
  }

  elRaw.addEventListener("input", render);
  document.getElementById("btn-example").addEventListener("click", function () { elRaw.value = EXAMPLE; render(); });
  document.getElementById("btn-example-prob").addEventListener("click", function () { elRaw.value = EXAMPLE_PROB; render(); });
  document.getElementById("btn-clear").addEventListener("click", function () { elRaw.value = ""; render(); });
  render();
})();

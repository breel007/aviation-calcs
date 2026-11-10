/**
 * UI for the METAR decoder.
 * Parsing lives in calc.js (MetarDecoder).
 */
(function () {
  "use strict";

  var M = window.MetarDecoder;
  if (!M) return;

  var elRaw = document.getElementById("raw");
  var warnings = document.getElementById("warnings");
  var hero = document.getElementById("hero");
  var heroValue = document.getElementById("hero-value");
  var heroSub = document.getElementById("hero-sub");
  var plain = document.getElementById("plain");
  var statGrid = document.getElementById("stat-grid");

  var EXAMPLE = "METAR KLAX 100653Z 08004KT 10SM CLR 21/17 A3005 RMK AO2 SLP171 T02110167 $";
  var EXAMPLE_LIFR = "SPECI KJFK 101151Z 05015G25KT 1/2SM R04R/2000V3000FT FG BKN002 08/08 A2910";

  function showWarnings(notes) {
    if (!notes || !notes.length) { warnings.hidden = true; warnings.innerHTML = ""; return; }
    warnings.hidden = false;
    warnings.innerHTML = notes.map(function (n) { return "<p>" + n + "</p>"; }).join("");
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value + '</p>' +
      (sub ? '<p class="stat-sub">' + sub + '</p>' : '') + '</div>';
  }
  function fmtHdg(d) {
    if (!isFinite(d)) return "—";
    return String(Math.round(d)).padStart(3, "0") + "°";
  }

  function render() {
    var raw = elRaw.value;
    if (!String(raw).trim()) {
      showWarnings([]);
      hero.setAttribute("data-cat", "");
      heroValue.innerHTML = '<span class="num">—</span>';
      heroSub.textContent = "Paste a METAR to decode.";
      plain.textContent = "";
      statGrid.innerHTML = "";
      return;
    }
    var r = M.parseMetar(raw);
    if (r.error) {
      showWarnings([r.error]);
      hero.setAttribute("data-cat", "");
      heroValue.innerHTML = '<span class="num">—</span>';
      heroSub.textContent = "";
      plain.textContent = "";
      statGrid.innerHTML = "";
      return;
    }
    showWarnings([]);

    var cat = r.flightCategory || "—";
    hero.setAttribute("data-cat", cat === "UNKNOWN" ? "" : cat);
    heroValue.innerHTML = '<span class="num">' + esc(cat) + "</span>";
    var ceil = r.ceilingFt == null ? "no BKN/OVC/VV ceiling" : Math.round(r.ceilingFt).toLocaleString("en-US") + " ft ceiling";
    var vis = r.visibility ? M.formatVis(r.visibility) : "visibility missing";
    heroSub.textContent = ceil + "  ·  " + vis;

    plain.textContent = r.plainEnglish || "";

    var html = "";
    html += stat("Station", r.station || "—", (r.reportType || "METAR") + (r.auto ? " · AUTO" : "") + (r.corrected ? " · COR" : ""));
    if (r.time) {
      html += stat("Time", String(r.time.hour).padStart(2, "0") + ":" + String(r.time.minute).padStart(2, "0") + " Z", "Day " + r.time.day);
    }
    if (r.wind) {
      var w = r.wind.calm ? "Calm" : (r.wind.variable ? "VRB " : fmtHdg(r.wind.direction) + " ") +
        (isFinite(r.wind.speedKt) ? Math.round(r.wind.speedKt) + " kt" : "") +
        (isFinite(r.wind.gustKt) ? " G" + Math.round(r.wind.gustKt) : "");
      var wsub = r.wind.variableDirection ? "Varying " + fmtHdg(r.wind.variableDirection.from) + "–" + fmtHdg(r.wind.variableDirection.to) : M.describeWind(r.wind);
      html += stat("Wind", w, wsub);
    }
    if (r.visibility) html += stat("Visibility", M.formatVis(r.visibility), "");
    if (r.rvr && r.rvr.length) {
      html += stat("RVR", r.rvr.map(function (x) {
        return "Rwy " + x.runway + " " + x.min.text + (x.max ? "–" + x.max.text : "");
      }).join("; "), "");
    }
    if (r.weather && r.weather.length) {
      html += stat("Weather", r.weather.map(function (w) { return w.text; }).join("; "), r.weather.map(function (w) { return w.raw; }).join(" "));
    }
    if (r.sky && r.sky.length) html += stat("Sky", M.describeSky(r.sky, r.cavok), r.sky.map(function (s) { return s.raw; }).join(" "));
    if (r.tempDew) {
      var t = r.tempDew.tempC == null ? "—" : r.tempDew.tempC + "°C";
      var d = r.tempDew.dewC == null ? "—" : r.tempDew.dewC + "°C";
      html += stat("Temperature / dewpoint", t + " / " + d, "");
    }
    if (r.altimeter) {
      html += stat("Altimeter", r.altimeter.inHg.toFixed(2) + " inHg", Math.round(r.altimeter.hPa) + " hPa");
    }
    if (r.remarks && r.remarks.notes && r.remarks.notes.length) {
      html += stat("Remarks", r.remarks.notes.join(" "), r.remarks.raw);
    }
    statGrid.innerHTML = html;
  }

  elRaw.addEventListener("input", render);
  document.getElementById("btn-example").addEventListener("click", function () { elRaw.value = EXAMPLE; render(); });
  document.getElementById("btn-example-ifr").addEventListener("click", function () { elRaw.value = EXAMPLE_LIFR; render(); });
  document.getElementById("btn-clear").addEventListener("click", function () { elRaw.value = ""; render(); });
  render();
})();

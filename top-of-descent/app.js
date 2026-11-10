/**
 * UI for the top-of-descent calculator.
 * Math lives in calc.js (TopOfDescent).
 */
(function () {
  "use strict";

  var TOD = window.TopOfDescent;
  if (!TOD) return;

  var elCruise = document.getElementById("cruise");
  var elTarget = document.getElementById("target");
  var elGs = document.getElementById("gs");
  var elAngle = document.getElementById("angle");
  var elRate = document.getElementById("rate");
  var elBuffer = document.getElementById("buffer");
  var angleWrap = document.getElementById("angle-wrap");
  var rateWrap = document.getElementById("rate-wrap");
  var warnings = document.getElementById("warnings");
  var heroValue = document.getElementById("hero-value");
  var heroSub = document.getElementById("hero-sub");
  var statGrid = document.getElementById("stat-grid");

  var altUnit = "ft";
  var spdUnit = "kt";
  var method = "angle";

  function parseNumber(input) {
    if (!input) return NaN;
    var raw = String(input.value).trim().replace(",", ".");
    if (raw === "") return NaN;
    return Number(raw);
  }
  function setSeg(group, value) {
    document.querySelectorAll('[data-unit-group="' + group + '"]').forEach(function (btn) {
      var active = btn.getAttribute("data-unit") === value;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }
  function showWarnings(notes) {
    if (!notes || !notes.length) { warnings.hidden = true; warnings.innerHTML = ""; return; }
    warnings.hidden = false;
    warnings.innerHTML = notes.map(function (n) { return "<p>" + n + "</p>"; }).join("");
  }
  function fmt(n, d) {
    if (!isFinite(n)) return "—";
    var s = n.toFixed(d == null ? 1 : d);
    return s.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  }
  function toFt(v) { return altUnit === "m" ? v / 0.3048 : v; }
  function toKt(v) { return spdUnit === "mph" ? v / (1852 / 1609.344) : v; }
  function fromNm(v) { return v; }
  function spdLabel() { return spdUnit === "mph" ? "mph" : "kt"; }

  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value + '</p>' +
      (sub ? '<p class="stat-sub">' + sub + '</p>' : '') + '</div>';
  }

  function render() {
    angleWrap.hidden = method !== "angle";
    rateWrap.hidden = method !== "rate";

    var result = TOD.compute({
      cruiseAltFt: toFt(parseNumber(elCruise)),
      targetAltFt: toFt(parseNumber(elTarget)),
      groundspeedKt: toKt(parseNumber(elGs)),
      method: method,
      angleDeg: parseNumber(elAngle),
      rateFpm: parseNumber(elRate),
      bufferNm: parseNumber(elBuffer)
    });

    if (result.error) {
      showWarnings([result.error]);
      heroValue.innerHTML = '<span class="num">—</span> <span class="unit">nm</span>';
      heroSub.textContent = "";
      statGrid.innerHTML = "";
      return;
    }
    showWarnings([]);

    heroValue.innerHTML = '<span class="num">' + fmt(result.todDistanceNm, 1) + '</span> <span class="unit">nm</span>';
    var sub = "to lose " + Math.round(result.altToLoseFt).toLocaleString("en-US") + " ft";
    if (result.bufferNm) sub += "  ·  includes a " + fmt(result.bufferNm, 1) + " nm buffer";
    heroSub.textContent = sub;

    var timeMin = result.descentTimeMin;
    var t = Math.floor(timeMin);
    var s = Math.round((timeMin - t) * 60);
    if (s === 60) { t += 1; s = 0; }

    statGrid.innerHTML =
      stat("Descent rate", Math.round(result.rateFpm) + " fpm", "GS × 5 rule of thumb: " + Math.round(result.ruleRateFpm) + " fpm") +
      stat("Path angle", fmt(result.angleDeg, 2) + "°", fmt(result.ftPerNm, 0) + " ft/nm  ·  " + fmt(result.gradientPercent, 2) + "% gradient") +
      stat("Exact path distance", fmt(result.descentDistanceNm, 1) + " nm", "3-to-1 rule: " + fmt(result.ruleDistanceNm, 1) + " nm") +
      stat("Time to descend", t + " min" + (s ? " " + s + " s" : ""), "at " + fmt(toKt(parseNumber(elGs)) , 0) + " kt groundspeed");
  }

  document.querySelectorAll("[data-unit-group]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var group = btn.getAttribute("data-unit-group");
      var value = btn.getAttribute("data-unit");
      if (group === "alt") {
        var c = parseNumber(elCruise), t = parseNumber(elTarget);
        var from = altUnit;
        altUnit = value;
        setSeg("alt", altUnit);
        function conv(v) {
          if (!isFinite(v)) return v;
          var ft = from === "m" ? v / 0.3048 : v;
          return altUnit === "m" ? ft * 0.3048 : ft;
        }
        if (isFinite(c)) elCruise.value = fmt(conv(c), altUnit === "m" ? 0 : 0);
        if (isFinite(t)) elTarget.value = fmt(conv(t), 0);
      }
      if (group === "spd") {
        var g = parseNumber(elGs);
        var fromS = spdUnit;
        spdUnit = value;
        setSeg("spd", spdUnit);
        if (isFinite(g)) {
          var kt = fromS === "mph" ? g / (1852 / 1609.344) : g;
          elGs.value = fmt(spdUnit === "mph" ? kt * (1852 / 1609.344) : kt, 1);
        }
      }
      if (group === "method") method = value;
      setSeg(group, value);
      render();
    });
  });

  ["cruise", "target", "gs", "angle", "rate", "buffer"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", render);
  });

  document.getElementById("btn-example").addEventListener("click", function () {
    altUnit = "ft"; spdUnit = "kt"; method = "angle";
    setSeg("alt", "ft"); setSeg("spd", "kt"); setSeg("method", "angle");
    elCruise.value = "7000"; elTarget.value = "1000"; elGs.value = "120"; elAngle.value = "3"; elBuffer.value = "";
    render();
  });
  document.getElementById("btn-reset").addEventListener("click", function (e) {
    e.preventDefault();
    document.getElementById("btn-example").click();
  });

  render();
})();

(function () {
  "use strict";
  var C = window.StandardAtmosphereCalcs;
  if (!C) return;
  var $ = function (id) { return document.getElementById(id); };

  var mode = "altitude";
  var system = "si";
  var altUnit = "m";
  var kind = "geopotential";
  var pUnit = "pa";
  var dUnit = "kgm3";

  function bindSeg(group, onChange) {
    document.querySelectorAll('[data-unit-group="' + group + '"]').forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll('[data-unit-group="' + group + '"]').forEach(function (b) {
          b.classList.toggle("is-active", b === btn);
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        onChange(btn.getAttribute("data-unit"));
      });
    });
  }

  function fmt(n, d) {
    if (!isFinite(n)) return "—";
    return n.toLocaleString("en-US", { maximumFractionDigits: d == null ? 1 : d, minimumFractionDigits: 0 });
  }
  function sci(n, d) {
    if (!isFinite(n)) return "—";
    if (n !== 0 && (Math.abs(n) < 1e-3 || Math.abs(n) >= 1e5)) return n.toExponential(d == null ? 3 : d);
    return fmt(n, d == null ? 5 : d);
  }
  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value +
      "</p>" + (sub ? '<p class="stat-sub">' + sub + "</p>" : "") + "</div>";
  }

  function showBlocks() {
    $("block-altitude").hidden = mode !== "altitude";
    $("block-pressure").hidden = mode !== "pressure";
    $("block-density").hidden = mode !== "density";
  }

  bindSeg("mode", function (u) { mode = u; showBlocks(); render(); });
  bindSeg("system", function (u) { system = u; render(); });
  bindSeg("altu", function (u) { altUnit = u; render(); });
  bindSeg("kind", function (u) { kind = u; render(); });
  bindSeg("pu", function (u) { pUnit = u; render(); });
  bindSeg("du", function (u) { dUnit = u; render(); });

  function render() {
    var r = C.compute({
      mode: mode,
      altitude: $("altitude").value,
      altitudeUnit: altUnit,
      altitudeKind: kind,
      pressure: $("pressure").value,
      pressureUnit: pUnit,
      density: $("density").value,
      densityUnit: dUnit
    });
    var warnings = $("warnings");
    if (!r) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>Enter a non-negative altitude at or below 86 km geometric (84.852 km geopotential), or a pressure or density that occurs in that range. Sea-level pressure is 101,325 Pa; sea-level density is 1.225 kg/m³.</p>";
      $("out-hero").innerHTML = '<span class="num">—</span> <span class="unit" id="out-unit"></span>';
      $("out-sub").textContent = "";
      $("stat-grid").innerHTML = "";
      $("extra-results").innerHTML = "";
      return;
    }
    warnings.hidden = true;
    var si = system === "si";
    var T = si ? r.temperatureK : r.temperatureF;
    var Tunit = si ? "K" : "°F";
    var Talt = si ? (fmt(r.temperatureC, 2) + " °C") : (fmt(r.temperatureR, 2) + " °R");
    $("out-hero").innerHTML = '<span class="num">' + fmt(T, 2) + '</span> <span class="unit">' + Tunit + "</span>";
    $("out-sub").textContent = Talt + " · θ = " + fmt(r.temperatureRatio, 5);

    var pVal, pUnitL, pSub;
    if (si) { pVal = r.pressurePa >= 1000 ? fmt(r.pressureHpa, 3) : sci(r.pressurePa, 4); pUnitL = r.pressurePa >= 1000 ? " hPa" : " Pa"; pSub = fmt(r.pressureInHg, 3) + " inHg"; }
    else { pVal = fmt(r.pressurePsf, r.pressurePsf >= 10 ? 1 : 3); pUnitL = " psf"; pSub = fmt(r.pressureInHg, 3) + " inHg · " + fmt(r.pressurePsi, 3) + " psi"; }

    var rhoVal, rhoUnit, rhoSub;
    if (si) { rhoVal = sci(r.densityKgM3, 4); rhoUnit = " kg/m³"; rhoSub = "σ = " + fmt(r.densityRatio, 5); }
    else { rhoVal = sci(r.densitySlugFt3, 4); rhoUnit = " slug/ft³"; rhoSub = fmt(r.densityLbFt3, 5) + " lb/ft³ · σ = " + fmt(r.densityRatio, 5); }

    var aVal = si ? fmt(r.speedOfSoundMps, 2) + " m/s" : fmt(r.speedOfSoundFps, 1) + " ft/s";
    var aSub = si ? fmt(r.speedOfSoundKt, 1) + " kt" : fmt(r.speedOfSoundKt, 1) + " kt · " + fmt(r.speedOfSoundMps, 2) + " m/s";

    var muVal = si ? sci(r.dynamicViscosity, 4) + " Pa·s" : sci(r.dynamicViscositySlugFtS, 4) + " slug/(ft·s)";
    var nuVal = si ? sci(r.kinematicViscosity, 4) + " m²/s" : sci(r.kinematicViscosityFt2S, 4) + " ft²/s";

    var H = si ? fmt(r.geopotentialM, 1) + " m" : fmt(r.geopotentialFt, 0) + " ft";
    var Z = si ? fmt(r.geometricM, 1) + " m" : fmt(r.geometricFt, 0) + " ft";
    var Hsub = si ? fmt(r.geopotentialFt, 0) + " ft · " + fmt(r.geopotentialKm, 4) + " km" : fmt(r.geopotentialM, 1) + " m";
    var Zsub = si ? fmt(r.geometricFt, 0) + " ft · " + fmt(r.geometricKm, 4) + " km" : fmt(r.geometricM, 1) + " m";

    $("stat-grid").innerHTML =
      stat("Pressure", pVal + pUnitL, pSub + " · δ = " + fmt(r.pressureRatio, 5)) +
      stat("Density", rhoVal + rhoUnit, rhoSub) +
      stat("Speed of sound", aVal, aSub) +
      stat("Dynamic viscosity μ", muVal, "Sutherland’s law") +
      stat("Kinematic viscosity ν", nuVal, "μ / ρ") +
      stat("Geopotential H", H, Hsub) +
      stat("Geometric Z", Z, Zsub) +
      stat("Pressure / density ratios", "δ " + fmt(r.pressureRatio, 5), "θ " + fmt(r.temperatureRatio, 5) + " · σ " + fmt(r.densityRatio, 5));

    var lapse = r.lapseKPerKm;
    var lapseStr = lapse === 0 ? "isothermal" : (lapse > 0 ? "+" : "") + fmt(lapse, 1) + " K/km";
    $("extra-results").innerHTML = '<p class="layer-note">Layer starting at H = ' +
      fmt(r.layerBaseM / 1000, 3) + " km geopotential (" + lapseStr + "). Local g ≈ " +
      (si ? fmt(r.gravityMs2, 5) + " m/s²" : fmt(r.gravityFtS2, 4) + " ft/s²") + ".</p>";
  }

  function loadAltitude(value, unit, k) {
    mode = "altitude";
    altUnit = unit;
    kind = k || "geopotential";
    $("altitude").value = value;
    document.querySelectorAll('[data-unit-group="mode"]').forEach(function (b) {
      var on = b.getAttribute("data-unit") === "altitude";
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    document.querySelectorAll('[data-unit-group="altu"]').forEach(function (b) {
      var on = b.getAttribute("data-unit") === unit;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    document.querySelectorAll('[data-unit-group="kind"]').forEach(function (b) {
      var on = b.getAttribute("data-unit") === kind;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    showBlocks();
    render();
  }

  $("btn-sl").addEventListener("click", function () { loadAltitude(0, "m", "geopotential"); });
  $("btn-trop").addEventListener("click", function () { loadAltitude(11, "km", "geopotential"); });
  $("btn-fl360").addEventListener("click", function () { loadAltitude(360, "fl", "geopotential"); });
  $("btn-50km").addEventListener("click", function () { loadAltitude(50, "km", "geopotential"); });

  $("calc-form").addEventListener("input", render);
  $("calc-form").addEventListener("change", render);
  showBlocks();
  render();
})();

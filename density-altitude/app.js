/**
 * UI for the density altitude calculator.
 * All atmosphere math lives in calc.js (AviationCalcs).
 */
(function () {
  "use strict";

  var AC = window.AviationCalcs;
  if (!AC) return;

  var form = document.getElementById("calc-form");
  var elElevation = document.getElementById("elevation");
  var elAltInhg = document.getElementById("alt-inhg");
  var elAltHpa = document.getElementById("alt-hpa");
  var elOatC = document.getElementById("oat-c");
  var elOatF = document.getElementById("oat-f");
  var elIsaC = document.getElementById("isa-dev-c");
  var elIsaF = document.getElementById("isa-dev-f");
  var elTdC = document.getElementById("td-c");
  var elTdF = document.getElementById("td-f");
  var warnings = document.getElementById("warnings");
  var elevationUnit = "ft";
  var syncing = false;
  // Last-edited field wins when OAT and ISA deviation would otherwise fight,
  // and when elevation or altimeter changes ISA temperature.
  var lastTempSource = "oat"; // "oat" | "isa"
  var lastAltSource = "inhg"; // "inhg" | "hpa"

  function parseNumber(input) {
    if (!input) return NaN;
    var raw = String(input.value).trim().replace(",", ".");
    if (raw === "") return NaN;
    return Number(raw);
  }

  function hasValue(input) {
    return input && String(input.value).trim() !== "";
  }

  function formatFt(ft) {
    var rounded = Math.round(ft);
    var sign = rounded < 0 ? "−" : "";
    return sign + Math.abs(rounded).toLocaleString("en-US") + " ft";
  }

  function formatM(ft) {
    var m = AC.ftToM(ft);
    var rounded = Math.abs(m) >= 100 ? Math.round(m) : Math.round(m * 10) / 10;
    var sign = rounded < 0 ? "−" : "";
    return sign + Math.abs(rounded).toLocaleString("en-US") + " m";
  }

  function formatTemp(c, digits) {
    if (digits == null) digits = 1;
    var v = Number(c).toFixed(digits);
    if (Number(v) > 0) return "+" + v + "°C";
    return v + "°C";
  }

  function formatTempPlain(c, digits) {
    if (digits == null) digits = 1;
    return Number(c).toFixed(digits) + "°C";
  }

  function trimNum(n, digits) {
    return String(Number(n.toFixed(digits)));
  }

  function severityFor(daFt) {
    if (daFt >= 8000) return "severe";
    if (daFt >= 5000) return "high";
    if (daFt >= 2000) return "caution";
    return "normal";
  }

  function setText(id, text) {
    var node = document.getElementById(id);
    if (node) node.textContent = text;
  }

  function setHeroNumber(id, ft) {
    var node = document.getElementById(id);
    if (!node) return;
    var rounded = Math.round(ft);
    var sign = rounded < 0 ? "−" : "";
    node.innerHTML =
      '<span class="num">' + sign + Math.abs(rounded).toLocaleString("en-US") +
      '</span> <span class="unit">ft</span>';
  }

  function clearHero(id, fallback) {
    var node = document.getElementById(id);
    if (node) node.innerHTML = '<span class="num">' + fallback + '</span> <span class="unit">ft</span>';
  }

  function positionMarker(el, value, min, max, hidden) {
    if (!el) return;
    if (hidden || !isFinite(value)) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    var span = max - min;
    var pct = span === 0 ? 50 : ((value - min) / span) * 100;
    pct = Math.min(98, Math.max(2, pct));
    el.style.left = pct + "%";
  }

  function renderTape(result) {
    var values = [0, result.elevationFt, result.pressureAltitudeFt, result.densityAltitudeFt];
    if (result.humid) values.push(result.humid.densityAltitudeFt);
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var pad = Math.max(500, (max - min) * 0.12);
    min -= pad;
    max += pad;
    if (min > 0) min = 0;
    positionMarker(document.getElementById("tape-fe"), result.elevationFt, min, max, false);
    positionMarker(document.getElementById("tape-pa"), result.pressureAltitudeFt, min, max, false);
    positionMarker(document.getElementById("tape-da"), result.densityAltitudeFt, min, max, false);
    positionMarker(
      document.getElementById("tape-daw"),
      result.humid ? result.humid.densityAltitudeFt : NaN,
      min,
      max,
      !result.humid
    );
    setText("tape-min", formatFt(min));
    setText("tape-max", formatFt(max));
  }

  function renderPerformance(result) {
    var perfDa = result.humid ? result.humid.densityAltitudeFt : result.densityAltitudeFt;
    var perf = result.performance;
    var toPct = perf.takeoffPctVsSl;
    var clPct = perf.climbPctVsSl;
    var toLabel;
    var clLabel;
    if (Math.abs(toPct) < 0.5) {
      toLabel = "≈ sea-level ISA";
    } else if (toPct >= 0) {
      toLabel = "+" + toPct.toFixed(0) + "%  ·  " + perf.takeoffFactor.toFixed(2) + "× SL ISA";
    } else {
      toLabel = toPct.toFixed(0) + "% vs SL ISA";
    }
    if (Math.abs(clPct) < 0.5) {
      clLabel = "≈ sea-level ISA";
    } else if (clPct >= 0) {
      clLabel = "+" + clPct.toFixed(0) + "% vs SL ISA";
    } else {
      clLabel = clPct.toFixed(0) + "%  ·  " + (perf.climbFactor * 100).toFixed(0) + "% of SL ISA";
    }
    setText("out-to", toLabel);
    setText("out-climb", clLabel);

    var barTo = document.getElementById("bar-to");
    var barClimb = document.getElementById("bar-climb");
    var toWidth = Math.max(6, Math.min(100, (perf.takeoffFactor / 2.5) * 100));
    var climbWidth = Math.max(4, Math.min(100, perf.climbFactor * 100));
    if (barTo) {
      barTo.style.width = toWidth + "%";
      barTo.classList.toggle("is-down", perf.takeoffFactor >= 1.4);
    }
    if (barClimb) {
      barClimb.style.width = climbWidth + "%";
      barClimb.classList.toggle("is-down", perf.climbFactor <= 0.7);
    }

    var basis = "Estimate uses " + formatFt(perfDa) + " density altitude";
    if (result.humid) basis += " (humidity-corrected).";
    else basis += " (dry-air / standard formula).";
    setText("out-perf-basis", basis);
  }

  function collectWarnings(raw, result) {
    var notes = [];
    if (raw.elevWarn) notes.push(raw.elevWarn);
    if (raw.altWarn) notes.push(raw.altWarn);
    if (raw.oatWarn) notes.push(raw.oatWarn);
    if (raw.tdWarn) notes.push(raw.tdWarn);
    if (result && result.tropopauseWarning) {
      notes.push("Pressure or density altitude is near or above the tropopause (36,089 ft). The tropospheric ISA formula is not valid there.");
    }
    if (result && result.densityAltitudeFt >= 8000) {
      notes.push("Very high density altitude — expect a much longer takeoff roll and a sharply reduced climb. Check the POH carefully and build in extra margin.");
    }
    return notes;
  }

  function showWarnings(notes) {
    if (!notes.length) {
      warnings.hidden = true;
      warnings.innerHTML = "";
      return;
    }
    warnings.hidden = false;
    warnings.innerHTML = notes.map(function (n) { return "<p>" + n + "</p>"; }).join("");
  }

  function currentElevationFt() {
    var elev = parseNumber(elElevation);
    if (!isFinite(elev)) return NaN;
    return elevationUnit === "m" ? AC.mToFt(elev) : elev;
  }

  function currentAltimeterInHg() {
    var inhg = parseNumber(elAltInhg);
    var hpa = parseNumber(elAltHpa);
    if (lastAltSource === "hpa" && isFinite(hpa)) {
      if (AC.isConventionalStandardHpa(hpa)) return AC.CONST.P0_INHG;
      return AC.hpaToInHg(hpa);
    }
    if (isFinite(inhg)) return AC.canonicalAltimeterInHg(inhg);
    if (isFinite(hpa)) {
      return AC.isConventionalStandardHpa(hpa) ? AC.CONST.P0_INHG : AC.hpaToInHg(hpa);
    }
    return NaN;
  }

  function readIsaDeviationC() {
    if (hasValue(elIsaC)) {
      var c = parseNumber(elIsaC);
      if (isFinite(c)) return c;
    }
    if (hasValue(elIsaF)) {
      var f = parseNumber(elIsaF);
      if (isFinite(f)) return AC.isaDevFToC(f);
    }
    return NaN;
  }

  function readOatC() {
    var c = parseNumber(elOatC);
    if (isFinite(c)) return c;
    var f = parseNumber(elOatF);
    if (isFinite(f)) return AC.fToC(f);
    return NaN;
  }

  function fillIsaFields(isaDevC) {
    syncing = true;
    elIsaC.value = trimNum(isaDevC, 1);
    elIsaF.value = trimNum(AC.isaDevCToF(isaDevC), 1);
    syncing = false;
  }

  function fillOatFields(oatC) {
    syncing = true;
    elOatC.value = trimNum(oatC, 1);
    elOatF.value = trimNum(AC.cToF(oatC), 1);
    syncing = false;
  }

  function readCanonical() {
    var info = { ok: false, elevWarn: null, altWarn: null, oatWarn: null, tdWarn: null };
    var elevationFt = currentElevationFt();
    var altimeterInHg = currentAltimeterInHg();
    if (!isFinite(elevationFt) || !isFinite(altimeterInHg)) return info;

    var source = lastTempSource;
    var oatC = readOatC();
    var isaDevC = readIsaDeviationC();
    if (source === "isa" && !isFinite(isaDevC)) source = "oat";
    if (source === "oat" && !isFinite(oatC) && isFinite(isaDevC)) source = "isa";

    var resolved = AC.resolveOatAndIsaDev({
      elevationFt: elevationFt,
      altimeterInHg: altimeterInHg,
      oatC: oatC,
      isaDeviationC: isaDevC,
      source: source
    });
    if (!resolved) return info;

    oatC = resolved.oatC;
    isaDevC = resolved.isaDeviationC;

    // Update the derived field only, so the last-edited input is not overwritten
    // mid-keystroke and we do not create a feedback loop.
    if (source === "isa") fillOatFields(oatC);
    else fillIsaFields(isaDevC);

    var dewpointC = null;
    if (hasValue(elTdC) || hasValue(elTdF)) {
      if (hasValue(elTdC)) dewpointC = parseNumber(elTdC);
      else dewpointC = AC.fToC(parseNumber(elTdF));
      if (!isFinite(dewpointC)) dewpointC = null;
    }

    if (elevationFt < -1500 || elevationFt > 20000) {
      info.elevWarn = "Field elevation is outside the usual range for this tool (−1,500 to 20,000 ft).";
    }
    if (altimeterInHg < 27.5 || altimeterInHg > 32) {
      info.altWarn = "Altimeter setting is outside the typical aviation range (27.50–32.00 inHg / 931–1085 hPa).";
    }
    if (oatC < -70 || oatC > 60) {
      info.oatWarn = "OAT is outside a typical atmospheric range for this calculator.";
    }
    if (dewpointC != null && dewpointC > oatC + 0.05) {
      info.tdWarn = "Dewpoint is above OAT, which is not a physical observation. Humidity correction is still shown, but check the inputs.";
      elTdC.classList.add("is-invalid");
      elTdF.classList.add("is-invalid");
    } else {
      elTdC.classList.remove("is-invalid");
      elTdF.classList.remove("is-invalid");
    }

    info.ok = true;
    info.elevationFt = elevationFt;
    info.altimeterInHg = altimeterInHg;
    info.oatC = oatC;
    info.isaDeviationC = isaDevC;
    info.dewpointC = dewpointC;
    return info;
  }

  function render(result, raw) {
    if (!result) {
      clearHero("out-da", "—");
      setText("out-da-m", "Enter elevation, altimeter, and OAT or ISA deviation.");
      var humidCard = document.getElementById("humid-card");
      if (humidCard) humidCard.hidden = true;
      showWarnings(collectWarnings(raw || {}, null));
      return;
    }

    var daShow = result.densityAltitudeFt;
    setHeroNumber("out-da", daShow);
    setText("out-da-m", formatM(daShow));
    var hero = document.getElementById("hero-da");
    if (hero) hero.setAttribute("data-severity", severityFor(result.humid ? result.humid.densityAltitudeFt : daShow));

    setText("out-pa", formatFt(result.pressureAltitudeFt));
    setText("out-pa-m", formatM(result.pressureAltitudeFt));
    setText(
      "out-isa-temp",
      formatTempPlain(result.isaTempC) + "  /  " +
        formatTempPlain(AC.cToF(result.isaTempC)).replace("°C", "°F")
    );
    setText(
      "out-isa-dev",
      "Deviation " + formatTemp(result.isaDeviationC) + "  /  " +
        formatTemp(AC.isaDevCToF(result.isaDeviationC)).replace("°C", "°F")
    );

    if (Math.abs(result.stationPressureHpa - AC.CONST.P0_HPA) < 0.005) {
      setText("out-station", "29.92 inHg");
      setText("out-station-hpa", "1013.25 hPa");
    } else {
      setText("out-station", result.stationPressureInHg.toFixed(2) + " inHg");
      setText("out-station-hpa", result.stationPressureHpa.toFixed(1) + " hPa");
    }

    var rho = result.humid ? result.humid.density : result.densityDry;
    var ratio = rho / AC.CONST.RHO0;
    setText("out-rho", rho.toFixed(4) + " kg/m³");
    setText("out-rho-ratio", (ratio * 100).toFixed(1) + "% of sea-level ISA" + (result.humid ? " (moist)" : " (dry)"));

    var humidCard = document.getElementById("humid-card");
    if (result.humid) {
      humidCard.hidden = false;
      setHeroNumber("out-da-wet", result.humid.densityAltitudeFt);
      var inc = result.humid.humidityIncrementFt;
      var incStr = (inc >= 0 ? "+" : "−") + Math.abs(Math.round(inc)).toLocaleString("en-US") + " ft vs dry air";
      setText(
        "out-da-wet-meta",
        formatM(result.humid.densityAltitudeFt) +
          "  ·  Tv " + formatTempPlain(result.humid.virtualTempC) +
          "  ·  " + incStr
      );
    } else {
      humidCard.hidden = true;
    }

    renderTape(result);
    renderPerformance(result);
    showWarnings(collectWarnings(raw, result));
  }

  function recalculate() {
    var raw = readCanonical();
    if (!raw.ok) {
      render(null, raw);
      return;
    }
    var result = AC.compute({
      elevationFt: raw.elevationFt,
      altimeterInHg: raw.altimeterInHg,
      oatC: raw.oatC,
      dewpointC: raw.dewpointC
    });
    render(result, raw);
  }

  function onAltInhg() {
    if (syncing) return;
    lastAltSource = "inhg";
    var v = parseNumber(elAltInhg);
    syncing = true;
    if (isFinite(v)) {
      elAltHpa.value = AC.isConventionalStandardInHg(v) ? "1013.25" : trimNum(AC.inHgToHpa(v), 1);
    }
    syncing = false;
    recalculate();
  }

  function onAltHpa() {
    if (syncing) return;
    lastAltSource = "hpa";
    var v = parseNumber(elAltHpa);
    syncing = true;
    if (isFinite(v)) {
      elAltInhg.value = AC.isConventionalStandardHpa(v) ? "29.92" : trimNum(AC.hpaToInHg(v), 2);
    }
    syncing = false;
    recalculate();
  }

  function onOatC() {
    if (syncing) return;
    lastTempSource = "oat";
    var v = parseNumber(elOatC);
    syncing = true;
    if (isFinite(v)) elOatF.value = trimNum(AC.cToF(v), 1);
    syncing = false;
    recalculate();
  }

  function onOatF() {
    if (syncing) return;
    lastTempSource = "oat";
    var v = parseNumber(elOatF);
    syncing = true;
    if (isFinite(v)) elOatC.value = trimNum(AC.fToC(v), 1);
    syncing = false;
    recalculate();
  }

  function onIsaC() {
    if (syncing) return;
    lastTempSource = "isa";
    var v = parseNumber(elIsaC);
    syncing = true;
    if (isFinite(v)) elIsaF.value = trimNum(AC.isaDevCToF(v), 1);
    syncing = false;
    recalculate();
  }

  function onIsaF() {
    if (syncing) return;
    lastTempSource = "isa";
    var v = parseNumber(elIsaF);
    syncing = true;
    if (isFinite(v)) elIsaC.value = trimNum(AC.isaDevFToC(v), 1);
    syncing = false;
    recalculate();
  }

  function onTdC() {
    if (syncing) return;
    var v = parseNumber(elTdC);
    syncing = true;
    if (isFinite(v)) elTdF.value = trimNum(AC.cToF(v), 1);
    else elTdF.value = "";
    syncing = false;
    recalculate();
  }

  function onTdF() {
    if (syncing) return;
    var v = parseNumber(elTdF);
    syncing = true;
    if (isFinite(v)) elTdC.value = trimNum(AC.fToC(v), 1);
    else elTdC.value = "";
    syncing = false;
    recalculate();
  }

  function setElevationUnit(unit) {
    if (unit === elevationUnit) return;
    var v = parseNumber(elElevation);
    if (isFinite(v)) {
      if (unit === "m") elElevation.value = trimNum(AC.ftToM(v), 1);
      else elElevation.value = trimNum(AC.mToFt(v), 0);
    }
    elevationUnit = unit;
    document.querySelectorAll('[data-unit-group="elevation"]').forEach(function (btn) {
      var active = btn.getAttribute("data-unit") === unit;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
    recalculate();
  }

  function setElevationUnitButtons(unit) {
    elevationUnit = unit;
    document.querySelectorAll('[data-unit-group="elevation"]').forEach(function (btn) {
      var active = btn.getAttribute("data-unit") === unit;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function loadExample() {
    lastTempSource = "oat";
    lastAltSource = "inhg";
    setElevationUnitButtons("ft");
    syncing = true;
    elElevation.value = "5000";
    elAltInhg.value = "29.92";
    elAltHpa.value = "1013.25";
    elOatC.value = "30";
    elOatF.value = "86";
    elTdC.value = "";
    elTdF.value = "";
    syncing = false;
    recalculate();
    document.getElementById("hero-da").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function resetIsa() {
    lastTempSource = "oat";
    lastAltSource = "inhg";
    setElevationUnitButtons("ft");
    syncing = true;
    elElevation.value = "0";
    elAltInhg.value = "29.92";
    elAltHpa.value = "1013.25";
    elOatC.value = "15";
    elOatF.value = "59";
    elIsaC.value = "0";
    elIsaF.value = "0";
    elTdC.value = "";
    elTdF.value = "";
    syncing = false;
    recalculate();
  }

  elElevation.addEventListener("input", recalculate);
  elAltInhg.addEventListener("input", onAltInhg);
  elAltHpa.addEventListener("input", onAltHpa);
  elOatC.addEventListener("input", onOatC);
  elOatF.addEventListener("input", onOatF);
  elIsaC.addEventListener("input", onIsaC);
  elIsaF.addEventListener("input", onIsaF);
  elTdC.addEventListener("input", onTdC);
  elTdF.addEventListener("input", onTdF);

  document.querySelectorAll('[data-unit-group="elevation"]').forEach(function (btn) {
    btn.addEventListener("click", function () {
      setElevationUnit(btn.getAttribute("data-unit"));
    });
  });

  document.getElementById("btn-example").addEventListener("click", loadExample);
  document.getElementById("btn-reset").addEventListener("click", function (ev) {
    ev.preventDefault();
    resetIsa();
  });
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    recalculate();
  });
  form.addEventListener("reset", function (ev) {
    ev.preventDefault();
    resetIsa();
  });

  recalculate();
})();

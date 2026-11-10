/**
 * UI for the true-airspeed calculator.
 * Math lives in calc.js (TrueAirspeed).
 */
(function () {
  "use strict";

  var TAS = window.TrueAirspeed;
  if (!TAS) return;

  var elCas = document.getElementById("cas");
  var elPa = document.getElementById("pa");
  var elOatC = document.getElementById("oat-c");
  var elOatF = document.getElementById("oat-f");
  var elIsa = document.getElementById("isa-dev");
  var isaHint = document.getElementById("isa-hint");
  var warnings = document.getElementById("warnings");
  var heroValue = document.getElementById("hero-value");
  var heroSub = document.getElementById("hero-sub");
  var statGrid = document.getElementById("stat-grid");

  var spdUnit = "kt";
  var altUnit = "ft";
  var lastTemp = "oat"; // "oat" | "isa"
  var syncing = false;

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
  function toKt(v) { return spdUnit === "mph" ? v / (1852 / 1609.344) : v; }
  function fromKt(v) { return spdUnit === "mph" ? v * (1852 / 1609.344) : v; }
  function toFt(v) { return altUnit === "m" ? TAS.mToFt(v) : v; }
  function unit() { return spdUnit === "mph" ? "mph" : "kt"; }

  function paFt() { return toFt(parseNumber(elPa)); }

  function applyIsaFromOat() {
    var oat = parseNumber(elOatC);
    var pa = paFt();
    if (!isFinite(oat) || !isFinite(pa)) return;
    var dev = oat - TAS.isaTempC(pa);
    elIsa.value = fmt(dev, 1);
  }
  function applyOatFromIsa() {
    var dev = parseNumber(elIsa);
    var pa = paFt();
    if (!isFinite(dev) || !isFinite(pa)) return;
    var oat = TAS.isaTempC(pa) + dev;
    elOatC.value = fmt(oat, 1);
    elOatF.value = fmt(TAS.cToF(oat), 1);
  }

  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value + '</p>' +
      (sub ? '<p class="stat-sub">' + sub + '</p>' : '') + '</div>';
  }

  function render() {
    var pa = paFt();
    if (isFinite(pa)) {
      isaHint.textContent = "ISA at this PA is " + fmt(TAS.isaTempC(pa), 1) + "°C.";
    } else {
      isaHint.textContent = "";
    }

    var oatC = parseNumber(elOatC);
    var result = TAS.compute({
      casKt: toKt(parseNumber(elCas)),
      pressureAltitudeFt: pa,
      oatC: oatC
    });

    if (result.error) {
      showWarnings([result.error]);
      heroValue.innerHTML = '<span class="num">—</span> <span class="unit">' + unit() + "</span>";
      heroSub.textContent = "";
      statGrid.innerHTML = "";
      return;
    }
    showWarnings([]);

    heroValue.innerHTML = '<span class="num">' + fmt(fromKt(result.tasKt), 1) + '</span> <span class="unit">' + unit() + "</span>";
    heroSub.textContent = "Mach " + result.mach.toFixed(3) + "  ·  EAS " + fmt(fromKt(result.easKt), 1) + " " + unit();

    var isaDev = result.isaDeviationC;
    var isaTxt = "ISA " + (isaDev >= 0 ? "+" : "−") + fmt(Math.abs(isaDev), 1) + "°C";
    statGrid.innerHTML =
      stat("Mach number", result.mach.toFixed(3), "Speed of sound " + fmt(fromKt(result.speedOfSoundKt), 1) + " " + unit()) +
      stat("Equivalent airspeed", fmt(fromKt(result.easKt), 1) + " " + unit(), "TAS × √σ") +
      stat("ISA temperature", fmt(result.isaTempC, 1) + "°C", isaTxt) +
      stat("Total air temperature", fmt(result.tatC, 1) + "°C", "Recovery factor 1  ·  " + fmt(result.tatF, 1) + "°F") +
      stat("Density ratio σ", result.densityRatio.toFixed(4), "Ambient " + fmt(result.ambientHpa, 1) + " hPa");
  }

  function onOatC() {
    if (syncing) return;
    syncing = true;
    lastTemp = "oat";
    var c = parseNumber(elOatC);
    if (isFinite(c)) elOatF.value = fmt(TAS.cToF(c), 1);
    applyIsaFromOat();
    syncing = false;
    render();
  }
  function onOatF() {
    if (syncing) return;
    syncing = true;
    lastTemp = "oat";
    var f = parseNumber(elOatF);
    if (isFinite(f)) {
      var c = TAS.fToC(f);
      elOatC.value = fmt(c, 1);
    }
    applyIsaFromOat();
    syncing = false;
    render();
  }
  function onIsa() {
    if (syncing) return;
    syncing = true;
    lastTemp = "isa";
    applyOatFromIsa();
    syncing = false;
    render();
  }
  function onPa() {
    if (syncing) return;
    syncing = true;
    if (lastTemp === "isa") applyOatFromIsa();
    else applyIsaFromOat();
    syncing = false;
    render();
  }

  elCas.addEventListener("input", render);
  elPa.addEventListener("input", onPa);
  elOatC.addEventListener("input", onOatC);
  elOatF.addEventListener("input", onOatF);
  elIsa.addEventListener("input", onIsa);

  document.querySelectorAll("[data-unit-group]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var group = btn.getAttribute("data-unit-group");
      var value = btn.getAttribute("data-unit");
      if (group === "spd") {
        var cur = parseNumber(elCas);
        var from = spdUnit;
        spdUnit = value;
        setSeg("spd", spdUnit);
        if (isFinite(cur)) {
          var kt = from === "mph" ? cur / (1852 / 1609.344) : cur;
          elCas.value = fmt(spdUnit === "mph" ? kt * (1852 / 1609.344) : kt, 1);
        }
      }
      if (group === "alt") {
        var alt = parseNumber(elPa);
        var fromA = altUnit;
        altUnit = value;
        setSeg("alt", altUnit);
        if (isFinite(alt)) {
          var ft = fromA === "m" ? TAS.mToFt(alt) : alt;
          elPa.value = fmt(altUnit === "m" ? TAS.ftToM(ft) : ft, 0);
        }
      }
      render();
    });
  });

  document.getElementById("btn-example").addEventListener("click", function () {
    spdUnit = "kt"; altUnit = "ft"; lastTemp = "isa";
    setSeg("spd", "kt"); setSeg("alt", "ft");
    elCas.value = "100"; elPa.value = "8000"; elIsa.value = "0";
    syncing = true; applyOatFromIsa(); syncing = false;
    render();
  });
  document.getElementById("btn-reset").addEventListener("click", function (e) {
    e.preventDefault();
    spdUnit = "kt"; altUnit = "ft"; lastTemp = "oat";
    setSeg("spd", "kt"); setSeg("alt", "ft");
    elCas.value = "100"; elPa.value = "0"; elOatC.value = "15";
    syncing = true;
    elOatF.value = fmt(TAS.cToF(15), 1);
    applyIsaFromOat();
    syncing = false;
    render();
  });

  // Initialize OAT °F and ISA from the default °C / PA
  syncing = true;
  if (isFinite(parseNumber(elOatC))) elOatF.value = fmt(TAS.cToF(parseNumber(elOatC)), 1);
  applyIsaFromOat();
  syncing = false;
  render();
})();

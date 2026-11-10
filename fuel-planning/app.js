/**
 * UI for the fuel planner.
 * Math lives in calc.js (FuelPlanning).
 */
(function () {
  "use strict";

  var FP = window.FuelPlanning;
  if (!FP) return;

  var elDist = document.getElementById("distance");
  var elGs = document.getElementById("gs");
  var elBurn = document.getElementById("burn");
  var elCustomDen = document.getElementById("custom-den");
  var elReserveMin = document.getElementById("reserve-min");
  var elTaxi = document.getElementById("taxi");
  var elUseAlt = document.getElementById("use-alt");
  var elAltDist = document.getElementById("alt-dist");
  var elAltGs = document.getElementById("alt-gs");
  var elOnboard = document.getElementById("onboard");
  var warnings = document.getElementById("warnings");
  var heroValue = document.getElementById("hero-value");
  var heroSub = document.getElementById("hero-sub");
  var statGrid = document.getElementById("stat-grid");
  var customDenWrap = document.getElementById("custom-den-wrap");
  var customResWrap = document.getElementById("custom-res-wrap");
  var altFields = document.getElementById("alt-fields");

  var distUnit = "nm";
  var spdUnit = "kt";
  var burnUnit = "gph";
  var fuelType = "100LL";
  var reserveKind = "vfr-day";
  var onbUnit = "gal";

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
    var x = Math.abs(n) < 5e-4 ? 0 : n;
    var s = x.toFixed(d == null ? 1 : d);
    return s.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  }
  function fmtTime(hours) {
    if (!isFinite(hours)) return "—";
    var totalMin = Math.round(hours * 60);
    var h = Math.floor(totalMin / 60);
    var m = totalMin - h * 60;
    if (h === 0) return m + " min";
    return h + " h " + m + " min";
  }
  function toNm(v) { return distUnit === "sm" ? v * 1609.344 / 1852 : v; }
  function toKt(v) { return spdUnit === "mph" ? v / FP.KT_TO_MPH : v; }
  function fromNm(v) { return distUnit === "sm" ? v * 1852 / 1609.344 : v; }
  function distLabel() { return distUnit === "sm" ? "sm" : "nm"; }

  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value + '</p>' +
      (sub ? '<p class="stat-sub">' + sub + '</p>' : '') + '</div>';
  }

  function render() {
    customDenWrap.hidden = fuelType !== "custom";
    customResWrap.hidden = reserveKind !== "custom";
    altFields.hidden = !elUseAlt.checked;

    var result = FP.compute({
      distanceNm: toNm(parseNumber(elDist)),
      groundspeedKt: toKt(parseNumber(elGs)),
      burn: parseNumber(elBurn),
      burnUnit: burnUnit,
      fuelType: fuelType,
      customLbPerGal: parseNumber(elCustomDen),
      reserveKind: reserveKind,
      reserveMinutes: parseNumber(elReserveMin),
      taxiGal: parseNumber(elTaxi),
      includeAlternate: elUseAlt.checked,
      alternateNm: toNm(parseNumber(elAltDist)),
      alternateGsKt: toKt(parseNumber(elAltGs)),
      onboardGal: onbUnit === "gal" ? parseNumber(elOnboard) : undefined,
      onboardLb: onbUnit === "lb" ? parseNumber(elOnboard) : undefined
    });

    if (result.error) {
      showWarnings([result.error]);
      if (!isFinite(result.totalGal)) {
        heroValue.innerHTML = '<span class="num">—</span> <span class="unit">gal</span>';
        heroSub.textContent = "";
        statGrid.innerHTML = "";
        return;
      }
    } else {
      showWarnings(result.notes || []);
    }

    heroValue.innerHTML = '<span class="num">' + fmt(result.totalGal, 1) + '</span> <span class="unit">gal</span>';
    heroSub.textContent = fmt(result.totalLb, 1) + " lb  ·  " + fmt(result.totalLiters, 1) + " L  ·  " +
      result.lbPerGal + " lb/gal " + (result.fuelType === "JET-A" ? "Jet-A" : result.fuelType === "100LL" ? "100LL" : "custom");

    var html = "";
    html += stat("Trip fuel", fmt(result.tripGal, 1) + " gal", isFinite(result.tripHours) ? fmtTime(result.tripHours) + " · " + fmt(result.tripLb, 1) + " lb" : "");
    if (result.includeAlternate) {
      html += stat("Alternate", fmt(result.alternateGal, 1) + " gal", fmtTime(result.alternateHours) + " · " + fmt(fromNm(result.alternateNm), 1) + " " + distLabel());
    }
    var resLabel = reserveKind === "vfr-day" ? "VFR day reserve (91.151)" :
      reserveKind === "vfr-night" ? "VFR night reserve (91.151)" :
      reserveKind === "ifr" ? "IFR reserve (91.167)" : "Reserve";
    html += stat(resLabel, fmt(result.reserveGal, 1) + " gal", result.reserveMinutes + " min at " + fmt(result.gph, 1) + " gph");
    if (result.taxiGal) html += stat("Taxi / run-up", fmt(result.taxiGal, 1) + " gal", fmt(result.taxiLb, 1) + " lb");
    if (isFinite(result.onboardGal)) {
      var surplus = result.surplusGal;
      var surplusLabel = surplus >= 0 ? "Surplus" : "Deficit";
      html += stat("Endurance", fmtTime(result.enduranceHours), isFinite(result.rangeNm) ? "range " + fmt(fromNm(result.rangeNm), 0) + " " + distLabel() : "");
      html += stat(surplusLabel, fmt(Math.abs(surplus), 1) + " gal", fmtTime(Math.abs(result.surplusHours)) + (surplus < 0 ? " short of required" : " above required"));
    }
    statGrid.innerHTML = html;
  }

  document.querySelectorAll("[data-unit-group]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var group = btn.getAttribute("data-unit-group");
      var value = btn.getAttribute("data-unit");
      if (group === "dist") distUnit = value;
      if (group === "spd") spdUnit = value;
      if (group === "burn") burnUnit = value;
      if (group === "fuel") fuelType = value;
      if (group === "reserve") reserveKind = value;
      if (group === "onb") onbUnit = value;
      setSeg(group, value);
      render();
    });
  });

  ["distance", "gs", "burn", "custom-den", "reserve-min", "taxi", "alt-dist", "alt-gs", "onboard"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", render);
  });
  elUseAlt.addEventListener("change", render);

  document.getElementById("btn-example").addEventListener("click", function () {
    distUnit = "nm"; spdUnit = "kt"; burnUnit = "gph"; fuelType = "100LL"; reserveKind = "vfr-day"; onbUnit = "gal";
    setSeg("dist", "nm"); setSeg("spd", "kt"); setSeg("burn", "gph"); setSeg("fuel", "100LL"); setSeg("reserve", "vfr-day"); setSeg("onb", "gal");
    elDist.value = "180"; elGs.value = "120"; elBurn.value = "10"; elTaxi.value = ""; elOnboard.value = "";
    elUseAlt.checked = false; elAltDist.value = ""; elAltGs.value = "";
    render();
  });
  document.getElementById("btn-reset").addEventListener("click", function (e) {
    e.preventDefault();
    document.getElementById("btn-example").click();
  });

  render();
})();

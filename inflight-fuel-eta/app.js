/**
 * UI for the in-flight fuel and ETA calculator. Math and result text
 * (with units) live in calc.js; this file reads the form and renders.
 */
(function () {
  "use strict";
  var C = window.InflightFuelEtaCalcs;
  if (!C) return;
  var $ = function (id) { return document.getElementById(id); };

  function num(id) {
    var t = String($(id).value).trim().replace(",", ".");
    if (t === "") return NaN;
    var v = Number(t);
    return isFinite(v) ? v : NaN;
  }
  function opt(id) {
    var t = String($(id).value).trim();
    return t === "" ? undefined : num(id);
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function showWarning(msg) {
    var w = $("warnings");
    w.hidden = !msg;
    w.innerHTML = msg ? "<p>" + esc(msg) + "</p>" : "";
  }
  function setHero(num, unit, sub) {
    $("out-hero").innerHTML = '<span class="num">' + esc(num) + '</span> <span class="unit" id="out-unit">' + esc(unit) + "</span>";
    $("out-sub").textContent = sub || "";
  }
  function clearOut(msg) {
    showWarning(msg);
    setHero("—", "", "");
    $("stat-grid").innerHTML = "";
    $("hero").removeAttribute("data-status");
    $("hero-tag").textContent = "";
  }

  function syncUnits() {
    var u = C.fuelUnits($("fuelUnit").value);
    document.querySelectorAll(".js-fuel-unit").forEach(function (el) { el.textContent = u.qty; });
    document.querySelectorAll(".js-flow-unit").forEach(function (el) { el.textContent = u.flow; });
    var du = { nm: "NM", sm: "SM", km: "km" }[$("distUnit").value] || "NM";
    document.querySelectorAll(".js-dist-unit").forEach(function (el) { el.textContent = du; });
    $("rowCustom").hidden = $("reserveKind").value !== "custom";
  }

  function run() {
    syncUnits();
    var clock = C.parseClock($("now").value);
    if (clock !== undefined && !isFinite(clock)) {
      clearOut("Use HH:MM for the optional clock time (for example 14:00).");
      return;
    }
    var r = C.compute({
      distance: num("distance"), distUnit: $("distUnit").value,
      groundspeed: num("gs"), speedUnit: $("speedUnit").value,
      fuelFlow: num("flow"), onboard: num("onboard"),
      reserveKind: $("reserveKind").value,
      alternateNm: opt("altNm"),
      reserveHours: opt("reserveHours"),
      nowMinutes: clock
    });
    if (!r) {
      clearOut("Enter a remaining distance of zero or more, a groundspeed and fuel flow greater than zero, and fuel on board of zero or more.");
      return;
    }
    showWarning("");
    var d = C.describe(r, $("fuelUnit").value);
    setHero(d.hero.num, d.hero.unit, d.hero.sub);
    $("hero").setAttribute("data-status", d.meetsReserve ? "current" : "expired");
    $("hero-tag").textContent = d.meetsReserve ? "reserve intact" : "below reserve";
    $("stat-grid").innerHTML = d.stats.map(function (s) {
      return '<div class="stat"><p class="stat-label">' + esc(s.label) + '</p><p class="stat-value">' + esc(s.value) + "</p></div>";
    }).join("");
  }

  function setDefaults() {
    $("distance").value = "60"; $("distUnit").value = "nm";
    $("gs").value = "120"; $("speedUnit").value = "kt";
    $("fuelUnit").value = "gal"; $("flow").value = "10"; $("onboard").value = "15";
    $("reserveKind").value = "vfr-day"; $("reserveHours").value = "0.5";
    $("altNm").value = ""; $("now").value = "";
  }

  $("calc-form").addEventListener("submit", function (e) { e.preventDefault(); run(); });
  $("calc-form").addEventListener("input", run);
  $("calc-form").addEventListener("change", run);
  $("exVfr").addEventListener("click", function () {
    setDefaults();
    $("now").value = "14:00";
    run();
  });
  $("resetBtn").addEventListener("click", function () { setDefaults(); run(); });

  run();
})();

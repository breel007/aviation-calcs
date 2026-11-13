(function () {
  "use strict";
  var C = window.ElectricAircraftEnduranceCalcs;
  if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
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
  function setSeg(group, unit) {
    document.querySelectorAll('[data-unit-group="' + group + '"]').forEach(function (b) {
      var on = b.getAttribute("data-unit") === unit;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  function fmt(n, d) {
    if (!isFinite(n)) return "—";
    return n.toLocaleString("en-US", { maximumFractionDigits: d == null ? 1 : d });
  }
  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value +
      "</p>" + (sub ? '<p class="stat-sub">' + sub + "</p>" : "") + "</div>";
  }
  function setHero(num, unit, sub) {
    $("out-hero").innerHTML = '<span class="num">' + num + '</span> <span class="unit">' + (unit || "") + "</span>";
    $("out-sub").textContent = sub || "";
    $("hero").hidden = false;
  }
  function clearOut(msg) {
    $("warnings").hidden = !msg;
    if (msg) $("warnings").innerHTML = "<p>" + msg + "</p>";
    else $("warnings").innerHTML = "";
    setHero("—", "", "");
    $("stat-grid").innerHTML = "";
    var extra = $("extra-results");
    if (extra) extra.innerHTML = "";
  }
var $ = function (id) { return document.getElementById(id); };
function num(id) { var v = parseFloat($(id).value); return isFinite(v) ? v : NaN; }
function syncMode() { var ld = $('mode').value === 'ld'; $('rowLd').hidden = !ld; $('rowP').hidden = ld; }
function run() {
  var energy = num('energy');
  var input = { mode: $('mode').value, usableFrac: num('usable'), speed: num('speed'), speedUnit: $('speedUnit').value, mass: num('mass'), massUnit: $('massUnit').value, liftToDrag: num('ld'), eta: num('eta') };
  if ($('energyUnit').value === 'kwh') input.capacityKwh = energy; else input.energyWh = energy;
  if (input.mode === 'power') input.powerW = num('power') * 1000;
  var r = ElectricAircraftEnduranceCalcs.compute(input);
  if (!r) { clearOut('Enter a positive battery energy and either a positive cruise power or a mass, speed, L/D, and efficiency in (0, 1].'); return; }
  var items = [
    { label: 'Endurance', value: fmt(r.enduranceHours, 2) + ' h  ·  ' + fmt(r.enduranceMin, 0) + ' min' },
    { label: 'Electric cruise power', value: fmt(r.electricPowerW / 1000, 1) + ' kW' },
    { label: 'Usable energy', value: fmt(r.usableWh / 1000, 2) + ' kWh' }
  ];
  if (r.rangeNm != null) items.splice(1, 0, { label: 'Still-air range', value: fmt(r.rangeNm, 1) + ' NM  ·  ' + fmt(r.rangeKm, 1) + ' km' });
  if (r.requiredPowerW != null) items.push({ label: 'Aero power required', value: fmt(r.requiredPowerW / 1000, 1) + ' kW  at  η = ' + fmt(r.eta, 2) });
  setHero(fmt(r.enduranceHours, 2) + ' h', r.rangeNm != null ? fmt(r.rangeNm, 0) + ' NM still-air range' : 'electric endurance');
  $("stat-grid").innerHTML = items.map(stat).join('');
}
$('mode').addEventListener('change', syncMode);
$('calcBtn').addEventListener('click', run);
$('ex20').addEventListener('click', function () { $('mode').value = 'power'; syncMode(); $('energy').value = '20'; $('energyUnit').value = 'kwh'; $('usable').value = '0.9'; $('power').value = '40'; $('speed').value = '100'; run(); });
$('resetBtn').addEventListener('click', function () { $('mode').value = 'power'; syncMode(); $('energy').value = '20'; $('usable').value = '0.9'; $('power').value = '40'; $('speed').value = '100'; clearOut(); run(); });
['energy','usable','power','mass','ld','eta','speed'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); }); });
syncMode();
  var form = $("calc-form");
  if (form) {
    form.addEventListener("submit", function (e) { e.preventDefault(); run(); });
    form.addEventListener("change", run);
  }
  if (typeof show === "function") show();
  run();
})();

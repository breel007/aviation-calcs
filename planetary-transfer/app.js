(function () {
  "use strict";
  var C = window.PlanetaryTransferCalcs;
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
function opt(id) { var t = $(id).value.trim(); if (t === '') return undefined; var v = parseFloat(t); return isFinite(v) ? v : NaN; }
function run() {
  var input = {};
  if ($('body1').value === 'custom') input.radius1 = opt('r1'); else input.body1 = $('body1').value;
  if ($('body2').value === 'custom') input.radius2 = opt('r2'); else input.body2 = $('body2').value;
  var r = PlanetaryTransferCalcs.compute(input);
  if (!r) { clearOut('Pick two different planets, or enter two different positive radii in AU.'); return; }
  setHero(fmt(r.timeOfFlightDays, 1) + ' days', 'heliocentric time of flight');
  $("stat-grid").innerHTML = [
    { label: 'Time of flight', value: fmt(r.timeOfFlightDays, 1) + ' days' },
    { label: 'Departure Δv (heliocentric)', value: fmt(r.dv1Mps / 1000, 3) + ' km/s' },
    { label: 'Arrival Δv (heliocentric)', value: fmt(r.dv2Mps / 1000, 3) + ' km/s' },
    { label: 'Total heliocentric Δv', value: fmt(r.dvTotalMps / 1000, 3) + ' km/s' },
    { label: 'Next similar window (synodic)', value: fmt(r.synodicDays, 1) + ' days' }
  ].map(stat).join('');
}
$('calcBtn').addEventListener('click', run);
$('exEM').addEventListener('click', function () { $('body1').value = 'earth'; $('body2').value = 'mars'; $('r1').value = ''; $('r2').value = ''; run(); });
$('resetBtn').addEventListener('click', function () { $('body1').value = 'earth'; $('body2').value = 'mars'; $('r1').value = ''; $('r2').value = ''; clearOut(); run(); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("submit", function (e) { e.preventDefault(); run(); });
    form.addEventListener("change", run);
  }
  if (typeof show === "function") show();
  run();
})();

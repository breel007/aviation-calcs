(function () {
  "use strict";
  var C = window.ParachuteDescentCalcs;
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
function opt(id) { var t = $(id).value.trim(); if (t === '') return undefined; var v = parseFloat(t); return isFinite(v) ? v : NaN; }
function run() {
  var r = ParachuteDescentCalcs.compute({
    height: num('height'), altUnit: $('altUnit').value,
    vt: opt('vt'), vtUnit: $('vtUnit').value,
    wind: opt('wind'), windUnit: $('windUnit').value,
    mass: opt('mass'), massUnit: $('massUnit').value,
    cd: opt('cd'), area: opt('area'), areaUnit: $('areaUnit').value
  });
  if (!r) { clearOut('Enter a height of zero or more, plus a descent rate greater than zero — or mass, Cd, and area so the page can compute terminal speed.'); return; }
  function dur(s) { return s < 120 ? fmt(s, 1) + ' s' : fmt(s / 60, 1) + ' min'; }
  setHero(dur(r.timeConstSec), 'time to the ground at terminal speed');
  $("stat-grid").innerHTML = [
    { label: 'Descent rate', value: fmt(r.vtFpm, 0) + ' ft/min  ·  ' + fmt(r.vtKt, 2) + ' kt  ·  ' + fmt(r.vtMps, 2) + ' m/s' },
    { label: 'Time at constant v_t', value: dur(r.timeConstSec) },
    { label: 'Time from rest (quadratic drag)', value: dur(r.timeFromRestSec) },
    { label: 'Wind drift (constant v_t)', value: fmt(r.driftConstFt, 0) + ' ft  ·  ' + fmt(r.driftConstNm, 2) + ' NM' }
  ].map(stat).join('');
}
$('calcBtn').addEventListener('click', run);
$('ex1000').addEventListener('click', function () { $('height').value = '1000'; $('altUnit').value = 'ft'; $('vt').value = '1000'; $('vtUnit').value = 'fpm'; $('wind').value = '10'; $('windUnit').value = 'kt'; $('mass').value = ''; $('cd').value = ''; $('area').value = ''; run(); });
$('resetBtn').addEventListener('click', function () { $('height').value = '1000'; $('vt').value = '1000'; $('wind').value = '10'; $('mass').value = ''; $('cd').value = ''; $('area').value = ''; clearOut(); run(); });
['height','vt','wind','mass','cd','area'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); }); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("submit", function (e) { e.preventDefault(); run(); });
    form.addEventListener("change", run);
  }
  if (typeof show === "function") show();
  run();
})();

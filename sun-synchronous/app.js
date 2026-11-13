(function () {
  "use strict";
  var C = window.SunSynchronousCalcs;
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
  var r = SunSynchronousCalcs.compute({ altitude: num('alt'), altUnit: $('altUnit').value, eccentricity: opt('ecc'), precessionDegPerDay: opt('rate') });
  if (!r) { clearOut('Enter a positive altitude whose perigee stays above the equator, and an eccentricity in [0, 1). If no inclination exists for those elements, the page returns nothing rather than inventing an angle.'); return; }
  setHero(fmt(r.inclinationDeg, 2) + '°', 'sun-synchronous inclination');
  $("stat-grid").innerHTML = [
    { label: 'Inclination', value: fmt(r.inclinationDeg, 3) + '°  (retrograde)' },
    { label: 'Semi-major axis', value: fmt(r.smaM / 1000, 1) + ' km' },
    { label: 'Period', value: fmt(r.periodSec / 60, 2) + ' min' },
    { label: 'Target nodal rate', value: fmt(r.precessionDegPerDay, 6) + ' °/day' }
  ].map(stat).join('');
}
$('calcBtn').addEventListener('click', run);
$('ex800').addEventListener('click', function () { $('alt').value = '800'; $('altUnit').value = 'km'; $('ecc').value = '0'; $('rate').value = ''; run(); });
$('resetBtn').addEventListener('click', function () { $('alt').value = '800'; $('ecc').value = '0'; $('rate').value = ''; clearOut(); run(); });
['alt','ecc','rate'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); }); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("submit", function (e) { e.preventDefault(); run(); });
    form.addEventListener("change", run);
  }
  if (typeof show === "function") show();
  run();
})();

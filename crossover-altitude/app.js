(function () {
  "use strict";
  var C = window.CrossoverAltitudeCalcs;
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
function run() {
  var r = CrossoverAltitudeCalcs.compute({ vmo: num('vmo'), vmoUnit: $('vmoUnit').value, mmo: num('mmo') });
  if (!r) { clearOut('Enter a positive Vmo and a subsonic Mmo (greater than 0 and less than 1) that have a crossover in the standard atmosphere.'); return; }
  setHero(fmt(r.crossoverFt, 0) + ' ft', 'pressure altitude  ·  FL' + fmt(r.crossoverFL, 0));
  $('out').innerHTML = [
    { label: 'Crossover pressure altitude', value: fmt(r.crossoverFt, 0) + ' ft  ·  FL' + fmt(r.crossoverFL, 0) },
    { label: 'Ambient pressure', value: fmt(r.ambientPa / 100, 1) + ' hPa' },
    { label: 'Vmo', value: fmt(r.vmoKt, 1) + ' KCAS' },
    { label: 'Mmo', value: fmt(r.mmo, 3) },
    { label: 'Below this altitude', value: 'The CAS limit (Vmo) is reached first.' },
    { label: 'Above this altitude', value: 'The Mach limit (Mmo) is reached first.' }
  ].map(stat).join('');
}
$('calcBtn').addEventListener('click', run);
$('ex350').addEventListener('click', function () { $('vmo').value = '350'; $('vmoUnit').value = 'kt'; $('mmo').value = '0.80'; run(); });
$('resetBtn').addEventListener('click', function () { $('vmo').value = '350'; $('mmo').value = '0.80'; clearOut(); $('hero').hidden = true; });
['vmo','mmo'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); }); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

(function () {
  "use strict";
  var C = window.PropellerStaticThrustCalcs;
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
  var r = PropellerStaticThrustCalcs.compute({ power: num('power'), powerUnit: $('powerUnit').value, diameter: num('diameter'), diaUnit: $('diaUnit').value, eta: opt('eta'), density: opt('density') });
  if (!r) { clearOut('Enter a positive shaft power and diameter, and an efficiency in (0, 1] if you use one.'); return; }
  setHero(fmt(r.thrustN, 0) + ' N', 'static thrust  ·  ' + fmt(r.thrustLbf, 0) + ' lbf');
  $("stat-grid").innerHTML = [
    { label: 'Static thrust', value: fmt(r.thrustN, 0) + ' N  ·  ' + fmt(r.thrustLbf, 0) + ' lbf' },
    { label: 'Induced velocity', value: fmt(r.inducedMps, 2) + ' m/s' },
    { label: 'Disk area', value: fmt(r.areaM2, 3) + ' m²  ·  loading ' + fmt(r.diskLoadingPa, 1) + ' Pa' },
    { label: 'Useful power', value: fmt(r.powerIdealW / 1000, 1) + ' kW  at  η = ' + fmt(r.eta, 2) }
  ].map(stat).join('');
}
$('calcBtn').addEventListener('click', run);
$('ex100').addEventListener('click', function () { $('power').value = '100'; $('powerUnit').value = 'kw'; $('diameter').value = '2'; $('diaUnit').value = 'm'; $('eta').value = '1'; $('density').value = ''; run(); });
$('resetBtn').addEventListener('click', function () { $('power').value = '100'; $('diameter').value = '2'; $('eta').value = '1'; $('density').value = ''; clearOut(); run(); });
['power','diameter','eta','density'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); }); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("submit", function (e) { e.preventDefault(); run(); });
    form.addEventListener("change", run);
  }
  if (typeof show === "function") show();
  run();
})();

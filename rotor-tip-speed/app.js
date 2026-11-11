(function () {
  "use strict";
  var C = window.RotorTipSpeedCalcs;
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
function opt(id) { var t = $(id).value.trim(); if (t === '') return undefined; var v = parseFloat(t); return isFinite(v) ? v : NaN; }
function run() {
  var input = { radius: num('radius'), radUnit: $('radUnit').value, omega: num('rpm'), omegaUnit: $('omegaUnit').value, speed: opt('speed'), speedUnit: $('speedUnit').value, oat: opt('oat'), tempUnit: $('tempUnit').value };
  var r = RotorTipSpeedCalcs.compute(input);
  if (!r) { clearOut('Enter a positive rotor speed and radius. Flight speed and temperature, if used, must be finite, with temperature above absolute zero.'); return; }
  var items = [
    { label: 'Tip speed ΩR', value: fmt(r.tipMps, 1) + ' m/s  ·  ' + fmt(r.tipKt, 0) + ' kt  ·  ' + fmt(r.tipFps, 0) + ' ft/s' },
    { label: 'Tip Mach', value: fmt(r.tipMach, 3) },
    { label: 'Helical tip Mach', value: fmt(r.helicalTipMach, 3) },
    { label: 'Advance ratio μ', value: fmt(r.advanceRatio, 3) + '  at  ' + fmt(r.rpm, 1) + ' rpm' }
  ];
  setHero(fmt(r.tipMps, 0) + ' m/s', 'tip speed  ·  M ' + fmt(r.tipMach, 2));
  $('out').innerHTML = items.map(stat).join('');
}
$('calcBtn').addEventListener('click', run);
$('ex400').addEventListener('click', function () { $('rpm').value = '400'; $('omegaUnit').value = 'rpm'; $('radius').value = '5.5'; $('radUnit').value = 'm'; $('speed').value = '120'; $('oat').value = '15'; run(); });
$('resetBtn').addEventListener('click', function () { $('rpm').value = '400'; $('radius').value = '5.5'; $('speed').value = '120'; $('oat').value = '15'; clearOut(); $('hero').hidden = true; });
['rpm','radius','speed','oat'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); }); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

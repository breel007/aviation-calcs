(function () {
  "use strict";
  var C = window.HoverPowerCalcs;
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
  var pUnit = $('powerUnit').value;
  var r = HoverPowerCalcs.compute({
    thrust: num('thrust'), thrustUnit: $('thrustUnit').value,
    diameter: num('diameter'), diaUnit: $('diaUnit').value,
    fm: num('fm'), altitude: num('alt'), altUnit: $('altUnit').value,
    powerAvail: opt('power'), powerUnit: pUnit
  });
  if (!r) { clearOut('Enter a positive thrust and diameter, a figure of merit in (0, 1], and a non-negative altitude. Available power, if used, must be positive.'); return; }
  var items = [
    { label: 'Shaft power required', value: fmt(r.shaftPowerW / 1000, 1) + ' kW  ·  ' + fmt(r.shaftPowerHp, 1) + ' hp' },
    { label: 'Ideal induced power', value: fmt(r.idealPowerW / 1000, 1) + ' kW' },
    { label: 'Disk loading', value: fmt(r.diskLoadingPa, 1) + ' Pa  ·  v_i ' + fmt(r.inducedMps, 2) + ' m/s' }
  ];
  if (r.hoverCeilingFt != null) items.unshift({ label: 'Induced-power hover ceiling', value: fmt(r.hoverCeilingFt, 0) + ' ft  ·  ' + fmt(r.hoverCeilingM, 0) + ' m' });
  setHero(fmt(r.shaftPowerW / 1000, 1) + ' kW', 'shaft power to hover');
  $("stat-grid").innerHTML = items.map(stat).join('');
}
$('calcBtn').addEventListener('click', run);
$('ex20').addEventListener('click', function () { $('thrust').value = '20000'; $('thrustUnit').value = 'n'; $('diameter').value = '20'; $('diaUnit').value = 'm'; $('fm').value = '0.7'; $('alt').value = '0'; $('altUnit').value = 'ft'; $('power').value = ''; run(); });
$('resetBtn').addEventListener('click', function () { $('thrust').value = '20000'; $('diameter').value = '20'; $('fm').value = '0.7'; $('alt').value = '0'; $('power').value = ''; clearOut(); run(); });
['thrust','diameter','fm','alt','power'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); }); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("submit", function (e) { e.preventDefault(); run(); });
    form.addEventListener("change", run);
  }
  if (typeof show === "function") show();
  run();
})();

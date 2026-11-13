(function () {
  "use strict";
  var C = window.BraytonCycleCalcs;
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
  var r = BraytonCycleCalcs.compute({ pressureRatio: num('rp'), gamma: num('gamma'), t1: opt('t1'), t3: opt('t3'), tempUnit: $('tempUnit').value });
  if (!r) { clearOut('Enter a pressure ratio greater than 1 and a γ greater than 1. If you enter temperatures, T1 must be above absolute zero and T3, if used, must be hotter than T2.'); return; }
  var items = [
    { label: 'Thermal efficiency', value: fmt(r.efficiency * 100, 2) + ' %' }
  ];
  if (r.T2 != null) items.push({ label: 'T2 (compressor exit)', value: fmt(r.T2, 1) + ' K' });
  if (r.T4 != null) {
    items.push({ label: 'T4 (turbine exit)', value: fmt(r.T4, 1) + ' K' });
    items.push({ label: 'Net work', value: fmt(r.netWorkJPerKg / 1000, 1) + ' kJ/kg' });
    items.push({ label: 'Heat input', value: fmt(r.heatInJPerKg / 1000, 1) + ' kJ/kg' });
  }
  setHero(fmt(r.efficiency * 100, 1) + ' %', 'ideal Brayton efficiency');
  $("stat-grid").innerHTML = items.map(stat).join('');
}
$('calcBtn').addEventListener('click', run);
$('ex10').addEventListener('click', function () { $('rp').value = '10'; $('gamma').value = '1.4'; $('t1').value = '300'; $('t3').value = '1400'; $('tempUnit').value = 'K'; run(); });
$('resetBtn').addEventListener('click', function () { $('rp').value = '10'; $('gamma').value = '1.4'; $('t1').value = '300'; $('t3').value = '1400'; clearOut(); run(); });
['rp','gamma','t1','t3'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); }); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("submit", function (e) { e.preventDefault(); run(); });
    form.addEventListener("change", run);
  }
  if (typeof show === "function") show();
  run();
})();

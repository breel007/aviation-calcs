(function () {
  "use strict";
  var C = window.SynodicPeriodCalcs;
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
  var input = { unit: $('unit').value };
  if ($('body1').value === 'custom') input.period1 = opt('p1'); else input.body1 = $('body1').value;
  if ($('body2').value === 'custom') input.period2 = opt('p2'); else input.body2 = $('body2').value;
  var r = SynodicPeriodCalcs.compute(input);
  if (!r) { clearOut('Pick two different bodies, or enter two different positive periods.'); return; }
  setHero(fmt(r.synodicDays, 1) + ' days', 'synodic period  ·  ' + fmt(r.synodicYears, 2) + ' yr');
  $("stat-grid").innerHTML = [
    { label: 'Synodic period', value: fmt(r.synodicDays, 2) + ' days  ·  ' + fmt(r.synodicYears, 3) + ' years' },
    { label: 'Sidereal period 1', value: fmt(r.period1Days, 3) + ' days' },
    { label: 'Sidereal period 2', value: fmt(r.period2Days, 3) + ' days' },
    { label: 'Meetings per year', value: fmt(r.meetingsPerYear, 2) }
  ].map(stat).join('');
}
$('calcBtn').addEventListener('click', run);
$('exEM').addEventListener('click', function () { $('body1').value = 'earth'; $('body2').value = 'mars'; run(); });
$('resetBtn').addEventListener('click', function () { $('body1').value = 'earth'; $('body2').value = 'mars'; $('p1').value = ''; $('p2').value = ''; clearOut(); run(); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("submit", function (e) { e.preventDefault(); run(); });
    form.addEventListener("change", run);
  }
  if (typeof show === "function") show();
  run();
})();

(function () {
  "use strict";
  var C = window.ServiceCeilingCalcs;
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
function syncMode() { var two = $('mode').value === 'two-points'; $('rowCeil').hidden = two; $('rowTwo').hidden = !two; }
function run() {
  var input = { mode: $('mode').value, serviceRoc: num('svc'), hQuery: opt('hQuery'), rocUnit: 'fpm', altUnit: 'ft' };
  if (input.mode === 'two-points') { input.h1 = num('h1'); input.roc1 = num('roc1'); input.h2 = num('h2'); input.roc2 = num('roc2'); }
  else { input.roc0 = num('roc0'); input.absoluteCeiling = num('hAbs'); }
  var r = ServiceCeilingCalcs.compute(input);
  if (!r) { clearOut('Enter a positive sea-level climb and absolute ceiling, or two points whose climb decreases with altitude, and a service residual between zero and that sea-level climb.'); return; }
  var items = [
    { label: 'Service ceiling', value: fmt(r.serviceCeilingFt, 0) + ' ft DA  at  ' + fmt(r.serviceRocFpm, 0) + ' ft/min' },
    { label: 'Absolute ceiling', value: fmt(r.absoluteCeilingFt, 0) + ' ft DA' },
    { label: 'Sea-level rate of climb', value: fmt(r.roc0Fpm, 0) + ' ft/min' }
  ];
  if (r.rocAtQueryFpm != null) items.push({ label: 'ROC at ' + fmt(r.queryAltitudeFt, 0) + ' ft DA', value: fmt(r.rocAtQueryFpm, 0) + ' ft/min' });
  setHero(fmt(r.serviceCeilingFt, 0) + ' ft', 'service ceiling (linear model)');
  $('out').innerHTML = items.map(stat).join('');
}
$('mode').addEventListener('change', syncMode);
$('calcBtn').addEventListener('click', run);
$('ex1200').addEventListener('click', function () { $('mode').value = 'ceiling'; syncMode(); $('roc0').value = '1200'; $('hAbs').value = '12000'; $('svc').value = '100'; $('hQuery').value = '6000'; run(); });
$('resetBtn').addEventListener('click', function () { $('mode').value = 'ceiling'; syncMode(); $('roc0').value = '1200'; $('hAbs').value = '12000'; $('svc').value = '100'; $('hQuery').value = '6000'; clearOut(); $('hero').hidden = true; });
['roc0','hAbs','h1','roc1','h2','roc2','svc','hQuery'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); }); });
syncMode();
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

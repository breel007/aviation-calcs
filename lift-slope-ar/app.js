(function () {
  "use strict";
  var C = window.LiftSlopeArCalcs;
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
  var r = LiftSlopeArCalcs.compute({ aspectRatio: num('ar'), oswald: num('oswald'), a0: opt('a0') });
  if (!r) { clearOut('Enter a positive aspect ratio, a positive Oswald efficiency, and an optional positive section slope.'); return; }
  setHero(fmt(r.prandtlPerDeg, 4) + ' /deg', 'Prandtl slope');
  $('out').innerHTML = [
    { label: 'Prandtl slope', value: fmt(r.prandtlPerRad, 3) + ' per rad  ·  ' + fmt(r.prandtlPerDeg, 4) + ' per degree' },
    { label: 'Helmbold slope', value: fmt(r.helmboldPerRad, 3) + ' per rad  ·  ' + fmt(r.helmboldPerDeg, 4) + ' per degree' },
    { label: 'Section slope a0', value: fmt(r.a0PerRad, 3) + ' per rad  ·  ' + fmt(r.a0PerDeg, 4) + ' per degree' },
    { label: 'Helmbold / Prandtl', value: fmt(r.ratioHelmboldToPrandtl, 3) }
  ].map(stat).join('');
}
$('calcBtn').addEventListener('click', run);
$('ex6').addEventListener('click', function () { $('ar').value = '6'; $('oswald').value = '1'; $('a0').value = ''; run(); });
$('resetBtn').addEventListener('click', function () { $('ar').value = '6'; $('oswald').value = '1'; $('a0').value = ''; clearOut(); $('hero').hidden = true; });
['ar','oswald','a0'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); }); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

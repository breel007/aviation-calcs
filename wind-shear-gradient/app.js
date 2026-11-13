(function () {
  "use strict";
  var C = window.WindShearGradientCalcs;
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
function syncMode() { var lin = $('mode').value === 'linear'; $('rowAlpha').hidden = lin; $('rowShear').hidden = !lin; }
function run() {
  var r = WindShearGradientCalcs.compute({
    mode: $('mode').value, vref: num('vref'), href: num('href'), height: num('height'),
    altUnit: $('altUnit').value, speedUnit: $('speedUnit').value,
    alpha: opt('alpha'), shearPer100: opt('shear')
  });
  if (!r) { clearOut('Enter a reference height greater than zero, a wind of zero or more, and a height of interest of zero or more.'); return; }
  setHero(fmt(r.windKt, 1) + ' kt', 'at ' + fmt(r.heightFt, 0) + ' ft');
  $("stat-grid").innerHTML = [
    { label: 'Wind at the height of interest', value: fmt(r.windKt, 1) + ' kt' },
    { label: 'Change from the reference', value: (r.deltaKt >= 0 ? '+' : '') + fmt(r.deltaKt, 1) + ' kt' },
    { label: 'Mean shear', value: fmt(r.shearKtPer100ft, 2) + ' kt / 100 ft' },
    { label: 'Profile', value: r.mode === 'linear' ? 'linear' : ('power law, α = ' + fmt(r.alpha, 3)) }
  ].map(stat).join('');
}
$('mode').addEventListener('change', syncMode);
$('calcBtn').addEventListener('click', run);
$('exPower').addEventListener('click', function () { $('mode').value = 'power'; syncMode(); $('vref').value = '20'; $('href').value = '30'; $('height').value = '1000'; $('altUnit').value = 'ft'; $('speedUnit').value = 'kt'; $('alpha').value = ''; run(); });
$('resetBtn').addEventListener('click', function () { $('mode').value = 'power'; syncMode(); $('vref').value = '20'; $('href').value = '30'; $('height').value = '1000'; $('alpha').value = ''; $('shear').value = '3'; clearOut(); run(); });
['vref','href','height','alpha','shear'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); }); });
syncMode();
  var form = $("calc-form");
  if (form) {
    form.addEventListener("submit", function (e) { e.preventDefault(); run(); });
    form.addEventListener("change", run);
  }
  if (typeof show === "function") show();
  run();
})();

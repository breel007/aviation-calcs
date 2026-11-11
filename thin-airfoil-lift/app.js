(function () {
  "use strict";
  var C = window.ThinAirfoilLiftCalcs;
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
  var r = ThinAirfoilLiftCalcs.compute({ alpha: num('alpha'), alphaL0: num('aL0'), angleUnit: $('angleUnit').value, speed: opt('speed'), speedUnit: $('speedUnit').value, area: opt('area'), density: opt('density') });
  if (!r) { clearOut('Enter a finite angle of attack and zero-lift angle. If you ask for a dimensional lift, also enter a non-negative speed and a positive area.'); return; }
  var items = [
    { label: 'Section lift coefficient', value: 'cl = ' + fmt(r.cl, 3) },
    { label: 'Effective angle (α − α_L0)', value: fmt(r.alphaDeg - r.alphaL0Deg, 2) + '°' },
    { label: 'Lift-curve slope', value: fmt(r.a0PerRad, 3) + ' per rad  ·  ' + fmt(r.a0PerDeg, 4) + ' per degree' }
  ];
  if (r.liftN != null) items.unshift({ label: 'Lift', value: fmt(r.liftN, 1) + ' N' });
  setHero('cl ' + fmt(r.cl, 3), 'thin-airfoil theory');
  $('out').innerHTML = items.map(stat).join('');
}
$('calcBtn').addEventListener('click', run);
$('ex5').addEventListener('click', function () { $('alpha').value = '5'; $('aL0').value = '0'; $('angleUnit').value = 'deg'; $('speed').value = ''; $('area').value = ''; run(); });
$('resetBtn').addEventListener('click', function () { $('alpha').value = '5'; $('aL0').value = '0'; $('speed').value = ''; $('area').value = ''; $('density').value = ''; clearOut(); $('hero').hidden = true; });
['alpha','aL0','speed','area','density'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); }); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

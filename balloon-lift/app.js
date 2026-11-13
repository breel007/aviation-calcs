(function () {
  "use strict";
  var C = window.BalloonLiftCalcs;
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
  var r = BalloonLiftCalcs.compute({
    volume: num('volume'), volUnit: $('volUnit').value,
    tAir: num('tAir'), tHot: num('tHot'), tempUnit: $('tempUnit').value,
    pressure: opt('pressure'), pressureUnit: $('pressureUnit').value,
    emptyWeight: opt('empty'), weightUnit: $('weightUnit').value
  });
  if (!r) { clearOut('Enter a positive envelope volume, an outside temperature, and a hotter envelope temperature. Pressure, if used, must be positive.'); return; }
  setHero(fmt(r.usefulKg, 0) + ' kg', 'useful lift');
  $("stat-grid").innerHTML = [
    { label: 'Gross lift', value: fmt(r.liftKg, 0) + ' kg  ·  ' + fmt(r.liftLb, 0) + ' lb  ·  ' + fmt(r.liftN, 0) + ' N' },
    { label: 'Useful lift', value: fmt(r.usefulKg, 0) + ' kg  ·  ' + fmt(r.usefulLb, 0) + ' lb' },
    { label: 'Air density', value: fmt(r.rhoAir, 3) + ' kg/m³  outside,  ' + fmt(r.rhoHot, 3) + ' kg/m³  in the envelope' },
    { label: 'Volume', value: fmt(r.volumeM3, 0) + ' m³' }
  ].map(stat).join('');
}
$('calcBtn').addEventListener('click', run);
$('ex2800').addEventListener('click', function () { $('volume').value = '2800'; $('volUnit').value = 'm3'; $('tAir').value = '15'; $('tHot').value = '100'; $('tempUnit').value = 'C'; $('pressure').value = '101325'; $('pressureUnit').value = 'pa'; $('empty').value = '400'; $('weightUnit').value = 'kg'; run(); });
$('resetBtn').addEventListener('click', function () { $('volume').value = '2800'; $('tAir').value = '15'; $('tHot').value = '100'; $('pressure').value = '101325'; $('empty').value = '400'; clearOut(); run(); });
['volume','tAir','tHot','pressure','empty'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); }); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("submit", function (e) { e.preventDefault(); run(); });
    form.addEventListener("change", run);
  }
  if (typeof show === "function") show();
  run();
})();

(function () {
  "use strict";
  var C = window.AccelerateStopCalcs;
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
function run() {
  var ak = $('accelKind').value, dk = $('decelKind').value;
  var input = { v1: num('v1'), v1Unit: $('v1Unit').value, reactionSec: num('react'), accelKind: ak, decelKind: dk };
  if (ak === 'distance') input.accelDistance = num('accelVal');
  else if (ak === 'g') input.accelG = num('accelVal');
  else input.accelKtsPerSec = num('accelVal');
  if (dk === 'g') input.decelG = num('decelVal'); else input.decelKtsPerSec = num('decelVal');
  var r = AccelerateStopCalcs.compute(input);
  if (!r) { clearOut('Enter a decision speed greater than zero, positive acceleration and deceleration, and a recognition time of zero or more.'); return; }
  setHero(fmt(r.totalFt, 0) + ' ft', 'educational accelerate-stop distance');
  $('out').innerHTML = [
    { label: 'Total distance', value: fmt(r.totalFt, 0) + ' ft  ·  ' + fmt(r.totalM, 0) + ' m  ·  ' + fmt(r.totalSec, 1) + ' s' },
    { label: 'Accelerate to the decision speed', value: fmt(r.accelFt, 0) + ' ft  in  ' + fmt(r.accelSec, 1) + ' s' },
    { label: 'Recognition / reaction', value: fmt(r.reactionFt, 0) + ' ft  in  ' + fmt(r.reactionSec, 1) + ' s' },
    { label: 'Brake to a stop', value: fmt(r.stopFt, 0) + ' ft  in  ' + fmt(r.stopSec, 1) + ' s' }
  ].map(stat).join('');
}
$('calcBtn').addEventListener('click', run);
$('ex80').addEventListener('click', function () { $('v1').value = '80'; $('v1Unit').value = 'kt'; $('accelKind').value = 'kts-per-s'; $('accelVal').value = '4'; $('decelKind').value = 'kts-per-s'; $('decelVal').value = '8'; $('react').value = '1'; run(); });
$('resetBtn').addEventListener('click', function () { $('v1').value = '80'; $('accelKind').value = 'kts-per-s'; $('accelVal').value = '4'; $('decelKind').value = 'kts-per-s'; $('decelVal').value = '8'; $('react').value = '1'; clearOut(); $('hero').hidden = true; });
['v1','accelVal','decelVal','react'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); }); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

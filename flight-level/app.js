(function () {
  "use strict";
  var C = window.FlightLevelCalcs;
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
function syncMode() { var isPa = $('mode').value === 'pa'; $('rowPa').hidden = !isPa; $('rowFl').hidden = isPa; }
function run() {
  var input = { mode: $('mode').value, transitionAltitude: num('ta'), transitionLevel: num('tl'), qnh: opt('qnh'), qnhUnit: $('qnhUnit').value };
  if (input.mode === 'fl') input.flightLevel = num('fl'); else input.pressureAltitude = num('pa');
  var r = FlightLevelCalcs.compute(input);
  if (!r) { clearOut('Enter a non-negative pressure altitude or flight level, and a transition level at or above the transition altitude.'); return; }
  var band = r.inTransitionLayer ? 'In the transition layer (at or above the TA, below the TL).' : (r.atOrAboveTransitionLevel ? 'At or above the transition level — flight levels, altimeter 29.92 / 1013.' : 'Below the transition altitude — QNH altitudes.');
  var items = [
    { label: 'Flight level', value: r.flightLevelLabel + '  ·  ' + fmt(r.flightLevel, 1) },
    { label: 'Pressure altitude', value: fmt(r.pressureAltitudeFt, 0) + ' ft' },
    { label: 'Transition', value: 'TA ' + fmt(r.transitionAltitudeFt, 0) + ' ft,  TL ' + fmt(r.transitionLevel, 0) + (r.transitionLayerFt > 0 ? '  (layer ' + fmt(r.transitionLayerFt, 0) + ' ft)' : '') },
    { label: 'Altimeter setting band', value: band }
  ];
  if (r.qnhAltitudeFt != null) {
    items.push({ label: 'QNH altitude (rule of thumb)', value: fmt(r.qnhAltitudeFt, 0) + ' ft' });
    items.push({ label: 'PA − QNH offset', value: fmt(r.qnhOffsetFt, 0) + ' ft' });
  }
  setHero(r.flightLevelLabel, 'from ' + fmt(r.pressureAltitudeFt, 0) + ' ft PA');
  $('out').innerHTML = items.map(stat).join('');
}
$('mode').addEventListener('change', syncMode);
$('calcBtn').addEventListener('click', run);
$('exUs').addEventListener('click', function () { $('mode').value = 'pa'; syncMode(); $('pa').value = '18000'; $('ta').value = '18000'; $('tl').value = '180'; $('qnh').value = ''; run(); });
$('exEur').addEventListener('click', function () { $('mode').value = 'fl'; syncMode(); $('fl').value = '60'; $('ta').value = '5000'; $('tl').value = '70'; $('qnh').value = ''; run(); });
$('resetBtn').addEventListener('click', function () { $('mode').value = 'pa'; syncMode(); $('pa').value = '18000'; $('fl').value = '180'; $('ta').value = '18000'; $('tl').value = '180'; $('qnh').value = ''; $('qnhUnit').value = 'inhg'; clearOut(); $('hero').hidden = true; });
['pa','fl','ta','tl','qnh'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); }); });
syncMode();
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

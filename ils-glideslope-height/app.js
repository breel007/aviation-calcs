(function () {
  "use strict";
  var C = window.IlsGlideslopeHeightCalcs;
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
function syncMode() {
  var isDist = $('mode').value === 'distance';
  $('rowDist').hidden = !isDist;
  $('rowHeight').hidden = isDist;
}
function run() {
  var mode = $('mode').value;
  var input = {
    mode: mode,
    angle: num('angle'),
    tch: num('tch'),
    tchUnit: 'ft',
    antennaOffset: opt('antennaOffset'),
    offsetUnit: $('offsetUnit').value,
    distanceIsDme: $('distanceIsDme').checked,
    groundspeed: opt('groundspeed')
  };
  if (mode === 'height') { input.height = num('height'); input.heightUnit = $('heightUnit').value; }
  else { input.distance = num('distance'); input.distUnit = $('distUnit').value; }
  var r = IlsGlideslopeHeightCalcs.compute(input);
  if (!r) { clearOut('Enter a positive path angle and a finite distance or height, with a threshold crossing height of zero or more.'); return; }
  var items = [
    { label: 'Height above threshold', value: fmt(r.heightFt, 0) + ' ft  ·  ' + fmt(r.heightM, 1) + ' m' },
    { label: 'Distance to threshold', value: fmt(r.distanceToThresholdNm, 2) + ' NM  ·  ' + fmt(r.distanceToThresholdFt, 0) + ' ft' },
    { label: 'Path slope', value: fmt(r.ftPerNm, 1) + ' ft/NM  at  ' + fmt(r.angleDeg, 2) + '°' },
    { label: 'Threshold crossing height', value: fmt(r.tchFt, 1) + ' ft' }
  ];
  if (r.descentFpm != null) items.push({ label: 'Descent rate on path', value: fmt(r.descentFpm, 0) + ' ft/min  at  ' + fmt(r.groundspeedKt, 0) + ' kt' });
  if (r.pastThreshold) items.push({ label: 'Note', value: 'The computed point is past the landing threshold.' });
  setHero(fmt(r.heightFt, 0) + ' ft', 'above the threshold');
  $("stat-grid").innerHTML = items.map(stat).join('');
}
$('mode').addEventListener('change', syncMode);
$('calcBtn').addEventListener('click', run);
$('exOneNm').addEventListener('click', function () { $('mode').value = 'distance'; syncMode(); $('distance').value = '1'; $('distUnit').value = 'nm'; $('angle').value = '3'; $('tch').value = '50'; $('antennaOffset').value = ''; $('distanceIsDme').checked = false; $('groundspeed').value = '90'; run(); });
$('resetBtn').addEventListener('click', function () { $('mode').value = 'distance'; syncMode(); $('distance').value = '1'; $('distUnit').value = 'nm'; $('height').value = '368'; $('angle').value = '3'; $('tch').value = '50'; $('antennaOffset').value = ''; $('distanceIsDme').checked = false; $('groundspeed').value = ''; clearOut(); run(); });
['distance','height','angle','tch','antennaOffset','groundspeed'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); }); });
syncMode();
  var form = $("calc-form");
  if (form) {
    form.addEventListener("submit", function (e) { e.preventDefault(); run(); });
    form.addEventListener("change", run);
  }
  if (typeof show === "function") show();
  run();
})();

(function () {
  "use strict";
  var C = window.DroneFlightTimeCalcs;
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
  var r = DroneFlightTimeCalcs.compute({
    mass: num('mass'), massUnit: $('massUnit').value, rotors: num('rotors'),
    diameter: num('diameter'), diaUnit: $('diaUnit').value, fm: num('fm'),
    energyWh: opt('energyWh'), capacityMah: opt('mah'), voltage: opt('volt'),
    usableFrac: num('usable'), avionicsW: opt('avionics'), maxThrust: opt('maxThrust')
  });
  if (!r) { clearOut('Enter a positive mass, a whole number of rotors, a positive diameter, a figure of merit between 0 and 1, and battery energy as watt-hours or as mAh and voltage.'); return; }
  var items = [
    { label: 'Hover power', value: fmt(r.hoverPowerW, 0) + ' W  (ideal ' + fmt(r.idealPowerW, 0) + ' W)' },
    { label: 'Induced velocity (per rotor)', value: fmt(r.inducedMps, 2) + ' m/s' }
  ];
  if (r.enduranceMin != null) items.unshift({ label: 'Hover endurance', value: fmt(r.enduranceMin, 1) + ' min  from  ' + fmt(r.usableWh, 1) + ' Wh usable' });
  if (r.thrustToWeight != null) items.push({ label: 'Thrust-to-weight', value: fmt(r.thrustToWeight, 2) + '  (max thrust ' + fmt(r.maxThrustN, 0) + ' N)' });
  setHero(r.enduranceMin != null ? fmt(r.enduranceMin, 1) + ' min' : fmt(r.hoverPowerW, 0) + ' W', r.enduranceMin != null ? 'hover endurance' : 'hover power');
  $('out').innerHTML = items.map(stat).join('');
}
$('calcBtn').addEventListener('click', run);
$('exQuad').addEventListener('click', function () { $('mass').value = '2'; $('rotors').value = '4'; $('diameter').value = '0.25'; $('fm').value = '0.6'; $('energyWh').value = '100'; $('usable').value = '0.8'; $('mah').value = ''; $('volt').value = ''; $('avionics').value = '0'; $('maxThrust').value = ''; run(); });
$('resetBtn').addEventListener('click', function () { $('mass').value = '2'; $('rotors').value = '4'; $('diameter').value = '0.25'; $('fm').value = '0.6'; $('energyWh').value = '100'; $('usable').value = '0.8'; $('mah').value = ''; $('volt').value = ''; $('avionics').value = '0'; $('maxThrust').value = ''; clearOut(); $('hero').hidden = true; });
['mass','rotors','diameter','fm','energyWh','usable','mah','volt','avionics','maxThrust'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); }); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

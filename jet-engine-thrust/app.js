(function () {
  "use strict";
  var C = window.JetEngineThrustCalcs;
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
  var r = JetEngineThrustCalcs.compute({
    airflow: num('air'), airUnit: $('airUnit').value, exitSpeed: num('ue'), flightSpeed: num('u0'),
    speedUnit: $('speedUnit').value, far: opt('far'), fuelFlow: opt('fuel'),
    exitPressure: opt('pe'), ambientPressure: opt('p0'), exitArea: opt('ae'), pressureUnit: $('pressureUnit').value
  });
  if (!r) { clearOut('Enter a positive air mass flow and a non-negative exit and flight speed. Fuel/air ratio or fuel flow, if used, must be zero or more.'); return; }
  var items = [
    { label: 'Net thrust', value: fmt(r.thrustN, 0) + ' N  ·  ' + fmt(r.thrustLbf, 0) + ' lbf' },
    { label: 'Fuel/air ratio', value: fmt(r.far, 4) + '  ·  fuel flow ' + fmt(r.fuelMassFlow, 3) + ' kg/s' }
  ];
  if (r.tsfcKgPerNs != null && isFinite(r.tsfcKgPerNs)) {
    items.push({ label: 'TSFC', value: fmt(r.tsfcMgPerNs, 2) + ' (mg/s)/N  ·  ' + fmt(r.tsfcLbPerHrLbf, 3) + ' (lbm/h)/lbf' });
  }
  if (r.pressureTermN) items.push({ label: 'Pressure term', value: fmt(r.pressureTermN, 0) + ' N' });
  setHero(fmt(r.thrustN, 0) + ' N', 'net thrust');
  $('out').innerHTML = items.map(stat).join('');
}
$('calcBtn').addEventListener('click', run);
$('ex50').addEventListener('click', function () { $('air').value = '50'; $('ue').value = '600'; $('u0').value = '0'; $('far').value = '0.02'; $('fuel').value = ''; $('pe').value = ''; $('p0').value = ''; $('ae').value = ''; run(); });
$('resetBtn').addEventListener('click', function () { $('air').value = '50'; $('ue').value = '600'; $('u0').value = '0'; $('far').value = '0.02'; $('fuel').value = ''; $('pe').value = ''; $('p0').value = ''; $('ae').value = ''; clearOut(); $('hero').hidden = true; });
['air','ue','u0','far','fuel','pe','p0','ae'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); }); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

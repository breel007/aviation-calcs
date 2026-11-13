(function () {
  "use strict";
  var C = window.WindChillCalcs;
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
function run() {
  var r = WindChillCalcs.compute({ temperature: num('temp'), tempUnit: $('tempUnit').value, wind: num('wind'), windUnit: $('windUnit').value });
  if (!r) { clearOut('Enter a finite air temperature and a wind speed of zero or more.'); return; }
  var items = [
    { label: 'Wind-chill temperature', value: fmt(r.windChillF, 0) + ' °F  ·  ' + fmt(r.windChillC, 1) + ' °C' },
    { label: 'Air temperature', value: fmt(r.temperatureF, 1) + ' °F  ·  ' + fmt(r.temperatureC, 1) + ' °C' },
    { label: 'Wind', value: fmt(r.windMph, 1) + ' mph  ·  ' + fmt(r.windKt, 1) + ' kt' }
  ];
  if (!r.applicable) items.push({ label: 'Domain', value: 'NWS publishes wind chill only for air temperatures at or below 50 °F and winds of 3 mph or more. Below that wind, this page reports the air temperature.' });
  setHero(fmt(r.windChillF, 0) + ' °F', 'wind-chill temperature');
  $("stat-grid").innerHTML = items.map(stat).join('');
}
$('calcBtn').addEventListener('click', run);
$('exCold').addEventListener('click', function () { $('temp').value = '0'; $('tempUnit').value = 'F'; $('wind').value = '10'; $('windUnit').value = 'mph'; run(); });
$('resetBtn').addEventListener('click', function () { $('temp').value = '0'; $('tempUnit').value = 'F'; $('wind').value = '10'; $('windUnit').value = 'mph'; clearOut(); run(); });
['temp','wind'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); }); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("submit", function (e) { e.preventDefault(); run(); });
    form.addEventListener("change", run);
  }
  if (typeof show === "function") show();
  run();
})();

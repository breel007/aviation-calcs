(function () {
  "use strict";
  var C = window.ThunderstormDistanceCalcs;
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
  var tIn = $('temp').value.trim();
  var r = ThunderstormDistanceCalcs.compute({ seconds: num('seconds'), temperature: tIn === '' ? undefined : num('temp'), tempUnit: $('tempUnit').value });
  if (!r) { clearOut('Enter a flash-to-bang time of zero seconds or more, and an optional finite temperature.'); return; }
  setHero(fmt(r.distanceSm, 1) + ' SM', 'estimated range');
  $("stat-grid").innerHTML = [
    { label: 'Estimated distance', value: fmt(r.distanceSm, 1) + ' SM  ·  ' + fmt(r.distanceNm, 1) + ' NM  ·  ' + fmt(r.distanceM / 1000, 1) + ' km' },
    { label: 'Speed of sound used', value: fmt(r.speedOfSoundMps, 1) + ' m/s  ·  ' + fmt(r.secondsPerSm, 2) + ' s/SM' },
    { label: 'Five-seconds-per-mile rule', value: fmt(r.rule5SecPerSm, 1) + ' SM  (t / 5)' },
    { label: 'Temperature assumed', value: fmt(r.temperatureC, 1) + ' °C' }
  ].map(stat).join('');
}
$('calcBtn').addEventListener('click', run);
$('ex15').addEventListener('click', function () { $('seconds').value = '15'; $('temp').value = '15'; $('tempUnit').value = 'C'; run(); });
$('resetBtn').addEventListener('click', function () { $('seconds').value = '15'; $('temp').value = '15'; $('tempUnit').value = 'C'; clearOut(); run(); });
['seconds','temp'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); }); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("submit", function (e) { e.preventDefault(); run(); });
    form.addEventListener("change", run);
  }
  if (typeof show === "function") show();
  run();
})();

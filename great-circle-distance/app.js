(function () {
  "use strict";
  var C = window.GreatCircleDistanceCalcs;
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
var def = { lat1: '40.6413', lon1: '-73.7781', lat2: '33.9425', lon2: '-118.4081' };
function num(id) { var v = parseFloat($(id).value); return isFinite(v) ? v : NaN; }
function course(deg) {
  if (deg == null || !isFinite(deg)) return '— (no unique course)';
  return fmt(deg, 1) + '° true';
}
function run() {
  var r = GreatCircleDistanceCalcs.compute({ lat1: num('lat1'), lon1: num('lon1'), lat2: num('lat2'), lon2: num('lon2') });
  if (!r) { clearOut('Enter two valid latitudes (−90 to 90) and longitudes (−180 to 180).'); return; }
  var items = [
    { label: 'Great-circle distance', value: fmt(r.distanceNm, 1) + ' NM  ·  ' + fmt(r.distanceKm, 1) + ' km' },
    { label: 'Initial true course', value: course(r.initialCourse) },
    { label: 'Arrival true course', value: course(r.finalCourse) },
    { label: 'Central angle', value: fmt(r.centralAngleDeg, 3) + '°' }
  ];
  if (r.antipodal) items.push({ label: 'Note', value: 'These points are antipodal: the distance is half a circumference, but every initial course is equally short.' });
  setHero(fmt(r.distanceNm, 1) + ' NM', 'great-circle distance');
  $('out').innerHTML = items.map(stat).join('');
}
$('calcBtn').addEventListener('click', run);
$('exJfkLax').addEventListener('click', function () { $('lat1').value = '40.6413'; $('lon1').value = '-73.7781'; $('lat2').value = '33.9425'; $('lon2').value = '-118.4081'; run(); });
$('exLhrSyd').addEventListener('click', function () { $('lat1').value = '51.4700'; $('lon1').value = '-0.4543'; $('lat2').value = '-33.9399'; $('lon2').value = '151.1753'; run(); });
$('resetBtn').addEventListener('click', function () { Object.keys(def).forEach(function (k) { $(k).value = def[k]; }); clearOut(); $('hero').hidden = true; });
['lat1','lon1','lat2','lon2'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); }); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

(function () {
  "use strict";
  var C = window.InflightFuelEtaCalcs;
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
function parseHHMM(s) {
  s = (s || '').trim(); if (!s) return undefined;
  var m = s.match(/^(\d{1,2}):(\d{2})$/); if (!m) return NaN;
  var h = Number(m[1]), min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return NaN;
  return h * 60 + min;
}
function fmtClock(min) {
  if (min == null || !isFinite(min)) return '—';
  var t = ((min % (24 * 60)) + 24 * 60) % (24 * 60);
  var h = Math.floor(t / 60), m = Math.round(t - h * 60);
  if (m === 60) { m = 0; h = (h + 1) % 24; }
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
function fmtDur(hours) {
  var m = Math.round(hours * 60);
  var h = Math.floor(m / 60); m = m - h * 60;
  if (h <= 0) return m + ' min';
  return h + ' h ' + String(m).padStart(2, '0') + ' min';
}
function syncReserve() { $('rowCustom').hidden = $('reserveKind').value !== 'custom'; }
function run() {
  var clock = parseHHMM($('now2').value) ;
  if ($('reserveKind').value === 'custom' && $('now').value.trim()) clock = parseHHMM($('now').value);
  if (clock !== undefined && !isFinite(clock)) { clearOut('Use HH:MM for the optional clock time (for example 14:00).'); return; }
  var r = InflightFuelEtaCalcs.compute({
    distance: num('distance'), distUnit: $('distUnit').value,
    groundspeed: num('gs'), speedUnit: $('speedUnit').value,
    fuelFlow: num('flow'), onboard: num('onboard'),
    reserveKind: $('reserveKind').value,
    alternateNm: opt('altNm'),
    reserveHours: opt('reserveHours'),
    nowMinutes: clock
  });
  if (!r) { clearOut('Enter a remaining distance of zero or more, a groundspeed and fuel flow greater than zero, and a fuel-on-board of zero or more.'); return; }
  var items = [
    { label: 'ETE', value: fmtDur(r.eteHours) },
    { label: 'Fuel at destination', value: fmt(r.atDestination, 1) + (r.willArriveWithFuel ? '' : '  (arrives dry or worse)') },
    { label: 'Burn ahead', value: fmt(r.burn, 1) },
    { label: 'Endurance now', value: fmtDur(r.enduranceHours) },
    { label: 'Reserve required', value: fmt(r.reserveFuel, 1) + '  (' + fmtDur(r.reserveHours) + ')' },
    { label: 'Surplus vs reserve', value: fmt(r.surplus, 1) + '  (' + fmtDur(Math.abs(r.surplusHours)) + (r.meetsReserve ? ' extra)' : ' short)') }
  ];
  if (r.etaMinutes != null) items.splice(1, 0, { label: 'ETA', value: fmtClock(r.etaMinutes) });
  setHero(fmt(r.atDestination, 1), r.meetsReserve ? 'at destination, reserve intact' : 'at destination, below the chosen reserve');
  $('out').innerHTML = items.map(stat).join('');
}
$('reserveKind').addEventListener('change', syncReserve);
$('calcBtn').addEventListener('click', run);
$('exVfr').addEventListener('click', function () { $('distance').value = '60'; $('gs').value = '120'; $('flow').value = '10'; $('onboard').value = '15'; $('reserveKind').value = 'vfr-day'; syncReserve(); $('altNm').value = ''; $('now2').value = '14:00'; run(); });
$('resetBtn').addEventListener('click', function () { $('distance').value = '60'; $('distUnit').value = 'nm'; $('gs').value = '120'; $('speedUnit').value = 'kt'; $('flow').value = '10'; $('onboard').value = '15'; $('reserveKind').value = 'vfr-day'; $('altNm').value = ''; $('reserveHours').value = '0.5'; $('now').value = ''; $('now2').value = ''; syncReserve(); clearOut(); $('hero').hidden = true; });
['distance','gs','flow','onboard','altNm','reserveHours','now','now2'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); }); });
syncReserve();
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

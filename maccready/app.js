(function () {
  "use strict";
  var C = window.MaccreadyCalcs;
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
  var r = MaccreadyCalcs.compute({
    mode: 'points', v1: num('v1'), w1: num('w1'), v2: num('v2'), w2: num('w2'),
    v3: opt('v3'), w3: opt('w3'), maccready: num('mc'),
    speedUnit: $('speedUnit').value, sinkUnit: $('sinkUnit').value, mcUnit: $('sinkUnit').value
  });
  if (!r) { clearOut('Enter two (or three) polar points with increasing airspeed and a quadratic that curves upward (c > 0), plus a MacCready climb of zero or more.'); return; }
  var items = [
    { label: 'Speed to fly', value: fmt(r.speedToFlyKt, 1) + ' kt  ·  sink ' + fmt(r.sinkAtStfFpm, 0) + ' ft/min  ·  L/D ' + fmt(r.glideRatioAtStf, 1) },
    { label: 'Still-air best glide (Mc = 0)', value: r.bestGlideKt == null ? '—' : (fmt(r.bestGlideKt, 1) + ' kt  ·  L/D ' + fmt(r.bestGlideRatio, 1)) },
    { label: 'Minimum sink', value: r.minSinkKt == null ? 'Not defined on this two-coefficient polar' : (fmt(r.minSinkKt, 1) + ' kt  at  ' + fmt(r.minSinkFpm, 0) + ' ft/min') },
    { label: 'MacCready setting', value: fmt(r.maccreadyKt, 2) + ' kt  ·  ' + fmt(r.maccreadyFpm, 0) + ' ft/min' }
  ];
  setHero(fmt(r.speedToFlyKt, 1) + ' kt', 'MacCready speed to fly');
  $('out').innerHTML = items.map(stat).join('');
}
$('calcBtn').addEventListener('click', run);
$('ex40').addEventListener('click', function () { $('v1').value = '20'; $('w1').value = '2'; $('v2').value = '40'; $('w2').value = '5'; $('v3').value = ''; $('w3').value = ''; $('mc').value = '3'; $('sinkUnit').value = 'kt'; $('speedUnit').value = 'kt'; run(); });
$('resetBtn').addEventListener('click', function () { $('v1').value = '20'; $('w1').value = '2'; $('v2').value = '40'; $('w2').value = '5'; $('v3').value = ''; $('w3').value = ''; $('mc').value = '3'; clearOut(); $('hero').hidden = true; });
['v1','w1','v2','w2','v3','w3','mc'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); }); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

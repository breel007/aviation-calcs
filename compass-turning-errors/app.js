(function () {
  "use strict";
  var C = window.CompassTurningErrorsCalcs;
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
  var r = CompassTurningErrorsCalcs.compute({ latitude: num('lat'), heading: opt('heading') });
  if (!r) { clearOut('Enter a latitude between −90 and 90, and an optional heading.'); return; }
  var items = [
    { label: 'Dipole dip (estimate)', value: fmt(r.dipDeg, 1) + '°' },
    { label: 'Hemisphere', value: r.hemisphere === 'equator' ? 'Magnetic equator (stand-in)' : (r.hemisphere === 'north' ? 'Northern' : 'Southern') },
    { label: 'Turning-error memory item', value: r.turnRule === 'none' ? 'None at the equator' : r.turnRule },
    { label: 'Acceleration-error memory item', value: r.accelerationRule === 'none' ? 'None at the equator' : r.accelerationRule }
  ];
  if (r.rollout) items.push({ label: 'Roll-out on this heading', value: r.rollout.action + ' — ' + r.rollout.reason });
  if (r.acceleration) items.push({ label: 'Acceleration error on this heading', value: r.acceleration.effect + ' — ' + r.acceleration.reason });
  setHero(fmt(r.dipDeg, 1) + '° dip', r.turnRule === 'none' ? 'no turning error at the equator' : r.turnRule + ' / ' + r.accelerationRule);
  $('out').innerHTML = items.map(stat).join('');
}
$('calcBtn').addEventListener('click', run);
$('exN').addEventListener('click', function () { $('lat').value = '40'; $('heading').value = '0'; run(); });
$('exS').addEventListener('click', function () { $('lat').value = '-40'; $('heading').value = '90'; run(); });
$('resetBtn').addEventListener('click', function () { $('lat').value = '40'; $('heading').value = '0'; clearOut(); $('hero').hidden = true; });
['lat','heading'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); }); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

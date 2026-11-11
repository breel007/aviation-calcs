(function () {
  "use strict";
  var C = window.RadioHorizonCalcs;
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
function numOpt(id) { var t = $(id).value.trim(); if (t === '') return undefined; var v = parseFloat(t); return isFinite(v) ? v : NaN; }
function run() {
  var r = RadioHorizonCalcs.compute({ height1: parseFloat($('h1').value), height2: numOpt('h2'), altUnit: $('hUnit').value });
  if (!r) { clearOut('Enter a height greater than zero, and an optional second height of zero or more.'); return; }
  var items = [
    { label: 'Radio horizon (k = 4/3)', value: fmt(r.radioNm, 1) + ' NM  ·  ' + fmt(r.radioKm, 1) + ' km' },
    { label: 'Geometric horizon (k = 1)', value: fmt(r.geometricNm, 1) + ' NM' },
    { label: '1.23 √h rule of thumb', value: fmt(r.rule123Nm, 1) + ' NM' }
  ];
  if (r.height2Ft > 0) {
    items.push({ label: 'Horizon from height 1 alone', value: fmt(r.radio1Nm, 1) + ' NM' });
    items.push({ label: 'Horizon from height 2 alone', value: fmt(r.radio2Nm, 1) + ' NM' });
  }
  setHero(fmt(r.radioNm, 1) + ' NM', 'radio line-of-sight');
  $('out').innerHTML = items.map(stat).join('');
}
$('calcBtn').addEventListener('click', run);
$('exAtc').addEventListener('click', function () { $('h1').value = '1000'; $('h2').value = '6000'; $('hUnit').value = 'ft'; run(); });
$('resetBtn').addEventListener('click', function () { $('h1').value = '1000'; $('h2').value = ''; $('hUnit').value = 'ft'; clearOut(); $('hero').hidden = true; });
['h1','h2'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); }); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

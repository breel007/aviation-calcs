(function () {
  "use strict";
  var C = window.WakeTurbulenceSeparationCalcs;
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
var LABELS = { super: 'Super', heavy: 'Heavy', b757: 'B757', large: 'Large', small: 'Small' };
function opt(id) { var t = $(id).value.trim(); if (t === '') return undefined; var v = parseFloat(t); return isFinite(v) ? v : NaN; }
function run() {
  var input = { leader: $('leader').value, follower: $('follower').value, scenario: $('scenario').value };
  var lw = opt('leaderWeight'), fw = opt('followerWeight');
  if (lw != null) { input.leader = ''; input.leaderWeightLb = lw; }
  if (fw != null) { input.follower = ''; input.followerWeightLb = fw; }
  var r = WakeTurbulenceSeparationCalcs.compute(input);
  if (!r) { clearOut('Pick a leading and following class, or enter positive takeoff weights, and a scenario.'); return; }
  var sep = r.minutes != null ? fmt(r.minutes, 0) + ' min' : (r.nm != null ? fmt(r.nm, 0) + ' NM' : 'No extra AIM 7-4-9 wake minimum');
  var items = [
    { label: 'Pair', value: LABELS[r.follower] + ' behind ' + LABELS[r.leader] },
    { label: 'AIM 7-4-9 minimum', value: sep },
    { label: 'Waivable by pilot request', value: r.waivable == null ? '—' : (r.waivable ? 'Yes, on a specific request (7-4-9 c)' : 'No — controllers may not reduce or waive this interval') },
    { label: 'Note', value: r.note }
  ];
  if (r.inferred) items.push({ label: 'Caution', value: 'This landing-threshold Super figure is inferred from the in-trail table; confirm with ATC.' });
  setHero(sep, 'AIM 7-4-9  ·  ' + LABELS[r.follower] + ' behind ' + LABELS[r.leader]);
  $('out').innerHTML = items.map(stat).join('');
}
$('calcBtn').addEventListener('click', run);
$('exDep').addEventListener('click', function () { $('leader').value = 'heavy'; $('follower').value = 'small'; $('scenario').value = 'same-threshold-departure'; $('leaderWeight').value = ''; $('followerWeight').value = ''; run(); });
$('exRadar').addEventListener('click', function () { $('leader').value = 'super'; $('follower').value = 'small'; $('scenario').value = 'radar-in-trail'; $('leaderWeight').value = ''; $('followerWeight').value = ''; run(); });
$('resetBtn').addEventListener('click', function () { $('leader').value = 'heavy'; $('follower').value = 'small'; $('scenario').value = 'same-threshold-departure'; $('leaderWeight').value = ''; $('followerWeight').value = ''; clearOut(); $('hero').hidden = true; });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

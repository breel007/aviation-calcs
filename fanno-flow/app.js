(function () {
  "use strict";
  var C = window.FannoFlowCalcs;
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
function run() {
  var r = FannoFlowCalcs.compute({ mach: num('mach'), gamma: num('gamma') });
  if (!r) { clearOut('Enter a Mach number greater than zero and a γ greater than 1 (and less than 2).'); return; }
  setHero('4fL*/D  ' + fmt(r.fourFLStarOverD, 4), 'M = ' + fmt(r.mach, 3));
  $('out').innerHTML = [
    { label: '4fL* / D to sonic', value: fmt(r.fourFLStarOverD, 4) },
    { label: 'T / T*', value: fmt(r.T_Tstar, 4) },
    { label: 'P / P*', value: fmt(r.P_Pstar, 4) },
    { label: 'ρ / ρ*', value: fmt(r.rho_rhostar, 4) },
    { label: 'P0 / P0*', value: fmt(r.P0_P0star, 4) }
  ].map(stat).join('');
}
$('calcBtn').addEventListener('click', run);
$('ex05').addEventListener('click', function () { $('mach').value = '0.5'; $('gamma').value = '1.4'; run(); });
$('resetBtn').addEventListener('click', function () { $('mach').value = '0.5'; $('gamma').value = '1.4'; clearOut(); $('hero').hidden = true; });
['mach','gamma'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); }); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

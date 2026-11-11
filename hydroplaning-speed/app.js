(function () {
  "use strict";
  var C = window.HydroplaningSpeedCalcs;
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
  var pu = "psi";
  bindSeg("pu", function (u) { pu = u; render(); });
  function render() {
    var r = C.compute({ pressure: $("pressure").value, pressureUnit: pu });
    if (!r) { clearOut("Enter a positive tire inflation pressure."); return; }
    $("warnings").hidden = true; $("warnings").innerHTML = "";
    setHero(fmt(r.rotatingKt, 1), "kt", fmt(r.rotatingMph, 1) + " mph · " + fmt(r.rotatingMps, 1) + " m/s");
    $("stat-grid").innerHTML =
      stat("Locked-wheel speed", fmt(r.lockedKt, 1) + " kt", fmt(r.lockedMph, 1) + " mph · 7.7√P") +
      stat("Pressure", fmt(r.pressurePsi, 1) + " psi", fmt(r.pressureBar, 2) + " bar · " + fmt(r.pressureKpa, 0) + " kPa") +
      stat("Difference", fmt(r.deltaKt, 1) + " kt", "rotating minus locked");
  }
  $("btn-ga").addEventListener("click", function () { $("pressure").value = "32"; pu = "psi"; setSeg("pu", "psi"); render(); });
  $("btn-jet").addEventListener("click", function () { $("pressure").value = "200"; pu = "psi"; setSeg("pu", "psi"); render(); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

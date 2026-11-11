(function () {
  "use strict";
  var C = window.SpecificImpulseCalcs;
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
  var veu = "m/s", fu = "N", mu = "kg/s";
  bindSeg("veu", function (u) { veu = u; render(); });
  bindSeg("fu", function (u) { fu = u; render(); });
  bindSeg("mu", function (u) { mu = u; render(); });
  function render() {
    var r = C.compute({ Isp: $("Isp").value, ve: $("ve").value, veUnit: veu, thrust: $("thrust").value, thrustUnit: fu, mdot: $("mdot").value, mdotUnit: mu, massRatio: $("mr").value });
    if (!r) { clearOut("Enter a positive Isp or exhaust velocity, or enough of thrust and mass flow to infer them. If both Isp and ve are entered they must agree."); return; }
    $("warnings").hidden = true; $("warnings").innerHTML = "";
    setHero(fmt(r.Isp, 1), "s", "ve " + fmt(r.veMps, 0) + " m/s · " + fmt(r.veKmS, 3) + " km/s");
    var bits =
      stat("Exhaust velocity", fmt(r.veMps, 0) + " m/s", fmt(r.veFps, 0) + " ft/s");
    if (r.thrustN != null) bits += stat("Thrust", fmt(r.thrustN, 0) + " N", fmt(r.thrustLbf, 1) + " lbf");
    if (r.mdotKgS != null) bits += stat("Mass flow", fmt(r.mdotKgS, 3) + " kg/s", fmt(r.mdotLbS, 3) + " lbm/s · " + fmt(r.weightFlowLbfS, 3) + " lbf/s");
    if (r.deltaVMps != null) bits += stat("Ideal Δv", fmt(r.deltaVMps, 0) + " m/s", fmt(r.deltaVKmS, 3) + " km/s · mass ratio " + fmt(r.massRatio, 3));
    $("stat-grid").innerHTML = bits;
  }
  $("btn-ex").addEventListener("click", function () {
    $("Isp").value = "300"; $("ve").value = ""; $("thrust").value = "10000"; $("mdot").value = ""; $("mr").value = "";
    fu = "N"; mu = "kg/s"; setSeg("fu", fu); setSeg("mu", mu); render();
  });
  $("btn-us").addEventListener("click", function () {
    $("Isp").value = ""; $("ve").value = ""; $("thrust").value = "1"; $("mdot").value = "1"; $("mr").value = "";
    fu = "lbf"; mu = "lbf/s"; setSeg("fu", fu); setSeg("mu", mu); render();
  });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

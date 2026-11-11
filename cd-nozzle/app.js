(function () {
  "use strict";
  var C = window.CdNozzleCalcs;
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
  var mode = "area";
  bindSeg("mode", function (u) { mode = u; show(); render(); });
  function show() { $("block-area").hidden = mode !== "area"; $("block-mach").hidden = mode !== "mach"; }
  $("btn-ex1").addEventListener("click", function () {
    mode = "mach"; $("mach").value = 2; $("gamma").value = 1.4; $("p0").value = ""; $("pa").value = ""; $("At").value = "";
    var r0 = C.compute({ mode: "mach", mach: 2, gamma: 1.4 });
    $("pa_p0").value = r0 ? r0.pe_p0 : "";
    document.querySelectorAll('[data-unit-group="mode"]').forEach(function (b) { var on = b.getAttribute("data-unit") === "mach"; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    show(); render();
  });
  $("btn-ex2").addEventListener("click", function () {
    mode = "area"; $("areaRatio").value = 1; $("gamma").value = 1.4; $("p0").value = ""; $("pa").value = ""; $("pa_p0").value = ""; $("At").value = "";
    document.querySelectorAll('[data-unit-group="mode"]').forEach(function (b) { var on = b.getAttribute("data-unit") === "area"; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    show(); render();
  });
  function render() {
    var r = C.compute({ mode: mode, areaRatio: $("areaRatio").value, mach: $("mach").value, gamma: $("gamma").value, p0: $("p0").value, pa: $("pa").value, pa_p0: $("pa_p0").value, At: $("At").value });
    if (!r) { clearOut("Enter an area ratio of 1 or more, or a design exit Mach of 1 or more, and a γ greater than 1. Pressures and throat area, if used, must be positive."); return; }
    var warn = "";
    if (r.regime === "overexpanded") warn = "The nozzle is overexpanded (pa > pe). A strong enough overexpansion can produce shocks or separation in the diverging section that this ideal isentropic model does not include.";
    $("warnings").hidden = !warn; $("warnings").innerHTML = warn ? "<p>" + warn + "</p>" : "";
    setHero(fmt(r.exitMach, 3), "Me", "supersonic exit · Ae/At = " + fmt(r.areaRatio, 4));
    var html = stat("Area ratio Ae/At", fmt(r.areaRatio, 4), "subsonic root Me = " + fmt(r.subsonicMach, 3) + " (converging duct)") +
      stat("pe / p0", fmt(r.pe_p0, 5), "Te/T0 = " + fmt(r.Te_T0, 4) + " · γ = " + fmt(r.gamma, 3)) +
      stat("Ideal Cf (momentum)", fmt(r.CfMomentum, 4), "vacuum Cf = " + fmt(r.CfVacuum, 4));
    if (r.Cf != null) html += stat("Cf at this pa", fmt(r.Cf, 4), r.regime + (r.pa_p0 != null ? " · pa/p0 = " + fmt(r.pa_p0, 5) : ""));
    if (r.pe != null) html += stat("Exit pressure pe", fmt(r.pe, 4), "same unit as p0");
    if (r.thrust != null) html += stat("Thrust F", fmt(r.thrust, 3), "Cf × p0 × At · vacuum thrust " + fmt(r.thrustVacuum, 3));
    $("stat-grid").innerHTML = html;
  }
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

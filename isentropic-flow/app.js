(function () {
  "use strict";
  var C = window.IsentropicFlowCalcs;
  if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var mode = "mach", branch = "supersonic";
  var labels = { mach: "Mach number", T_T0: "T / T0 (static / stagnation)", P_P0: "P / P0", rho_rho0: "ρ / ρ0", A_Astar: "A / A*" };
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
  function fmt(n, d) {
    if (!isFinite(n)) return "—";
    return n.toLocaleString("en-US", { maximumFractionDigits: d == null ? 5 : d });
  }
  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value +
      "</p>" + (sub ? '<p class="stat-sub">' + sub + "</p>" : "") + "</div>";
  }
  bindSeg("mode", function (u) {
    mode = u;
    $("value-label").textContent = labels[u];
    $("branch-row").hidden = u !== "A_Astar";
    render();
  });
  bindSeg("branch", function (u) { branch = u; render(); });
  function render() {
    var r = C.compute({
      mode: mode, value: $("value").value, gamma: $("gamma").value, branch: branch,
      staticTempK: $("Ts").value, staticPressurePa: $("Ps").value
    });
    var warnings = $("warnings");
    if (!r) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>Enter a valid Mach number (≥ 0), a ratio in (0, 1] for T/T0, P/P0, or ρ/ρ0, or an A/A* ≥ 1, and a γ greater than 1.</p>";
      $("out-hero").innerHTML = '<span class="num">—</span> <span class="unit"></span>';
      $("out-sub").textContent = ""; $("stat-grid").innerHTML = "";
      return;
    }
    warnings.hidden = true;
    $("out-hero").innerHTML = '<span class="num">' + fmt(r.mach, 4) + '</span> <span class="unit"></span>';
    $("out-sub").textContent = r.branch + (r.otherMach != null ? " · other root M = " + fmt(r.otherMach, 4) : "");
    $("stat-grid").innerHTML =
      stat("T / T0", fmt(r.T_T0, 5), "T0 / T = " + fmt(r.T0_T, 5)) +
      stat("P / P0", fmt(r.P_P0, 5), "P0 / P = " + fmt(r.P0_P, 5)) +
      stat("ρ / ρ0", fmt(r.rho_rho0, 5), "ρ0 / ρ = " + fmt(r.rho0_rho, 5)) +
      stat("A / A*", isFinite(r.A_Astar) ? fmt(r.A_Astar, 5) : "∞", "M* = " + fmt(r.Mstar, 5)) +
      stat("T / T*", fmt(r.T_Tstar, 5), "P / P* = " + fmt(r.P_Pstar, 5) + " · ρ / ρ* = " + fmt(r.rho_rhostar, 5)) +
      (r.stagnationTempK != null || r.stagnationPressurePa != null
        ? stat("Stagnation state", r.stagnationTempK != null ? fmt(r.stagnationTempK, 2) + " K" : "—",
            r.stagnationPressurePa != null ? fmt(r.stagnationPressurePa, 1) + " Pa" : "")
        : "");
  }
  $("btn-m1").addEventListener("click", function () { $("value").value = "1"; mode = "mach"; $("value-label").textContent = labels.mach; $("branch-row").hidden = true; render(); });
  $("btn-m2").addEventListener("click", function () { $("value").value = "2"; mode = "mach"; $("value-label").textContent = labels.mach; $("branch-row").hidden = true; render(); });
  $("calc-form").addEventListener("input", render);
  $("calc-form").addEventListener("change", render);
  render();
})();

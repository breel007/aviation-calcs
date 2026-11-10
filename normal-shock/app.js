(function () {
  "use strict";
  var C = window.NormalShockCalcs;
  if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var mode = "M1";
  var labels = { M1: "Upstream Mach number M1", P2_P1: "Static pressure ratio P2/P1", rho2_rho1: "Density ratio ρ2/ρ1" };
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
  bindSeg("mode", function (u) { mode = u; $("value-label").textContent = labels[u]; render(); });
  function render() {
    var r = C.compute({ mode: mode, value: $("value").value, gamma: $("gamma").value, staticTempK: $("T1").value, staticPressurePa: $("P1").value });
    var warnings = $("warnings");
    if (!r) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>A normal shock requires M1 ≥ 1 (or P2/P1 ≥ 1, or a density ratio between 1 and the strong-shock limit (γ+1)/(γ−1)).</p>";
      $("out-hero").innerHTML = '<span class="num">—</span> <span class="unit"></span>';
      $("out-sub").textContent = ""; $("stat-grid").innerHTML = "";
      return;
    }
    warnings.hidden = true;
    $("out-hero").innerHTML = '<span class="num">' + fmt(r.M2, 5) + '</span> <span class="unit"></span>';
    $("out-sub").textContent = "upstream M1 = " + fmt(r.M1, 5);
    $("stat-grid").innerHTML =
      stat("P2 / P1", fmt(r.P2_P1, 5), r.P2Pa != null ? "P2 = " + fmt(r.P2Pa, 1) + " Pa" : "") +
      stat("T2 / T1", fmt(r.T2_T1, 5), r.T2K != null ? "T2 = " + fmt(r.T2K, 2) + " K" : "") +
      stat("ρ2 / ρ1", fmt(r.rho2_rho1, 5), "") +
      stat("P02 / P01", fmt(r.P02_P01, 5), "total-pressure ratio (loss)") +
      stat("P02 / P1 (Rayleigh pitot)", fmt(r.P02_P1, 5), "supersonic pitot pressure") +
      stat("T0 ratio", "T02 / T01 = 1", r.T0K != null ? "T0 = " + fmt(r.T0K, 2) + " K" : "stagnation temperature is continuous");
  }
  $("btn-m2").addEventListener("click", function () { $("value").value = "2"; render(); });
  $("btn-m3").addEventListener("click", function () { $("value").value = "3"; render(); });
  $("calc-form").addEventListener("input", render);
  $("calc-form").addEventListener("change", render);
  render();
})();

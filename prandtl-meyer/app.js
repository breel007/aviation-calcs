(function () {
  "use strict";
  var C = window.PrandtlMeyerCalcs;
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
  var mode = "expand";
  bindSeg("mode", function (u) { mode = u; show(); render(); });
  function show() { $("block-th").hidden = mode !== "expand"; $("m1-label").innerHTML = mode === "nu" ? "Mach, M" : "Upstream Mach, M<sub>1</sub>"; }
  function render() {
    var r = C.compute({ mode: mode, M1: $("M1").value, M: $("M1").value, theta: $("theta").value, gamma: $("gamma").value });
    if (!r) { clearOut("Enter a Mach number of 1 or more, a non-negative turning angle, and a γ between 1 and 3."); return; }
    if (r.vacuum) {
      clearOut("The requested turn would push ν past ν_max = " + fmt(r.nuMaxDeg, 2) + "° (remaining from this M1 is " + fmt(r.nuMaxDeg - r.nu1Deg, 2) + "°). The flow cannot expand that far.");
      return;
    }
    $("warnings").hidden = true; $("warnings").innerHTML = "";
    if (mode === "nu") {
      setHero(fmt(r.nuDeg, 3), "°", "ν(M) at M = " + fmt(r.M, 3) + " · ν_max " + fmt(r.nuMaxDeg, 2) + "°");
      $("stat-grid").innerHTML =
        stat("ν(M)", fmt(r.nuDeg, 3) + "°", fmt(r.nuRad, 5) + " rad") +
        stat("Remaining to ν_max", fmt(r.nuMaxDeg - r.nuDeg, 2) + "°", "ν_max " + fmt(r.nuMaxDeg, 2) + "°") +
        stat("Isentropic P0/P", fmt(r.isentropic.P0_P, 3), "T0/T " + fmt(r.isentropic.T0_T, 3) + " · ρ0/ρ " + fmt(r.isentropic.rho0_rho, 3));
      return;
    }
    setHero(fmt(r.M2, 3), "M2", "from M1 " + fmt(r.M1, 3) + " through " + fmt(r.thetaDeg, 2) + "°");
    $("stat-grid").innerHTML =
      stat("ν1 → ν2", fmt(r.nu1Deg, 3) + "° → " + fmt(r.nu2Deg, 3) + "°", "remaining " + fmt(r.remainingDeg, 2) + "° of " + fmt(r.nuMaxDeg, 2) + "° max") +
      stat("P2 / P1", fmt(r.P2_P1, 4), "isentropic; P02/P01 = 1") +
      stat("T2 / T1", fmt(r.T2_T1, 4), "ρ2/ρ1 " + fmt(r.rho2_rho1, 4));
  }
  $("btn-ex").addEventListener("click", function () { mode = "expand"; $("M1").value = "2"; $("theta").value = "10"; $("gamma").value = "1.4"; setSeg("mode", mode); show(); render(); });
  $("btn-nu").addEventListener("click", function () { mode = "nu"; $("M1").value = "2"; $("gamma").value = "1.4"; setSeg("mode", mode); show(); render(); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

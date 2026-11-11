(function () {
  "use strict";
  var C = window.ObliqueShockCalcs;
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
  var mode = "theta";
  bindSeg("mode", function (u) { mode = u; show(); render(); });
  function show() { $("block-th").hidden = mode !== "theta"; $("block-be").hidden = mode !== "beta"; }
  function branchStats(label, s) {
    if (!s) return "";
    return stat(label, "β " + fmt(s.betaDeg, 2) + "°", "M2 " + fmt(s.M2, 3) + " · P2/P1 " + fmt(s.P2_P1, 3) + " · P02/P01 " + fmt(s.P02_P01, 3));
  }
  function render() {
    var r = C.compute({ mode: mode, M1: $("M1").value, gamma: $("gamma").value, theta: $("theta").value, beta: $("beta").value });
    if (!r) { clearOut("Enter an upstream Mach greater than 1 and a turning or wave angle. γ must be between 1 and 3."); return; }
    if (r.detached) {
      clearOut("The turning angle is above θ_max = " + fmt(r.thetaMaxDeg, 2) + "° at this Mach, so an attached oblique shock cannot exist (detached / bow shock).");
      setHero("detached", "", "θ_max " + fmt(r.thetaMaxDeg, 2) + "° · Mach angle " + fmt(r.machAngleDeg, 2) + "°");
      return;
    }
    $("warnings").hidden = true; $("warnings").innerHTML = "";
    var w = r.weak || r.chosen, s = r.strong;
    if (mode === "beta" && r.chosen) {
      setHero(fmt(r.chosen.thetaDeg, 2), "° turn", r.branch + " · β " + fmt(r.chosen.betaDeg, 2) + "° · M2 " + fmt(r.chosen.M2, 3));
    } else if (w) {
      setHero(fmt(w.betaDeg, 2), "° weak β", "M2 " + fmt(w.M2, 3) + (s ? " · strong β " + fmt(s.betaDeg, 2) + "°" : ""));
    }
    var bits = stat("Mach angle μ", fmt(r.machAngleDeg, 2) + "°", "θ_max " + fmt(r.thetaMaxDeg, 2) + "° at β " + fmt(r.betaAtThetaMaxDeg, 2) + "°");
    bits += branchStats("Weak shock", r.weak);
    bits += branchStats("Strong shock", r.strong);
    if (mode === "beta" && r.chosen && !r.weak && !r.strong) bits += branchStats("Solution", r.chosen);
    if (r.chosen) bits += stat("Normal component", "Mn1 " + fmt(r.chosen.Mn1, 3), "Mn2 " + fmt(r.chosen.Mn2, 3) + " · T2/T1 " + fmt(r.chosen.T2_T1, 3) + " · ρ2/ρ1 " + fmt(r.chosen.rho2_rho1, 3));
    $("stat-grid").innerHTML = bits;
  }
  $("btn-ex").addEventListener("click", function () { mode = "theta"; $("M1").value = "2"; $("theta").value = "10"; $("gamma").value = "1.4"; setSeg("mode", mode); show(); render(); });
  $("btn-n").addEventListener("click", function () { mode = "theta"; $("M1").value = "2"; $("theta").value = "0"; $("gamma").value = "1.4"; setSeg("mode", mode); show(); render(); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

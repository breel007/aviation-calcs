/**
 * One-dimensional isentropic flow in a convergent-divergent nozzle:
 * exit Mach from the area ratio, exit-to-chamber pressure, the ideal
 * thrust coefficient, and over- / perfectly / under-expanded status
 * against a back pressure.
 *
 *   Ae/At = (1/Me) [ (2/(γ+1)) (1 + ((γ−1)/2) Me²) ]^{(γ+1)/(2(γ−1))}
 *   pe/p0 = [ 1 + ((γ−1)/2) Me² ]^{−γ/(γ−1)}
 *
 * Ideal thrust coefficient (Sutton / NASA 1-D, no losses):
 *
 *   Cf = √{ (2γ²/(γ−1)) (2/(γ+1))^{(γ+1)/(γ−1)} [1 − (pe/p0)^{(γ−1)/γ}] }
 *        + ((pe − pa)/p0) (Ae/At)
 *
 *   F  = Cf × p0 × At
 *
 * pe > pa is underexpanded, pe < pa overexpanded, pe = pa perfectly
 * expanded. This page does not model shocks in the diverging section,
 * flow separation, or a discharge coefficient — use it as an ideal
 * design estimate, and use the isentropic-flow calculator for the
 * underlying ratios at a chosen Mach.
 *
 * Sources: NACA Report 1135 (isentropic-flow tables); NASA Glenn
 * Beginner's Guide (nozzles, area-Mach); Sutton and Biblarz, Rocket
 * Propulsion Elements (thrust coefficient); Anderson, Modern
 * Compressible Flow.
 */
(function (root) {
  "use strict";

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function ratiosFromMach(M, gamma) {
    if (!isFiniteNumber(M) || M < 0) return null;
    if (!isFiniteNumber(gamma) || gamma <= 1) return null;
    var gm1 = gamma - 1, gp1 = gamma + 1;
    var tt = 1 + 0.5 * gm1 * M * M;
    var P_P0 = Math.pow(tt, -gamma / gm1);
    var T_T0 = 1 / tt;
    var A_Astar;
    if (M === 0) A_Astar = Infinity;
    else A_Astar = (1 / M) * Math.pow((2 / gp1) * tt, gp1 / (2 * gm1));
    return { mach: M, gamma: gamma, T_T0: T_T0, P_P0: P_P0, A_Astar: A_Astar, T0_T: tt };
  }

  function machFromAreaRatio(A_Astar, gamma, branch) {
    if (!isFiniteNumber(A_Astar) || A_Astar < 1) return null;
    if (Math.abs(A_Astar - 1) < 1e-14) return 1;
    var lo, hi;
    if (branch === "supersonic") {
      lo = 1; hi = 1;
      var guess = ratiosFromMach(hi, gamma), guard = 0;
      while (guess && guess.A_Astar < A_Astar && hi < 100 && guard < 60) {
        hi *= 1.5;
        guess = ratiosFromMach(hi, gamma);
        guard += 1;
      }
      if (!guess || guess.A_Astar < A_Astar) return null;
    } else {
      lo = 1e-8; hi = 1;
    }
    for (var i = 0; i < 80; i++) {
      var mid = 0.5 * (lo + hi);
      var r = ratiosFromMach(mid, gamma);
      if (!r) return null;
      if (branch === "supersonic") {
        if (r.A_Astar < A_Astar) lo = mid;
        else hi = mid;
      } else {
        if (r.A_Astar > A_Astar) lo = mid;
        else hi = mid;
      }
    }
    return 0.5 * (lo + hi);
  }

  function idealMomentumCf(pe_p0, gamma) {
    var gm1 = gamma - 1, gp1 = gamma + 1;
    var term = (2 * gamma * gamma / gm1) *
      Math.pow(2 / gp1, gp1 / gm1) *
      (1 - Math.pow(pe_p0, gm1 / gamma));
    return Math.sqrt(term);
  }

  function compute(input) {
    if (!input) return null;
    var gamma = input.gamma == null || input.gamma === "" ? 1.4 : Number(input.gamma);
    if (!isFiniteNumber(gamma) || gamma <= 1) return null;

    var mode = input.mode || "area";
    var Me, Ae_At, ratios;
    if (mode === "mach") {
      Me = Number(input.mach);
      if (!isFiniteNumber(Me) || Me < 1) return null;
      ratios = ratiosFromMach(Me, gamma);
      if (!ratios) return null;
      Ae_At = ratios.A_Astar;
    } else {
      Ae_At = Number(input.areaRatio);
      if (!isFiniteNumber(Ae_At) || Ae_At < 1) return null;
      Me = machFromAreaRatio(Ae_At, gamma, "supersonic");
      if (Me == null) return null;
      ratios = ratiosFromMach(Me, gamma);
    }
    var pe_p0 = ratios.P_P0;
    var Te_T0 = ratios.T_T0;
    var Ms = machFromAreaRatio(Ae_At, gamma, "subsonic");

    var p0 = null, pa = null, pa_p0 = null, pe = null;
    if (input.p0 != null && input.p0 !== "") {
      p0 = Number(input.p0);
      if (!isFiniteNumber(p0) || p0 <= 0) return null;
      pe = pe_p0 * p0;
    }
    if (input.pa != null && input.pa !== "") {
      pa = Number(input.pa);
      if (!isFiniteNumber(pa) || pa < 0) return null;
    }
    if (p0 != null && pa != null) pa_p0 = pa / p0;
    else if (input.pa_p0 != null && input.pa_p0 !== "") {
      pa_p0 = Number(input.pa_p0);
      if (!isFiniteNumber(pa_p0) || pa_p0 < 0) return null;
    }

    var CfMom = idealMomentumCf(pe_p0, gamma);
    var CfVac = CfMom + pe_p0 * Ae_At;
    var Cf = null, regime = null;
    if (pa_p0 != null) {
      Cf = CfMom + (pe_p0 - pa_p0) * Ae_At;
      var rel = pe_p0 - pa_p0;
      if (Math.abs(rel) < 1e-8) regime = "perfectly expanded";
      else if (rel > 0) regime = "underexpanded";
      else regime = "overexpanded";
    }

    var At = null, F = null, Fvac = null;
    if (input.At != null && input.At !== "" && p0 != null) {
      At = Number(input.At);
      if (!isFiniteNumber(At) || At <= 0) return null;
      if (Cf != null) F = Cf * p0 * At;
      Fvac = CfVac * p0 * At;
    }

    return {
      gamma: gamma,
      mode: mode,
      exitMach: Me,
      subsonicMach: Ms,
      areaRatio: Ae_At,
      pe_p0: pe_p0,
      Te_T0: Te_T0,
      p0: p0,
      pa: pa,
      pe: pe,
      pa_p0: pa_p0,
      CfMomentum: CfMom,
      CfVacuum: CfVac,
      Cf: Cf,
      regime: regime,
      At: At,
      thrust: F,
      thrustVacuum: Fvac
    };
  }

  var api = {
    ratiosFromMach: ratiosFromMach,
    machFromAreaRatio: machFromAreaRatio,
    idealMomentumCf: idealMomentumCf,
    compute: compute
  };
  root.CdNozzleCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

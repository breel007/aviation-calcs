/**
 * One-dimensional isentropic flow of a perfect gas (default γ = 1.4).
 *
 *   T0/T = 1 + ((γ−1)/2) M²
 *   P0/P = (T0/T)^{γ/(γ−1)}
 *   ρ0/ρ = (T0/T)^{1/(γ−1)}
 *   A/A* = (1/M) [ (2/(γ+1)) (1 + ((γ−1)/2) M²) ]^{(γ+1)/(2(γ−1))}
 *   M*²  = ((γ+1)/2 M²) / (1 + ((γ−1)/2) M²)
 *
 * The same identities invert: any of M, T/T0, P/P0, ρ/ρ0, or A/A*
 * (two Mach numbers when A/A* > 1) determines the rest.
 *
 * Stagnation (total) temperature, pressure, and density are T0, P0, ρ0.
 *
 * Sources: NACA Report 1135, Equations of Motion and Isentropic-Flow Tables
 * (γ = 1.4); NASA Glenn Beginner's Guide; Anderson, Modern Compressible Flow.
 */
(function (root) {
  "use strict";

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function ratiosFromMach(M, gamma) {
    if (!isFiniteNumber(M) || M < 0) return null;
    if (!isFiniteNumber(gamma) || gamma <= 1) return null;
    var gm1 = gamma - 1;
    var gp1 = gamma + 1;
    var tt = 1 + 0.5 * gm1 * M * M; // T0/T
    var T_T0 = 1 / tt;
    var P_P0 = Math.pow(tt, -gamma / gm1);
    var rho_rho0 = Math.pow(tt, -1 / gm1);
    var A_Astar;
    if (M === 0) {
      A_Astar = Infinity;
    } else {
      var inner = (2 / gp1) * tt;
      A_Astar = (1 / M) * Math.pow(inner, gp1 / (2 * gm1));
    }
    var Mstar = Math.sqrt((gp1 / 2 * M * M) / tt);
    // Sonic (critical) static / stagnation ratios: M = 1
    var Tstar_T0 = 1 / (1 + 0.5 * gm1);
    var Pstar_P0 = Math.pow(1 + 0.5 * gm1, -gamma / gm1);
    var rhostar_rho0 = Math.pow(1 + 0.5 * gm1, -1 / gm1);
    return {
      mach: M,
      gamma: gamma,
      T_T0: T_T0,
      P_P0: P_P0,
      rho_rho0: rho_rho0,
      T0_T: tt,
      P0_P: 1 / P_P0,
      rho0_rho: 1 / rho_rho0,
      A_Astar: A_Astar,
      Mstar: Mstar,
      T_Tstar: T_T0 / Tstar_T0,
      P_Pstar: P_P0 / Pstar_P0,
      rho_rhostar: rho_rho0 / rhostar_rho0,
      Tstar_T0: Tstar_T0,
      Pstar_P0: Pstar_P0,
      rhostar_rho0: rhostar_rho0
    };
  }

  function machFromT0Ratio(T0_T, gamma) {
    var gm1 = gamma - 1;
    if (!(T0_T >= 1)) return null;
    return Math.sqrt((2 / gm1) * (T0_T - 1));
  }

  function machFromP0Ratio(P0_P, gamma) {
    if (!(P0_P >= 1)) return null;
    var T0_T = Math.pow(P0_P, (gamma - 1) / gamma);
    return machFromT0Ratio(T0_T, gamma);
  }

  function machFromRho0Ratio(rho0_rho, gamma) {
    if (!(rho0_rho >= 1)) return null;
    var T0_T = Math.pow(rho0_rho, gamma - 1);
    return machFromT0Ratio(T0_T, gamma);
  }

  /**
   * Invert A/A* for Mach. For A/A* > 1 there is a subsonic and a
   * supersonic root. `branch` is "subsonic" | "supersonic".
   */
  function machFromAreaRatio(A_Astar, gamma, branch) {
    if (!isFiniteNumber(A_Astar) || A_Astar < 1) return null;
    if (Math.abs(A_Astar - 1) < 1e-14) return 1;
    var lo, hi;
    if (branch === "supersonic") {
      lo = 1;
      hi = 1;
      var guess = ratiosFromMach(hi, gamma);
      var guard = 0;
      while (guess && guess.A_Astar < A_Astar && hi < 100 && guard < 60) {
        hi *= 1.5;
        guess = ratiosFromMach(hi, gamma);
        guard += 1;
      }
      if (!guess || guess.A_Astar < A_Astar) return null;
    } else {
      lo = 1e-8;
      hi = 1;
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

  /**
   * input.mode: "mach" | "T0_T" | "T_T0" | "P0_P" | "P_P0" | "rho0_rho" | "rho_rho0" | "A_Astar"
   * input.value, input.gamma (default 1.4)
   * input.branch: "subsonic" | "supersonic" for A/A*
   * Optional static / stagnation pair: input.staticTempK, input.staticPressurePa, input.staticDensity
   *   to also report the total conditions.
   */
  function compute(input) {
    if (!input) return null;
    var gamma = input.gamma == null || input.gamma === "" ? 1.4 : Number(input.gamma);
    if (!isFiniteNumber(gamma) || gamma <= 1 || gamma >= 3) return null;
    var mode = input.mode || "mach";
    var value = Number(input.value);
    if (!isFiniteNumber(value)) return null;
    var M = null;
    var branch = input.branch === "supersonic" ? "supersonic" : "subsonic";
    if (mode === "mach") {
      if (value < 0) return null;
      M = value;
    } else if (mode === "T0_T") {
      M = machFromT0Ratio(value, gamma);
    } else if (mode === "T_T0") {
      if (!(value > 0) || value > 1) return null;
      M = machFromT0Ratio(1 / value, gamma);
    } else if (mode === "P0_P") {
      M = machFromP0Ratio(value, gamma);
    } else if (mode === "P_P0") {
      if (!(value > 0) || value > 1) return null;
      M = machFromP0Ratio(1 / value, gamma);
    } else if (mode === "rho0_rho") {
      M = machFromRho0Ratio(value, gamma);
    } else if (mode === "rho_rho0") {
      if (!(value > 0) || value > 1) return null;
      M = machFromRho0Ratio(1 / value, gamma);
    } else if (mode === "A_Astar") {
      M = machFromAreaRatio(value, gamma, branch);
    } else {
      return null;
    }
    if (!isFiniteNumber(M)) return null;
    var r = ratiosFromMach(M, gamma);
    if (!r) return null;

    // Optional dimensional stagnation from a static state
    var Ts = input.staticTempK == null || input.staticTempK === "" ? null : Number(input.staticTempK);
    var Ps = input.staticPressurePa == null || input.staticPressurePa === "" ? null : Number(input.staticPressurePa);
    var rhos = input.staticDensity == null || input.staticDensity === "" ? null : Number(input.staticDensity);
    r.stagnationTempK = isFiniteNumber(Ts) && Ts > 0 ? Ts * r.T0_T : null;
    r.stagnationPressurePa = isFiniteNumber(Ps) && Ps > 0 ? Ps * r.P0_P : null;
    r.stagnationDensity = isFiniteNumber(rhos) && rhos > 0 ? rhos * r.rho0_rho : null;
    r.branch = M > 1 ? "supersonic" : (M === 1 ? "sonic" : "subsonic");
    if (mode === "A_Astar" && r.A_Astar > 1) {
      var other = machFromAreaRatio(r.A_Astar, gamma, branch === "supersonic" ? "subsonic" : "supersonic");
      r.otherMach = other;
    } else {
      r.otherMach = null;
    }
    return r;
  }

  var api = {
    ratiosFromMach: ratiosFromMach,
    machFromT0Ratio: machFromT0Ratio,
    machFromP0Ratio: machFromP0Ratio,
    machFromRho0Ratio: machFromRho0Ratio,
    machFromAreaRatio: machFromAreaRatio,
    compute: compute
  };

  root.IsentropicFlowCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

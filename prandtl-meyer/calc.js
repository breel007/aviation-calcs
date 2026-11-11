/**
 * Prandtl–Meyer expansion for a perfect gas (default γ = 1.4).
 *
 *   ν(M) = √((γ+1)/(γ−1)) arctan √(((γ−1)/(γ+1))(M²−1)) − arctan √(M²−1)
 *
 * An expansion through a turning angle θ (convex corner, or a centered
 * fan) raises Mach:  ν(M2) = ν(M1) + θ. The flow is isentropic, so
 * total pressure and total temperature are constant; static ratios
 * follow the isentropic identities
 *
 *   T0/T = 1 + ((γ−1)/2) M²
 *   P0/P = (T0/T)^{γ/(γ−1)}
 *   ρ0/ρ = (T0/T)^{1/(γ−1)}
 *
 * The maximum turning from M = 1 to M → ∞ is
 *   ν_max = (π/2) (√((γ+1)/(γ−1)) − 1)   (= 130.45° for γ = 1.4).
 *
 * Sources: NACA Report 1135 (Prandtl–Meyer function); NASA Glenn;
 * Anderson, Modern Compressible Flow. Isentropic ratios match this
 * site's isentropic-flow calculator.
 */
(function (root) {
  "use strict";

  var DEG = Math.PI / 180;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function nu(M, gamma) {
    if (!isFiniteNumber(M) || M < 1 || !isFiniteNumber(gamma) || gamma <= 1) return NaN;
    if (M === 1) return 0;
    var gm1 = gamma - 1;
    var gp1 = gamma + 1;
    var k = Math.sqrt(gp1 / gm1);
    var rad = Math.sqrt(M * M - 1);
    return k * Math.atan(Math.sqrt(gm1 / gp1) * rad) - Math.atan(rad);
  }

  function nuMax(gamma) {
    return 0.5 * Math.PI * (Math.sqrt((gamma + 1) / (gamma - 1)) - 1);
  }

  /**
   * Invert ν(M) = nuTarget (radians) by bisection. M ≥ 1.
   */
  function machFromNu(nuTarget, gamma) {
    if (!isFiniteNumber(nuTarget) || nuTarget < 0) return NaN;
    var vmax = nuMax(gamma);
    if (nuTarget > vmax + 1e-12) return NaN;
    if (nuTarget <= 1e-16) return 1;
    var lo = 1, hi = 1e4, i, mid, nMid;
    // Grow hi if needed (should not for physical ν).
    while (nu(hi, gamma) < nuTarget && hi < 1e7) hi *= 2;
    for (i = 0; i < 80; i += 1) {
      mid = 0.5 * (lo + hi);
      nMid = nu(mid, gamma);
      if (Math.abs(nMid - nuTarget) < 1e-15 || hi - lo < 1e-14) return mid;
      if (nMid < nuTarget) lo = mid;
      else hi = mid;
    }
    return mid;
  }

  function isentropic(M, gamma) {
    var gm1 = gamma - 1;
    var T0_T = 1 + 0.5 * gm1 * M * M;
    var P0_P = Math.pow(T0_T, gamma / gm1);
    var rho0_rho = Math.pow(T0_T, 1 / gm1);
    return { T0_T: T0_T, P0_P: P0_P, rho0_rho: rho0_rho };
  }

  function compute(input) {
    if (!input) return null;
    var gamma = input.gamma == null || input.gamma === "" ? 1.4 : Number(input.gamma);
    if (!isFiniteNumber(gamma) || gamma <= 1 || gamma >= 3) return null;
    var mode = input.mode || "expand";
    var vmax = nuMax(gamma);

    if (mode === "nu") {
      var M = Number(input.M);
      if (!isFiniteNumber(M) || M < 1) return null;
      var n = nu(M, gamma);
      return {
        mode: mode,
        gamma: gamma,
        M: M,
        nuRad: n,
        nuDeg: n / DEG,
        nuMaxDeg: vmax / DEG,
        isentropic: isentropic(M, gamma)
      };
    }

    var M1 = Number(input.M1);
    if (!isFiniteNumber(M1) || M1 < 1) return null;
    var thetaDeg = Number(input.theta);
    if (!isFiniteNumber(thetaDeg) || thetaDeg < 0) return null;
    var nu1 = nu(M1, gamma);
    var nu2 = nu1 + thetaDeg * DEG;
    if (nu2 > vmax + 1e-12) {
      return {
        mode: mode,
        gamma: gamma,
        M1: M1,
        nu1Deg: nu1 / DEG,
        thetaDeg: thetaDeg,
        nuMaxDeg: vmax / DEG,
        vacuum: true
      };
    }
    var M2 = machFromNu(nu2, gamma);
    if (!isFiniteNumber(M2)) return null;
    var iso1 = isentropic(M1, gamma);
    var iso2 = isentropic(M2, gamma);
    // Same stagnation state: P2/P1 = (P2/P02) / (P1/P01) = (P01/P1) / (P02/P2) wait
    // P0 is constant, so P2/P1 = (P2/P0) / (P1/P0) = (P0/P1) / (P0/P2)
    var P2_P1 = iso1.P0_P / iso2.P0_P;
    var T2_T1 = iso1.T0_T / iso2.T0_T;
    var rho2_rho1 = iso1.rho0_rho / iso2.rho0_rho;
    return {
      mode: mode,
      gamma: gamma,
      M1: M1,
      M2: M2,
      nu1Deg: nu1 / DEG,
      nu2Deg: nu2 / DEG,
      thetaDeg: thetaDeg,
      nuMaxDeg: vmax / DEG,
      remainingDeg: (vmax - nu2) / DEG,
      P2_P1: P2_P1,
      T2_T1: T2_T1,
      rho2_rho1: rho2_rho1,
      P02_P01: 1,
      T02_T01: 1,
      vacuum: false
    };
  }

  var api = {
    nu: nu,
    nuMax: nuMax,
    machFromNu: machFromNu,
    isentropic: isentropic,
    compute: compute
  };
  root.PrandtlMeyerCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

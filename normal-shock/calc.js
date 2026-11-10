/**
 * Normal shock relations for a perfect gas (default γ = 1.4).
 *
 *   M2² = [1 + ((γ−1)/2) M1²] / [γ M1² − (γ−1)/2]
 *   P2/P1   = 1 + [2γ/(γ+1)] (M1² − 1)
 *   ρ2/ρ1   = [(γ+1) M1²] / [(γ−1) M1² + 2]
 *   T2/T1   = (P2/P1) / (ρ2/ρ1)
 *   P02/P01 = (ρ2/ρ1)^{γ/(γ−1)} * (P1/P2)^{1/(γ−1)}   (or the closed form below)
 *
 * Rayleigh-pitot (supersonic pitot pressure):
 *   P02/P1 = [((γ+1)/2) M1²]^{γ/(γ−1)}  [ (γ+1) / (2γ M1² − (γ−1)) ]^{1/(γ−1)}
 *
 * Sources: NACA Report 1135, Normal-Shock Tables; NASA Glenn Beginner's
 * Guide; Anderson, Modern Compressible Flow.
 */
(function (root) {
  "use strict";

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function relations(M1, gamma) {
    if (!isFiniteNumber(M1) || M1 < 1) return null;
    if (!isFiniteNumber(gamma) || gamma <= 1) return null;
    var gm1 = gamma - 1;
    var gp1 = gamma + 1;
    var M1sq = M1 * M1;
    var M2sq = (1 + 0.5 * gm1 * M1sq) / (gamma * M1sq - 0.5 * gm1);
    if (!(M2sq > 0)) return null;
    var M2 = Math.sqrt(M2sq);
    var P2_P1 = 1 + (2 * gamma / gp1) * (M1sq - 1);
    var rho2_rho1 = (gp1 * M1sq) / (gm1 * M1sq + 2);
    var T2_T1 = P2_P1 / rho2_rho1;
    // Total-pressure ratio across the shock (same T0)
    var P02_P01 = Math.pow(rho2_rho1, gamma / gm1) * Math.pow(P2_P1, -1 / gm1);
    // Also the explicit product-of-powers form used in NACA 1135
    var expA = gamma / gm1;
    var expB = 1 / gm1;
    var P02_P01_b = Math.pow((gp1 * M1sq) / (gm1 * M1sq + 2), expA) *
      Math.pow((gp1) / (2 * gamma * M1sq - gm1), expB);
    var P02_P1 = Math.pow((gp1 / 2) * M1sq, expA) * Math.pow(gp1 / (2 * gamma * M1sq - gm1), expB);
    // Upstream stagnation / static (isentropic)
    var P01_P1 = Math.pow(1 + 0.5 * gm1 * M1sq, gamma / gm1);
    var T01_T1 = 1 + 0.5 * gm1 * M1sq;
    var T02_T2 = 1 + 0.5 * gm1 * M2sq;
    return {
      M1: M1,
      M2: M2,
      gamma: gamma,
      P2_P1: P2_P1,
      rho2_rho1: rho2_rho1,
      T2_T1: T2_T1,
      P02_P01: P02_P01,
      P02_P01_check: P02_P01_b,
      P02_P1: P02_P1,
      P01_P1: P01_P1,
      T01_T1: T01_T1,
      T02_T2: T02_T2,
      T02_T01: 1 // adiabatic shock, stagnation temperature is continuous
    };
  }

  /**
   * Invert P2/P1, ρ2/ρ1, or M2 for M1 (γ fixed).
   */
  function mach1FromPressureRatio(P2_P1, gamma) {
    if (!isFiniteNumber(P2_P1) || P2_P1 < 1) return null;
    var gp1 = gamma + 1;
    var M1sq = 1 + (P2_P1 - 1) * gp1 / (2 * gamma);
    return Math.sqrt(M1sq);
  }

  function compute(input) {
    if (!input) return null;
    var gamma = input.gamma == null || input.gamma === "" ? 1.4 : Number(input.gamma);
    if (!isFiniteNumber(gamma) || gamma <= 1 || gamma >= 3) return null;
    var mode = input.mode || "M1";
    var value = Number(input.value);
    if (!isFiniteNumber(value)) return null;
    var M1;
    if (mode === "M1") {
      if (value < 1) return null;
      M1 = value;
    } else if (mode === "P2_P1") {
      M1 = mach1FromPressureRatio(value, gamma);
    } else if (mode === "rho2_rho1") {
      // ρ2/ρ1 = (γ+1) M² / ((γ−1) M² + 2)  →  M² = 2 (ρ2/ρ1) / ((γ+1) − (γ−1)(ρ2/ρ1))
      var r = value;
      var maxR = (gamma + 1) / (gamma - 1);
      if (!(r >= 1) || r >= maxR) return null;
      var M1sq = 2 * r / ((gamma + 1) - (gamma - 1) * r);
      if (!(M1sq >= 1)) return null;
      M1 = Math.sqrt(M1sq);
    } else {
      return null;
    }
    if (!isFiniteNumber(M1) || M1 < 1) return null;
    var out = relations(M1, gamma);
    if (!out) return null;
    var T1 = input.staticTempK == null || input.staticTempK === "" ? null : Number(input.staticTempK);
    var P1 = input.staticPressurePa == null || input.staticPressurePa === "" ? null : Number(input.staticPressurePa);
    out.T1K = isFiniteNumber(T1) && T1 > 0 ? T1 : null;
    out.T2K = out.T1K != null ? out.T1K * out.T2_T1 : null;
    out.P1Pa = isFiniteNumber(P1) && P1 > 0 ? P1 : null;
    out.P2Pa = out.P1Pa != null ? out.P1Pa * out.P2_P1 : null;
    out.T0K = out.T1K != null ? out.T1K * out.T01_T1 : null;
    return out;
  }

  var api = {
    relations: relations,
    mach1FromPressureRatio: mach1FromPressureRatio,
    compute: compute
  };

  root.NormalShockCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

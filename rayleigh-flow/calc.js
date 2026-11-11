/**
 * Rayleigh flow: frictionless, constant-area flow with heat addition
 * or rejection, referenced to the sonic (*) state (maximum-entropy
 * point on the Rayleigh line).
 *
 * For a perfect gas with ratio of specific heats γ,
 *   P/P*     = (1+γ) / (1 + γ M²)
 *   T/T*     = [ M (1+γ) / (1 + γ M²) ]²
 *   ρ/ρ*     = (1 + γ M²) / (M² (1+γ))
 *   P0/P0*   = ((1+γ)/(1+γ M²)) [ (2+(γ−1)M²)/(γ+1) ]^{γ/(γ−1)}
 *   T0/T0*   = [ 2(γ+1) M² (1 + (γ−1)/2 M²) ] / (1 + γ M²)²
 *
 * Heat addition drives a subsonic flow toward Mach 1 and a supersonic
 * flow toward Mach 1; T0/T0* = 1 is the thermal choke. γ defaults to
 * 1.4.
 *
 * Sources: Rayleigh-line relations, e.g. John and Keith, Gas Dynamics;
 * Zucker and Biblarz, Fundamentals of Gas Dynamics; Anderson, Modern
 * Compressible Flow.
 */
(function (root) {
  "use strict";

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function rayleigh(M, g) {
    var gp = g + 1, gm = g - 1;
    var den = 1 + g * M * M;
    var p = gp / den;
    var t = Math.pow(M * gp / den, 2);
    var rho = den / (M * M * gp);
    var p0 = (gp / den) * Math.pow((2 + gm * M * M) / gp, g / gm);
    var t0 = (2 * gp * M * M * (1 + gm / 2 * M * M)) / (den * den);
    return { p: p, t: t, rho: rho, p0: p0, t0: t0 };
  }

  function compute(input) {
    if (!input) return null;
    var M = Number(input.mach);
    var g = input.gamma == null || input.gamma === "" ? 1.4 : Number(input.gamma);
    if (!(M > 0) || !(g > 1) || g >= 2) return null;
    var r = rayleigh(M, g);
    return {
      mach: M,
      gamma: g,
      P_Pstar: r.p,
      T_Tstar: r.t,
      rho_rhostar: r.rho,
      P0_P0star: r.p0,
      T0_T0star: r.t0
    };
  }

  var api = { rayleigh: rayleigh, compute: compute };
  root.RayleighFlowCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

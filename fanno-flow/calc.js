/**
 * Fanno flow: adiabatic, constant-area flow with friction, referenced
 * to the sonic (*) state.
 *
 * For a perfect gas with ratio of specific heats γ,
 *   T/T*     = (γ+1) / (2 + (γ−1) M²)
 *   P/P*     = (1/M) √((γ+1) / (2 + (γ−1) M²))
 *   ρ/ρ*     = (1/M) √((2 + (γ−1) M²) / (γ+1))
 *   P0/P0*   = (1/M) [ (2 + (γ−1) M²) / (γ+1) ]^{(γ+1)/(2(γ−1))}
 *   4fL* / D   = (1−M²)/(γ M²) + (γ+1)/(2γ) ln{ (γ+1) M² / (2+(γ−1)M²) }
 *
 * 4fL* / D is the additional friction length, in duct diameters, from
 * the station at Mach M to the sonic throat. γ defaults to 1.4. This
 * page does not integrate a friction factor along a pipe with varying
 * properties beyond that closed-form length to sonic; it is the
 * standard starred-ratio table.
 *
 * Sources: Fanno-line relations, e.g. John and Keith, Gas Dynamics;
 * Zucker and Biblarz, Fundamentals of Gas Dynamics; Anderson, Modern
 * Compressible Flow. γ = 1.4 air tables (4fL* / D ≈ 1.069 at M = 0.50).
 */
(function (root) {
  "use strict";

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function fanno(M, g) {
    var gp = g + 1, gm = g - 1;
    var den = 2 + gm * M * M;
    var t = gp / den;
    var p = (1 / M) * Math.sqrt(gp / den);
    var rho = (1 / M) * Math.sqrt(den / gp);
    var p0 = (1 / M) * Math.pow(den / gp, gp / (2 * gm));
    var fl = (1 - M * M) / (g * M * M) + (gp / (2 * g)) * Math.log((gp * M * M) / den);
    return { t: t, p: p, rho: rho, p0: p0, fl: fl };
  }

  function compute(input) {
    if (!input) return null;
    var M = Number(input.mach);
    var g = input.gamma == null || input.gamma === "" ? 1.4 : Number(input.gamma);
    if (!(M > 0) || !(g > 1) || g >= 2) return null;
    var r = fanno(M, g);
    return {
      mach: M,
      gamma: g,
      T_Tstar: r.t,
      P_Pstar: r.p,
      rho_rhostar: r.rho,
      P0_P0star: r.p0,
      fourFLStarOverD: r.fl
    };
  }

  var api = { fanno: fanno, compute: compute };
  root.FannoFlowCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

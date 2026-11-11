/**
 * Parasite-plus-induced drag polar, maximum L/D, and the classic
 * cruise / endurance lift coefficients.
 *
 *   CD = CD0 + k CL²
 *   k  = 1 / (π e AR)
 *   L/D = CL / CD
 *
 * At (L/D)max:
 *   CL* = √(CD0 / k)      CD* = 2 CD0      (L/D)max = 1 / (2 √(CD0 k))
 *
 * For a quadratic polar these are also the conditions for:
 *   • propeller maximum range (and jet maximum endurance): (L/D)max
 *   • propeller maximum endurance: max CL^{3/2}/CD  at  CL = √(3 CD0 / k)
 *   • jet maximum range: max CL^{1/2}/CD            at  CL = √(CD0 / (3k))
 *
 * Oswald efficiency e is typically 0.7–0.85 for a clean subsonic
 * airplane. This is an uncambered, untrimmed parabolic polar — no
 * compressibility, flap, or ground-effect terms.
 *
 * Sources: Anderson, Introduction to Flight / Aircraft Performance and
 * Design; Raymer, Aircraft Design: A Conceptual Approach; NACA / NASA
 * induced-drag factor k = 1/(π e AR); FAA PHAK (L/D, induced drag).
 */
(function (root) {
  "use strict";

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function kFrom(e, AR) {
    if (!isFiniteNumber(e) || !isFiniteNumber(AR) || e <= 0 || e > 1.5 || AR <= 0) return NaN;
    return 1 / (Math.PI * e * AR);
  }

  function polar(CD0, k, CL) {
    if (!isFiniteNumber(CD0) || !isFiniteNumber(k) || !isFiniteNumber(CL)) return null;
    if (CD0 <= 0 || k <= 0) return null;
    var CD = CD0 + k * CL * CL;
    var LD = CL === 0 ? 0 : CL / CD;
    return { CL: CL, CD: CD, LD: LD, induced: k * CL * CL };
  }

  function compute(input) {
    if (!input) return null;
    var CD0 = Number(input.CD0);
    if (!isFiniteNumber(CD0) || CD0 <= 0) return null;

    var k, e = null, AR = null;
    if (input.k != null && input.k !== "") {
      k = Number(input.k);
      if (!isFiniteNumber(k) || k <= 0) return null;
    } else {
      e = input.e == null || input.e === "" ? 0.8 : Number(input.e);
      AR = Number(input.AR);
      k = kFrom(e, AR);
      if (!isFiniteNumber(k)) return null;
    }

    var LDmax = 1 / (2 * Math.sqrt(CD0 * k));
    var CL_md = Math.sqrt(CD0 / k);
    var CD_md = 2 * CD0;
    var CL_endurance = Math.sqrt(3 * CD0 / k);       // prop max endurance
    var CL_jetRange = Math.sqrt(CD0 / (3 * k));      // jet max range
    var pEnd = polar(CD0, k, CL_endurance);
    var pJet = polar(CD0, k, CL_jetRange);

    var point = null;
    if (input.CL != null && input.CL !== "") {
      var CL = Number(input.CL);
      if (!isFiniteNumber(CL)) return null;
      point = polar(CD0, k, CL);
    }

    return {
      CD0: CD0,
      k: k,
      e: e,
      AR: AR,
      LDmax: LDmax,
      CL_LDmax: CL_md,
      CD_LDmax: CD_md,
      CL_propEndurance: CL_endurance,
      LD_propEndurance: pEnd.LD,
      CD_propEndurance: pEnd.CD,
      CL_jetRange: CL_jetRange,
      LD_jetRange: pJet.LD,
      CD_jetRange: pJet.CD,
      point: point
    };
  }

  var api = { kFrom: kFrom, polar: polar, compute: compute };
  root.DragPolarCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

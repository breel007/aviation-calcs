/**
 * Finite-wing lift-curve slope from a section slope a0 and aspect
 * ratio, by the Prandtl lifting-line formula and by Helmbold's
 * low-aspect-ratio correction.
 *
 *   Prandtl (with Oswald efficiency e):
 *     a = a0 / (1 + a0 / (π e AR))
 *   Helmbold:
 *     a = a0 / ( √(1 + (a0 / (π AR))²) + a0 / (π AR) )
 *
 * a0 defaults to the thin-airfoil value 2π per radian. e defaults to
 * 1 in the Prandtl formula (an ideal elliptic wing); you may enter a
 * lower Oswald factor. Slopes are reported per radian and per degree.
 * This is an incompressible, inviscid correction; it is not a stall
 * model and it is not a transonic lift slope.
 *
 * Sources: Prandtl lifting-line theory; Helmbold's finite-wing
 * lift-slope formula (often used at low AR); Anderson, Fundamentals
 * of Aerodynamics; Phillips, Mechanics of Flight.
 */
(function (root) {
  "use strict";

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function compute(input) {
    if (!input) return null;
    var ar = Number(input.aspectRatio);
    if (!(ar > 0)) return null;
    var a0 = input.a0 == null || input.a0 === "" ? 2 * Math.PI : Number(input.a0);
    if (input.a0Unit === "per-deg") a0 = a0 * 180 / Math.PI;
    if (!(a0 > 0)) return null;
    var e = input.oswald == null || input.oswald === "" ? 1 : Number(input.oswald);
    if (!(e > 0) || e > 2) return null;

    var prandtl = a0 / (1 + a0 / (Math.PI * e * ar));
    var x = a0 / (Math.PI * ar);
    var helmbold = a0 / (Math.sqrt(1 + x * x) + x);

    return {
      aspectRatio: ar,
      a0PerRad: a0,
      a0PerDeg: a0 * Math.PI / 180,
      oswald: e,
      prandtlPerRad: prandtl,
      prandtlPerDeg: prandtl * Math.PI / 180,
      helmboldPerRad: helmbold,
      helmboldPerDeg: helmbold * Math.PI / 180,
      ratioHelmboldToPrandtl: helmbold / prandtl
    };
  }

  var api = { compute: compute };
  root.LiftSlopeArCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

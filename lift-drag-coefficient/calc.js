/**
 * Lift and drag coefficients from force, dynamic pressure, and area:
 *
 *   CL = L / (q S)      CD = D / (q S)      L/D = CL/CD = L/D
 *   q  = ½ ρ V²
 *
 * In steady level flight, L = n W with n = 1, so the required CL is
 *   CL = n W / (q S)
 *
 * Sources: NASA Glenn Beginner's Guide to Aeronautics (lift and drag
 * equations); Anderson, Introduction to Flight; FAA Pilot's Handbook of
 * Aeronautical Knowledge, Chapter 5 (aerodynamics).
 */
(function (root) {
  "use strict";

  var G0 = 9.80665;
  var RHO0 = 1.225;
  var KT_MPS = 1852 / 3600;
  var M_PER_FT = 0.3048;
  var LB_N = 4.4482216152605;
  var FT2_M2 = M_PER_FT * M_PER_FT;
  var PA_PER_PSF = 47.88025898033584;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function toNewtons(value, unit) {
    var n = Number(value);
    if (!isFiniteNumber(n) || n < 0) return NaN;
    if (unit === "lbf" || unit === "lb") return n * LB_N;
    if (unit === "kgf" || unit === "kg") return n * G0; // mass entered as "kg" weight
    if (unit === "kN") return n * 1000;
    return n; // N
  }

  function toM2(value, unit) {
    var n = Number(value);
    if (!isFiniteNumber(n) || n <= 0) return NaN;
    if (unit === "ft2") return n * FT2_M2;
    return n;
  }

  function toMps(value, unit) {
    var n = Number(value);
    if (!isFiniteNumber(n) || n < 0) return NaN;
    if (unit === "kt") return n * KT_MPS;
    if (unit === "mph") return n * 0.44704;
    if (unit === "fps") return n * M_PER_FT;
    if (unit === "kmh") return n / 3.6;
    return n;
  }

  function resolveQ(input) {
    if (input.dynamicPressurePa != null && input.dynamicPressurePa !== "") {
      var qIn = Number(input.dynamicPressurePa);
      if (isFiniteNumber(qIn) && qIn > 0) return qIn;
    }
    if (input.dynamicPressurePsf != null && input.dynamicPressurePsf !== "") {
      var qPsf = Number(input.dynamicPressurePsf);
      if (isFiniteNumber(qPsf) && qPsf > 0) return qPsf * PA_PER_PSF;
    }
    var V = toMps(input.velocity, input.velocityUnit || "m/s");
    var rho = Number(input.rho);
    if (!isFiniteNumber(rho) || rho <= 0) {
      if (input.atmosphere === "sl" || input.rho == null || input.rho === "") rho = RHO0;
    }
    if (isFiniteNumber(V) && V >= 0 && isFiniteNumber(rho) && rho > 0) return 0.5 * rho * V * V;
    return NaN;
  }

  /**
   * Provide S and q (or V and ρ), plus any of: lift, drag, CL, CD, weight, n.
   * Missing coefficients are computed from the corresponding force; missing
   * forces from the corresponding coefficient.
   */
  function compute(input) {
    if (!input) return null;
    var S = toM2(input.area, input.areaUnit || "m2");
    var q = resolveQ(input);
    if (!isFiniteNumber(S) || !isFiniteNumber(q) || q < 0) return null;

    var n = input.loadFactor == null || input.loadFactor === "" ? 1 : Number(input.loadFactor);
    if (!isFiniteNumber(n) || n <= 0) n = 1;

    var W = null;
    if (input.weight != null && input.weight !== "") {
      W = toNewtons(input.weight, input.weightUnit || "N");
      if (!isFiniteNumber(W)) W = null;
    }

    var L = null;
    if (input.lift != null && input.lift !== "") L = toNewtons(input.lift, input.liftUnit || "N");
    if (!isFiniteNumber(L)) {
      if (W != null) L = n * W;
      else L = null;
    }

    var D = null;
    if (input.drag != null && input.drag !== "") D = toNewtons(input.drag, input.dragUnit || "N");
    if (!isFiniteNumber(D)) D = null;

    var CL = null, CD = null;
    if (input.CL != null && input.CL !== "") CL = Number(input.CL);
    if (input.CD != null && input.CD !== "") CD = Number(input.CD);

    if (CL == null && L != null && q > 0) CL = L / (q * S);
    if (CD == null && D != null && q > 0) CD = D / (q * S);
    if (L == null && isFiniteNumber(CL) && q > 0) L = CL * q * S;
    if (D == null && isFiniteNumber(CD) && q > 0) D = CD * q * S;

    if (CL == null && CD == null && L == null && D == null) return null;

    var LD = (isFiniteNumber(CL) && isFiniteNumber(CD) && CD !== 0)
      ? CL / CD
      : (isFiniteNumber(L) && isFiniteNumber(D) && D !== 0 ? L / D : null);

    return {
      CL: isFiniteNumber(CL) ? CL : null,
      CD: isFiniteNumber(CD) ? CD : null,
      liftN: isFiniteNumber(L) ? L : null,
      dragN: isFiniteNumber(D) ? D : null,
      liftToDrag: isFiniteNumber(LD) ? LD : null,
      dynamicPressurePa: q,
      dynamicPressurePsf: q / PA_PER_PSF,
      areaM2: S,
      loadFactor: n,
      weightN: W,
      wingLoadingPa: W != null ? W / S : (isFiniteNumber(L) ? L / S : null)
    };
  }

  var api = {
    G0: G0,
    RHO0: RHO0,
    toNewtons: toNewtons,
    toM2: toM2,
    toMps: toMps,
    resolveQ: resolveQ,
    compute: compute
  };

  root.LiftDragCoefficientCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

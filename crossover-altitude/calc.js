/**
 * Vmo / Mmo crossover altitude, using the same subsonic pitot
 * identities as this site's true-airspeed calculator.
 *
 * Calibrated airspeed (CAS) and Mach are related by the compressible
 * subsonic impact-pressure formula. There is one ambient pressure —
 * and therefore one pressure altitude — at which a given Vmo (a CAS
 * limit) and a given Mmo (a Mach limit) represent the same flight
 * condition. Below that crossover altitude the CAS limit is reached
 * first; above it, the Mach limit is.
 *
 *   q_c / p0  = (1 + 0.2 (Vmo / a0)²)^{3.5} − 1     (from Vmo as CAS)
 *   q_c / p   = (1 + 0.2 Mmo²)^{3.5} − 1            (from Mmo)
 *   p         = q_c / ((1 + 0.2 Mmo²)^{3.5} − 1)
 *
 * Pressure altitude then follows from the U.S. Standard Atmosphere
 * 1976 inversion of p (troposphere and lower stratosphere). The
 * CAS–Mach–PA relationship does not depend on temperature; TAS at
 * the crossover would.
 *
 * Sources: subsonic pitot-static formula as used on this site's
 * true-airspeed page (γ = 1.4, a0 = 340.294 m/s, p0 = 101325 Pa);
 * U.S. Standard Atmosphere, 1976; FAA / AFM concept of Vmo/Mmo
 * crossover (the published mark always wins).
 */
(function (root) {
  "use strict";

  var T0 = 288.15, L = 0.0065, P0 = 101325, G = 9.80665, R = 287.05287, GAMMA = 1.4;
  var EXP = G / (R * L);
  var TROP_M = 11000, TROP_T = T0 - L * TROP_M;
  var TROP_P = P0 * Math.pow(1 - L * TROP_M / T0, EXP);
  var A0 = Math.sqrt(GAMMA * R * T0);
  var KT_MPS = 1852 / 3600;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function toMps(v, unit) {
    if (!isFiniteNumber(v) || v <= 0) return NaN;
    if (unit === "mph") return v * 1609.344 / 3600;
    if (unit === "kph") return v / 3.6;
    if (unit === "fps") return v * 0.3048;
    if (unit === "mps") return v;
    return v * KT_MPS; // knots
  }

  function isaPressurePa(hM) {
    if (hM <= TROP_M) return P0 * Math.pow(1 - L * hM / T0, EXP);
    return TROP_P * Math.exp(-G * (hM - TROP_M) / (R * TROP_T));
  }

  function paFromPressure(p) {
    if (!(p > 0) || p > P0) return NaN;
    if (p >= TROP_P) {
      var ratio = p / P0;
      var h = (T0 / L) * (1 - Math.pow(ratio, 1 / EXP));
      return h;
    }
    return TROP_M + (R * TROP_T / G) * Math.log(TROP_P / p);
  }

  function casFromMachPa(mach, ambientPa) {
    var qc = ambientPa * (Math.pow(1 + 0.2 * mach * mach, 3.5) - 1);
    var inner = qc / P0 + 1;
    if (inner < 1) return NaN;
    var casSq = 5 * A0 * A0 * (Math.pow(inner, 2 / 7) - 1);
    if (casSq < 0) return 0;
    return Math.sqrt(casSq);
  }

  function machFromCasPa(casMps, ambientPa) {
    var qcOverP0 = Math.pow(1 + 0.2 * Math.pow(casMps / A0, 2), 3.5) - 1;
    var qc = qcOverP0 * P0;
    var ratio = qc / ambientPa + 1;
    if (ratio < 1) return NaN;
    var m2 = 5 * (Math.pow(ratio, 2 / 7) - 1);
    if (m2 < 0) return 0;
    return Math.sqrt(m2);
  }

  function compute(input) {
    if (!input) return null;
    var vmo = toMps(Number(input.vmo), input.vmoUnit || "kt");
    var mmo = Number(input.mmo);
    if (!(vmo > 0) || !(mmo > 0) || mmo >= 1) return null;

    var qc = P0 * (Math.pow(1 + 0.2 * Math.pow(vmo / A0, 2), 3.5) - 1);
    var denom = Math.pow(1 + 0.2 * mmo * mmo, 3.5) - 1;
    if (!(denom > 0) || !(qc > 0)) return null;
    var p = qc / denom;
    if (!(p > 0) || p > P0) {
      // Vmo already corresponds to a Mach greater than Mmo at sea level,
      // or the other way around (crossover below sea level / above trop).
      return null;
    }
    var hM = paFromPressure(p);
    if (!isFiniteNumber(hM) || hM < 0) return null;

    var casCheck = casFromMachPa(mmo, p);
    var machSL = machFromCasPa(vmo, P0);

    return {
      vmoMps: vmo,
      vmoKt: vmo / KT_MPS,
      mmo: mmo,
      ambientPa: p,
      crossoverM: hM,
      crossoverFt: hM / 0.3048,
      crossoverFL: (hM / 0.3048) / 100,
      casAtCrossoverMps: casCheck,
      machAtSeaLevelVmo: machSL,
      A0: A0,
      P0: P0
    };
  }

  var api = {
    A0: A0, P0: P0,
    isaPressurePa: isaPressurePa, paFromPressure: paFromPressure,
    casFromMachPa: casFromMachPa, machFromCasPa: machFromCasPa,
    compute: compute
  };
  root.CrossoverAltitudeCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

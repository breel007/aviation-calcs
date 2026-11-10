/**
 * Tsiolkovsky rocket equation (ideal, no gravity or drag loss):
 *
 *   Δv = ve ln(m0 / mf)  =  Isp g0 ln(m0 / mf)
 *
 *   ve  = Isp g0,     mass ratio MR = m0 / mf,     propellant mass = m0 − mf
 *
 * g0 is the standard gravity 9.80665 m/s² used to define specific impulse,
 * even for a burn in vacuum. Multi-stage Δv is the sum of each stage's
 * ideal Δv, with the payload of one stage being the stacked mass of the
 * stages above it plus the payload.
 *
 * Sources: Tsiolkovsky (1903); Sutton & Biblarz, Rocket Propulsion Elements;
 * NASA Glenn Beginner's Guide to Propulsion (specific impulse, rocket
 * equation).
 */
(function (root) {
  "use strict";

  var G0 = 9.80665;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function veFrom(input) {
    if (input.ve != null && input.ve !== "") {
      var ve = Number(input.ve);
      if (isFiniteNumber(ve) && ve > 0) {
        var unit = input.veUnit || "m/s";
        if (unit === "km/s") ve *= 1000;
        if (unit === "ft/s") ve *= 0.3048;
        return ve;
      }
    }
    if (input.Isp != null && input.Isp !== "") {
      var Isp = Number(input.Isp);
      if (isFiniteNumber(Isp) && Isp > 0) return Isp * G0;
    }
    return NaN;
  }

  function stageDeltaV(ve, m0, mf) {
    if (!(ve > 0) || !(m0 > 0) || !(mf > 0) || m0 < mf) return null;
    var MR = m0 / mf;
    var dv = ve * Math.log(MR);
    return {
      ve: ve,
      Isp: ve / G0,
      m0: m0,
      mf: mf,
      massRatio: MR,
      propellantMass: m0 - mf,
      propellantFraction: 1 - 1 / MR,
      deltaV: dv
    };
  }

  /**
   * Single-stage or a list of stages.
   *
   * input.mode: "delta-v" (from masses) | "mass-ratio" (from Δv) | "final-mass"
   * input.ve or input.Isp
   * input.m0, input.mf  (same mass unit — the unit cancels in the ratio)
   * input.deltaV, input.deltaVUnit
   *
   * For several stages: input.stages = [{ ve or Isp, m0, mf }, ...]
   */
  function compute(input) {
    if (!input) return null;
    if (Array.isArray(input.stages) && input.stages.length > 0) {
      var stages = [];
      var total = 0;
      for (var i = 0; i < input.stages.length; i++) {
        var s = input.stages[i];
        var veS = veFrom(s);
        var row = stageDeltaV(veS, Number(s.m0), Number(s.mf));
        if (!row) return null;
        row.index = i + 1;
        stages.push(row);
        total += row.deltaV;
      }
      return { stages: stages, deltaV: total, stageCount: stages.length };
    }

    var ve = veFrom(input);
    if (!isFiniteNumber(ve) || ve <= 0) return null;

    var mode = input.mode || "delta-v";
    var dvUnit = input.deltaVUnit || "m/s";
    function toMps(v) {
      if (dvUnit === "km/s") return v * 1000;
      if (dvUnit === "ft/s") return v * 0.3048;
      return v;
    }
    function fromMps(v) { return v; }

    if (mode === "mass-ratio") {
      var dv = toMps(Number(input.deltaV));
      if (!isFiniteNumber(dv) || dv < 0) return null;
      var MR = Math.exp(dv / ve);
      var m0r = input.m0 != null && input.m0 !== "" ? Number(input.m0) : null;
      var mfr = null, payload = null;
      if (isFiniteNumber(m0r) && m0r > 0) mfr = m0r / MR;
      return {
        ve: ve,
        Isp: ve / G0,
        m0: m0r,
        mf: mfr,
        massRatio: MR,
        propellantMass: isFiniteNumber(m0r) && isFiniteNumber(mfr) ? m0r - mfr : null,
        propellantFraction: 1 - 1 / MR,
        deltaV: dv
      };
    }

    var m0 = Number(input.m0);
    var mf = Number(input.mf);
    if (mode === "final-mass") {
      var dv2 = toMps(Number(input.deltaV));
      if (!isFiniteNumber(m0) || m0 <= 0 || !isFiniteNumber(dv2) || dv2 < 0) return null;
      mf = m0 / Math.exp(dv2 / ve);
    }
    var row = stageDeltaV(ve, m0, mf);
    return row;
  }

  var api = {
    G0: G0,
    veFrom: veFrom,
    stageDeltaV: stageDeltaV,
    compute: compute
  };

  root.RocketEquationCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

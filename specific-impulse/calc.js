/**
 * Specific impulse, effective exhaust velocity, thrust, and mass flow.
 *
 *   Isp  = F / (ṁ g0)  =  ve / g0
 *   ve   = Isp × g0
 *   F    = ṁ × ve      =  ṁ × Isp × g0
 *
 * g0 is the standard gravity 9.80665 m/s² used to define Isp, even for
 * a vacuum burn (the same convention as this site's rocket-equation
 * calculator). Isp is reported in seconds. Effective exhaust velocity
 * ve may be entered or reported in m/s, km/s, or ft/s.
 *
 * In US customary units the same Isp (seconds) is F(lbf) / ẇ(lbf/s),
 * because lbf and lbm share the g0 definition.
 *
 * Optional: with a mass ratio or propellant mass, the ideal Δv from
 * the Tsiolkovsky equation Δv = ve ln(m0/mf) is shown, and the page
 * links to the full rocket-equation calculator for multi-stage work.
 *
 * Sources: Sutton & Biblarz, Rocket Propulsion Elements; NASA Glenn
 * Beginner's Guide to Propulsion (specific impulse); Tsiolkovsky
 * rocket equation.
 */
(function (root) {
  "use strict";

  var G0 = 9.80665;
  var LBF_PER_N = 1 / 4.4482216152605;
  var LB_PER_KG = 2.2046226218487757;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function toMps(value, unit) {
    if (!isFiniteNumber(value) || value <= 0) return NaN;
    if (unit === "km/s") return value * 1000;
    if (unit === "ft/s" || unit === "fps") return value * 0.3048;
    if (unit === "mph") return value * 1609.344 / 3600;
    return value;
  }

  function toNewton(value, unit) {
    if (!isFiniteNumber(value) || value <= 0) return NaN;
    if (unit === "lbf" || unit === "lb") return value * 4.4482216152605;
    if (unit === "kN") return value * 1000;
    if (unit === "kgf") return value * G0;
    return value; // N
  }

  function toKgPerS(value, unit) {
    if (!isFiniteNumber(value) || value <= 0) return NaN;
    if (unit === "lb/s" || unit === "lbm/s") return value / LB_PER_KG;
    if (unit === "lbf/s") return value * 4.4482216152605 / G0; // weight flow
    if (unit === "kg/h") return value / 3600;
    return value; // kg/s
  }

  function compute(input) {
    if (!input) return null;
    var ve = null, Isp = null, F = null, mdot = null;

    if (input.ve != null && input.ve !== "") {
      ve = toMps(Number(input.ve), input.veUnit || "m/s");
      if (!isFiniteNumber(ve)) return null;
      Isp = ve / G0;
    }
    if (input.Isp != null && input.Isp !== "") {
      var IspIn = Number(input.Isp);
      if (!isFiniteNumber(IspIn) || IspIn <= 0) return null;
      if (Isp != null && Math.abs(Isp - IspIn) > 1e-6 * Math.max(Isp, IspIn)) {
        // Both given and inconsistent — prefer explicit ve if both came in,
        // but treat a clear conflict as invalid if they disagree badly.
        return null;
      }
      if (ve == null) {
        Isp = IspIn;
        ve = Isp * G0;
      }
    }
    if (input.thrust != null && input.thrust !== "") {
      F = toNewton(Number(input.thrust), input.thrustUnit || "N");
      if (!isFiniteNumber(F)) return null;
    }
    if (input.mdot != null && input.mdot !== "") {
      mdot = toKgPerS(Number(input.mdot), input.mdotUnit || "kg/s");
      if (!isFiniteNumber(mdot)) return null;
    }

    // Infer the missing piece when two of {ve/Isp, F, mdot} are present.
    if (ve == null && F != null && mdot != null) {
      ve = F / mdot;
      Isp = ve / G0;
    } else if (F == null && ve != null && mdot != null) {
      F = mdot * ve;
    } else if (mdot == null && ve != null && F != null) {
      mdot = F / ve;
    }

    if (ve == null || Isp == null) return null;

    var m0 = null, mf = null, mr = null, dV = null, mp = null;
    if (input.massRatio != null && input.massRatio !== "") {
      mr = Number(input.massRatio);
      if (!isFiniteNumber(mr) || mr <= 1) return null;
    } else if (input.m0 != null && input.m0 !== "" && input.mf != null && input.mf !== "") {
      m0 = Number(input.m0);
      mf = Number(input.mf);
      if (!isFiniteNumber(m0) || !isFiniteNumber(mf) || m0 <= 0 || mf <= 0 || m0 <= mf) return null;
      mr = m0 / mf;
    }
    if (mr != null) {
      dV = ve * Math.log(mr);
      if (m0 != null) mp = m0 - mf;
    }

    return {
      veMps: ve,
      veKmS: ve / 1000,
      veFps: ve / 0.3048,
      Isp: Isp,
      thrustN: F,
      thrustLbf: F != null ? F * LBF_PER_N : null,
      mdotKgS: mdot,
      mdotLbS: mdot != null ? mdot * LB_PER_KG : null,
      weightFlowLbfS: mdot != null ? mdot * G0 * LBF_PER_N : null,
      massRatio: mr,
      deltaVMps: dV,
      deltaVKmS: dV != null ? dV / 1000 : null,
      propellantKg: mp,
      g0: G0
    };
  }

  var api = {
    G0: G0,
    toMps: toMps,
    toNewton: toNewton,
    toKgPerS: toKgPerS,
    compute: compute
  };
  root.SpecificImpulseCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

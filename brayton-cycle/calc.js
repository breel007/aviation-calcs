/**
 * Cold air-standard Brayton cycle thermal efficiency, and optional
 * station temperatures.
 *
 *   η = 1 − 1 / r_p^{(γ−1)/γ}
 *
 * r_p = p_max / p_min is the compressor pressure ratio. γ defaults to
 * 1.4 (cold air). If you enter a compressor-inlet temperature T1,
 * the isentropic compressor exit is T2 = T1 r_p^{(γ−1)/γ}; an optional
 * turbine-inlet T3 then gives T4 = T3 / r_p^{(γ−1)/γ}, a heat input
 * cp(T3−T2), and a net work cp((T3−T4) − (T2−T1)). The efficiency
 * from those temperatures matches the pressure-ratio formula when the
 * compressions and expansions are isentropic and cp is constant.
 *
 * This is the ideal cycle, not a real engine with burner pressure
 * loss, cooling bleed, or a polytropic efficiency.
 *
 * Sources: air-standard Brayton cycle (Cengel and Boles, Thermodynamics;
 * Hill and Peterson, Mechanics and Thermodynamics of Propulsion;
 * Mattingly, Elements of Propulsion).
 */
(function (root) {
  "use strict";

  var CP_AIR = 1004.5; // J/(kg·K), cold-air typical, used only for optional work

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function toK(t, unit) {
    if (!isFiniteNumber(t)) return NaN;
    if (unit === "C" || unit === "c") return t + 273.15;
    if (unit === "F" || unit === "f") return (t - 32) * 5 / 9 + 273.15;
    return t;
  }

  function compute(input) {
    if (!input) return null;
    var rp = Number(input.pressureRatio);
    var g = input.gamma == null || input.gamma === "" ? 1.4 : Number(input.gamma);
    if (!(rp > 1) || !(g > 1) || g >= 2) return null;
    var exp = (g - 1) / g;
    var eta = 1 - 1 / Math.pow(rp, exp);

    var T1 = null, T2 = null, T3 = null, T4 = null;
    var qIn = null, wNet = null, etaFromT = null;
    if (input.t1 != null && input.t1 !== "") {
      T1 = toK(Number(input.t1), input.tempUnit || "K");
      if (!(T1 > 0)) return null;
      T2 = T1 * Math.pow(rp, exp);
      if (input.t3 != null && input.t3 !== "") {
        T3 = toK(Number(input.t3), input.tempUnit || "K");
        if (!(T3 > T2)) return null;
        T4 = T3 / Math.pow(rp, exp);
        var cp = input.cp == null || input.cp === "" ? CP_AIR : Number(input.cp);
        if (!(cp > 0)) return null;
        qIn = cp * (T3 - T2);
        wNet = cp * ((T3 - T4) - (T2 - T1));
        etaFromT = wNet / qIn;
      }
    }

    return {
      pressureRatio: rp,
      gamma: g,
      exponent: exp,
      efficiency: eta,
      T1: T1, T2: T2, T3: T3, T4: T4,
      heatInJPerKg: qIn,
      netWorkJPerKg: wNet,
      efficiencyFromTemps: etaFromT
    };
  }

  var api = { CP_AIR: CP_AIR, compute: compute };
  root.BraytonCycleCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

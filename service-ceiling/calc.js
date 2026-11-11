/**
 * Service ceiling from a linear rate-of-climb versus density-altitude
 * model.
 *
 *   ROC(h) = ROC0 × (1 − h / h_abs)
 *
 * ROC0 is the sea-level (or zero-DA) rate of climb, and h_abs is the
 * absolute ceiling — the density altitude at which ROC falls to zero.
 * The service ceiling is the density altitude at which ROC equals a
 * chosen residual, 100 ft/min by the usual light-airplane definition
 * (you may enter another value; some manuals use 50 or 500 ft/min).
 *
 *   h_svc = h_abs × (1 − ROC_svc / ROC0)
 *
 * If you enter climb rates at two density altitudes, the page fits the
 * same straight line rather than asking for ROC0 and h_abs directly.
 * Real climb performance is not exactly linear in density altitude,
 * and a POH chart always wins.
 *
 * Sources: FAA Pilot's Handbook of Aeronautical Knowledge (service,
 * absolute, and cruise ceilings; rate of climb versus altitude);
 * standard linear ROC-versus-altitude model used in performance
 * textbooks (e.g. Anderson, Introduction to Flight; Phillips,
 * Mechanics of Flight).
 */
(function (root) {
  "use strict";

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function toFpm(roc, unit) {
    if (!isFiniteNumber(roc)) return NaN;
    if (unit === "mps" || unit === "m/s") return roc / 0.00508;
    if (unit === "m/min") return roc / 0.3048;
    return roc;
  }
  function toFt(h, unit) {
    if (!isFiniteNumber(h)) return NaN;
    if (unit === "m") return h / 0.3048;
    if (unit === "fl") return h * 100;
    return h;
  }

  function compute(input) {
    if (!input) return null;
    var rocUnit = input.rocUnit || "fpm";
    var altUnit = input.altUnit || "ft";
    var rocSvc = toFpm(input.serviceRoc == null || input.serviceRoc === "" ? 100 : Number(input.serviceRoc), rocUnit);
    if (!isFiniteNumber(rocSvc) || rocSvc < 0) return null;

    var roc0, hAbs, mode = input.mode || "roc0";
    if (mode === "two-points") {
      var h1 = toFt(Number(input.h1), altUnit);
      var h2 = toFt(Number(input.h2), altUnit);
      var r1 = toFpm(Number(input.roc1), rocUnit);
      var r2 = toFpm(Number(input.roc2), rocUnit);
      if (!isFiniteNumber(h1) || !isFiniteNumber(h2) || !isFiniteNumber(r1) || !isFiniteNumber(r2)) return null;
      if (Math.abs(h1 - h2) < 1e-9) return null;
      var slope = (r2 - r1) / (h2 - h1);
      if (slope >= 0) return null; // climb must fall as altitude rises
      roc0 = r1 - slope * h1;
      hAbs = roc0 === 0 ? Infinity : -roc0 / slope;
    } else if (mode === "ceiling") {
      roc0 = toFpm(Number(input.roc0), rocUnit);
      hAbs = toFt(Number(input.absoluteCeiling), altUnit);
      if (!(roc0 > 0) || !(hAbs > 0)) return null;
    } else {
      // roc0 + ROC at a known height
      roc0 = toFpm(Number(input.roc0), rocUnit);
      if (!(roc0 > 0)) return null;
      if (input.absoluteCeiling != null && input.absoluteCeiling !== "") {
        hAbs = toFt(Number(input.absoluteCeiling), altUnit);
        if (!(hAbs > 0)) return null;
      } else if (input.hKnown != null && input.hKnown !== "" && input.rocKnown != null && input.rocKnown !== "") {
        var hK = toFt(Number(input.hKnown), altUnit);
        var rK = toFpm(Number(input.rocKnown), rocUnit);
        if (!isFiniteNumber(hK) || !isFiniteNumber(rK) || hK === 0) return null;
        if (rK >= roc0) return null;
        // ROC(h) = ROC0 (1 - h/hAbs) => rK = roc0 (1 - hK/hAbs) => hAbs = hK / (1 - rK/roc0)
        var frac = 1 - rK / roc0;
        if (frac <= 0) return null;
        hAbs = hK / frac;
      } else {
        return null;
      }
    }
    if (!(roc0 > 0) || !(hAbs > 0) || !isFiniteNumber(hAbs)) return null;
    if (rocSvc > roc0) return null;

    var hSvc = hAbs * (1 - rocSvc / roc0);
    var rocAt = null, hQuery = null;
    if (input.hQuery != null && input.hQuery !== "") {
      hQuery = toFt(Number(input.hQuery), altUnit);
      if (!isFiniteNumber(hQuery)) return null;
      rocAt = roc0 * (1 - hQuery / hAbs);
    }

    return {
      roc0Fpm: roc0,
      absoluteCeilingFt: hAbs,
      serviceRocFpm: rocSvc,
      serviceCeilingFt: hSvc,
      queryAltitudeFt: hQuery,
      rocAtQueryFpm: rocAt,
      slopeFpmPerFt: -roc0 / hAbs
    };
  }

  var api = { compute: compute };
  root.ServiceCeilingCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

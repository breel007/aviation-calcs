/**
 * Pressure altitude from altimeter setting and field / indicated elevation,
 * or from a station pressure, using the ICAO / ISA troposphere calibration
 * that a sensitive altimeter assumes.
 *
 * Station pressure from QNH and elevation h (metres):
 *   p = QNH · (1 − L h / T0)^{g/(R L)}
 * Pressure altitude (geopotential, metres):
 *   PA = (T0 / L) (1 − (p / P0)^{R L / g})
 *
 * The common rule of thumb is also reported:
 *   PA ≈ elevation + 1,000 ft × (29.92 − QNH in inHg)
 *
 * Constants match the site's density-altitude calculator (ICAO Doc 7488):
 * T0 = 288.15 K, L = 0.0065 K/m, g0 = 9.80665 m/s², R = 287.05287 J/(kg·K),
 * P0 = 1013.25 hPa = 29.92126 inHg. A typed 29.92 inHg is taken as this
 * conventional standard, not 29.92000.
 *
 * The ISA troposphere altimeter calibration is used up to the tropopause
 * (11 km / 36,089 ft). Above that, pressure altitude is still well-defined
 * from station pressure via the U.S. Standard Atmosphere 1976 layers when
 * StandardAtmosphereCalcs is available; otherwise the troposphere formula
 * is limited to 11 km.
 *
 * Sources: ICAO Doc 7488; FAA Pilot's Handbook of Aeronautical Knowledge
 * (Chapter 8, altimetry; pressure altitude); 14 CFR / AIM altimeter setting
 * procedures; U.S. Standard Atmosphere 1976.
 */
(function (root) {
  "use strict";

  var T0 = 288.15;
  var L = 0.0065;
  var G0 = 9.80665;
  var R_DRY = 287.05287;
  var P0_HPA = 1013.25;
  var M_PER_FT = 0.3048;
  var FT_PER_M = 1 / 0.3048;
  var HPA_PER_INHG = 33.863886666666667;
  var P0_INHG = P0_HPA / HPA_PER_INHG;
  var G_OVER_RL = G0 / (R_DRY * L);
  var RL_OVER_G = 1 / G_OVER_RL;
  var T0_OVER_L_M = T0 / L;
  var TROPOPAUSE_M = 11000;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function isConventionalStandardInHg(inhg) {
    return isFiniteNumber(inhg) && Math.abs(inhg - 29.92) < 0.0005;
  }
  function isConventionalStandardHpa(hpa) {
    return isFiniteNumber(hpa) && Math.abs(hpa - 1013.25) < 0.005;
  }
  function canonicalAltimeterInHg(inhg) {
    return isConventionalStandardInHg(inhg) ? P0_INHG : inhg;
  }
  function canonicalAltimeterHpa(hpa) {
    return isConventionalStandardHpa(hpa) ? P0_HPA : hpa;
  }

  function inHgToHpa(inhg) { return inhg * HPA_PER_INHG; }
  function hpaToInHg(hpa) { return hpa / HPA_PER_INHG; }

  function stationPressureHpa(altimeterHpa, elevationFt) {
    var hM = elevationFt * M_PER_FT;
    var factor = 1 - (L * hM) / T0;
    if (factor <= 0) return NaN;
    return altimeterHpa * Math.pow(factor, G_OVER_RL);
  }

  function troposphereHeightFromPressureHpa(pHpa) {
    var ratio = pHpa / P0_HPA;
    if (ratio <= 0) return NaN;
    return T0_OVER_L_M * (1 - Math.pow(ratio, RL_OVER_G));
  }

  function pressureAltitudeFromStationHpa(pHpa) {
    if (!isFiniteNumber(pHpa) || pHpa <= 0) return NaN;
    var hM = troposphereHeightFromPressureHpa(pHpa);
    if (isFiniteNumber(hM) && hM <= TROPOPAUSE_M + 0.5 && hM >= -2000) {
      // Allow a little below MSL (high QNH).
      if (hM <= TROPOPAUSE_M) return hM;
    }
    var Atm = root.StandardAtmosphereCalcs;
    if (Atm) {
      var inv = Atm.fromPressure(pHpa * 100);
      if (inv) return inv.geopotentialM;
    }
    return hM;
  }

  /**
   * input.mode: "qnh-elevation" | "station-pressure" | "indicated-qnh"
   * input.altimeter, input.altimeterUnit ("inhg"|"hpa")
   * input.elevation, input.elevationUnit ("ft"|"m")
   * input.stationPressure, input.stationUnit
   */
  function compute(input) {
    if (!input) return null;
    var mode = input.mode || "qnh-elevation";
    var altUnit = input.altimeterUnit || "inhg";
    var elUnit = input.elevationUnit || "ft";
    var elevFt = null;
    if (input.elevation != null && input.elevation !== "") {
      var el = Number(input.elevation);
      if (!isFiniteNumber(el)) return null;
      elevFt = elUnit === "m" ? el * FT_PER_M : el;
    }

    var qnhHpa = null, qnhInHg = null;
    if (input.altimeter != null && input.altimeter !== "") {
      var raw = Number(input.altimeter);
      if (!isFiniteNumber(raw) || raw <= 0) return null;
      if (altUnit === "hpa" || altUnit === "mb") {
        qnhHpa = canonicalAltimeterHpa(raw);
        qnhInHg = hpaToInHg(qnhHpa);
      } else {
        qnhInHg = canonicalAltimeterInHg(raw);
        qnhHpa = inHgToHpa(qnhInHg);
      }
    }

    var stationHpa;
    if (mode === "station-pressure") {
      var sp = Number(input.stationPressure);
      if (!isFiniteNumber(sp) || sp <= 0) return null;
      var su = input.stationUnit || "hpa";
      if (su === "inhg") stationHpa = inHgToHpa(sp);
      else if (su === "pa") stationHpa = sp / 100;
      else if (su === "psi") stationHpa = sp * 6894.757293168 / 100;
      else stationHpa = sp;
    } else {
      if (qnhHpa == null || elevFt == null) return null;
      stationHpa = stationPressureHpa(qnhHpa, elevFt);
    }
    if (!isFiniteNumber(stationHpa) || stationHpa <= 0) return null;

    var paM = pressureAltitudeFromStationHpa(stationHpa);
    if (!isFiniteNumber(paM)) return null;
    var paFt = paM * FT_PER_M;

    var ruleOfThumbFt = null;
    if (qnhInHg != null && elevFt != null) {
      // Published thumb rule uses 29.92 inHg and 1,000 ft / inHg.
      var typedInHg = altUnit === "hpa" || altUnit === "mb"
        ? hpaToInHg(Number(input.altimeter))
        : Number(input.altimeter);
      if (isConventionalStandardInHg(typedInHg) || isConventionalStandardHpa(Number(input.altimeter))) {
        typedInHg = 29.92;
      }
      ruleOfThumbFt = elevFt + 1000 * (29.92 - typedInHg);
    }

    // QFE is station pressure expressed as an altimeter setting (reads zero at the field).
    var qfeHpa = stationHpa;
    var qfeInHg = hpaToInHg(qfeHpa);

    return {
      stationPressureHpa: stationHpa,
      stationPressureInHg: hpaToInHg(stationHpa),
      pressureAltitudeFt: paFt,
      pressureAltitudeM: paM,
      elevationFt: elevFt,
      qnhHpa: qnhHpa,
      qnhInHg: qnhInHg,
      qfeHpa: qfeHpa,
      qfeInHg: qfeInHg,
      qneHpa: P0_HPA,
      qneInHg: P0_INHG,
      ruleOfThumbFt: ruleOfThumbFt,
      ruleOfThumbDeltaFt: ruleOfThumbFt != null ? paFt - ruleOfThumbFt : null,
      standardInHg: P0_INHG,
      standardHpa: P0_HPA
    };
  }

  var api = {
    T0: T0,
    L: L,
    P0_HPA: P0_HPA,
    P0_INHG: P0_INHG,
    HPA_PER_INHG: HPA_PER_INHG,
    stationPressureHpa: stationPressureHpa,
    pressureAltitudeFromStationHpa: pressureAltitudeFromStationHpa,
    compute: compute,
    canonicalAltimeterInHg: canonicalAltimeterInHg,
    canonicalAltimeterHpa: canonicalAltimeterHpa
  };

  root.PressureAltitudeCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

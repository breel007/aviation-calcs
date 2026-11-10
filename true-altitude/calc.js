/**
 * True altitude from pressure altitude and the actual temperature of
 * the column, using the standard E6B / training identity:
 *
 *   TA = PA × (T_actual / T_ISA)     (absolute temperatures)
 *
 * which is the same as
 *   TA = PA + PA × (OAT − ISA) / ISA_abs
 *
 * ISA temperature at pressure altitude (troposphere, ICAO):
 *   ISA_K = 288.15 − 0.0065 K/m × PA
 * and is constant 216.65 K from 11 km to 20 km.
 *
 * The common rule of thumb is also reported:
 *   correction ≈ 4 ft per 1 °C of ISA deviation per 1,000 ft of PA
 *   (“from high to low or hot to cold, look out below”).
 *
 * This is a column-temperature correction of a pressure height. It is not
 * a substitute for an altimeter setting, and it does not include a
 * non-standard lapse rate along the whole column. Always treat terrain
 * clearance in cold weather as a published procedure (AIM / PANS-OPS)
 * when one applies.
 *
 * Sources: FAA Pilot's Handbook of Aeronautical Knowledge (altimetry,
 * true altitude, temperature error); FAA Instrument Flying Handbook;
 * ICAO Doc 7488 ISA; AIM cold-temperature altimetry.
 */
(function (root) {
  "use strict";

  var T0 = 288.15;
  var L = 0.0065;
  var M_PER_FT = 0.3048;
  var TROP_FT = 11000 / M_PER_FT;
  var STRAT_TOP_FT = 20000 / M_PER_FT;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function isaTempK(pressureAltitudeFt) {
    if (pressureAltitudeFt <= TROP_FT) return T0 - L * pressureAltitudeFt * M_PER_FT;
    if (pressureAltitudeFt <= STRAT_TOP_FT) return 216.65;
    // Above 20 km this simple page still uses 216.65 unless a full atmosphere
    // is wanted; warn via a flag.
    return 216.65;
  }

  function fToC(f) { return (f - 32) * 5 / 9; }
  function cToF(c) { return c * 9 / 5 + 32; }

  /**
   * input.pressureAltitudeFt
   * input.oat  + input.tempUnit ("C"|"F")   OR  input.isaDeviationC
   */
  function compute(input) {
    if (!input) return null;
    var pa = Number(input.pressureAltitudeFt);
    if (!isFiniteNumber(pa)) return null;

    var isaK = isaTempK(pa);
    var isaC = isaK - 273.15;
    var oatC;
    if (input.isaDeviationC != null && input.isaDeviationC !== "" &&
        (input.oat == null || input.oat === "" || input.tempSource === "isa-dev")) {
      var dev = Number(input.isaDeviationC);
      if (!isFiniteNumber(dev)) return null;
      oatC = isaC + dev;
    } else {
      var raw = Number(input.oat);
      if (!isFiniteNumber(raw)) return null;
      oatC = (input.tempUnit === "F") ? fToC(raw) : raw;
    }
    var oatK = oatC + 273.15;
    if (!(oatK > 0) || !(isaK > 0)) return null;

    var ta = pa * (oatK / isaK);
    var corr = ta - pa;
    var devC = oatC - isaC;
    var ruleCorr = 4 * devC * (pa / 1000);
    var ruleTa = pa + ruleCorr;

    return {
      pressureAltitudeFt: pa,
      isaTempC: isaC,
      isaTempK: isaK,
      oatC: oatC,
      oatF: cToF(oatC),
      isaDeviationC: devC,
      trueAltitudeFt: ta,
      correctionFt: corr,
      ruleOfThumbCorrectionFt: ruleCorr,
      ruleOfThumbTrueFt: ruleTa,
      colderThanIsa: devC < 0,
      aboveTropopause: pa > TROP_FT,
      aboveLowerStratosphere: pa > STRAT_TOP_FT
    };
  }

  var api = {
    T0: T0,
    L: L,
    TROP_FT: TROP_FT,
    isaTempK: isaTempK,
    compute: compute
  };

  root.TrueAltitudeCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

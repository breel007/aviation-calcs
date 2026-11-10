/**
 * Estimated convective cloud base (AGL / MSL) from the temperature–
 * dewpoint spread, plus relative humidity and a freezing-level estimate.
 *
 * The spread closes at about 2.5 °C (4.4 °F) per 1,000 ft because the
 * dry adiabatic lapse rate (~3.0 °C / 1,000 ft, or 5.4 °F) is faster
 * than the dewpoint lapse rate (~0.5 °C / 1,000 ft, or 1.0 °F).
 *
 *   Cloud base AGL (ft) ≈ (T − Td)_°C  / 2.5 × 1,000   =  400 × spread_°C
 *   Cloud base AGL (ft) ≈ (T − Td)_°F  / 4.4 × 1,000   ≈  227 × spread_°F
 *
 * The 2.5 °C and 4.4 °F conventions are the ones taught in the FAA
 * Pilot’s Handbook of Aeronautical Knowledge / many weather texts.
 * They differ slightly (2.5 × 1.8 = 4.5, not 4.4); this calculator
 * uses each convention in its own unit and also reports the 400 ft/°C
 * rule of thumb.
 *
 * Relative humidity uses the Magnus / Bolton (1980) approximation:
 *   es(t) = 6.112 × exp(17.67 t / (t + 243.5))   (t in °C, es in hPa)
 *   RH    = 100 × es(Td) / es(T)
 *
 * Freezing-level AGL ≈ T_°C / lapse × 1,000, with a selectable lapse
 * rate (standard 2 °C/1,000 ft, dry adiabatic 3 °C/1,000 ft, or a
 * moist ≈ 1.5 °C/1,000 ft).
 */
(function (root) {
  "use strict";

  var SPREAD_C_PER_1000 = 2.5;
  var SPREAD_F_PER_1000 = 4.4;
  var FT_PER_C_THUMB = 400; // (T-Td) °C × 400

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function cToF(c) { return c * 9 / 5 + 32; }
  function fToC(f) { return (f - 32) * 5 / 9; }

  /** Saturation vapor pressure in hPa, t in °C. Bolton / Magnus-Tetens. */
  function satVaporHpa(tC) {
    return 6.112 * Math.exp((17.67 * tC) / (tC + 243.5));
  }

  function relativeHumidity(tC, tdC) {
    if (!isFiniteNumber(tC) || !isFiniteNumber(tdC)) return null;
    if (tdC > tC + 1e-9) return null;
    var es = satVaporHpa(tC);
    if (es <= 0) return null;
    var rh = 100 * satVaporHpa(tdC) / es;
    if (rh < 0) rh = 0;
    if (rh > 100) rh = 100;
    return rh;
  }

  function dewpointFromRh(tC, rh) {
    if (!isFiniteNumber(tC) || !isFiniteNumber(rh) || rh <= 0 || rh > 100) return null;
    var e = satVaporHpa(tC) * (rh / 100);
    // Invert Magnus: t = 243.5 ln(e/6.112) / (17.67 − ln(e/6.112))
    var x = Math.log(e / 6.112);
    return (243.5 * x) / (17.67 - x);
  }

  function cloudBaseAglFtFromC(spreadC) {
    return (spreadC / SPREAD_C_PER_1000) * 1000;
  }

  function cloudBaseAglFtFromF(spreadF) {
    return (spreadF / SPREAD_F_PER_1000) * 1000;
  }

  function freezingLevelAglFt(tC, lapseCPerThousand) {
    var lapse = lapseCPerThousand == null ? 2 : lapseCPerThousand;
    if (!(lapse > 0)) return null;
    if (tC <= 0) return 0;
    return (tC / lapse) * 1000;
  }

  function compute(input) {
    if (!input) return null;
    var tC, tdC;
    if (input.unit === "F") {
      var tF = Number(input.temp);
      var tdF = Number(input.dewpoint);
      if (!isFiniteNumber(tF) || !isFiniteNumber(tdF)) return null;
      tC = fToC(tF);
      tdC = fToC(tdF);
    } else {
      tC = Number(input.temp);
      tdC = Number(input.dewpoint);
      if (!isFiniteNumber(tC) || !isFiniteNumber(tdC)) return null;
    }
    if (tdC > tC + 0.05) return { error: "dewpoint-above-temp", tempC: tC, dewpointC: tdC };

    var spreadC = tC - tdC;
    var spreadF = spreadC * 9 / 5;
    var aglC = cloudBaseAglFtFromC(spreadC);
    var aglF = cloudBaseAglFtFromF(spreadF);
    var aglThumb = spreadC * FT_PER_C_THUMB;
    // Primary reported value uses the convention of the input unit, but
    // both are always returned. Default display is the °C / 2.5 formula
    // when the user works in °C, and the °F / 4.4 formula in °F.
    var agl = input.unit === "F" ? aglF : aglC;

    var elev = input.elevation == null || input.elevation === "" ? 0 : Number(input.elevation);
    if (!isFiniteNumber(elev)) elev = 0;
    var elevUnit = input.elevationUnit === "m" ? "m" : "ft";
    var elevFt = elevUnit === "m" ? elev * 3.280839895 : elev;
    var msl = elevFt + agl;
    var mslC = elevFt + aglC;
    var mslF = elevFt + aglF;

    var rh = relativeHumidity(tC, tdC);
    var lapse = input.lapse == null || input.lapse === "" ? 2 : Number(input.lapse);
    var fzAgl = freezingLevelAglFt(tC, lapse);
    var fzMsl = fzAgl == null ? null : elevFt + fzAgl;
    // Flag when the estimated cloud base is at or above the freezing
    // level, i.e. the cloud starts in sub-freezing air (icing possible).
    var baseAtOrBelowFreezing = fzAgl != null && agl >= fzAgl - 0.5;

    return {
      tempC: tC,
      tempF: cToF(tC),
      dewpointC: tdC,
      dewpointF: cToF(tdC),
      spreadC: spreadC,
      spreadF: spreadF,
      rh: rh,
      cloudBaseAglFt: agl,
      cloudBaseAglFtC: aglC,
      cloudBaseAglFtF: aglF,
      cloudBaseAglThumb: aglThumb,
      cloudBaseMslFt: msl,
      cloudBaseMslFtC: mslC,
      cloudBaseMslFtF: mslF,
      elevationFt: elevFt,
      freezingLevelAglFt: fzAgl,
      freezingLevelMslFt: fzMsl,
      lapseCPerThousand: lapse,
      baseAtOrBelowFreezing: baseAtOrBelowFreezing
    };
  }

  var api = {
    SPREAD_C_PER_1000: SPREAD_C_PER_1000,
    SPREAD_F_PER_1000: SPREAD_F_PER_1000,
    FT_PER_C_THUMB: FT_PER_C_THUMB,
    cToF: cToF,
    fToC: fToC,
    satVaporHpa: satVaporHpa,
    relativeHumidity: relativeHumidity,
    dewpointFromRh: dewpointFromRh,
    cloudBaseAglFtFromC: cloudBaseAglFtFromC,
    cloudBaseAglFtFromF: cloudBaseAglFtFromF,
    freezingLevelAglFt: freezingLevelAglFt,
    compute: compute
  };

  root.CloudBaseCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

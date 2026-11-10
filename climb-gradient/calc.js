/**
 * Climb / descent gradient conversions.
 *
 * Given groundspeed (kt) and any one of: ft/NM, feet per minute, percent,
 * or degrees, compute the others and compare with a required departure
 * procedure climb gradient (standard is 200 ft/NM).
 *
 *   ft/NM     = fpm × 60 / groundspeed_kt
 *   fpm       = (ft/NM) × groundspeed_kt / 60
 *   percent   = (ft/NM) / 60.76115 × 100     because 1 NM = 6,076.115 ft
 *   degrees   = arctan((ft/NM) / 6,076.115)
 *
 * The same identities work for a descent (negative or separately signed).
 */
(function (root) {
  "use strict";

  var FT_PER_NM = 6076.11548556;
  var STANDARD_DP_FT_NM = 200;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function percentFromFtNm(ftNm) {
    return (ftNm / FT_PER_NM) * 100;
  }

  function ftNmFromPercent(pct) {
    return (pct / 100) * FT_PER_NM;
  }

  function degFromFtNm(ftNm) {
    return Math.atan(ftNm / FT_PER_NM) * 180 / Math.PI;
  }

  function ftNmFromDeg(deg) {
    return Math.tan(deg * Math.PI / 180) * FT_PER_NM;
  }

  function fpmFromFtNm(ftNm, gsKt) {
    return ftNm * gsKt / 60;
  }

  function ftNmFromFpm(fpm, gsKt) {
    return fpm * 60 / gsKt;
  }

  /**
   * input.mode: 'ftnm' | 'fpm' | 'percent' | 'degrees'
   * input.value: the gradient in that unit (positive for climb or descent)
   * input.groundspeed: knots (required for fpm ↔ others; also for the
   *   required-fpm check against a DP)
   * input.requiredFtNm: optional required climb gradient, default 200
   * input.kind: 'climb' | 'descent' (labels only; math is the same)
   */
  function compute(input) {
    if (!input) return null;
    var gs = Number(input.groundspeed);
    var raw = Number(input.value);
    var mode = input.mode || "ftnm";
    if (!isFiniteNumber(raw)) return null;
    if (raw < 0) return null;

    var needsGs = true;
    var ftNm;
    if (mode === "ftnm") {
      ftNm = raw;
      needsGs = false;
    } else if (mode === "percent") {
      ftNm = ftNmFromPercent(raw);
      needsGs = false;
    } else if (mode === "degrees") {
      if (raw >= 90) return null;
      ftNm = ftNmFromDeg(raw);
      needsGs = false;
    } else if (mode === "fpm") {
      if (!isFiniteNumber(gs) || gs <= 0) return null;
      ftNm = ftNmFromFpm(raw, gs);
    } else {
      return null;
    }

    var hasGs = isFiniteNumber(gs) && gs > 0;
    if (needsGs && !hasGs) return null;

    var required = input.requiredFtNm == null || input.requiredFtNm === ""
      ? STANDARD_DP_FT_NM
      : Number(input.requiredFtNm);
    if (!isFiniteNumber(required) || required < 0) required = STANDARD_DP_FT_NM;

    var fpm = hasGs ? fpmFromFtNm(ftNm, gs) : null;
    var requiredFpm = hasGs ? fpmFromFtNm(required, gs) : null;
    var marginFtNm = ftNm - required;
    var marginFpm = hasGs ? fpm - requiredFpm : null;
    var meets = ftNm + 1e-9 >= required;

    return {
      ftPerNm: ftNm,
      fpm: fpm,
      percent: percentFromFtNm(ftNm),
      degrees: degFromFtNm(ftNm),
      groundspeed: hasGs ? gs : null,
      requiredFtNm: required,
      requiredFpm: requiredFpm,
      requiredPercent: percentFromFtNm(required),
      requiredDegrees: degFromFtNm(required),
      marginFtNm: marginFtNm,
      marginFpm: marginFpm,
      meetsRequired: meets,
      standardDpFtNm: STANDARD_DP_FT_NM
    };
  }

  var api = {
    FT_PER_NM: FT_PER_NM,
    STANDARD_DP_FT_NM: STANDARD_DP_FT_NM,
    percentFromFtNm: percentFromFtNm,
    ftNmFromPercent: ftNmFromPercent,
    degFromFtNm: degFromFtNm,
    ftNmFromDeg: ftNmFromDeg,
    fpmFromFtNm: fpmFromFtNm,
    ftNmFromFpm: ftNmFromFpm,
    compute: compute
  };

  root.ClimbGradientCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

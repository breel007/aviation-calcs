/**
 * Visual descent point (VDP) and a 3°-class descent-path planner for a
 * non-precision approach.
 *
 * Exact distance from the threshold (or from the point at which the path
 * reaches the HAT):
 *   dist_NM = HAT / (FT_PER_NM · tan(θ))
 *
 * The common 3° rule of thumb is HAT / 300 (because a 3° path is about
 * 318 ft/NM, and 300 is the memory item). A 3.00° ILS glide path is
 * 318.4 ft/NM (tan 3° × 6,076.12).
 *
 * Descent rate:  fpm = groundspeed_kt × FT_PER_NM × tan(θ) / 60
 * For 3°, this is very nearly GS × 5 (the “times five” rule).
 *
 * Sources: FAA Instrument Flying Handbook (VDP); AIM / TERPS 3° glide
 * path; FAA Instrument Procedures Handbook; 14 CFR Part 97 approach
 * procedures (HAT is as published — this page does not design a procedure).
 */
(function (root) {
  "use strict";

  var FT_PER_NM = 6076.11548556;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function ftPerNm(angleDeg) {
    return FT_PER_NM * Math.tan(angleDeg * Math.PI / 180);
  }

  function vdpNm(hatFt, angleDeg) {
    var slope = ftPerNm(angleDeg);
    if (!(slope > 0) || !(hatFt >= 0)) return NaN;
    return hatFt / slope;
  }

  function descentRateFpm(gsKt, angleDeg) {
    if (!(gsKt > 0)) return NaN;
    return ftPerNm(angleDeg) * gsKt / 60;
  }

  /**
   * input.hatFt  (height above touchdown / MDA HAT)
   * input.angleDeg (default 3)
   * input.groundspeedKt (optional, for fpm and time)
   * input.thresholdDme (optional, DME at the threshold or MAP if used that way)
   * input.mdaFt, input.tdzeFt — optional; HAT = MDA − TDZE if hat not given
   */
  function compute(input) {
    if (!input) return null;
    var hat = Number(input.hatFt);
    if (!isFiniteNumber(hat) || hat < 0) {
      var mda = Number(input.mdaFt);
      var tdze = Number(input.tdzeFt);
      if (isFiniteNumber(mda) && isFiniteNumber(tdze)) hat = mda - tdze;
    }
    if (!isFiniteNumber(hat) || hat < 0) return null;
    var angle = input.angleDeg == null || input.angleDeg === "" ? 3 : Number(input.angleDeg);
    if (!isFiniteNumber(angle) || angle <= 0 || angle >= 45) return null;

    var exactNm = vdpNm(hat, angle);
    var rule300Nm = hat / 300;
    var rule320Nm = hat / 320;
    var slope = ftPerNm(angle);

    var gs = input.groundspeedKt == null || input.groundspeedKt === "" ? null : Number(input.groundspeedKt);
    var fpm = isFiniteNumber(gs) && gs > 0 ? descentRateFpm(gs, angle) : null;
    var timeMin = isFiniteNumber(gs) && gs > 0 ? (exactNm / gs) * 60 : null;
    var timesFive = isFiniteNumber(gs) && gs > 0 ? gs * 5 * (angle / 3) : null;

    var thresholdDme = input.thresholdDme == null || input.thresholdDme === "" ? null : Number(input.thresholdDme);
    var vdpDme = isFiniteNumber(thresholdDme) ? thresholdDme + exactNm : null;

    return {
      hatFt: hat,
      angleDeg: angle,
      ftPerNm: slope,
      vdpNm: exactNm,
      rule300Nm: rule300Nm,
      rule320Nm: rule320Nm,
      descentRateFpm: fpm,
      timesFiveFpm: timesFive,
      timeMin: timeMin,
      groundspeedKt: isFiniteNumber(gs) && gs > 0 ? gs : null,
      vdpDme: vdpDme,
      thresholdDme: isFiniteNumber(thresholdDme) ? thresholdDme : null
    };
  }

  var api = {
    FT_PER_NM: FT_PER_NM,
    ftPerNm: ftPerNm,
    vdpNm: vdpNm,
    descentRateFpm: descentRateFpm,
    compute: compute
  };

  root.VisualDescentPointCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

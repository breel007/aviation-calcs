/**
 * Required descent rate (VSI) for a constant-angle glide path, including
 * a 3° ILS / LPV glideslope, and the matching gradient in ft/NM.
 *
 *   ft per NM     = tan(γ) × 6,076.1155… ft/NM     (1 NM = 1,852 m)
 *   descent (fpm) = groundspeed (kt) × (ft per NM) / 60
 *
 * For a 3° path, tan 3° × 6,076.12 ≈ 318.4 ft/NM, so
 *   fpm ≈ 5.31 × groundspeed (kt).
 * The memory item “groundspeed × 5” is a slightly shallow 3° target
 * (120 kt → 600 fpm vs about 637 fpm exact). This page shows both,
 * plus a 300 ft/NM (HAT/300 style) check.
 *
 * The same identity is used on the site's top-of-descent and visual
 * descent point calculators; this page is the glideslope / VSI form
 * (given groundspeed and angle, what rate to fly), including the
 * inverse (angle from a chosen rate).
 *
 * Sources: FAA Instrument Flying Handbook (ILS glideslope, descent
 * planning); FAA Instrument Procedures Handbook; AIM instrument
 * approach procedures; standard 3° glide-path geometry.
 */
(function (root) {
  "use strict";

  var FT_PER_NM = 1852 / 0.3048; // 6076.11548556…, same as TOD / VDP
  var DEG = Math.PI / 180;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function ftPerNm(angleDeg) {
    if (!isFiniteNumber(angleDeg) || angleDeg <= 0 || angleDeg >= 90) return NaN;
    return Math.tan(angleDeg * DEG) * FT_PER_NM;
  }

  function descentRateFpm(groundspeedKt, angleDeg) {
    var g = ftPerNm(angleDeg);
    if (!isFiniteNumber(groundspeedKt) || groundspeedKt < 0 || !isFiniteNumber(g)) return NaN;
    return groundspeedKt * g / 60;
  }

  function angleFromRate(fpm, groundspeedKt) {
    if (!(fpm > 0) || !(groundspeedKt > 0)) return NaN;
    return Math.atan((fpm * 60 / groundspeedKt) / FT_PER_NM) / DEG;
  }

  function angleFromFtPerNm(ftNm) {
    if (!(ftNm > 0)) return NaN;
    return Math.atan(ftNm / FT_PER_NM) / DEG;
  }

  function compute(input) {
    if (!input) return null;
    var mode = input.mode || "angle";
    var gs = Number(input.groundspeed);
    if (!isFiniteNumber(gs) || gs < 0) return null;

    var angle, fpm, ftNm;
    if (mode === "rate") {
      fpm = Number(input.fpm);
      if (!isFiniteNumber(fpm) || fpm <= 0) return null;
      if (gs === 0) return null;
      angle = angleFromRate(fpm, gs);
      ftNm = fpm * 60 / gs;
    } else if (mode === "ft-per-nm") {
      ftNm = Number(input.ftPerNm);
      if (!isFiniteNumber(ftNm) || ftNm <= 0) return null;
      angle = angleFromFtPerNm(ftNm);
      fpm = gs * ftNm / 60;
    } else {
      angle = input.angle == null || input.angle === "" ? 3 : Number(input.angle);
      if (!isFiniteNumber(angle) || angle <= 0 || angle >= 90) return null;
      ftNm = ftPerNm(angle);
      fpm = gs * ftNm / 60;
    }
    if (!isFiniteNumber(angle) || !isFiniteNumber(fpm) || !isFiniteNumber(ftNm)) return null;

    var ruleTimes5 = gs * 5;
    var rule300Fpm = gs * 300 / 60; // 300 ft/NM
    var isThree = Math.abs(angle - 3) < 0.051;
    var timePerThousandMin = fpm > 0 ? 1000 / fpm : Infinity;

    return {
      mode: mode,
      groundspeedKt: gs,
      angleDeg: angle,
      ftPerNm: ftNm,
      fpm: fpm,
      mps: fpm * 0.3048 / 60,
      ruleTimes5Fpm: ruleTimes5,
      ruleTimes5DeltaFpm: fpm - ruleTimes5,
      rule300FtPerNm: 300,
      rule300Fpm: rule300Fpm,
      isNearlyThreeDeg: isThree,
      tanAngle: Math.tan(angle * DEG),
      gradientPercent: Math.tan(angle * DEG) * 100,
      nmPerThousandFt: 1000 / ftNm,
      timePerThousandMin: timePerThousandMin,
      ftPerNmStandard: FT_PER_NM
    };
  }

  var api = {
    FT_PER_NM: FT_PER_NM,
    ftPerNm: ftPerNm,
    descentRateFpm: descentRateFpm,
    angleFromRate: angleFromRate,
    compute: compute
  };
  root.DescentRateCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

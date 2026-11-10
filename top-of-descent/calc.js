/**
 * Top of descent (TOD) and descent rate.
 *
 * Exact geometry for a constant flight-path angle γ:
 *   distance (nm)       = altitude to lose (ft) / (tan γ × 6076.12 ft/nm)
 *   vertical speed (fpm) = groundspeed (kt) × 6076.12 / 60 × tan γ
 *
 * Common rules of thumb (3° path):
 *   distance ≈ altitude to lose (thousands of ft) × 3
 *   descent rate ≈ groundspeed × 5
 *
 * The 3° rules work because tan 3° × 6076 ≈ 318 ft per nm (≈ 1/3 nm per
 * 100 ft), and 318 ft/nm × kt / 60 ≈ 5.3 × groundspeed.
 */
(function (root) {
  "use strict";

  var FT_PER_NM = 1852 / 0.3048; // 6076.1155 ft
  var DEG = Math.PI / 180;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function ftPerNm(angleDeg) {
    return Math.tan(angleDeg * DEG) * FT_PER_NM;
  }

  /** Descent distance (nm) for an altitude to lose and a path angle. */
  function descentDistanceNm(altToLoseFt, angleDeg) {
    if (!(altToLoseFt >= 0) || !(angleDeg > 0) || angleDeg >= 90) return NaN;
    return altToLoseFt / ftPerNm(angleDeg);
  }

  /** Vertical speed (fpm) for a groundspeed and path angle. */
  function descentRateFpm(groundspeedKt, angleDeg) {
    if (!(groundspeedKt >= 0) || !(angleDeg > 0) || angleDeg >= 90) return NaN;
    return groundspeedKt * ftPerNm(angleDeg) / 60;
  }

  /** Path angle (deg) from a vertical speed and groundspeed. */
  function angleFromRate(fpm, groundspeedKt) {
    if (!(fpm > 0) || !(groundspeedKt > 0)) return NaN;
    var ftPerNmVal = fpm * 60 / groundspeedKt;
    return Math.atan(ftPerNmVal / FT_PER_NM) / DEG;
  }

  /** Path angle (deg) from an altitude to lose and a distance. */
  function angleFromDistance(altToLoseFt, distanceNm) {
    if (!(altToLoseFt > 0) || !(distanceNm > 0)) return NaN;
    return Math.atan(altToLoseFt / (distanceNm * FT_PER_NM)) / DEG;
  }

  function ruleOfThumbDistanceNm(altToLoseFt) {
    return altToLoseFt / 1000 * 3;
  }

  function ruleOfThumbRateFpm(groundspeedKt) {
    return groundspeedKt * 5;
  }

  /**
   * input:
   *   cruiseAltFt, targetAltFt, groundspeedKt
   *   method: "angle" (default) | "rate"
   *   angleDeg (default 3)
   *   rateFpm   (when method === "rate")
   *   bufferNm  (optional extra distance, e.g. to cross a fix early)
   */
  function compute(input) {
    input = input || {};
    var cruise = input.cruiseAltFt;
    var target = input.targetAltFt;
    var gs = input.groundspeedKt;
    if (!isFiniteNumber(cruise) || !isFiniteNumber(target)) {
      return { error: "Enter the cruise altitude and the target altitude." };
    }
    var toLose = cruise - target;
    if (toLose <= 0) {
      return { error: "The target altitude must be below the cruise altitude.", altToLoseFt: toLose };
    }
    if (!isFiniteNumber(gs) || gs <= 0) {
      return { error: "Enter a groundspeed greater than zero.", altToLoseFt: toLose };
    }

    var method = input.method === "rate" ? "rate" : "angle";
    var angle, rate, distance;
    if (method === "rate") {
      rate = input.rateFpm;
      if (!isFiniteNumber(rate) || rate <= 0) {
        return { error: "Enter a descent rate greater than zero.", altToLoseFt: toLose };
      }
      angle = angleFromRate(rate, gs);
      var minutes = toLose / rate;
      distance = gs * minutes / 60;
    } else {
      angle = isFiniteNumber(input.angleDeg) ? input.angleDeg : 3;
      if (!(angle > 0) || angle >= 30) {
        return { error: "Use a descent angle between 0° and 30°.", altToLoseFt: toLose };
      }
      distance = descentDistanceNm(toLose, angle);
      rate = descentRateFpm(gs, angle);
    }

    var buffer = isFiniteNumber(input.bufferNm) && input.bufferNm > 0 ? input.bufferNm : 0;
    var timeMin = toLose / rate;

    return {
      method: method,
      cruiseAltFt: cruise,
      targetAltFt: target,
      altToLoseFt: toLose,
      groundspeedKt: gs,
      angleDeg: angle,
      rateFpm: rate,
      descentDistanceNm: distance,
      bufferNm: buffer,
      todDistanceNm: distance + buffer,
      descentTimeMin: timeMin,
      ftPerNm: ftPerNm(angle),
      gradientPercent: Math.tan(angle * DEG) * 100,
      ruleDistanceNm: ruleOfThumbDistanceNm(toLose),
      ruleRateFpm: ruleOfThumbRateFpm(gs),
      error: null
    };
  }

  var api = {
    FT_PER_NM: FT_PER_NM,
    isFiniteNumber: isFiniteNumber,
    ftPerNm: ftPerNm,
    descentDistanceNm: descentDistanceNm,
    descentRateFpm: descentRateFpm,
    angleFromRate: angleFromRate,
    angleFromDistance: angleFromDistance,
    ruleOfThumbDistanceNm: ruleOfThumbDistanceNm,
    ruleOfThumbRateFpm: ruleOfThumbRateFpm,
    compute: compute
  };

  root.TopOfDescent = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

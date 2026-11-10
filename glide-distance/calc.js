/**
 * Best-glide distance and reachable range, including wind.
 *
 * Still-air ground distance (NM) = (altitude_ft / 6076.12) × glide ratio.
 * Glide ratio is distance / altitude in consistent units (9:1 means
 * 9 feet forward for each foot of altitude lost).
 *
 * With a best-glide TAS Vg and a headwind component Hw (positive
 * headwind, negative tailwind):
 *   sink rate (ft/min) = Vg(kt) × 6076.12 / (60 × ratio)
 *                      = Vg × 101.2687 / ratio
 *   time (min)         = altitude_ft / sink_rate
 *   groundspeed        = Vg − Hw
 *   ground distance    = GS × time / 60
 *
 * The reachable area in a uniform wind is a circle of still-air radius
 * shifted downwind by wind_speed × time.
 */
(function (root) {
  "use strict";

  var FT_PER_NM = 6076.11548556;
  var FT_PER_SM = 5280;
  var KT_TO_FPM = FT_PER_NM / 60; // 101.2686 ft per minute at 1 knot

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function headingDiff(from, to) {
    var d = ((to - from + 540) % 360) - 180;
    return d;
  }

  function windComponents(course, windFrom, windSpeed) {
    var angle = ((windFrom - course + 540) % 360) - 180;
    var rad = angle * Math.PI / 180;
    return {
      angle: angle,
      headwind: windSpeed * Math.cos(rad),
      crosswind: windSpeed * Math.sin(rad)
    };
  }

  /**
   * Glide angle in degrees from a ratio (rise/run inverted).
   * angle = arctan(1 / ratio).
   */
  function angleFromRatio(ratio) {
    if (!(ratio > 0)) return null;
    return Math.atan(1 / ratio) * 180 / Math.PI;
  }

  function ratioFromAngle(deg) {
    if (!(deg > 0) && deg !== 0) return null;
    if (deg <= 0 || deg >= 90) return null;
    return 1 / Math.tan(deg * Math.PI / 180);
  }

  function compute(input) {
    if (!input) return null;
    var alt = Number(input.altitude);
    var ratio = Number(input.glideRatio);
    var vg = input.bestGlide == null || input.bestGlide === "" ? NaN : Number(input.bestGlide);
    if (!isFiniteNumber(alt) || alt <= 0) return null;
    if (!isFiniteNumber(ratio) || ratio <= 0 || ratio > 80) return null;

    var stillAirNm = (alt / FT_PER_NM) * ratio;
    var stillAirSm = (alt / FT_PER_SM) * ratio;
    var stillAirFt = alt * ratio;
    var angle = angleFromRatio(ratio);

    var hasSpeed = isFiniteNumber(vg) && vg > 0;
    var sinkFpm = hasSpeed ? (vg * KT_TO_FPM) / ratio : null;
    var timeMin = hasSpeed ? alt / sinkFpm : null;

    var windSpeed = input.windSpeed == null || input.windSpeed === "" ? 0 : Number(input.windSpeed);
    if (!isFiniteNumber(windSpeed) || windSpeed < 0) windSpeed = 0;
    var hw;
    if (input.windMode === "component") {
      hw = input.headwind == null || input.headwind === "" ? 0 : Number(input.headwind);
      if (!isFiniteNumber(hw)) hw = 0;
    } else if (isFiniteNumber(Number(input.course)) && isFiniteNumber(Number(input.windFrom))) {
      var wc = windComponents(Number(input.course), Number(input.windFrom), windSpeed);
      hw = wc.headwind;
    } else {
      hw = 0;
    }

    var intoWind = null;
    var downWind = null;
    var crossRange = null;
    var alongCourse = null;
    var gs = null;
    var windOffsetNm = null;
    var reachableMin = null;
    var reachableMax = null;
    var canReach = null;

    if (hasSpeed) {
      // Envelope wind magnitude: full wind speed when a direction is
      // given, otherwise the magnitude of the entered head/tail component.
      var w = input.windMode === "vector" ? windSpeed : Math.abs(hw);
      intoWind = ((vg - w) * timeMin) / 60;
      downWind = ((vg + w) * timeMin) / 60;
      if (intoWind < 0) intoWind = 0;
      // In a uniform wind the reachable area is the still-air circle
      // translated downwind, so the range abeam the wind is the still-air
      // radius.
      crossRange = stillAirNm;
      windOffsetNm = (w * timeMin) / 60;
      reachableMin = intoWind;
      reachableMax = downWind;

      if (input.windMode !== "vector") {
        gs = vg - hw;
        alongCourse = (gs * timeMin) / 60;
        if (alongCourse < 0) alongCourse = 0;
      } else if (isFiniteNumber(Number(input.course)) && isFiniteNumber(Number(input.windFrom))) {
        var hwC = windComponents(Number(input.course), Number(input.windFrom), windSpeed).headwind;
        gs = vg - hwC;
        alongCourse = (gs * timeMin) / 60;
        if (alongCourse < 0) alongCourse = 0;
      }

      if (input.targetDistance != null && input.targetDistance !== "") {
        var tgt = Number(input.targetDistance);
        if (isFiniteNumber(tgt) && tgt >= 0) {
          var bearing = input.targetBearing == null || input.targetBearing === "" ? null : Number(input.targetBearing);
          if (isFiniteNumber(bearing) && input.windMode === "vector" && isFiniteNumber(Number(input.windFrom))) {
            // Target point at (distance, bearing). Wind from W means the
            // circle is shifted toward W+180.
            var windTo = (Number(input.windFrom) + 180) % 360;
            var ang = ((bearing - windTo) * Math.PI) / 180;
            // Distance from shifted center to target:
            // center is windOffset downwind from origin.
            // target is tgt at bearing.
            var cx = windOffsetNm;
            var tx = tgt * Math.cos(ang);
            var ty = tgt * Math.sin(ang);
            var dist = Math.sqrt((tx - cx) * (tx - cx) + ty * ty);
            canReach = dist <= stillAirNm + 1e-9;
          } else {
            // No wind direction: treat target distance along the chosen course
            // (or as a still-air / into-or-down-wind range check).
            var limit = alongCourse != null ? alongCourse : stillAirNm;
            canReach = tgt <= limit + 1e-9;
          }
        }
      }
    }

    return {
      altitudeFt: alt,
      glideRatio: ratio,
      angleDeg: angle,
      stillAirNm: stillAirNm,
      stillAirSm: stillAirSm,
      stillAirFt: stillAirFt,
      bestGlideKt: hasSpeed ? vg : null,
      sinkFpm: sinkFpm,
      timeMin: timeMin,
      headwind: hasSpeed ? hw : null,
      groundspeed: gs,
      alongCourseNm: alongCourse,
      intoWindNm: intoWind,
      downWindNm: downWind,
      crossRangeNm: crossRange,
      windOffsetNm: windOffsetNm,
      reachableMinNm: reachableMin,
      reachableMaxNm: reachableMax,
      canReach: canReach
    };
  }

  var api = {
    FT_PER_NM: FT_PER_NM,
    KT_TO_FPM: KT_TO_FPM,
    windComponents: windComponents,
    angleFromRatio: angleFromRatio,
    ratioFromAngle: ratioFromAngle,
    compute: compute
  };

  root.GlideDistanceCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

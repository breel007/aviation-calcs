/**
 * E6B wind triangle.
 *
 * Forward: true course, TAS, wind direction (FROM) and speed
 *   → wind correction angle, true heading, groundspeed.
 *
 * Reverse: true heading, TAS, true course, groundspeed
 *   → wind direction (FROM) and wind speed.
 *
 * Convention matches a mechanical E6B / electronic flight computer:
 *   wind is the direction the wind is coming FROM;
 *   a positive WCA is a correction to the right (heading = course + WCA);
 *   crosswind is positive when the wind is from the right of the course.
 *
 * Vector form (north/east, headings clockwise from north):
 *   air   = TAS at heading TH
 *   wind  = WS toward WD+180
 *   ground = GS at course TC
 *   ground = air + wind
 */
(function (root) {
  "use strict";

  var DEG = Math.PI / 180;
  var KT_TO_MPH = 1852 / 1609.344;
  var KT_TO_KMH = 1.852;
  var KT_TO_MPS = 1852 / 3600;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function toRad(deg) {
    return deg * DEG;
  }

  function toDeg(rad) {
    return rad / DEG;
  }

  /** Normalize a heading into (0, 360], with 0 and 360 displayed as 360. */
  function normalizeHeading(deg) {
    if (!isFiniteNumber(deg)) return NaN;
    var x = deg % 360;
    if (x < 0) x += 360;
    if (x === 0) return 360;
    return x;
  }

  /** Smallest signed angle in (−180, 180]. */
  function wrap180(deg) {
    var x = deg % 360;
    if (x > 180) x -= 360;
    if (x <= -180) x += 360;
    return x;
  }

  function headingComponents(speed, headingDeg) {
    var h = toRad(headingDeg);
    return {
      north: speed * Math.cos(h),
      east: speed * Math.sin(h)
    };
  }

  /**
   * Wind components relative to a course.
   * Positive crosswind is from the right; positive headwind is a headwind.
   */
  function courseWindComponents(courseDeg, windFromDeg, windSpeed) {
    var angle = wrap180(windFromDeg - courseDeg);
    var rad = toRad(angle);
    return {
      angleDeg: angle,
      crosswind: windSpeed * Math.sin(rad),
      headwind: windSpeed * Math.cos(rad)
    };
  }

  /**
   * Forward wind-triangle solution.
   * Returns null-ish fields and an error if the wind cannot be corrected
   * (crosswind greater than TAS).
   */
  function solveHeadingAndGs(trueCourse, tas, windFrom, windSpeed) {
    if (![trueCourse, tas, windFrom, windSpeed].every(isFiniteNumber)) {
      return { error: "Enter course, true airspeed, wind direction, and wind speed." };
    }
    if (tas <= 0) return { error: "True airspeed must be greater than zero." };
    if (windSpeed < 0) return { error: "Wind speed cannot be negative." };

    var tc = normalizeHeading(trueCourse);
    var wd = normalizeHeading(windFrom);
    var comp = courseWindComponents(tc, wd, windSpeed);
    var xw = comp.crosswind;
    var hw = comp.headwind;

    if (Math.abs(xw) > tas + 1e-12) {
      return {
        error: "Crosswind is greater than true airspeed, so the course cannot be maintained.",
        trueCourse: tc,
        tas: tas,
        windFrom: wd,
        windSpeed: windSpeed,
        crosswind: xw,
        headwind: hw,
        windAngleDeg: comp.angleDeg,
        impossible: true
      };
    }

    var wcaRad = Math.asin(Math.max(-1, Math.min(1, xw / tas)));
    var wca = toDeg(wcaRad);
    var th = normalizeHeading(tc + wca);
    var gs = Math.sqrt(Math.max(0, tas * tas - xw * xw)) - hw;

    var result = {
      trueCourse: tc,
      tas: tas,
      windFrom: wd,
      windSpeed: windSpeed,
      windAngleDeg: comp.angleDeg,
      crosswind: xw,
      headwind: hw,
      wca: wca,
      trueHeading: th,
      groundspeed: gs,
      impossible: gs < 0,
      error: null
    };

    if (gs < 0) {
      result.error = "Computed groundspeed is negative — the headwind is stronger than the along-track airspeed. The course cannot be made good.";
    }
    return result;
  }

  /**
   * Reverse solution: recover the wind from heading, TAS, course, and GS.
   */
  function solveWind(trueHeading, tas, trueCourse, groundspeed) {
    if (![trueHeading, tas, trueCourse, groundspeed].every(isFiniteNumber)) {
      return { error: "Enter heading, true airspeed, course, and groundspeed." };
    }
    if (tas <= 0) return { error: "True airspeed must be greater than zero." };
    if (groundspeed < 0) return { error: "Groundspeed cannot be negative." };

    var th = normalizeHeading(trueHeading);
    var tc = normalizeHeading(trueCourse);
    var air = headingComponents(tas, th);
    var gnd = headingComponents(groundspeed, tc);
    var windNorth = gnd.north - air.north; // air-mass velocity (toward)
    var windEast = gnd.east - air.east;
    var ws = Math.sqrt(windNorth * windNorth + windEast * windEast);
    var toDegHeading = toDeg(Math.atan2(windEast, windNorth));
    var windFrom = ws < 1e-10 ? 360 : normalizeHeading(toDegHeading + 180);
    var wca = wrap180(th - tc);
    var comp = courseWindComponents(tc, windFrom, ws);

    return {
      trueHeading: th,
      tas: tas,
      trueCourse: tc,
      groundspeed: groundspeed,
      wca: wca,
      windFrom: windFrom,
      windSpeed: ws,
      crosswind: comp.crosswind,
      headwind: comp.headwind,
      windAngleDeg: comp.angleDeg,
      calm: ws < 1e-10,
      error: null
    };
  }

  function compute(input) {
    input = input || {};
    var mode = input.mode === "wind" ? "wind" : "heading";
    if (mode === "wind") {
      return Object.assign({ mode: mode }, solveWind(input.trueHeading, input.tas, input.trueCourse, input.groundspeed));
    }
    return Object.assign({ mode: mode }, solveHeadingAndGs(input.trueCourse, input.tas, input.windFrom, input.windSpeed));
  }

  var api = {
    KT_TO_MPH: KT_TO_MPH,
    KT_TO_KMH: KT_TO_KMH,
    KT_TO_MPS: KT_TO_MPS,
    isFiniteNumber: isFiniteNumber,
    normalizeHeading: normalizeHeading,
    wrap180: wrap180,
    courseWindComponents: courseWindComponents,
    solveHeadingAndGs: solveHeadingAndGs,
    solveWind: solveWind,
    compute: compute
  };

  root.E6BWind = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

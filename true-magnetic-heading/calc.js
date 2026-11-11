/**
 * True, magnetic, and compass heading (or course) conversion using
 * magnetic variation and, optionally, compass deviation.
 *
 *   magnetic = true − east variation  =  true + west variation
 *   compass  = magnetic − east deviation = magnetic + west deviation
 *
 * That is the memory item “east is least, west is best.” Variation is
 * the angle between true north and magnetic north at your location
 * (from the chart or a current model). Deviation is the airplane’s
 * compass error, from the compass correction card, and depends on
 * heading.
 *
 * The same identities convert true course, magnetic course, and
 * compass course. They do not include a wind-correction angle — for
 * heading from course and wind, use the E6B wind-triangle calculator.
 *
 * Sources: FAA Pilot's Handbook of Aeronautical Knowledge (magnetic
 * variation, compass deviation, “east is least, west is best”); AIM
 * (isogonic lines, runway numbering is magnetic).
 */
(function (root) {
  "use strict";

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function wrap360(deg) {
    var x = deg % 360;
    if (x < 0) x += 360;
    if (Math.abs(x - 360) < 1e-12) x = 0;
    return x;
  }

  function signedAngle(value, dir) {
    if (!isFiniteNumber(value)) return NaN;
    var mag = Math.abs(value);
    if (dir === "W" || dir === "w" || dir === "west") return -mag;
    if (dir === "E" || dir === "e" || dir === "east") return mag;
    // A signed input: positive east, negative west (or already signed).
    return value;
  }

  /**
   * input.from: "true" | "magnetic" | "compass"
   * input.heading: degrees 0–360
   * input.variation, input.variationDir ("E"|"W")
   * input.deviation, input.deviationDir ("E"|"W")  optional
   */
  function compute(input) {
    if (!input) return null;
    var hdg = Number(input.heading);
    if (!isFiniteNumber(hdg)) return null;
    // Allow 360 as a synonym for 0.
    if (hdg < 0 || hdg > 360) return null;

    var varE = 0;
    if (input.variation != null && input.variation !== "") {
      varE = signedAngle(Number(input.variation), input.variationDir || "E");
      if (!isFiniteNumber(varE)) return null;
    }
    var devE = 0;
    var hasDev = input.deviation != null && input.deviation !== "";
    if (hasDev) {
      devE = signedAngle(Number(input.deviation), input.deviationDir || "E");
      if (!isFiniteNumber(devE)) return null;
    }

    var from = input.from || "true";
    var trueHdg, magHdg, compassHdg;
    if (from === "magnetic") {
      magHdg = wrap360(hdg);
      trueHdg = wrap360(magHdg + varE);
      compassHdg = wrap360(magHdg - devE);
    } else if (from === "compass") {
      compassHdg = wrap360(hdg);
      magHdg = wrap360(compassHdg + devE);
      trueHdg = wrap360(magHdg + varE);
    } else {
      trueHdg = wrap360(hdg);
      magHdg = wrap360(trueHdg - varE);
      compassHdg = wrap360(magHdg - devE);
    }

    return {
      from: from,
      trueHeading: trueHdg,
      magneticHeading: magHdg,
      compassHeading: compassHdg,
      variationEast: varE,
      deviationEast: devE,
      hasDeviation: hasDev,
      // Display helpers: 360 rather than 0 when the user typed 360 and
      // the result wraps to 0? Keep 0–360 with 0 for north.
      wrapIsNorth: trueHdg === 0 || magHdg === 0
    };
  }

  var api = { wrap360: wrap360, signedAngle: signedAngle, compute: compute };
  root.TrueMagneticHeadingCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

/**
 * Crosswind, headwind, and tailwind component calculations.
 *
 * Standard aviation convention (same as an E6B / flight computer):
 *   angle     = wind direction − runway heading  (wind FROM, heading TO)
 *   crosswind = speed × sin(angle)
 *   headwind  = speed × cos(angle)
 *
 * A positive crosswind is from the right (as seen looking along the runway
 * heading). A positive headwind is a headwind; a negative headwind is a
 * tailwind.
 *
 * Runway numbers are magnetic. METAR wind is true; ATIS and tower wind
 * is usually magnetic. Optional magnetic variation converts a true wind
 * to magnetic (east variation is subtracted from true).
 */
(function (root) {
  "use strict";

  var KT_TO_MPH = 1.150779448;
  var KT_TO_MPS = 0.514444;
  var KT_TO_KPH = 1.852;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function normalizeHeading(deg) {
    var x = deg % 360;
    if (x < 0) x += 360;
    if (x === 0) return 360;
    return x;
  }

  function normalizeAngle180(deg) {
    var x = deg % 360;
    if (x > 180) x -= 360;
    if (x <= -180) x += 360;
    return x;
  }

  /**
   * Parse a runway identifier ("27", "09L", "36C") or a heading in degrees.
   * Returns { heading, runwayNumber, suffix, source } or null.
   */
  function parseRunwayOrHeading(input, mode) {
    if (input == null) return null;
    var raw = String(input).trim().toUpperCase();
    if (!raw) return null;
    var suffix = "";
    var m = raw.match(/^(\d{1,3}(?:\.\d+)?)([LCR])?$/);
    if (!m) return null;
    var num = Number(m[1]);
    if (!isFiniteNumber(num)) return null;
    if (m[2]) suffix = m[2];

    var useRunway = mode === "runway" || (mode !== "heading" && num >= 1 && num <= 36 && !/\./.test(m[1]) && (m[1].length <= 2 || m[1].length === 2));
    // If mode is explicit, honor it. Otherwise: 1–36 with at most two digits → runway number.
    if (mode === "heading") useRunway = false;
    if (mode === "runway") useRunway = true;
    if (mode == null || mode === "auto") {
      useRunway = num >= 1 && num <= 36 && m[1].indexOf(".") === -1 && m[1].length <= 2;
    }

    var heading;
    var runwayNumber = null;
    if (useRunway) {
      if (num < 1 || num > 36) return null;
      runwayNumber = num;
      heading = num === 36 ? 360 : num * 10;
    } else {
      if (num < 0 || num > 360) return null;
      heading = num === 0 ? 360 : num;
      runwayNumber = runwayNumberFromHeading(heading);
    }
    return {
      heading: normalizeHeading(heading),
      runwayNumber: runwayNumber,
      suffix: suffix,
      source: useRunway ? "runway" : "heading",
      label: formatRunwayLabel(runwayNumber, suffix)
    };
  }

  function runwayNumberFromHeading(heading) {
    var n = Math.round(normalizeHeading(heading) / 10);
    if (n === 0 || n === 36) return 36;
    if (n > 36) return 36;
    return n;
  }

  function formatRunwayLabel(num, suffix) {
    if (!isFiniteNumber(num)) return "—";
    var s = (num < 10 ? "0" : "") + String(num);
    return s + (suffix || "");
  }

  function oppositeRunway(parsed) {
    var heading = normalizeHeading(parsed.heading + 180);
    var num = runwayNumberFromHeading(heading);
    return {
      heading: heading,
      runwayNumber: num,
      suffix: parsed.suffix || "",
      source: parsed.source,
      label: formatRunwayLabel(num, parsed.suffix || "")
    };
  }

  /**
   * Convert a true-direction wind to magnetic.
   * East variation is subtracted from true (magnetic = true − east).
   * West variation is added. `variationEast` is signed: +E, −W.
   */
  function trueToMagnetic(trueDir, variationEast) {
    if (!isFiniteNumber(variationEast)) return normalizeHeading(trueDir);
    return normalizeHeading(trueDir - variationEast);
  }

  function magneticToTrue(magDir, variationEast) {
    if (!isFiniteNumber(variationEast)) return normalizeHeading(magDir);
    return normalizeHeading(magDir + variationEast);
  }

  /**
   * Components for one runway heading and one wind (same reference).
   */
  function components(runwayHeading, windDirection, speed) {
    if (!isFiniteNumber(runwayHeading) || !isFiniteNumber(windDirection) || !isFiniteNumber(speed)) {
      return null;
    }
    if (speed < 0) return null;
    var angle = normalizeAngle180(windDirection - runwayHeading);
    var rad = angle * Math.PI / 180;
    var cross = speed * Math.sin(rad);
    var head = speed * Math.cos(rad);
    return {
      angleDeg: angle,
      crosswind: cross,
      headwind: head,
      crosswindAbs: Math.abs(cross),
      headwindAbs: Math.abs(head),
      crossFrom: cross > 0.05 ? "right" : cross < -0.05 ? "left" : "none",
      flow: head > 0.05 ? "headwind" : head < -0.05 ? "tailwind" : "calm-axis"
    };
  }

  /**
   * Full result for both runway ends, sustained and gust.
   *
   * input:
   *   runway          string/number  (e.g. "27" or 270)
   *   runwayMode      "runway" | "heading" | "auto"
   *   windDirection   degrees (FROM)
   *   windReference   "magnetic" | "true"
   *   variationEast   degrees east (optional; used if wind is true)
   *   speed           sustained speed
   *   gust            optional peak gust
   *   maxDemonstrated optional max demonstrated crosswind (same units as speed)
   */
  function compute(input) {
    var parsed = parseRunwayOrHeading(input.runway, input.runwayMode || "auto");
    if (!parsed) return null;
    if (!isFiniteNumber(input.windDirection) || !isFiniteNumber(input.speed) || input.speed < 0) {
      return null;
    }

    var windMag = input.windDirection;
    var variationApplied = false;
    if (input.windReference === "true" && isFiniteNumber(input.variationEast)) {
      windMag = trueToMagnetic(input.windDirection, input.variationEast);
      variationApplied = true;
    } else if (input.windReference === "true" && !isFiniteNumber(input.variationEast)) {
      // No variation given: treat the entered wind as already aligned,
      // but flag that METAR true vs runway magnetic may differ.
      windMag = normalizeHeading(input.windDirection);
    } else {
      windMag = normalizeHeading(input.windDirection);
    }

    var recip = oppositeRunway(parsed);
    var thisEnd = components(parsed.heading, windMag, input.speed);
    var otherEnd = components(recip.heading, windMag, input.speed);
    if (!thisEnd || !otherEnd) return null;

    var gust = isFiniteNumber(input.gust) && input.gust > 0 ? input.gust : null;
    if (gust != null && gust < input.speed) {
      // Still compute, but the caller can warn.
    }
    var thisGust = gust != null ? components(parsed.heading, windMag, gust) : null;
    var otherGust = gust != null ? components(recip.heading, windMag, gust) : null;

    var maxDem = isFiniteNumber(input.maxDemonstrated) && input.maxDemonstrated > 0
      ? input.maxDemonstrated
      : null;

    function compare(xw, gustXw) {
      if (maxDem == null) return null;
      var sustainedOver = Math.abs(xw) - maxDem;
      var gustOver = gustXw != null ? Math.abs(gustXw) - maxDem : null;
      return {
        maxDemonstrated: maxDem,
        sustainedMargin: -sustainedOver,
        gustMargin: gustOver == null ? null : -gustOver,
        sustainedExceeds: sustainedOver > 0.05,
        gustExceeds: gustOver != null && gustOver > 0.05
      };
    }

    return {
      runway: parsed,
      reciprocal: recip,
      windMagnetic: windMag,
      windEntered: normalizeHeading(input.windDirection),
      windReference: input.windReference || "magnetic",
      variationEast: isFiniteNumber(input.variationEast) ? input.variationEast : null,
      variationApplied: variationApplied,
      speed: input.speed,
      gust: gust,
      thisEnd: thisEnd,
      otherEnd: otherEnd,
      thisGust: thisGust,
      otherGust: otherGust,
      thisCompare: compare(thisEnd.crosswind, thisGust ? thisGust.crosswind : null),
      otherCompare: compare(otherEnd.crosswind, otherGust ? otherGust.crosswind : null),
      preferredEnd: thisEnd.headwind >= otherEnd.headwind ? "this" : "other"
    };
  }

  function convertSpeed(value, from, to) {
    if (!isFiniteNumber(value)) return NaN;
    var kt = value;
    if (from === "mph") kt = value / KT_TO_MPH;
    else if (from === "mps") kt = value / KT_TO_MPS;
    else if (from === "kph") kt = value / KT_TO_KPH;
    if (to === "kt") return kt;
    if (to === "mph") return kt * KT_TO_MPH;
    if (to === "mps") return kt * KT_TO_MPS;
    if (to === "kph") return kt * KT_TO_KPH;
    return kt;
  }

  var api = {
    KT_TO_MPH: KT_TO_MPH,
    normalizeHeading: normalizeHeading,
    normalizeAngle180: normalizeAngle180,
    parseRunwayOrHeading: parseRunwayOrHeading,
    runwayNumberFromHeading: runwayNumberFromHeading,
    formatRunwayLabel: formatRunwayLabel,
    oppositeRunway: oppositeRunway,
    trueToMagnetic: trueToMagnetic,
    magneticToTrue: magneticToTrue,
    components: components,
    compute: compute,
    convertSpeed: convertSpeed
  };

  root.CrosswindCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

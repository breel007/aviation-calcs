/**
 * Headwind, tailwind and crosswind on each runway, and a recommended
 * runway given a wind and a maximum demonstrated (or personal) crosswind.
 *
 * For a runway heading h and a wind from direction d at speed V:
 *
 *   headwind   =  V cos(d − h)
 *   crosswind  =  V sin(d − h)
 *
 * A negative headwind is a tailwind. The reciprocal runway (h + 180°)
 * simply flips the signs. Gust components use the same angles with the
 * gust speed.
 *
 * Wind and runway headings must be in the same reference. If the wind
 * is true and the runways are magnetic, this page converts the wind
 * with magnetic variation using “east is least, west is best”:
 *
 *   magnetic direction = true direction − east variation
 *                      = true direction + west variation
 *
 * The recommended runway is the one with the greatest headwind among
 * those whose gust (or, if no gust, steady) crosswind is within the
 * limit you set. If every runway is over the limit, the least-crosswind
 * into-wind runway is still flagged, with a warning.
 *
 * Sources: FAA Pilot's Handbook of Aeronautical Knowledge (wind
 * components, runway selection); AIM (runway numbering, magnetic
 * variation); same component identities as this site's crosswind
 * calculator, extended to a list of runways.
 */
(function (root) {
  "use strict";

  var DEG = Math.PI / 180;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function wrap360(deg) {
    var x = deg % 360;
    if (x < 0) x += 360;
    return x;
  }

  function toMagnetic(dir, variationEast) {
    // variationEast is positive for east variation (e.g. 15 means 15°E).
    return wrap360(dir - variationEast);
  }

  function components(windDir, windSpeed, rwyHdg) {
    var ang = (windDir - rwyHdg) * DEG;
    return {
      headwind: windSpeed * Math.cos(ang),
      crosswind: windSpeed * Math.sin(ang)
    };
  }

  function parseRunways(raw) {
    if (raw == null) return [];
    if (Array.isArray(raw)) {
      return raw.map(function (x) { return Number(x); }).filter(function (n) {
        return isFiniteNumber(n) && n > 0 && n < 37;
      });
    }
    var text = String(raw);
    var out = [], seen = {};
    text.split(/[s,;/]+/).forEach(function (tok) {
      tok = tok.replace(/^RWY\s*/i, "").replace(/^Rwy\s*/i, "");
      if (!tok) return;
      var n = parseInt(tok, 10);
      if (!isFiniteNumber(n) || n < 1 || n > 36) return;
      if (seen[n]) return;
      seen[n] = true;
      out.push(n);
    });
    return out;
  }

  function reciprocal(num) {
    return num > 18 ? num - 18 : num + 18;
  }

  function headingFromNumber(num) {
    return wrap360(num * 10);
  }

  function compute(input) {
    if (!input) return null;
    var windDirIn = Number(input.windDir);
    var windSpeed = Number(input.windSpeed);
    if (!isFiniteNumber(windDirIn) || !isFiniteNumber(windSpeed) || windSpeed < 0) return null;
    if (windDirIn < 0 || windDirIn > 360) return null;

    var windRef = input.windRef || "magnetic";
    var varEast = 0;
    if (input.variation != null && input.variation !== "") {
      var v = Number(input.variation);
      if (!isFiniteNumber(v)) return null;
      var varSign = input.variationDir === "W" || input.variationDir === "w" || input.variationDir === "west" ? -1 : 1;
      varEast = varSign * Math.abs(v);
    }
    var windDirMag = windRef === "true" ? toMagnetic(windDirIn, varEast) : wrap360(windDirIn);
    // 360 and 0 are the same direction.
    if (windDirMag === 0 && (windDirIn === 360 || (windRef === "true" && wrap360(windDirIn - varEast) === 0))) {
      windDirMag = 0;
    }

    var gust = null;
    if (input.gust != null && input.gust !== "") {
      gust = Number(input.gust);
      if (!isFiniteNumber(gust) || gust < 0) return null;
      if (gust < windSpeed) gust = windSpeed;
    }

    var limit = 15;
    if (input.crosswindLimit != null && input.crosswindLimit !== "") {
      limit = Number(input.crosswindLimit);
      if (!isFiniteNumber(limit) || limit < 0) return null;
    }

    var nums = parseRunways(input.runways);
    if (nums.length === 0) return null;

    // Expand each number to include the reciprocal if not already listed.
    var includeRecip = input.includeReciprocal !== false;
    var seen = {};
    var list = [];
    nums.forEach(function (n) {
      if (!seen[n]) { seen[n] = true; list.push(n); }
      if (includeRecip) {
        var r = reciprocal(n);
        if (!seen[r]) { seen[r] = true; list.push(r); }
      }
    });
    list.sort(function (a, b) { return a - b; });

    var rows = list.map(function (num) {
      var hdg = headingFromNumber(num);
      var c = components(windDirMag, windSpeed, hdg);
      var g = gust != null ? components(windDirMag, gust, hdg) : null;
      var xw = Math.abs(c.crosswind);
      var xwGust = g ? Math.abs(g.crosswind) : xw;
      var hw = c.headwind;
      return {
        runway: num,
        heading: hdg,
        headwind: hw,
        tailwind: hw < 0 ? -hw : 0,
        crosswind: c.crosswind,
        crosswindAbs: xw,
        gustHeadwind: g ? g.headwind : null,
        gustCrosswindAbs: g ? xwGust : null,
        withinLimit: xwGust <= limit + 1e-9,
        intoWind: hw > 0
      };
    });

    var eligible = rows.filter(function (r) { return r.withinLimit; });
    var pool = eligible.length ? eligible : rows;
    // Prefer greatest headwind; if tied, smaller |crosswind|.
    pool = pool.slice().sort(function (a, b) {
      if (b.headwind !== a.headwind) return b.headwind - a.headwind;
      return a.crosswindAbs - b.crosswindAbs;
    });
    var recommended = pool[0] || null;

    return {
      windDirMagnetic: windDirMag,
      windDirInput: windDirIn,
      windRef: windRef,
      variationEast: varEast,
      windSpeed: windSpeed,
      gust: gust,
      crosswindLimit: limit,
      runways: rows,
      recommended: recommended,
      anyWithinLimit: eligible.length > 0
    };
  }

  var api = {
    wrap360: wrap360,
    toMagnetic: toMagnetic,
    components: components,
    parseRunways: parseRunways,
    reciprocal: reciprocal,
    headingFromNumber: headingFromNumber,
    compute: compute
  };
  root.RunwaySelectionCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

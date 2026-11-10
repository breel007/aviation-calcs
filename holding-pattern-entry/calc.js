/**
 * Holding pattern entry (direct / teardrop / parallel) from inbound
 * course, turn direction, and aircraft heading, plus holding speeds
 * and inbound-leg timing.
 *
 * Sector geometry follows AIM 5-3-8 / FIG 5-3-4 and the Instrument
 * Procedures Handbook: a 70° line is drawn on the holding side. The
 * three sectors, measured by the aircraft's heading as it arrives at
 * the fix, are:
 *
 *   Direct   — 180°
 *   Teardrop —  70° on the holding side, adjacent to the outbound
 *   Parallel — 110° on the non-holding side, adjacent to the outbound
 *
 * Let R = (heading − inbound) normalized to [0, 360).
 *
 *   Standard (right) turns:
 *     Parallel  if  70° <  R <  180°
 *     Teardrop  if 180° ≤  R <  250°
 *     Direct    otherwise
 *     (boundaries: 70° direct/parallel, 180° teardrop/parallel,
 *      250° teardrop/direct)
 *
 *   Nonstandard (left) turns — sectors mirrored about the inbound:
 *     Teardrop  if 110° <  R ≤  180°
 *     Parallel  if 180° <  R <  290°
 *     Direct    otherwise
 *
 * AIM 5-3-8 j.8.(d): ±5° of heading is within good operating limits
 * for choosing the entry. On a sector boundary either adjacent entry
 * may be used.
 *
 * Teardrop heading = outbound ± 30°, toward the holding side
 *   (right turns: outbound − 30°; left turns: outbound + 30°).
 *
 * Maximum holding speeds (AIM TBL, civil):
 *   MHA–6,000 ft     200 KIAS
 *   6,001–14,000 ft  230 KIAS  (some patterns are restricted to 210)
 *   14,001 ft and up 265 KIAS
 *
 * Inbound leg timing: 1 minute at or below 14,000 ft MSL, 1½ minutes
 * above 14,000 (AIM 5-3-8 j.4).
 */
(function (root) {
  "use strict";

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function normalize(deg) {
    var x = deg % 360;
    if (x < 0) x += 360;
    return x;
  }

  function normalize360(deg) {
    var x = normalize(deg);
    return x === 0 ? 360 : x;
  }

  function shortestDiff(from, to) {
    return ((to - from + 540) % 360) - 180;
  }

  function holdingSpeeds(altitudeFt) {
    if (!isFiniteNumber(altitudeFt)) return null;
    if (altitudeFt <= 6000) {
      return { maxKias: 200, band: "MHA–6,000 ft", exception210: false };
    }
    if (altitudeFt <= 14000) {
      return { maxKias: 230, band: "6,001–14,000 ft", exception210: true };
    }
    return { maxKias: 265, band: "14,001 ft and above", exception210: false };
  }

  function legTiming(altitudeFt) {
    if (!isFiniteNumber(altitudeFt)) return null;
    if (altitudeFt <= 14000) {
      return { inboundMin: 1, outboundInitialMin: 1, note: "at or below 14,000 ft MSL" };
    }
    return { inboundMin: 1.5, outboundInitialMin: 1.5, note: "above 14,000 ft MSL" };
  }

  /** Approximate outbound / inbound length in NM for a timed leg at a given TAS. */
  function legLengthNm(timeMin, tasKt) {
    if (!(timeMin > 0) || !(tasKt > 0)) return null;
    return tasKt * (timeMin / 60);
  }

  /**
   * @param inbound  inbound holding course (degrees)
   * @param turn     'right' (standard) or 'left'
   * @param heading  aircraft heading arriving at the fix
   * @returns entry analysis, or null if inputs are invalid
   */
  function entry(inbound, turn, heading) {
    if (!isFiniteNumber(inbound) || !isFiniteNumber(heading)) return null;
    if (turn !== "right" && turn !== "left") return null;
    var inboundN = normalize(inbound);
    var headingN = normalize(heading);
    var outbound = normalize(inboundN + 180);
    var rel = normalize(headingN - inboundN);
    var standard = turn === "right";

    var primary;
    var alternate = null;
    var boundary = null;

    if (standard) {
      if (rel > 70 && rel < 180) primary = "parallel";
      else if (rel >= 180 && rel < 250) primary = "teardrop";
      else primary = "direct";

      if (Math.abs(shortestDiff(rel, 70)) < 1e-9 || Math.abs(rel - 70) < 1e-9) {
        primary = "direct";
        alternate = "parallel";
        boundary = 70;
      } else if (Math.abs(shortestDiff(rel, 180)) < 1e-9 || Math.abs(rel - 180) < 1e-9) {
        primary = "teardrop";
        alternate = "parallel";
        boundary = 180;
      } else if (Math.abs(shortestDiff(rel, 250)) < 1e-9 || Math.abs(rel - 250) < 1e-9) {
        primary = "teardrop";
        alternate = "direct";
        boundary = 250;
      }
    } else {
      if (rel > 110 && rel <= 180) primary = "teardrop";
      else if (rel > 180 && rel < 290) primary = "parallel";
      else primary = "direct";

      if (Math.abs(rel - 110) < 1e-9) {
        primary = "direct";
        alternate = "teardrop";
        boundary = 110;
      } else if (Math.abs(rel - 180) < 1e-9) {
        primary = "teardrop";
        alternate = "parallel";
        boundary = 180;
      } else if (Math.abs(rel - 290) < 1e-9) {
        primary = "parallel";
        alternate = "direct";
        boundary = 290;
      }
    }

    // ±5° AIM discretion: if within 5° of a sector boundary, mention the other entry.
    var near = nearBoundary(rel, standard);
    if (!alternate && near) {
      alternate = near.other;
      boundary = near.at;
    }

    var teardropHdg = normalize360(standard ? outbound - 30 : outbound + 30);
    var parallelHdg = normalize360(outbound);
    // After a parallel entry, turn toward the holding side through more than 180°.
    var afterParallelTurn = standard ? "left (through more than 180°, toward the holding side)" : "right (through more than 180°, toward the holding side)";
    var entryTurn = standard ? "right" : "left";

    var procedure;
    if (primary === "direct") {
      procedure = "Fly to the fix and turn " + entryTurn + " to follow the holding pattern (outbound " + fmtHdg(outbound) + ").";
    } else if (primary === "teardrop") {
      procedure = "Cross the fix, turn to a 30° teardrop heading of " + fmtHdg(teardropHdg) + " (on the holding side) for one minute (or 1½ minutes above 14,000), then turn " + entryTurn + " to intercept the inbound course of " + fmtHdg(inboundN) + ".";
    } else {
      procedure = "Cross the fix, turn to " + fmtHdg(parallelHdg) + " to parallel the holding course outbound on the non-holding side for one minute (or 1½ minutes above 14,000), then turn " + afterParallelTurn + " to intercept the inbound course or return to the fix.";
    }

    return {
      inbound: normalize360(inboundN === 0 ? 360 : inboundN),
      outbound: normalize360(outbound === 0 ? 360 : outbound),
      heading: normalize360(headingN === 0 ? 360 : headingN),
      turn: turn,
      standard: standard,
      holdingSide: standard ? "right of the inbound course" : "left of the inbound course",
      relative: rel,
      entry: primary,
      alternate: alternate,
      boundary: boundary,
      nearBoundary: !!near && !alternate ? false : !!alternate,
      teardropHeading: teardropHdg,
      parallelHeading: parallelHdg,
      procedure: procedure,
      sectors: standard
        ? { direct: "R ≤ 70° or R ≥ 250°", teardrop: "180° ≤ R < 250°", parallel: "70° < R < 180°" }
        : { direct: "R ≤ 110° or R ≥ 290°", teardrop: "110° < R ≤ 180°", parallel: "180° < R < 290°" }
    };
  }

  function nearBoundary(rel, standard) {
    var bounds = standard ? [70, 180, 250] : [110, 180, 290];
    var others = standard
      ? { 70: "parallel", 180: "parallel", 250: "direct" }
      : { 110: "teardrop", 180: "parallel", 290: "direct" };
    // At 180 the primary is teardrop; at 70/110 primary is set separately.
    for (var i = 0; i < bounds.length; i++) {
      var d = Math.abs(shortestDiff(rel, bounds[i]));
      if (d > 1e-9 && d <= 5) {
        return { at: bounds[i], other: others[bounds[i]], delta: d };
      }
    }
    return null;
  }

  function fmtHdg(deg) {
    var n = Math.round(normalize360(deg));
    if (n === 0) n = 360;
    var s = String(n);
    while (s.length < 3) s = "0" + s;
    return s + "°";
  }

  function compute(input) {
    if (!input) return null;
    var result = entry(Number(input.inbound), input.turn, Number(input.heading));
    if (!result) return null;
    var alt = input.altitude == null || input.altitude === "" ? null : Number(input.altitude);
    result.speeds = alt == null || !isFiniteNumber(alt) ? holdingSpeeds(3000) : holdingSpeeds(alt);
    result.timing = alt == null || !isFiniteNumber(alt) ? legTiming(3000) : legTiming(alt);
    result.altitudeFt = alt;
    var tas = input.tas == null || input.tas === "" ? null : Number(input.tas);
    if (isFiniteNumber(tas) && tas > 0 && result.timing) {
      result.legNm = legLengthNm(result.timing.inboundMin, tas);
    } else {
      result.legNm = null;
    }
    // Sector edges in absolute heading, for the diagram.
    var inn = normalize(Number(input.inbound));
    if (result.standard) {
      result.sectorEdges = {
        directParallel: normalize360(inn + 70),
        parallelTeardrop: normalize360(inn + 180),
        teardropDirect: normalize360(inn + 250)
      };
    } else {
      result.sectorEdges = {
        directTeardrop: normalize360(inn + 110),
        teardropParallel: normalize360(inn + 180),
        parallelDirect: normalize360(inn + 290)
      };
    }
    return result;
  }

  var api = {
    normalize: normalize,
    normalize360: normalize360,
    holdingSpeeds: holdingSpeeds,
    legTiming: legTiming,
    legLengthNm: legLengthNm,
    entry: entry,
    compute: compute
  };

  root.HoldingEntryCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

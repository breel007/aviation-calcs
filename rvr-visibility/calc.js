/**
 * Comparable values of RVR and ground visibility, from 14 CFR 91.175(h)(2).
 *
 * The regulation table (the values used when an RVR minimum is prescribed
 * but RVR is not reported, except Category II or III) is:
 *
 *   RVR 1,600 ft  →  1/4 SM
 *   RVR 2,400 ft  →  1/2 SM
 *   RVR 3,200 ft  →  5/8 SM
 *   RVR 4,000 ft  →  3/4 SM
 *   RVR 4,500 ft  →  7/8 SM
 *   RVR 5,000 ft  →  1 SM
 *   RVR 6,000 ft  →  1 1/4 SM
 *
 * These are comparable values for minima, not a unit conversion: 2,400 ft
 * is not physically 1/2 statute mile (that would be 2,640 ft). The rule
 * does not interpolate between rows.
 *
 * A common operational practice, described in the Terminal Procedures
 * Publication legend, is: for an RVR that falls between listed values,
 * use the next higher listed RVR and do not interpolate (the legend's
 * example: 4,800 RVR → 5,000 RVR → 1 SM). That practice is optional on
 * this page and is labeled separately from an exact-table match.
 *
 * Sources: 14 CFR 91.175(h) (Comparable values of RVR and ground
 * visibility); FAA AIM (same table); FAA Terminal Procedures Publication
 * legend, Comparable Values of RVR and Visibility (next-higher-RVR
 * practice). Does not apply to Category II or III minimums.
 */
(function (root) {
  "use strict";

  var TABLE = [
    { rvrFt: 1600, sm: 0.25, smLabel: "1/4" },
    { rvrFt: 2400, sm: 0.5, smLabel: "1/2" },
    { rvrFt: 3200, sm: 0.625, smLabel: "5/8" },
    { rvrFt: 4000, sm: 0.75, smLabel: "3/4" },
    { rvrFt: 4500, sm: 0.875, smLabel: "7/8" },
    { rvrFt: 5000, sm: 1, smLabel: "1" },
    { rvrFt: 6000, sm: 1.25, smLabel: "1 1/4" }
  ];

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function rvrToMeters(ft) { return ft * 0.3048; }

  function exactRvr(rvrFt) {
    var i;
    for (i = 0; i < TABLE.length; i += 1) {
      if (TABLE[i].rvrFt === rvrFt) return TABLE[i];
    }
    return null;
  }

  function exactSm(sm) {
    var i;
    for (i = 0; i < TABLE.length; i += 1) {
      if (Math.abs(TABLE[i].sm - sm) < 1e-9) return TABLE[i];
    }
    return null;
  }

  function nextHigherRvr(rvrFt) {
    var i;
    for (i = 0; i < TABLE.length; i += 1) {
      if (TABLE[i].rvrFt >= rvrFt) return TABLE[i];
    }
    return null;
  }

  function compute(input) {
    if (!input) return null;
    var mode = input.mode || "rvr";
    if (mode === "sm") {
      var sm = Number(input.visibility);
      if (!isFiniteNumber(sm) || sm <= 0) return null;
      var row = exactSm(sm);
      return {
        mode: mode,
        inputSm: sm,
        exact: row,
        table: TABLE
      };
    }

    var raw = Number(input.rvr);
    if (!isFiniteNumber(raw) || raw <= 0) return null;
    var unit = input.rvrUnit || "ft";
    var rvrFt = unit === "m" ? raw / 0.3048 : raw;
    // RVR is published in feet; accept a whole-foot value, including the
    // usual "RVR 24" shorthand (hundreds of feet) when rvrUnit is "x100".
    if (unit === "x100") rvrFt = raw * 100;

    var exact = exactRvr(Math.round(rvrFt));
    // Also treat a value extremely close to a row (floating m→ft) as exact.
    if (!exact) {
      var i, best = null, bestDiff = Infinity;
      for (i = 0; i < TABLE.length; i += 1) {
        var d = Math.abs(TABLE[i].rvrFt - rvrFt);
        if (d < bestDiff) { bestDiff = d; best = TABLE[i]; }
      }
      if (best && bestDiff < 0.5) exact = best;
    }
    var next = exact ? exact : nextHigherRvr(rvrFt);
    var aboveTable = next == null;

    return {
      mode: "rvr",
      rvrFt: rvrFt,
      rvrM: rvrToMeters(rvrFt),
      exact: exact,
      nextHigher: next && !exact ? next : (exact ? exact : null),
      betweenRows: !exact && !!next,
      aboveTable: aboveTable,
      belowTable: !exact && !aboveTable && rvrFt < TABLE[0].rvrFt,
      table: TABLE
    };
  }

  var api = { TABLE: TABLE, exactRvr: exactRvr, exactSm: exactSm, nextHigherRvr: nextHigherRvr, compute: compute };
  root.RvrVisibilityCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

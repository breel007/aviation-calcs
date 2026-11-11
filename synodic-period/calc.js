/**
 * Synodic period of two coplanar, same-sense circular orbits (or two
 * planets around the same primary):
 *
 *   1 / S = | 1 / T1 − 1 / T2 |
 *
 * S is the time between successive similar alignments (for example,
 * successive Hohmann-transfer windows, or successive oppositions of
 * two planets). Sidereal periods may be entered in days, hours, or
 * years, or chosen from a short list of mean heliocentric values
 * (Earth 365.256 days, Mars 686.980 days, and a few others). The
 * Earth–Mars synodic period is about 780 days.
 *
 * Sources: the synodic-period identity 1/S = |1/T1 − 1/T2| (standard
 * spherical / planetary astronomy; e.g. Danby, Fundamentals of
 * Celestial Mechanics; Vallado, Fundamentals of Astrodynamics and
 * Applications, launch-window / synodic period). Mean sidereal
 * periods from standard astronomical constants (approximate).
 */
(function (root) {
  "use strict";

  // Mean sidereal periods, days.
  var PERIODS_DAY = {
    mercury: 87.969,
    venus: 224.701,
    earth: 365.256363,
    mars: 686.980,
    jupiter: 4332.59,
    saturn: 10759.22
  };

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function toDays(t, unit) {
    if (!isFiniteNumber(t) || t <= 0) return NaN;
    if (unit === "h" || unit === "hours") return t / 24;
    if (unit === "s" || unit === "sec") return t / 86400;
    if (unit === "yr" || unit === "year") return t * 365.25;
    return t;
  }
  function periodOf(nameOrValue, unit) {
    if (typeof nameOrValue === "string" && PERIODS_DAY[nameOrValue.toLowerCase()]) {
      return PERIODS_DAY[nameOrValue.toLowerCase()];
    }
    return toDays(Number(nameOrValue), unit || "day");
  }

  function compute(input) {
    if (!input) return null;
    var t1 = periodOf(input.body1 != null && input.body1 !== "" ? input.body1 : input.period1, input.unit1 || input.unit || "day");
    var t2 = periodOf(input.body2 != null && input.body2 !== "" ? input.body2 : input.period2, input.unit2 || input.unit || "day");
    if (!(t1 > 0) || !(t2 > 0)) return null;
    if (Math.abs(t1 - t2) < 1e-15) return null;
    var s = 1 / Math.abs(1 / t1 - 1 / t2);
    return {
      period1Days: t1,
      period2Days: t2,
      synodicDays: s,
      synodicYears: s / 365.25,
      meetingsPerYear: 365.25 / s
    };
  }

  var api = { PERIODS_DAY: PERIODS_DAY, compute: compute };
  root.SynodicPeriodCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

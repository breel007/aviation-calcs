/**
 * Thunderstorm (lightning) distance from a flash-to-bang time, using
 * the speed of sound, plus the common 5-seconds-per-statute-mile
 * memory item.
 *
 * The speed of sound in dry air is taken as
 *   a = a0 √(T / T0),   a0 = 340.294 m/s at T0 = 288.15 K
 * (the same a0 used on this site's true-airspeed calculator). Distance
 * is then d = a × t. At 15 °C that is about 4.7 seconds per statute
 * mile; the familiar “count by five” rule (5 seconds ≈ 1 SM) is a
 * slightly conservative memory item and is reported alongside the
 * acoustic distance.
 *
 * Lightning is treated as instantaneous; only the thunder travel time
 * is modelled. Wind, humidity, and path curvature are not.
 *
 * Sources: FAA Pilot's Handbook of Aeronautical Knowledge (thunderstorms,
 * lightning); ICAO / ISO speed of sound in the standard atmosphere;
 * common flight-training “5 seconds per mile” flash-to-bang rule.
 */
(function (root) {
  "use strict";

  var T0 = 288.15;
  var A0 = 340.294; // m/s, matches true-airspeed
  var M_PER_SM = 1609.344;
  var M_PER_NM = 1852;
  var M_PER_FT = 0.3048;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function toC(t, unit) {
    if (!isFiniteNumber(t)) return NaN;
    if (unit === "F" || unit === "f") return (t - 32) * 5 / 9;
    if (unit === "K" || unit === "k") return t - 273.15;
    return t;
  }

  function compute(input) {
    if (!input) return null;
    var t = Number(input.seconds);
    if (!isFiniteNumber(t) || t < 0) return null;
    var tC = 15;
    if (input.temperature != null && input.temperature !== "") {
      tC = toC(Number(input.temperature), input.tempUnit || "C");
      if (!isFiniteNumber(tC)) return null;
    }
    var tK = tC + 273.15;
    if (!(tK > 0)) return null;
    var a = A0 * Math.sqrt(tK / T0);
    var distM = a * t;
    var ruleSm = t / 5;
    return {
      seconds: t,
      temperatureC: tC,
      speedOfSoundMps: a,
      distanceM: distM,
      distanceSm: distM / M_PER_SM,
      distanceNm: distM / M_PER_NM,
      distanceFt: distM / M_PER_FT,
      rule5SecPerSm: ruleSm,
      secondsPerSm: M_PER_SM / a
    };
  }

  var api = { A0: A0, T0: T0, compute: compute };
  root.ThunderstormDistanceCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

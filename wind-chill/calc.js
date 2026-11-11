/**
 * NWS/TWC wind-chill (apparent temperature) from air temperature and
 * wind speed, using the official November 2001 National Weather Service
 * formula (the “new” wind-chill index still in use).
 *
 * English units (T in °F, V in mph):
 *   WCT = 35.74 + 0.6215 T − 35.75 V^0.16 + 0.4275 T V^0.16
 *
 * Metric (T in °C, V in km/h):
 *   WCT = 13.12 + 0.6215 T − 11.37 V^0.16 + 0.3965 T V^0.16
 *
 * The NWS standard formula is defined for air temperatures at or below
 * 50 °F (10 °C) and wind speeds at or above 3 mph (4.8 km/h), for a
 * walking-height wind. Below that wind threshold the page reports the
 * air temperature and states that the official index does not apply.
 * This is a shade, face-level apparent temperature, not a runway or
 * wind-component calculation.
 *
 * Sources: National Weather Service, Wind Chill Temperature Index
 * (implemented 1 November 2001; NWS technical documents and the
 * current NWS wind-chill chart); Osczevski and Bluestein, the
 * Joint Action Group for Temperature Indices (JAG/TI).
 */
(function (root) {
  "use strict";

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function cToF(c) { return c * 9 / 5 + 32; }
  function fToC(f) { return (f - 32) * 5 / 9; }
  function mphToKmh(v) { return v * 1.609344; }
  function kmhToMph(v) { return v / 1.609344; }
  function ktToMph(v) { return v * 1.1507794480235425; }

  function toMph(v, unit) {
    if (!isFiniteNumber(v) || v < 0) return NaN;
    if (unit === "kt") return ktToMph(v);
    if (unit === "km/h" || unit === "kph") return kmhToMph(v);
    if (unit === "mps" || unit === "m/s") return v * 2.2369362920544;
    return v;
  }

  function wctF(tF, vMph) {
    var vs = Math.pow(vMph, 0.16);
    return 35.74 + 0.6215 * tF - 35.75 * vs + 0.4275 * tF * vs;
  }

  function compute(input) {
    if (!input) return null;
    var unit = input.tempUnit || "F";
    var tRaw = Number(input.temperature);
    var v = toMph(Number(input.wind), input.windUnit || "mph");
    if (!isFiniteNumber(tRaw) || !isFiniteNumber(v) || v < 0) return null;
    var tF = (unit === "C" || unit === "c") ? cToF(tRaw) : tRaw;
    if (tF < -80 || tF > 80) return null;

    var applicable = tF <= 50 + 1e-9 && v >= 3 - 1e-12;
    var wF = applicable ? wctF(tF, v) : tF;
    return {
      temperatureF: tF,
      temperatureC: fToC(tF),
      windMph: v,
      windKt: v / 1.1507794480235425,
      windKmh: mphToKmh(v),
      windChillF: wF,
      windChillC: fToC(wF),
      applicable: applicable,
      formula: "NWS 2001"
    };
  }

  var api = { wctF: wctF, compute: compute, cToF: cToF, fToC: fToC };
  root.WindChillCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

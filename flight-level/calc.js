/**
 * Pressure altitude ↔ flight level, and the transition altitude /
 * transition level switch.
 *
 * A flight level is a surface of constant pressure altitude, expressed
 * in hundreds of feet with the altimeter set to 29.92 inHg (1013.25 hPa,
 * QNE). So FL180 is 18,000 ft pressure altitude:
 *   FL  = PA_ft / 100
 *   PA  = FL × 100
 *
 * Below the transition altitude (TA), assigned altitudes are QNH
 * altitudes. At or above the transition level (TL), they are flight
 * levels. In the United States both are 18,000 ft / FL180; elsewhere
 * you enter the published TA and TL (they can differ, leaving a
 * transition layer). This page converts the numbers and says whether
 * a climbing or descending aircraft, at the altitude you enter, would
 * be using QNH or 29.92 under those published values. It does not
 * change RVSM rules or assign a level.
 *
 * The 1,000 ft per inHg rule of thumb for the difference between a
 * QNH altitude and pressure altitude is the same identity used on the
 * pressure-altitude calculator.
 *
 * Sources: FAA Aeronautical Information Manual (altimeter setting
 * procedures, flight levels, transition); ICAO Doc 8168 (PANS-OPS)
 * transition altitude and transition level; 14 CFR 91.121 (altimeter
 * settings); this site's pressure-altitude calculator.
 */
(function (root) {
  "use strict";

  var STD_INHG = 29.92126;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function compute(input) {
    if (!input) return null;
    var mode = input.mode || "pa";
    var pa, fl;
    if (mode === "fl") {
      var flIn = Number(input.flightLevel);
      if (!isFiniteNumber(flIn) || flIn < 0) return null;
      // Accept 180 or 18000-style slips: values > 1000 are treated as feet.
      if (flIn >= 1000) flIn = flIn / 100;
      fl = flIn;
      pa = fl * 100;
    } else {
      pa = Number(input.pressureAltitude);
      if (!isFiniteNumber(pa)) return null;
      fl = pa / 100;
    }

    var ta = input.transitionAltitude == null || input.transitionAltitude === ""
      ? 18000 : Number(input.transitionAltitude);
    var tl = input.transitionLevel == null || input.transitionLevel === ""
      ? 180 : Number(input.transitionLevel);
    if (!isFiniteNumber(ta) || !isFiniteNumber(tl) || ta < 0 || tl < 0) return null;
    if (tl >= 1000) tl = tl / 100;
    var tlFt = tl * 100;
    if (tlFt < ta) {
      // A published TL below the TA would invert the layer; reject.
      return null;
    }

    var climbingOnQnh = pa < ta;
    var descendingOnFl = pa >= tlFt;
    var inLayer = pa >= ta && pa < tlFt;

    var qnh = null, qnhOffsetFt = null, indicatedAmsl = null;
    if (input.qnh != null && input.qnh !== "") {
      qnh = Number(input.qnh);
      if (!isFiniteNumber(qnh) || qnh <= 0) return null;
      var unit = input.qnhUnit || "inhg";
      var qnhInhg = (unit === "hpa" || unit === "mb") ? qnh / 33.86389 : qnh;
      qnhOffsetFt = 1000 * (STD_INHG - qnhInhg);
      // PA ≈ QNH altitude + 1000*(29.92 − QNH). So QNH altitude ≈ PA − offset.
      indicatedAmsl = pa - qnhOffsetFt;
    }

    return {
      pressureAltitudeFt: pa,
      flightLevel: fl,
      flightLevelLabel: "FL" + (Math.abs(fl - Math.round(fl)) < 1e-9
        ? String(Math.round(fl)).padStart(3, "0")
        : fl.toFixed(1).padStart(5, "0")),
      transitionAltitudeFt: ta,
      transitionLevel: tl,
      transitionLevelFt: tlFt,
      transitionLayerFt: tlFt - ta,
      belowTransitionAltitude: climbingOnQnh,
      atOrAboveTransitionLevel: descendingOnFl,
      inTransitionLayer: inLayer,
      qnh: qnh,
      qnhOffsetFt: qnhOffsetFt,
      qnhAltitudeFt: indicatedAmsl
    };
  }

  var api = { STD_INHG: STD_INHG, compute: compute };
  root.FlightLevelCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

/**
 * Pivotal altitude for eights-on-pylons (commercial / CFI maneuvers).
 *
 * The visual line of sight to the pylon stays fixed on the wing when the
 * airplane is at the pivotal altitude for its groundspeed:
 *
 *   h = V² / g
 *
 * In the Airplane Flying Handbook this is written with rounded constants:
 *
 *   pivotal altitude (ft AGL) ≈ (groundspeed in mph)² / 15
 *   pivotal altitude (ft AGL) ≈ (groundspeed in knots)² / 11.3
 *
 * The exact identity with g0 = 9.80665 m/s² and 1 kt = 1852/3600 m/s is
 *   h_ft = GS_kt² / 11.2947…   and   h_ft = GS_mph² / 14.954…
 * so the handbook figures 11.3 and 15 are close, slightly conservative
 * (a few feet low) rounding.
 *
 * Pivotal altitude changes in the maneuver as groundspeed changes with
 * the wind: faster on the downwind side, slower on the upwind side.
 *
 * Sources: FAA Airplane Flying Handbook (FAA-H-8083-3), Eights-on-Pylons;
 * FAA Commercial Pilot ACS / CFI guidance for the maneuver.
 */
(function (root) {
  "use strict";

  var G0 = 9.80665; // m/s²
  var M_PER_FT = 0.3048;
  var MPS_PER_KT = 1852 / 3600;
  var MPS_PER_MPH = 1609.344 / 3600; // international mph
  var KT_PER_MPH = MPS_PER_MPH / MPS_PER_KT;
  // V_kt * MPS_PER_KT, then / g, then / M_PER_FT → ft
  // h_ft / GS_kt² = MPS_PER_KT² / (G0 * M_PER_FT)
  var EXACT_DIV_KT = (G0 * M_PER_FT) / (MPS_PER_KT * MPS_PER_KT);
  var EXACT_DIV_MPH = (G0 * M_PER_FT) / (MPS_PER_MPH * MPS_PER_MPH);
  var AFH_DIV_KT = 11.3;
  var AFH_DIV_MPH = 15;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function toKt(value, unit) {
    if (!isFiniteNumber(value) || value < 0) return NaN;
    if (unit === "mph") return value * KT_PER_MPH;
    if (unit === "mps" || unit === "m/s") return value / MPS_PER_KT;
    if (unit === "kph" || unit === "km/h") return value * (1000 / 3600) / MPS_PER_KT;
    return value;
  }

  function compute(input) {
    if (!input) return null;
    var unit = input.speedUnit || "kt";
    var gsKt = toKt(Number(input.groundspeed), unit);
    if (!isFiniteNumber(gsKt) || gsKt < 0) return null;
    if (gsKt === 0) {
      return {
        groundspeedKt: 0,
        groundspeedMph: 0,
        exactFt: 0,
        afhFt: 0,
        afhFromMphFt: 0,
        exactDivKt: EXACT_DIV_KT,
        exactDivMph: EXACT_DIV_MPH
      };
    }
    var gsMph = gsKt / KT_PER_MPH;
    var exactFt = (gsKt * gsKt) / EXACT_DIV_KT;
    var afhFt = (gsKt * gsKt) / AFH_DIV_KT;
    var afhFromMphFt = (gsMph * gsMph) / AFH_DIV_MPH;
    return {
      groundspeedKt: gsKt,
      groundspeedMph: gsMph,
      exactFt: exactFt,
      exactM: exactFt * M_PER_FT,
      afhFt: afhFt,
      afhFromMphFt: afhFromMphFt,
      exactDivKt: EXACT_DIV_KT,
      exactDivMph: EXACT_DIV_MPH,
      deltaAfhFt: exactFt - afhFt
    };
  }

  var api = {
    G0: G0,
    EXACT_DIV_KT: EXACT_DIV_KT,
    EXACT_DIV_MPH: EXACT_DIV_MPH,
    AFH_DIV_KT: AFH_DIV_KT,
    AFH_DIV_MPH: AFH_DIV_MPH,
    KT_PER_MPH: KT_PER_MPH,
    toKt: toKt,
    compute: compute
  };
  root.PivotalAltitudeCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

/**
 * Cold-temperature altitude correction for a published height above the
 * altimeter-setting source (normally the airport), using the ICAO
 * Doc 8168 (PANS-OPS) approximate formula and the ICAO / FAA AIM
 * Table 7-3-1 values.
 *
 * ICAO Doc 8168 formula (heights in feet, temperatures in °C):
 *
 *   L0 = 0.00198 °C/ft
 *   t0 = t_aerodrome + L0 × Hss          (surface temp reduced to sea level)
 *   Δh = H × (15 − t0) / (273 + t0 − 0.5 × L0 × (H + Hss))
 *
 * H is the height of the published altitude above the altimeter-setting
 * source; Hss is the elevation of that source. The 4 % rule of thumb —
 * add 4 % of the height for every 10 °C below ISA at the source — is
 * also reported (ICAO: acceptable above about −15 °C).
 *
 * AIM Table 7-3-1 (the ICAO cold-temperature error table) assumes a
 * sea-level airport and is slightly conservative at higher airports.
 * Corrections from the table are the feet to add to a published altitude.
 * Between tabulated values this page interpolates bilinearly.
 *
 * In cold air the true altitude is below the indicated altitude
 * (“look out below”). Fly a higher indicated altitude by the correction
 * so that the true height matches the charted obstacle clearance.
 * Do not change the Kollsman-window setting to make this correction.
 *
 * Sources: ICAO Doc 8168, Aircraft Operations (PANS-OPS), temperature
 * correction of minimum altitudes; FAA Aeronautical Information Manual
 * Table 7-3-1 (ICAO Cold Temperature Error Table); FAA Cold Temperature
 * Airports procedure (AIM / Notices, snowflake symbol). The true-altitude
 * calculator on this site uses the related E6B identity.
 */
(function (root) {
  "use strict";

  var L0 = 0.00198; // °C / ft, ISA lapse used in Doc 8168
  // AIM TBL 7-3-1 / ICAO cold temperature error table (feet to add).
  // Columns are reported aerodrome temperature (°C); rows are height
  // above the altimeter-setting source (ft). Sea-level-airport table.
  var TABLE_TEMPS = [10, 0, -10, -20, -30, -40, -50];
  var TABLE_HEIGHTS = [200, 300, 400, 500, 600, 700, 800, 900, 1000, 1500, 2000, 3000, 4000, 5000];
  var TABLE = [
    [10, 20, 20, 30, 40, 50, 60],
    [10, 20, 30, 50, 60, 80, 90],
    [10, 30, 40, 60, 80, 100, 120],
    [10, 30, 50, 70, 100, 120, 150],
    [20, 40, 60, 90, 120, 150, 180],
    [20, 40, 70, 100, 140, 170, 210],
    [20, 50, 80, 120, 150, 190, 240],
    [20, 50, 90, 130, 170, 220, 270],
    [20, 60, 100, 140, 190, 240, 300],
    [30, 90, 150, 210, 280, 360, 450],
    [40, 120, 200, 280, 380, 480, 590],
    [60, 170, 290, 420, 570, 720, 890],
    [80, 230, 390, 570, 760, 970, 1190],
    [90, 280, 490, 710, 950, 1210, 1500]
  ];

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function isaAtElevationFt(elevFt) {
    return 15 - L0 * elevFt;
  }

  /**
   * Doc 8168 approximate correction, feet. Positive means add to the
   * published (indicated) altitude. tAeroC is the reported aerodrome
   * temperature; HssFt is the setting-source elevation; Hft is height
   * above that source. 273 (not 273.15) follows the published equation.
   */
  function icaoCorrectionFt(Hft, tAeroC, HssFt) {
    if (!isFiniteNumber(Hft) || !isFiniteNumber(tAeroC) || !isFiniteNumber(HssFt)) return NaN;
    if (Hft < 0) return NaN;
    var t0 = tAeroC + L0 * HssFt;
    var denom = 273 + t0 - 0.5 * L0 * (Hft + HssFt);
    if (denom === 0) return NaN;
    return Hft * (15 - t0) / denom;
  }

  function rule4pctFt(Hft, tAeroC, HssFt) {
    var isa = isaAtElevationFt(HssFt);
    var below = isa - tAeroC;
    return Hft * 0.04 * (below / 10);
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function tableLookup(Hft, tAeroC) {
    if (!isFiniteNumber(Hft) || !isFiniteNumber(tAeroC)) return null;
    if (Hft < TABLE_HEIGHTS[0] || Hft > TABLE_HEIGHTS[TABLE_HEIGHTS.length - 1]) return null;
    if (tAeroC > TABLE_TEMPS[0] || tAeroC < TABLE_TEMPS[TABLE_TEMPS.length - 1]) return null;
    // Temps decrease across columns.
    var c0 = 0;
    while (c0 < TABLE_TEMPS.length - 1 && tAeroC < TABLE_TEMPS[c0 + 1] - 1e-12) c0 += 1;
    if (c0 > TABLE_TEMPS.length - 2) c0 = TABLE_TEMPS.length - 2;
    var c1 = c0 + 1;
    var tc = 0;
    if (TABLE_TEMPS[c0] !== TABLE_TEMPS[c1]) {
      tc = (tAeroC - TABLE_TEMPS[c0]) / (TABLE_TEMPS[c1] - TABLE_TEMPS[c0]);
    }
    var r0 = 0;
    while (r0 < TABLE_HEIGHTS.length - 1 && Hft > TABLE_HEIGHTS[r0 + 1] + 1e-12) r0 += 1;
    if (r0 > TABLE_HEIGHTS.length - 2) r0 = TABLE_HEIGHTS.length - 2;
    var r1 = r0 + 1;
    var tr = 0;
    if (TABLE_HEIGHTS[r0] !== TABLE_HEIGHTS[r1]) {
      tr = (Hft - TABLE_HEIGHTS[r0]) / (TABLE_HEIGHTS[r1] - TABLE_HEIGHTS[r0]);
    }
    var v00 = TABLE[r0][c0], v01 = TABLE[r0][c1];
    var v10 = TABLE[r1][c0], v11 = TABLE[r1][c1];
    var v0 = lerp(v00, v01, tc);
    var v1 = lerp(v10, v11, tc);
    return lerp(v0, v1, tr);
  }

  function ceilTo(value, step) {
    if (!isFiniteNumber(value)) return NaN;
    if (value <= 0) return 0;
    return Math.ceil(value / step - 1e-9) * step;
  }

  function compute(input) {
    if (!input) return null;
    var tUnit = input.tempUnit || "C";
    var tRaw = Number(input.temperature);
    if (!isFiniteNumber(tRaw)) return null;
    var tC = tUnit === "F" || tUnit === "f" ? (tRaw - 32) * 5 / 9 : tRaw;

    var elev = input.elevation == null || input.elevation === "" ? 0 : Number(input.elevation);
    var elUnit = input.elevationUnit || "ft";
    if (!isFiniteNumber(elev)) return null;
    var Hss = elUnit === "m" ? elev / 0.3048 : elev;

    var published, H;
    if (input.height != null && input.height !== "") {
      var hIn = Number(input.height);
      if (!isFiniteNumber(hIn) || hIn < 0) return null;
      var hUnit = input.heightUnit || "ft";
      H = hUnit === "m" ? hIn / 0.3048 : hIn;
      published = Hss + H;
    } else if (input.publishedAltitude != null && input.publishedAltitude !== "") {
      var pIn = Number(input.publishedAltitude);
      if (!isFiniteNumber(pIn)) return null;
      var pUnit = input.publishedUnit || "ft";
      published = pUnit === "m" ? pIn / 0.3048 : pIn;
      H = published - Hss;
      if (H < 0) return null;
    } else {
      return null;
    }

    var formula = icaoCorrectionFt(H, tC, Hss);
    if (!isFiniteNumber(formula)) return null;
    var rule = rule4pctFt(H, tC, Hss);
    var table = tableLookup(H, tC);
    var isa = isaAtElevationFt(Hss);
    var isaDev = tC - isa;
    // Fly this indicated altitude to keep the published true height.
    // A negative formula (warmer than the t0 = 15 °C sea-level reduction)
    // means the true altitude is above indicated; no "add" is required
    // for obstacle clearance, and we still report the signed value.
    var add = formula;
    var indicatedToFly = published + Math.max(0, add);

    return {
      temperatureC: tC,
      elevationFt: Hss,
      heightFt: H,
      publishedFt: published,
      isaAtSourceC: isa,
      isaDeviationC: isaDev,
      formulaFt: formula,
      rule4pctFt: rule,
      tableFt: table,
      addFt: Math.max(0, add),
      indicatedToFlyFt: indicatedToFly,
      indicatedToFlyRound10: published + ceilTo(Math.max(0, add), 10),
      indicatedToFlyRound100: published + ceilTo(Math.max(0, add), 100),
      trueIfUncorrectedFt: published - formula,
      warmerThanIsa: isaDev > 0
    };
  }

  var api = {
    L0: L0,
    TABLE_TEMPS: TABLE_TEMPS,
    TABLE_HEIGHTS: TABLE_HEIGHTS,
    TABLE: TABLE,
    isaAtElevationFt: isaAtElevationFt,
    icaoCorrectionFt: icaoCorrectionFt,
    rule4pctFt: rule4pctFt,
    tableLookup: tableLookup,
    compute: compute
  };
  root.ColdTemperatureCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

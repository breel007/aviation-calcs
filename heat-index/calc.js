/**
 * NWS heat index (apparent temperature) from air temperature and
 * relative humidity, using the official National Weather Service
 * algorithm (Rothfusz 1990 regression with the published low- and
 * high-humidity adjustments, and the Steadman-consistent fallback
 * below about 80 °F).
 *
 * Sources: National Weather Service, The Heat Index Equation
 * (www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml); Rothfusz,
 * NWS Technical Attachment SR 90-23 (1990); Steadman (1979).
 * Category breakpoints follow the NWS heat-index chart: Caution
 * 80–90, Extreme Caution 90–103, Danger 103–125, Extreme Danger 125 °F
 * and above.
 */
(function (root) {
  "use strict";

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function cToF(c) { return c * 9 / 5 + 32; }
  function fToC(f) { return (f - 32) * 5 / 9; }

  function steadman(tF, rh) {
    return 0.5 * (tF + 61.0 + (tF - 68.0) * 1.2 + rh * 0.094);
  }

  function rothfusz(tF, rh) {
    var T = tF, R = rh;
    var hi = -42.379 +
      2.04901523 * T +
      10.14333127 * R -
      0.22475541 * T * R -
      0.00683783 * T * T -
      0.05481717 * R * R +
      0.00122874 * T * T * R +
      0.00085282 * T * R * R -
      0.00000199 * T * T * R * R;
    if (R < 13 && T >= 80 && T <= 112) {
      hi -= ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
    } else if (R > 85 && T >= 80 && T <= 87) {
      hi += ((R - 85) / 10) * ((87 - T) / 5);
    }
    return hi;
  }

  function category(hiF) {
    if (hiF >= 125) return { id: "extreme-danger", label: "Extreme Danger" };
    if (hiF >= 103) return { id: "danger", label: "Danger" };
    if (hiF >= 90) return { id: "extreme-caution", label: "Extreme Caution" };
    if (hiF >= 80) return { id: "caution", label: "Caution" };
    return { id: "below", label: "Below the Caution threshold" };
  }

  function compute(input) {
    if (!input) return null;
    var unit = input.tempUnit || "F";
    var tRaw = Number(input.temperature);
    var rh = Number(input.rh);
    if (!isFiniteNumber(tRaw) || !isFiniteNumber(rh)) return null;
    if (rh < 0 || rh > 100) return null;
    var tF = (unit === "C" || unit === "c") ? cToF(tRaw) : tRaw;
    // The regression is for shade, light wind, and typical summer
    // temperatures. Refuse obviously out-of-range air temperatures.
    if (tF < -20 || tF > 140) return null;

    var simple = steadman(tF, rh);
    var average = 0.5 * (simple + tF);
    var usedRothfusz = average >= 80;
    var hiF = usedRothfusz ? rothfusz(tF, rh) : simple;
    var cat = category(hiF);

    return {
      temperatureF: tF,
      temperatureC: fToC(tF),
      rh: rh,
      heatIndexF: hiF,
      heatIndexC: fToC(hiF),
      usedRothfusz: usedRothfusz,
      steadmanF: simple,
      category: cat.id,
      categoryLabel: cat.label
    };
  }

  var api = {
    steadman: steadman,
    rothfusz: rothfusz,
    category: category,
    compute: compute,
    cToF: cToF,
    fToC: fToC
  };
  root.HeatIndexCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

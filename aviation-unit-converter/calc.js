/**
 * Aviation unit conversions using international legal definitions.
 *
 *   1 international nautical mile = 1,852 m exactly (IHO)
 *   1 international statute mile  = 1,609.344 m exactly
 *   1 foot                        = 0.3048 m exactly
 *   1 knot                        = 1.852 km/h exactly
 *   1 US gallon                   = 3.785411784 L exactly
 *   1 pound (avoirdupois)         = 0.45359237 kg exactly
 *   1 inHg                        = 33.863886666666667 hPa  (same constant
 *                                   as the density-altitude calculator;
 *                                   1013.25 hPa / that value = 29.92126 inHg)
 *   1 hPa                         = 1 millibar
 *   1 ft/min                      = 0.3048/60 m/s = 0.00508 m/s exactly
 */
(function (root) {
  "use strict";

  var NM_M = 1852;
  var SM_M = 1609.344;
  var FT_M = 0.3048;
  var HPA_PER_INHG = 33.863886666666667;
  var US_GAL_L = 3.785411784;
  var LB_KG = 0.45359237;
  var FPM_MPS = FT_M / 60;

  var KT_KMH = 1.852;
  var KT_MPS = NM_M / 3600;
  var KT_MPH = NM_M / SM_M;
  var KT_FPS = (NM_M / FT_M) / 3600;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  var CATEGORIES = {
    speed: {
      base: "kt",
      units: {
        kt: 1,
        mph: 1 / KT_MPH,
        kmh: 1 / KT_KMH,
        mps: 1 / KT_MPS,
        fps: 1 / KT_FPS
      },
      labels: { kt: "kt", mph: "mph", kmh: "km/h", mps: "m/s", fps: "ft/s" }
    },
    distance: {
      base: "nm",
      units: {
        nm: 1,
        sm: SM_M / NM_M,
        km: 1000 / NM_M,
        m: 1 / NM_M,
        ft: FT_M / NM_M
      },
      labels: { nm: "nm", sm: "sm", km: "km", m: "m", ft: "ft" }
    },
    altitude: {
      base: "ft",
      units: {
        ft: 1,
        m: 1 / FT_M,
        km: 1000 / FT_M,
        fl: 100
      },
      labels: { ft: "ft", m: "m", km: "km", fl: "FL (hundreds of ft)" }
    },
    pressure: {
      base: "inhg",
      units: {
        inhg: 1,
        hpa: 1 / HPA_PER_INHG,
        mb: 1 / HPA_PER_INHG,
        psi: 68.9475729316824 / HPA_PER_INHG
      },
      labels: { inhg: "inHg", hpa: "hPa", mb: "mb", psi: "psi" }
    },
    mass: {
      base: "lb",
      units: {
        lb: 1,
        kg: 1 / LB_KG,
        oz: 1 / 16
      },
      labels: { lb: "lb", kg: "kg", oz: "oz" }
    },
    volume: {
      base: "gal",
      units: {
        gal: 1,
        l: 1 / US_GAL_L,
        impgal: 4.54609 / US_GAL_L,
        qt: 1 / 4
      },
      labels: { gal: "US gal", l: "L", impgal: "Imp gal", qt: "US qt" }
    },
    verticalSpeed: {
      base: "fpm",
      units: {
        fpm: 1,
        mps: 1 / FPM_MPS,
        mpm: 1 / (FT_M),
        kt: (NM_M / FT_M) / 60
      },
      labels: { fpm: "ft/min", mps: "m/s", mpm: "m/min", kt: "kt (vertical)" }
    }
  };

  // Temperature is affine, not a simple scale — handled separately.
  function cToF(c) { return c * 9 / 5 + 32; }
  function fToC(f) { return (f - 32) * 5 / 9; }
  function cToK(c) { return c + 273.15; }
  function kToC(k) { return k - 273.15; }
  function cToR(c) { return (c + 273.15) * 9 / 5; }
  function rToC(r) { return r * 5 / 9 - 273.15; }

  function convertTemperature(value, from, to) {
    if (!isFiniteNumber(value)) return NaN;
    var c;
    switch (from) {
      case "c": c = value; break;
      case "f": c = fToC(value); break;
      case "k": c = kToC(value); break;
      case "r": c = rToC(value); break;
      default: return NaN;
    }
    switch (to) {
      case "c": return c;
      case "f": return cToF(c);
      case "k": return cToK(c);
      case "r": return cToR(c);
      default: return NaN;
    }
  }

  function convert(category, value, from, to) {
    if (category === "temperature") return convertTemperature(value, from, to);
    if (!isFiniteNumber(value)) return NaN;
    var cat = CATEGORIES[category];
    if (!cat) return NaN;
    var fromFactor = cat.units[from];
    var toFactor = cat.units[to];
    if (!fromFactor || !toFactor) return NaN;
    var base = value * fromFactor;
    return base / toFactor;
  }

  function convertAll(category, value, from) {
    if (category === "temperature") {
      return {
        c: convertTemperature(value, from, "c"),
        f: convertTemperature(value, from, "f"),
        k: convertTemperature(value, from, "k"),
        r: convertTemperature(value, from, "r")
      };
    }
    var cat = CATEGORIES[category];
    if (!cat) return null;
    var out = {};
    Object.keys(cat.units).forEach(function (u) {
      out[u] = convert(category, value, from, u);
    });
    return out;
  }

  var api = {
    NM_M: NM_M,
    SM_M: SM_M,
    FT_M: FT_M,
    HPA_PER_INHG: HPA_PER_INHG,
    US_GAL_L: US_GAL_L,
    LB_KG: LB_KG,
    FPM_MPS: FPM_MPS,
    KT_KMH: KT_KMH,
    KT_MPS: KT_MPS,
    KT_MPH: KT_MPH,
    CATEGORIES: CATEGORIES,
    cToF: cToF,
    fToC: fToC,
    cToK: cToK,
    kToC: kToC,
    convertTemperature: convertTemperature,
    convert: convert,
    convertAll: convertAll
  };

  root.AviationUnits = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

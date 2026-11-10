/**
 * U.S. Standard Atmosphere 1976 / ICAO ISA properties.
 *
 * Source: NOAA / NASA / USAF, "U.S. Standard Atmosphere, 1976"
 * (NASA-TM-X-74335 / NOAA-S/T 76-1562). The lower 32 km is the same
 * model as the ICAO Standard Atmosphere (Doc 7488) and ISO 2533.
 *
 * The defining independent variable is geopotential altitude H. Geometric
 * altitude Z is related by the 1976 document's radius:
 *   H = r0 Z / (r0 + Z),   Z = r0 H / (r0 - H),   r0 = 6,356,766 m.
 *
 * Seven molecular-scale temperature layers from 0 to 84.852 km geopotential
 * (86 km geometric). Molecular weight is taken as the sea-level value M0
 * throughout this range (the official tables introduce a small M variation
 * only above 80 km; see the page notes).
 *
 * Dynamic viscosity uses Sutherland's law with the 1976 constants
 *   μ = β T^{3/2} / (T + S),  β = 1.458e-6 kg/(s m K^{1/2}),  S = 110.4 K.
 */
(function (root) {
  "use strict";

  var G0 = 9.80665;                 // m/s², standard gravity
  var R_STAR = 8314.32;             // N·m/(kmol·K), universal gas constant (1976)
  var M0 = 28.9644;                 // kg/kmol, sea-level air molecular weight
  var RS = R_STAR / M0;             // 287.0528742... J/(kg·K)
  var P0 = 101325;                  // Pa
  var T0 = 288.15;                  // K
  var RHO0 = 1.225;                 // kg/m³ (defined sea-level density)
  var GAMMA = 1.4;
  var R0 = 6356766;                 // m, r0 used for geopotential in USSA 1976
  var BETA = 1.458e-6;              // kg/(s·m·K^{1/2})
  var SUTH_S = 110.4;               // K
  var H_MAX = 84852;                // m, geopotential at 86 km geometric
  var Z_MAX = 86000;                // m, top of this implementation

  var FT_PER_M = 1 / 0.3048;
  var M_PER_FT = 0.3048;
  var INHG_PER_PA = 1 / 3386.389;
  var PA_PER_INHG = 3386.389;
  var PA_PER_PSI = 6894.757293168;
  var PA_PER_PSF = 47.88025898033584; // PA_PER_PSI / 144
  var SLUG_FT3_PER_KG_M3 = 1 / 515.3788183932;
  var LB_FT3_PER_KG_M3 = 0.062427960576144866; // 1/16.01846337396
  var KT_PER_MPS = 3600 / 1852;

  // Geopotential bases H_b (m), molecular-scale temperature T_b (K),
  // and lapse rate L = dT_M/dH (K/m), USSA 1976 Table 4.
  var LAYER_DEF = [
    { Hb: 0,     Tb: 288.15, L: -0.0065 },
    { Hb: 11000, Tb: 216.65, L: 0 },
    { Hb: 20000, Tb: 216.65, L: 0.001 },
    { Hb: 32000, Tb: 228.65, L: 0.0028 },
    { Hb: 47000, Tb: 270.65, L: 0 },
    { Hb: 51000, Tb: 270.65, L: -0.0028 },
    { Hb: 71000, Tb: 214.65, L: -0.002 }
  ];

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function geometricFromGeopotential(H) {
    return (R0 * H) / (R0 - H);
  }

  function geopotentialFromGeometric(Z) {
    return (R0 * Z) / (R0 + Z);
  }

  function temperatureK(H, layer) {
    return layer.Tb + layer.L * (H - layer.Hb);
  }

  function pressureAt(H, layer) {
    var T = temperatureK(H, layer);
    if (layer.L === 0) {
      return layer.Pb * Math.exp(-G0 * M0 * (H - layer.Hb) / (R_STAR * layer.Tb));
    }
    return layer.Pb * Math.pow(T / layer.Tb, -G0 * M0 / (R_STAR * layer.L));
  }

  function densityAt(H, layer, P, T) {
    // Equation of state with constant M = M0. Equivalent to the 1976
    // power-law density ratio when L ≠ 0.
    return P * M0 / (R_STAR * T);
  }

  // Walk from sea level to attach Pb at each layer base.
  var LAYERS = (function () {
    var out = [];
    var Pb = P0;
    for (var i = 0; i < LAYER_DEF.length; i++) {
      var d = LAYER_DEF[i];
      var layer = { Hb: d.Hb, Tb: d.Tb, L: d.L, Pb: Pb };
      out.push(layer);
      var Hnext = i + 1 < LAYER_DEF.length ? LAYER_DEF[i + 1].Hb : H_MAX;
      Pb = pressureAt(Hnext, layer);
    }
    return out;
  })();

  function layerIndex(H) {
    var i = LAYERS.length - 1;
    while (i > 0 && H < LAYERS[i].Hb) i -= 1;
    return i;
  }

  function dynamicViscosity(T) {
    if (!(T > 0)) return NaN;
    return BETA * Math.pow(T, 1.5) / (T + SUTH_S);
  }

  function speedOfSound(T) {
    if (!(T > 0)) return NaN;
    return Math.sqrt(GAMMA * RS * T);
  }

  function propertiesAtGeopotential(H) {
    if (!isFiniteNumber(H)) return null;
    if (H < 0 || H > H_MAX + 0.5) return null;
    if (H > H_MAX) H = H_MAX;
    var layer = LAYERS[layerIndex(H)];
    var T = temperatureK(H, layer);
    var P = pressureAt(H, layer);
    var rho = densityAt(H, layer, P, T);
    var a = speedOfSound(T);
    var mu = dynamicViscosity(T);
    var Z = geometricFromGeopotential(H);
    return {
      geopotentialM: H,
      geometricM: Z,
      temperatureK: T,
      pressurePa: P,
      densityKgM3: rho,
      pressureRatio: P / P0,
      temperatureRatio: T / T0,
      densityRatio: rho / RHO0,
      speedOfSoundMps: a,
      dynamicViscosity: mu,
      kinematicViscosity: mu / rho,
      layerBaseM: layer.Hb,
      lapseKPerM: layer.L,
      gravityMs2: G0 * (R0 / (R0 + Z)) * (R0 / (R0 + Z))
    };
  }

  function propertiesFromGeometric(Z) {
    if (!isFiniteNumber(Z) || Z < 0 || Z > Z_MAX + 0.5) return null;
    return propertiesAtGeopotential(geopotentialFromGeometric(Math.min(Z, Z_MAX)));
  }

  function propertiesFromAltitude(valueM, kind) {
    if (kind === "geometric") return propertiesFromGeometric(valueM);
    return propertiesAtGeopotential(valueM);
  }

  /**
   * Invert a monotonic decreasing profile (pressure or density) for
   * geopotential altitude. `kind` is "pressure" or "density".
   */
  function invertToGeopotential(value, kind) {
    if (!isFiniteNumber(value) || value <= 0) return null;
    var sea = propertiesAtGeopotential(0);
    var top = propertiesAtGeopotential(H_MAX);
    var seaV = kind === "density" ? sea.densityKgM3 : sea.pressurePa;
    var topV = kind === "density" ? top.densityKgM3 : top.pressurePa;
    if (value > seaV * (1 + 1e-12) || value < topV * (1 - 1e-12)) return null;

    // Identify the layer: value lies between the base and the next base
    // (or the model top). Both P and ρ decrease with height.
    var layer = LAYERS[0];
    for (var i = 0; i < LAYERS.length; i++) {
      var nextH = i + 1 < LAYERS.length ? LAYERS[i + 1].Hb : H_MAX;
      var atNext = kind === "density"
        ? propertiesAtGeopotential(nextH).densityKgM3
        : pressureAt(nextH, LAYERS[i]);
      if (value >= atNext || i === LAYERS.length - 1) {
        layer = LAYERS[i];
        break;
      }
    }

    var H;
    if (kind === "pressure") {
      if (layer.L === 0) {
        H = layer.Hb - (R_STAR * layer.Tb / (G0 * M0)) * Math.log(value / layer.Pb);
      } else {
        var T = layer.Tb * Math.pow(value / layer.Pb, -R_STAR * layer.L / (G0 * M0));
        H = layer.Hb + (T - layer.Tb) / layer.L;
      }
    } else {
      var rhoB = densityAt(layer.Hb, layer, layer.Pb, layer.Tb);
      if (layer.L === 0) {
        H = layer.Hb - (R_STAR * layer.Tb / (G0 * M0)) * Math.log(value / rhoB);
      } else {
        // ρ/ρb = (T/Tb)^( -g0 M0/(R* L) - 1 )
        var exp = -G0 * M0 / (R_STAR * layer.L) - 1;
        var T2 = layer.Tb * Math.pow(value / rhoB, 1 / exp);
        H = layer.Hb + (T2 - layer.Tb) / layer.L;
      }
    }
    if (!isFiniteNumber(H)) return null;
    if (H < 0) H = 0;
    if (H > H_MAX) H = H_MAX;
    return propertiesAtGeopotential(H);
  }

  function fromPressure(pressurePa) {
    return invertToGeopotential(pressurePa, "pressure");
  }

  function fromDensity(densityKgM3) {
    return invertToGeopotential(densityKgM3, "density");
  }

  // ----- unit helpers -----
  function cToF(c) { return c * 9 / 5 + 32; }
  function fToC(f) { return (f - 32) * 5 / 9; }
  function kToC(k) { return k - 273.15; }
  function kToF(k) { return cToF(kToC(k)); }
  function kToR(k) { return k * 9 / 5; }

  function formatBundle(p) {
    if (!p) return null;
    return {
      raw: p,
      geopotentialM: p.geopotentialM,
      geopotentialFt: p.geopotentialM * FT_PER_M,
      geopotentialKm: p.geopotentialM / 1000,
      geometricM: p.geometricM,
      geometricFt: p.geometricM * FT_PER_M,
      geometricKm: p.geometricM / 1000,
      temperatureK: p.temperatureK,
      temperatureC: kToC(p.temperatureK),
      temperatureF: kToF(p.temperatureK),
      temperatureR: kToR(p.temperatureK),
      pressurePa: p.pressurePa,
      pressureHpa: p.pressurePa / 100,
      pressureInHg: p.pressurePa * INHG_PER_PA,
      pressurePsi: p.pressurePa / PA_PER_PSI,
      pressurePsf: p.pressurePa / PA_PER_PSF,
      densityKgM3: p.densityKgM3,
      densitySlugFt3: p.densityKgM3 * SLUG_FT3_PER_KG_M3,
      densityLbFt3: p.densityKgM3 * LB_FT3_PER_KG_M3,
      pressureRatio: p.pressureRatio,
      temperatureRatio: p.temperatureRatio,
      densityRatio: p.densityRatio,
      speedOfSoundMps: p.speedOfSoundMps,
      speedOfSoundKt: p.speedOfSoundMps * KT_PER_MPS,
      speedOfSoundFps: p.speedOfSoundMps * FT_PER_M,
      dynamicViscosity: p.dynamicViscosity,
      kinematicViscosity: p.kinematicViscosity,
      dynamicViscositySlugFtS: p.dynamicViscosity * 0.020885434233150127, // kg/(m·s) → slug/(ft·s)
      kinematicViscosityFt2S: p.kinematicViscosity * FT_PER_M * FT_PER_M,
      gravityMs2: p.gravityMs2,
      gravityFtS2: p.gravityMs2 * FT_PER_M,
      layerBaseM: p.layerBaseM,
      lapseKPerM: p.lapseKPerM,
      lapseKPerKm: p.lapseKPerM * 1000
    };
  }

  function parseAltitudeToMeters(value, unit) {
    var n = Number(value);
    if (!isFiniteNumber(n)) return NaN;
    if (unit === "ft") return n * M_PER_FT;
    if (unit === "km") return n * 1000;
    if (unit === "fl") return n * 100 * M_PER_FT; // FL is hundreds of feet, pressure, treated as geometric/geopotential per caller
    return n; // m
  }

  function parsePressureToPa(value, unit) {
    var n = Number(value);
    if (!isFiniteNumber(n) || n <= 0) return NaN;
    if (unit === "hpa" || unit === "mb") return n * 100;
    if (unit === "inhg") return n * PA_PER_INHG;
    if (unit === "psi") return n * PA_PER_PSI;
    if (unit === "psf") return n * PA_PER_PSF;
    if (unit === "kpa") return n * 1000;
    return n; // Pa
  }

  function parseDensityToKgM3(value, unit) {
    var n = Number(value);
    if (!isFiniteNumber(n) || n <= 0) return NaN;
    if (unit === "slugft3") return n / SLUG_FT3_PER_KG_M3;
    if (unit === "lbft3") return n / LB_FT3_PER_KG_M3;
    return n; // kg/m3
  }

  /**
   * input.mode: "altitude" | "pressure" | "density"
   * input.altitude, input.altitudeUnit ("m"|"km"|"ft"|"fl")
   * input.altitudeKind: "geopotential" | "geometric"
   * input.pressure, input.pressureUnit
   * input.density, input.densityUnit
   */
  function compute(input) {
    if (!input) return null;
    var mode = input.mode || "altitude";
    var p = null;
    if (mode === "pressure") {
      var Pa = parsePressureToPa(input.pressure, input.pressureUnit || "pa");
      if (!isFiniteNumber(Pa)) return null;
      p = fromPressure(Pa);
    } else if (mode === "density") {
      var rho = parseDensityToKgM3(input.density, input.densityUnit || "kgm3");
      if (!isFiniteNumber(rho)) return null;
      p = fromDensity(rho);
    } else {
      var Hm = parseAltitudeToMeters(input.altitude, input.altitudeUnit || "m");
      if (!isFiniteNumber(Hm)) return null;
      p = propertiesFromAltitude(Hm, input.altitudeKind === "geometric" ? "geometric" : "geopotential");
    }
    return formatBundle(p);
  }

  var api = {
    G0: G0,
    R_STAR: R_STAR,
    M0: M0,
    RS: RS,
    P0: P0,
    T0: T0,
    RHO0: RHO0,
    GAMMA: GAMMA,
    R0: R0,
    BETA: BETA,
    SUTH_S: SUTH_S,
    H_MAX: H_MAX,
    Z_MAX: Z_MAX,
    FT_PER_M: FT_PER_M,
    LAYERS: LAYERS,
    geometricFromGeopotential: geometricFromGeopotential,
    geopotentialFromGeometric: geopotentialFromGeometric,
    propertiesAtGeopotential: propertiesAtGeopotential,
    propertiesFromGeometric: propertiesFromGeometric,
    fromPressure: fromPressure,
    fromDensity: fromDensity,
    dynamicViscosity: dynamicViscosity,
    speedOfSound: speedOfSound,
    compute: compute,
    formatBundle: formatBundle,
    parseAltitudeToMeters: parseAltitudeToMeters,
    parsePressureToPa: parsePressureToPa,
    parseDensityToKgM3: parseDensityToKgM3
  };

  root.StandardAtmosphereCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

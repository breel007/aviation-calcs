/**
 * Terminal velocity from ballistic coefficient, and a simple
 * Allen–Eggers ballistic (zero-lift) re-entry pulse.
 *
 * Ballistic coefficient and sea-level (or in-atmosphere) terminal speed:
 *   β  = m / (Cd A)
 *   vt = √( 2 β g / ρ )     (drag equals weight)
 *
 * Density ρ at a chosen altitude uses the U.S. Standard Atmosphere 1976
 * / ICAO ISA (same constants and layers as this site's standard-atmosphere
 * calculator), or a density you enter. g = 9.80665 m/s².
 *
 * For a steepish ballistic atmospheric entry in an exponential atmosphere
 * ρ = ρ0 e^{−h/H}, with drag dominating weight, Allen and Eggers give
 *   V(h)     = V_E exp( − ρ H / (2 β sin γ) )
 *   a_max    = V_E² sin γ / (2 e H)          (independent of β)
 *   ρ_at_max = β sin γ / H
 *   V_at_max = V_E / √e
 * where γ is the positive flight-path angle below the local horizontal
 * (constant in this model), H is a scale height, and ρ0 is a reference
 * sea-level density. This page uses H = 7,162 m (23,500 ft) and
 * ρ0 = 1.225 kg/m³, and flags a result if the peak would fall below
 * the surface (ρ_at_max > ρ0). The model does not include lift, gravity
 * in the deceleration equation, a rotating or oblate Earth, or heating.
 *
 * Sources: U.S. Standard Atmosphere 1976 (NASA-TM-X-74335) for density;
 * Allen and Eggers, NACA Report 1381 (1958), A Study of the Motion and
 * Aerodynamic Heating of Ballistic Missiles Entering the Earth's
 * Atmosphere at High Supersonic Speeds; Anderson, Hypersonic and
 * High-Temperature Gas Dynamics; Regan, Dynamics of Atmospheric Re-Entry.
 */
(function (root) {
  "use strict";

  var G0 = 9.80665;
  var R_STAR = 8314.32;
  var M0 = 28.9644;
  var P0 = 101325;
  var T0 = 288.15;
  var RHO0 = 1.225;
  var R0 = 6356766;
  var H_MAX = 84852;
  var H_SCALE = 7162; // m, 23,500 ft, Allen–Eggers exponential atmosphere
  var EULER = Math.E;

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
  function temperatureK(H, layer) { return layer.Tb + layer.L * (H - layer.Hb); }
  function pressureAt(H, layer) {
    var T = temperatureK(H, layer);
    if (layer.L === 0) {
      return layer.Pb * Math.exp(-G0 * M0 * (H - layer.Hb) / (R_STAR * layer.Tb));
    }
    return layer.Pb * Math.pow(T / layer.Tb, -G0 * M0 / (R_STAR * layer.L));
  }
  var LAYERS = (function () {
    var out = [], Pb = P0;
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
  function geopotentialFromGeometric(Z) { return (R0 * Z) / (R0 + Z); }

  function isaDensity(altM, asGeometric) {
    if (!isFiniteNumber(altM) || altM < 0) return null;
    var H = asGeometric === false ? altM : geopotentialFromGeometric(altM);
    if (H > H_MAX + 1e-6) return null;
    var layer = LAYERS[layerIndex(H)];
    var T = temperatureK(H, layer);
    var P = pressureAt(H, layer);
    return P * M0 / (R_STAR * T);
  }

  function toKg(m, unit) {
    if (!isFiniteNumber(m) || m <= 0) return NaN;
    if (unit === "lb" || unit === "lbm") return m * 0.45359237;
    if (unit === "slug") return m * 14.5939029372064;
    return m;
  }
  function toM2(a, unit) {
    if (!isFiniteNumber(a) || a <= 0) return NaN;
    if (unit === "ft2") return a * 0.3048 * 0.3048;
    return a;
  }
  function toM(h, unit) {
    if (!isFiniteNumber(h) || h < 0) return NaN;
    if (unit === "ft") return h * 0.3048;
    if (unit === "km") return h * 1000;
    if (unit === "nm") return h * 1852;
    return h;
  }
  function toMps(v, unit) {
    if (!isFiniteNumber(v) || v < 0) return NaN;
    if (unit === "km/s") return v * 1000;
    if (unit === "ft/s") return v * 0.3048;
    if (unit === "kt") return v * (1852 / 3600);
    if (unit === "mph") return v * 0.44704;
    return v;
  }

  function compute(input) {
    if (!input) return null;
    var mass = toKg(Number(input.mass), input.massUnit || "kg");
    var cd = Number(input.cd);
    var area = toM2(Number(input.area), input.areaUnit || "m2");
    if (!(mass > 0) || !(cd > 0) || !(area > 0)) return null;
    var beta = mass / (cd * area); // kg/m²

    var rho, altM = 0, rhoSource = "sea-level ISA (ρ0 = 1.225 kg/m³)";
    if (input.density != null && input.density !== "") {
      rho = Number(input.density);
      if (!(rho > 0)) return null;
      rhoSource = "user-entered density";
    } else if (input.altitude != null && input.altitude !== "") {
      altM = toM(Number(input.altitude), input.altUnit || "m");
      if (!isFiniteNumber(altM)) return null;
      rho = isaDensity(altM, true);
      if (rho == null) return null;
      rhoSource = "U.S. Standard Atmosphere 1976 at " + altM + " m geometric";
    } else {
      rho = RHO0;
    }

    var vt = Math.sqrt((2 * beta * G0) / rho);

    var entry = null;
    if (input.entrySpeed != null && input.entrySpeed !== "" &&
        input.gamma != null && input.gamma !== "") {
      var ve = toMps(Number(input.entrySpeed), input.entrySpeedUnit || "km/s");
      var gammaDeg = Number(input.gamma);
      if (!isFiniteNumber(ve) || ve <= 0 || !isFiniteNumber(gammaDeg)) return null;
      if (gammaDeg <= 0 || gammaDeg >= 90) return null;
      var sinG = Math.sin(gammaDeg * Math.PI / 180);
      var aMax = (ve * ve * sinG) / (2 * EULER * H_SCALE);
      var rhoPeak = (beta * sinG) / H_SCALE;
      var belowSurface = rhoPeak > RHO0 + 1e-15;
      var hPeak = belowSurface ? null : -H_SCALE * Math.log(rhoPeak / RHO0);
      var vPeak = ve / Math.sqrt(EULER);
      entry = {
        entrySpeedMps: ve,
        gammaDeg: gammaDeg,
        aMaxMps2: aMax,
        aMaxG: aMax / G0,
        rhoPeak: rhoPeak,
        altitudePeakM: hPeak,
        speedAtPeakMps: vPeak,
        belowSurface: belowSurface,
        scaleHeightM: H_SCALE,
        rho0: RHO0
      };
    }

    return {
      massKg: mass,
      cd: cd,
      areaM2: area,
      ballisticCoefficient: beta,
      density: rho,
      densitySource: rhoSource,
      altitudeM: altM,
      terminalMps: vt,
      terminalKt: vt / (1852 / 3600),
      terminalMph: vt / 0.44704,
      terminalFtS: vt / 0.3048,
      g0: G0,
      entry: entry
    };
  }

  var api = {
    G0: G0,
    RHO0: RHO0,
    H_SCALE: H_SCALE,
    isaDensity: isaDensity,
    compute: compute
  };
  root.TerminalVelocityCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

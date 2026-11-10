/**
 * Reynolds number Re = ρ V L / μ = V L / ν.
 *
 * Density and viscosity may be entered directly, or taken from the
 * U.S. Standard Atmosphere 1976 at a geopotential altitude (when
 * StandardAtmosphereCalcs is loaded). Sutherland's law is used when
 * temperature is given with a pressure (μ from T, ρ from the equation
 * of state with the 1976 gas constant).
 *
 * Sources: NASA Glenn Beginner's Guide to Aeronautics; U.S. Standard
 * Atmosphere 1976 (Sutherland constants); Anderson, Fundamentals of
 * Aerodynamics.
 */
(function (root) {
  "use strict";

  var RS = 287.0528742; // J/(kg·K), USSA 1976 R*/M0
  var BETA = 1.458e-6;
  var SUTH_S = 110.4;
  var KT_MPS = 1852 / 3600;
  var M_PER_FT = 0.3048;
  var M_PER_IN = 0.0254;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function sutherlandMu(tempK) {
    if (!(tempK > 0)) return NaN;
    return BETA * Math.pow(tempK, 1.5) / (tempK + SUTH_S);
  }

  function velocityMps(value, unit) {
    var v = Number(value);
    if (!isFiniteNumber(v) || v < 0) return NaN;
    if (unit === "kt") return v * KT_MPS;
    if (unit === "mph") return v * 0.44704;
    if (unit === "ft/s" || unit === "fps") return v * M_PER_FT;
    if (unit === "km/h" || unit === "kmh") return v / 3.6;
    return v; // m/s
  }

  function lengthM(value, unit) {
    var L = Number(value);
    if (!isFiniteNumber(L) || L <= 0) return NaN;
    if (unit === "ft") return L * M_PER_FT;
    if (unit === "in") return L * M_PER_IN;
    if (unit === "cm") return L / 100;
    if (unit === "mm") return L / 1000;
    if (unit === "km") return L * 1000;
    return L; // m
  }

  /**
   * input.source: "isa" | "nu" | "rho-mu" | "pressure-temp"
   * input.velocity, input.velocityUnit
   * input.length, input.lengthUnit
   * For isa: input.altitudeM (geopotential), optional input.tempK (overrides ISA T)
   * For nu: input.nu (m²/s)
   * For rho-mu: input.rho (kg/m³), input.mu (Pa·s)
   * For pressure-temp: input.pressurePa, input.tempK
   */
  function compute(input) {
    if (!input) return null;
    var V = velocityMps(input.velocity, input.velocityUnit || "m/s");
    var L = lengthM(input.length, input.lengthUnit || "m");
    if (!isFiniteNumber(V) || !isFiniteNumber(L)) return null;

    var rho, mu, nu, tempK = null, pressurePa = null, altitudeM = null, source = input.source || "isa";

    if (source === "nu") {
      nu = Number(input.nu);
      if (!isFiniteNumber(nu) || nu <= 0) return null;
      mu = null;
      rho = null;
    } else if (source === "rho-mu") {
      rho = Number(input.rho);
      mu = Number(input.mu);
      if (!isFiniteNumber(rho) || !isFiniteNumber(mu) || rho <= 0 || mu <= 0) return null;
      nu = mu / rho;
    } else if (source === "pressure-temp") {
      pressurePa = Number(input.pressurePa);
      tempK = Number(input.tempK);
      if (!isFiniteNumber(pressurePa) || !isFiniteNumber(tempK) || pressurePa <= 0 || tempK <= 0) return null;
      rho = pressurePa / (RS * tempK);
      mu = sutherlandMu(tempK);
      nu = mu / rho;
    } else {
      // ISA / USSA 1976 at a geopotential altitude
      var Atm = root.StandardAtmosphereCalcs;
      if (!Atm) return { error: "Standard atmosphere library is not loaded." };
      altitudeM = Number(input.altitudeM);
      if (!isFiniteNumber(altitudeM) || altitudeM < 0) return null;
      var prop = Atm.propertiesAtGeopotential(altitudeM);
      if (!prop) return { error: "Altitude is outside the 0–86 km standard-atmosphere model." };
      if (input.tempK != null && input.tempK !== "" && isFiniteNumber(Number(input.tempK))) {
        tempK = Number(input.tempK);
        pressurePa = prop.pressurePa;
        rho = pressurePa / (RS * tempK);
        mu = sutherlandMu(tempK);
        nu = mu / rho;
      } else {
        tempK = prop.temperatureK;
        pressurePa = prop.pressurePa;
        rho = prop.densityKgM3;
        mu = prop.dynamicViscosity;
        nu = prop.kinematicViscosity;
      }
    }

    var Re = nu > 0 ? V * L / nu : (rho * V * L / mu);
    if (!isFiniteNumber(Re)) return null;

    return {
      reynolds: Re,
      velocityMps: V,
      lengthM: L,
      densityKgM3: rho,
      dynamicViscosity: mu,
      kinematicViscosity: nu,
      temperatureK: tempK,
      pressurePa: pressurePa,
      altitudeM: altitudeM,
      source: source
    };
  }

  var api = {
    RS: RS,
    sutherlandMu: sutherlandMu,
    velocityMps: velocityMps,
    lengthM: lengthM,
    compute: compute
  };

  root.ReynoldsNumberCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

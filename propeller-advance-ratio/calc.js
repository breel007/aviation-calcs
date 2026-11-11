/**
 * Propeller advance ratio and tip Mach number.
 *
 *   J = V / (n D)
 *
 * V is true airspeed, n is rotational speed in revolutions per second,
 * and D is diameter, in consistent units. The rotational tip speed is
 * π n D; the helical tip speed (resultant of forward speed and
 * rotational tip speed) is
 *
 *   V_tip,helical = √(V² + (π n D)²)
 *
 * Tip Mach is that speed divided by the local speed of sound. ISA sea-
 * level a = 340.294 m/s (661.48 kt) is the default; you can enter OAT
 * and altitude and, when the site's standard-atmosphere calculator is
 * available, a is taken from the 1976 U.S. Standard Atmosphere at that
 * geometric altitude, then scaled by √(T / T_ISA) if a non-standard
 * OAT is given.
 *
 * Compressibility and noise become a concern as helical tip Mach
 * approaches ~0.85–0.9, depending on the blade.
 *
 * Sources: NACA / NASA propeller theory (advance ratio J); FAA PHAK
 * (propeller, tip speed); U.S. Standard Atmosphere 1976 (speed of
 * sound); standard helical tip-speed geometry.
 */
(function (root) {
  "use strict";

  var A_SL_MPS = 340.294; // USSA 1976 sea-level, matches this site's atmosphere page
  var MPS_PER_KT = 1852 / 3600;
  var M_PER_FT = 0.3048;
  var M_PER_IN = 0.0254;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function tasToMps(value, unit) {
    if (!isFiniteNumber(value) || value < 0) return NaN;
    if (unit === "mph") return value * 1609.344 / 3600;
    if (unit === "mps" || unit === "m/s") return value;
    if (unit === "kph" || unit === "km/h") return value * 1000 / 3600;
    if (unit === "fps" || unit === "ft/s") return value * M_PER_FT;
    return value * MPS_PER_KT; // kt
  }

  function diameterToM(value, unit) {
    if (!isFiniteNumber(value) || value <= 0) return NaN;
    if (unit === "in" || unit === "inch") return value * M_PER_IN;
    if (unit === "m") return value;
    if (unit === "cm") return value / 100;
    return value * M_PER_FT; // ft
  }

  function rpmToRps(value, unit) {
    if (!isFiniteNumber(value) || value <= 0) return NaN;
    if (unit === "rps" || unit === "hz") return value;
    if (unit === "rad/s") return value / (2 * Math.PI);
    return value / 60; // rpm
  }

  function speedOfSoundMps(input) {
    var Atm = root.StandardAtmosphereCalcs;
    var altFt = 0;
    if (input && input.altitude != null && input.altitude !== "") {
      var a = Number(input.altitude);
      if (!isFiniteNumber(a) || a < 0) return NaN;
      var u = input.altitudeUnit || "ft";
      altFt = u === "m" ? a / M_PER_FT : a;
    }
    var oatC = null;
    if (input && input.oat != null && input.oat !== "") {
      var t = Number(input.oat);
      if (!isFiniteNumber(t)) return NaN;
      oatC = (input.oatUnit === "F" || input.oatUnit === "f") ? (t - 32) * 5 / 9 : t;
    }
    if (Atm) {
      var p = Atm.propertiesFromGeometric(altFt * M_PER_FT);
      if (p) {
        if (oatC == null) return p.speedOfSoundMps;
        var T = oatC + 273.15;
        if (T <= 0) return NaN;
        return p.speedOfSoundMps * Math.sqrt(T / p.temperatureK);
      }
    }
    // Fallback: ISA troposphere from sea-level a and T.
    var Tsl = 288.15, L = 0.0065, gammaR = 1.4 * 287.05287;
    var Tisa = Tsl - L * (altFt * M_PER_FT);
    if (Tisa <= 0) return NaN;
    var T = oatC == null ? Tisa : oatC + 273.15;
    if (T <= 0) return NaN;
    return Math.sqrt(gammaR * T);
  }

  function compute(input) {
    if (!input) return null;
    var V = tasToMps(Number(input.tas), input.tasUnit || "kt");
    var D = diameterToM(Number(input.diameter), input.diameterUnit || "ft");
    var n = rpmToRps(Number(input.rpm), input.rpmUnit || "rpm");
    if (!isFiniteNumber(V) || !isFiniteNumber(D) || !isFiniteNumber(n)) return null;
    if (n * D <= 0) return null;

    var J = V / (n * D);
    var tipRot = Math.PI * n * D;
    var tipHel = Math.sqrt(V * V + tipRot * tipRot);
    var a = speedOfSoundMps(input);
    if (!isFiniteNumber(a) || a <= 0) return null;
    var omega = 2 * Math.PI * n;

    return {
      J: J,
      tasMps: V,
      tasKt: V / MPS_PER_KT,
      diameterM: D,
      diameterFt: D / M_PER_FT,
      rps: n,
      rpm: n * 60,
      tipSpeedRotMps: tipRot,
      tipSpeedRotKt: tipRot / MPS_PER_KT,
      tipSpeedHelMps: tipHel,
      tipSpeedHelKt: tipHel / MPS_PER_KT,
      speedOfSoundMps: a,
      speedOfSoundKt: a / MPS_PER_KT,
      tipMachRot: tipRot / a,
      tipMachHel: tipHel / a,
      omega: omega
    };
  }

  var api = {
    A_SL_MPS: A_SL_MPS,
    tasToMps: tasToMps,
    diameterToM: diameterToM,
    rpmToRps: rpmToRps,
    speedOfSoundMps: speedOfSoundMps,
    compute: compute
  };
  root.PropellerAdvanceRatioCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

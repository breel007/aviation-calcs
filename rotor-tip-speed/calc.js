/**
 * Helicopter rotor tip speed, advance ratio, and tip Mach number.
 *
 *   tip speed     ΩR = 2π n R     (n in revolutions per second)
 *   advance ratio μ  = V / (ΩR)
 *   tip Mach      M_t = ΩR / a
 *   helical tip   M_h = √((ΩR)² + V²) / a     (advancing-blade tip,
 *                                              no cyclic addition)
 *
 * The speed of sound uses the same constants as this site's
 * standard-atmosphere and true-airspeed pages (γ = 1.4,
 * R = 287.05287 J/(kg·K)). Default temperature is 15 °C
 * (a = 340.294 m/s) unless you enter an OAT or a pressure altitude
 * (ISA). This is a helicopter μ / tip-Mach page; propeller advance
 * ratio J = V/(nD) is on the propeller-advance-ratio calculator
 * (J = π μ for the same rotor).
 *
 * Sources: Leishman, Principles of Helicopter Aerodynamics (tip
 * speed, advance ratio μ, advancing-tip Mach); FAA Helicopter Flying
 * Handbook (rotor-system limits, retreating-blade stall and
 * advancing-tip Mach — conceptual); U.S. Standard Atmosphere, 1976,
 * speed of sound.
 */
(function (root) {
  "use strict";

  var GAMMA = 1.4, R = 287.05287, T0 = 288.15, L = 0.0065, A0 = Math.sqrt(GAMMA * R * T0);
  var TROP_M = 11000, TROP_T = T0 - L * TROP_M;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function toM(d, unit) {
    if (!isFiniteNumber(d) || d <= 0) return NaN;
    if (unit === "ft") return d * 0.3048;
    if (unit === "in") return d * 0.0254;
    return d;
  }
  function toMps(v, unit) {
    if (!isFiniteNumber(v) || v < 0) return NaN;
    if (unit === "kt") return v * 1852 / 3600;
    if (unit === "mph") return v * 1609.344 / 3600;
    if (unit === "kph") return v / 3.6;
    if (unit === "fps") return v * 0.3048;
    return v;
  }
  function omegaFrom(input) {
    if (input.omega != null && input.omega !== "") {
      var om = Number(input.omega);
      var u = input.omegaUnit || "rpm";
      if (!(om > 0)) return NaN;
      if (u === "rpm") return om * 2 * Math.PI / 60;
      if (u === "rps" || u === "hz") return om * 2 * Math.PI;
      return om; // rad/s
    }
    if (input.rpm != null && input.rpm !== "") {
      var rpm = Number(input.rpm);
      return rpm > 0 ? rpm * 2 * Math.PI / 60 : NaN;
    }
    return NaN;
  }
  function isaTempK(hM) {
    if (hM <= TROP_M) return T0 - L * hM;
    return TROP_T;
  }

  function compute(input) {
    if (!input) return null;
    var radius;
    if (input.radius != null && input.radius !== "") {
      radius = toM(Number(input.radius), input.radUnit || "m");
    } else if (input.diameter != null && input.diameter !== "") {
      radius = toM(Number(input.diameter), input.diaUnit || "m") / 2;
    } else {
      return null;
    }
    var omega = omegaFrom(input);
    if (!(radius > 0) || !(omega > 0)) return null;
    var tip = omega * radius;

    var tempK = T0;
    if (input.oat != null && input.oat !== "") {
      var oat = Number(input.oat);
      var tu = input.tempUnit || "C";
      if (tu === "F" || tu === "f") tempK = (oat - 32) * 5 / 9 + 273.15;
      else if (tu === "K") tempK = oat;
      else tempK = oat + 273.15;
    } else if (input.pressureAltitude != null && input.pressureAltitude !== "") {
      var h = Number(input.pressureAltitude);
      if ((input.altUnit || "ft") === "ft") h = h * 0.3048;
      if (!isFiniteNumber(h)) return null;
      tempK = isaTempK(h);
    }
    if (!(tempK > 0)) return null;
    var a = Math.sqrt(GAMMA * R * tempK);

    var V = 0;
    if (input.speed != null && input.speed !== "") {
      V = toMps(Number(input.speed), input.speedUnit || "kt");
      if (!isFiniteNumber(V) || V < 0) return null;
    }
    var mu = tip > 0 ? V / tip : null;
    var mTip = tip / a;
    var mHel = Math.sqrt(tip * tip + V * V) / a;

    return {
      radiusM: radius,
      omegaRadS: omega,
      rpm: omega * 60 / (2 * Math.PI),
      tipMps: tip,
      tipFps: tip / 0.3048,
      tipKt: tip / (1852 / 3600),
      speedMps: V,
      advanceRatio: mu,
      speedOfSoundMps: a,
      tipMach: mTip,
      helicalTipMach: mHel,
      tempK: tempK,
      A0: A0
    };
  }

  var api = { A0: A0, compute: compute };
  root.RotorTipSpeedCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

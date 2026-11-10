/**
 * Hohmann coplanar circular-orbit transfer.
 *
 * Transfer ellipse: a_t = (r1 + r2) / 2
 *   v1 = √(μ/r1)                 v2 = √(μ/r2)
 *   vp = √(μ (2/r1 − 1/a_t))     va = √(μ (2/r2 − 1/a_t))
 *   Δv1 = |vp − v1|              Δv2 = |v2 − va|
 *   time of flight = π √(a_t³ / μ)     (half the transfer period)
 *
 * Default body: Earth, μ = 3.986004418×10¹⁴ m³/s². Radii may be entered
 * as radii from the center or as altitudes above a chosen body radius.
 *
 * Sources: Hohmann (1925); Vallado, Fundamentals of Astrodynamics and
 * Applications; Curtis, Orbital Mechanics for Engineering Students;
 * Bate, Mueller & White, Fundamentals of Astrodynamics.
 */
(function (root) {
  "use strict";

  var MU_EARTH = 3.986004418e14;
  var R_EARTH_MEAN = 6371000;
  var R_EARTH_EQ = 6378137;
  var SIDEREAL_DAY_S = 86164.0905;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function geoRadius(mu) {
    return Math.pow(mu * SIDEREAL_DAY_S * SIDEREAL_DAY_S / (4 * Math.PI * Math.PI), 1 / 3);
  }

  function resolveRadius(value, unit, bodyRadius, mu) {
    if (unit === "geo") return geoRadius(mu);
    var n = Number(value);
    if (!isFiniteNumber(n) || n < 0) return NaN;
    if (unit === "altitude-km") return bodyRadius + n * 1000;
    if (unit === "altitude-m") return bodyRadius + n;
    if (unit === "radius-km") return n * 1000;
    if (unit === "altitude-nm") return bodyRadius + n * 1852;
    return n; // radius, m
  }

  function compute(input) {
    if (!input) return null;
    var mu = input.mu != null && input.mu !== "" ? Number(input.mu) : MU_EARTH;
    var earthR = input.earthRadius === "equatorial" ? R_EARTH_EQ : R_EARTH_MEAN;
    var bodyRadius = input.bodyRadius != null && input.bodyRadius !== ""
      ? Number(input.bodyRadius)
      : earthR;
    if (!isFiniteNumber(mu) || mu <= 0 || !isFiniteNumber(bodyRadius) || bodyRadius <= 0) return null;

    var r1 = resolveRadius(input.r1, input.r1Unit || "altitude-km", bodyRadius, mu);
    var r2 = resolveRadius(input.r2, input.r2Unit || "altitude-km", bodyRadius, mu);
    if (!isFiniteNumber(r1) || !isFiniteNumber(r2) || r1 <= 0 || r2 <= 0) return null;
    if (r1 === r2) {
      return {
        r1: r1, r2: r2, mu: mu, bodyRadius: bodyRadius,
        deltaV1: 0, deltaV2: 0, deltaV: 0,
        timeOfFlight: 0,
        note: "Radii are equal; no transfer is required."
      };
    }

    var a = 0.5 * (r1 + r2);
    var v1 = Math.sqrt(mu / r1);
    var v2 = Math.sqrt(mu / r2);
    var vp = Math.sqrt(mu * (2 / r1 - 1 / a));
    var va = Math.sqrt(mu * (2 / r2 - 1 / a));
    var dv1 = vp - v1; // positive when going outward
    var dv2 = v2 - va;
    var tof = Math.PI * Math.sqrt((a * a * a) / mu);
    var e = Math.abs(r2 - r1) / (r1 + r2);
    return {
      r1: r1,
      r2: r2,
      mu: mu,
      bodyRadius: bodyRadius,
      altitude1: r1 - bodyRadius,
      altitude2: r2 - bodyRadius,
      transferSemiMajorAxis: a,
      eccentricity: e,
      circularVelocity1: v1,
      circularVelocity2: v2,
      periapsisVelocity: Math.max(vp, va), // speed on the ellipse at the smaller radius
      apoapsisVelocity: Math.min(vp, va),
      velocityOnEllipseAtR1: vp,
      velocityOnEllipseAtR2: va,
      deltaV1: Math.abs(dv1),
      deltaV2: Math.abs(dv2),
      deltaV: Math.abs(dv1) + Math.abs(dv2),
      deltaV1Signed: dv1,
      deltaV2Signed: dv2,
      timeOfFlight: tof,
      geoRadius: geoRadius(mu)
    };
  }

  var api = {
    MU_EARTH: MU_EARTH,
    R_EARTH_MEAN: R_EARTH_MEAN,
    R_EARTH_EQ: R_EARTH_EQ,
    SIDEREAL_DAY_S: SIDEREAL_DAY_S,
    geoRadius: geoRadius,
    compute: compute
  };

  root.HohmannTransferCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

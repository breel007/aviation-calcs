/**
 * Satellite horizon, field-of-view footprint, and swath on a
 * spherical Earth.
 *
 * From orbital altitude h above a sphere of radius R, the Earth
 * angular radius (nadir to the geometric limb) is
 *
 *   η_horizon = arcsin( R / (R + h) )
 *   λ_horizon = arccos( R / (R + h) )     (central angle to the limb)
 *
 * For a nadir-pointing sensor with half-angle η (or an off-nadir
 * look angle η), the Earth-central angle of the look is
 *
 *   λ = arcsin( ((R+h)/R) sin η ) − η
 *
 * provided η < η_horizon. The ground range from the subsatellite
 * point is R λ, and a symmetric nadir FOV has swath width 2 R λ.
 *
 * Circular-orbit period and inertial speed are included for context
 * (same μ as this site's orbital-velocity calculator):
 *   V = √(μ / (R+h)),   T = 2π √((R+h)³ / μ)
 * Subsatellite speed on a non-rotating Earth is V × R/(R+h). Earth
 * rotation, oblateness, and attitude are not modelled.
 *
 * Default R is the mean spherical radius 6,371 km. μ = 3.986004418×10¹⁴
 * m³/s² (Earth, IAU / WGS-family GM).
 *
 * Sources: Vallado, Fundamentals of Astrodynamics and Applications
 * (Earth central angle, horizon, swath); Wertz and Larson, Space
 * Mission Analysis and Design; NASA / JPL planetary constants (μ, R).
 */
(function (root) {
  "use strict";

  var R_MEAN_M = 6371000;
  var MU_EARTH = 3.986004418e14;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function toM(v, unit) {
    if (!isFiniteNumber(v) || v < 0) return NaN;
    if (unit === "km") return v * 1000;
    if (unit === "ft") return v * 0.3048;
    if (unit === "nm") return v * 1852;
    if (unit === "mi") return v * 1609.344;
    return v; // m
  }

  function compute(input) {
    if (!input) return null;
    var R = input.radius != null && input.radius !== ""
      ? toM(Number(input.radius), input.radiusUnit || "km")
      : R_MEAN_M;
    var h = toM(Number(input.altitude), input.altUnit || "km");
    if (!(R > 0) || !isFiniteNumber(h) || h < 0) return null;
    var r = R + h;
    if (!(r > R)) {
      // Allow h = 0 (on the surface): horizon and period still defined
      // in the degenerate sense, but a look angle will fail below.
    }
    var mu = input.mu != null && input.mu !== "" ? Number(input.mu) : MU_EARTH;
    if (!isFiniteNumber(mu) || mu <= 0) return null;

    var sinEtaH = R / r;
    if (sinEtaH > 1) sinEtaH = 1;
    var etaHorizon = Math.asin(sinEtaH);
    var lambdaHorizon = Math.acos(Math.min(1, R / r));
    var footprintRadiusH = R * lambdaHorizon;
    var swathH = 2 * footprintRadiusH;

    var eta = null, lambda = null, groundRange = null, swath = null, belowHorizon = null;
    if (input.nadirAngle != null && input.nadirAngle !== "") {
      var etaDeg = Number(input.nadirAngle);
      if (!isFiniteNumber(etaDeg) || etaDeg < 0) return null;
      eta = etaDeg * Math.PI / 180;
      belowHorizon = eta < etaHorizon - 1e-15;
      if (eta >= etaHorizon) {
        belowHorizon = false;
      } else {
        var arg = (r / R) * Math.sin(eta);
        if (arg > 1 && arg < 1 + 1e-12) arg = 1;
        if (arg < 0 || arg > 1) return null;
        lambda = Math.asin(arg) - eta;
        if (lambda < 0) lambda = 0;
        groundRange = R * lambda;
        swath = 2 * groundRange;
        belowHorizon = true;
      }
    }

    var periodSec = 2 * Math.PI * Math.sqrt((r * r * r) / mu);
    var vOrb = Math.sqrt(mu / r);
    var vGround = vOrb * (R / r); // non-rotating Earth

    return {
      radiusM: R,
      altitudeM: h,
      semiMajorM: r,
      mu: mu,
      etaHorizonRad: etaHorizon,
      etaHorizonDeg: etaHorizon * 180 / Math.PI,
      lambdaHorizonRad: lambdaHorizon,
      lambdaHorizonDeg: lambdaHorizon * 180 / Math.PI,
      horizonRadiusM: footprintRadiusH,
      horizonSwathM: swathH,
      nadirAngleRad: eta,
      lambdaRad: lambda,
      lambdaDeg: lambda == null ? null : lambda * 180 / Math.PI,
      groundRangeM: groundRange,
      swathM: swath,
      belowHorizon: belowHorizon,
      periodSec: periodSec,
      periodMin: periodSec / 60,
      orbitalSpeedMps: vOrb,
      subsatelliteSpeedMps: vGround
    };
  }

  var api = {
    R_MEAN_M: R_MEAN_M,
    MU_EARTH: MU_EARTH,
    compute: compute
  };
  root.SatelliteFovCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

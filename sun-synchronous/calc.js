/**
 * Sun-synchronous orbit inclination from J2 nodal precession.
 *
 * A sun-synchronous orbit is one whose right ascension of the
 * ascending node precesses at the mean apparent rate of the Sun,
 * about 0.985647 degrees per mean solar day (360° / 365.24219 days),
 * so that the local time of the ascending node stays roughly fixed.
 * Earth's oblateness (J2) provides that precession:
 *
 *   Ω̇ = −(3/2) n J2 (R_eq / a)² cos i / (1−e²)²
 *
 * Setting Ω̇ to the mean-solar rate and solving for inclination
 * gives a retrograde i (typically a little over 90°). This page
 * does not recompute a geostationary radius — that is on the
 * orbital-velocity-period calculator.
 *
 * Defaults: J2 = 1.08263×10⁻³, R_eq = 6,378.137 km, μ = 3.986004418×10¹⁴
 * m³/s², circular (e = 0) unless you enter an eccentricity. Semi-major
 * axis is R_eq plus the altitude you type.
 *
 * Sources: Vallado, Fundamentals of Astrodynamics and Applications
 * (J2 nodal precession and sun-synchronous inclination); Wertz and
 * Larson, Space Mission Analysis and Design; IERS / WGS-84 Earth
 * constants.
 */
(function (root) {
  "use strict";

  var MU = 3.986004418e14;
  var J2 = 1.08263e-3;
  var REQ = 6378137; // m, WGS-84 equatorial
  var DEG_PER_DAY = 360 / 365.24219; // mean tropical year ≈ 0.985647

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function toM(h, unit) {
    if (!isFiniteNumber(h)) return NaN;
    if (unit === "km") return h * 1000;
    if (unit === "nm") return h * 1852;
    if (unit === "ft") return h * 0.3048;
    return h;
  }

  function compute(input) {
    if (!input) return null;
    var h = toM(Number(input.altitude), input.altUnit || "km");
    if (!isFiniteNumber(h) || h <= 0) return null;
    var a = REQ + h;
    var e = input.eccentricity == null || input.eccentricity === "" ? 0 : Number(input.eccentricity);
    if (!isFiniteNumber(e) || e < 0 || e >= 1) return null;
    if (a * (1 - e) <= REQ) return null; // perigee inside the equator
    var j2 = input.j2 == null || input.j2 === "" ? J2 : Number(input.j2);
    if (!(j2 > 0)) return null;
    var rateDegDay = input.precessionDegPerDay == null || input.precessionDegPerDay === ""
      ? DEG_PER_DAY : Number(input.precessionDegPerDay);
    if (!isFiniteNumber(rateDegDay)) return null;

    var n = Math.sqrt(MU / (a * a * a));
    var rateRadS = rateDegDay * Math.PI / 180 / 86400;
    var factor = (-1.5) * n * j2 * Math.pow(REQ / a, 2) / Math.pow(1 - e * e, 2);
    var cosi = rateRadS / factor;
    if (Math.abs(cosi) > 1) return null;
    var i = Math.acos(cosi);

    return {
      altitudeM: h,
      smaM: a,
      eccentricity: e,
      meanMotionRadS: n,
      periodSec: 2 * Math.PI / n,
      j2: j2,
      precessionDegPerDay: rateDegDay,
      inclinationRad: i,
      inclinationDeg: i * 180 / Math.PI,
      cosInclination: cosi,
      REQ: REQ,
      DEG_PER_DAY: DEG_PER_DAY
    };
  }

  var api = { MU: MU, J2: J2, REQ: REQ, DEG_PER_DAY: DEG_PER_DAY, compute: compute };
  root.SunSynchronousCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

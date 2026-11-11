/**
 * Heliocentric Hohmann transfer between two circular coplanar
 * planetary orbits, including the synodic wait for the next window.
 *
 *   a_t   = (r1 + r2) / 2
 *   TOF   = π √(a_t³ / μ_sun)
 *   v_c   = √(μ / r)
 *   v_t   = √(μ (2/r − 1/a_t))     (vis-viva on the transfer ellipse)
 *   Δv1   = |v_t(r1) − v_c(r1)|
 *   Δv2   = |v_c(r2) − v_t(r2)|
 *
 * These Δv figures are heliocentric impulsive changes. A real
 * departure from low Earth orbit also has to climb out of Earth's
 * gravity well (a patched-conic or Oberth problem this page does
 * not solve). μ_sun = 1.32712440018×10²⁰ m³/s², and 1 AU =
 * 1.495978707×10¹¹ m. Default radii are Earth's 1 AU and Mars's
 * 1.523679 AU mean semi-major axes.
 *
 * The synodic period of the two orbits, 1/S = |1/T1 − 1/T2| with
 * T = 2π √(a³/μ), is the time between successive Hohmann windows
 * in this circular coplanar model. Contrast this site's Hohmann
 * transfer calculator, which is a coplanar transfer around a single
 * body you name (Earth, or a μ you type), not a heliocentric
 * planet-to-planet leg.
 *
 * Sources: Hohmann (1925) transfer; Vallado, Fundamentals of
 * Astrodynamics and Applications; Prussing and Conway, Orbital
 * Mechanics; IAU solar μ and AU.
 */
(function (root) {
  "use strict";

  var MU_SUN = 1.32712440018e20;
  var AU = 1.495978707e11;
  var PLANETS_AU = {
    mercury: 0.387098,
    venus: 0.723332,
    earth: 1,
    mars: 1.523679,
    jupiter: 5.203364,
    saturn: 9.537070
  };

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function radiusOf(nameOrValue, unit) {
    if (typeof nameOrValue === "string" && PLANETS_AU[nameOrValue.toLowerCase()]) {
      return PLANETS_AU[nameOrValue.toLowerCase()] * AU;
    }
    var r = Number(nameOrValue);
    if (!(r > 0)) return NaN;
    if (unit === "km") return r * 1000;
    if (unit === "m") return r;
    return r * AU;
  }

  function compute(input) {
    if (!input) return null;
    var r1 = radiusOf(input.body1 != null && input.body1 !== "" ? input.body1 : input.radius1, input.unit1 || "au");
    var r2 = radiusOf(input.body2 != null && input.body2 !== "" ? input.body2 : input.radius2, input.unit2 || "au");
    if (!(r1 > 0) || !(r2 > 0) || r1 === r2) return null;
    var mu = input.mu == null || input.mu === "" ? MU_SUN : Number(input.mu);
    if (!(mu > 0)) return null;

    var at = 0.5 * (r1 + r2);
    var tof = Math.PI * Math.sqrt(at * at * at / mu);
    var vc1 = Math.sqrt(mu / r1);
    var vc2 = Math.sqrt(mu / r2);
    var vt1 = Math.sqrt(mu * (2 / r1 - 1 / at));
    var vt2 = Math.sqrt(mu * (2 / r2 - 1 / at));
    var dv1 = Math.abs(vt1 - vc1);
    var dv2 = Math.abs(vc2 - vt2);
    var t1 = 2 * Math.PI * Math.sqrt(r1 * r1 * r1 / mu);
    var t2 = 2 * Math.PI * Math.sqrt(r2 * r2 * r2 / mu);
    var syn = 1 / Math.abs(1 / t1 - 1 / t2);

    return {
      r1M: r1,
      r2M: r2,
      r1Au: r1 / AU,
      r2Au: r2 / AU,
      transferSmaM: at,
      timeOfFlightSec: tof,
      timeOfFlightDays: tof / 86400,
      dv1Mps: dv1,
      dv2Mps: dv2,
      dvTotalMps: dv1 + dv2,
      vc1Mps: vc1,
      vc2Mps: vc2,
      period1Days: t1 / 86400,
      period2Days: t2 / 86400,
      synodicDays: syn / 86400,
      MU_SUN: MU_SUN,
      AU: AU
    };
  }

  var api = { MU_SUN: MU_SUN, AU: AU, PLANETS_AU: PLANETS_AU, compute: compute };
  root.PlanetaryTransferCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

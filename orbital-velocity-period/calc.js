/**
 * Circular-orbit speed, period, and escape speed, plus the vis-viva
 * speed on an ellipse:
 *
 *   v_circ  = √(μ / r)
 *   T       = 2π √(r³ / μ)
 *   v_esc   = √(2μ / r)
 *   v       = √( μ (2/r − 1/a) )     (vis-viva)
 *
 * Default body is Earth, with μ = 3.986004418×10¹⁴ m³/s² (IERS / Vallado)
 * and a mean radius of 6,371,000 m. Equatorial radius 6,378,137 m (WGS-84)
 * is offered as an option; the user may also enter a custom μ and radius.
 *
 * GEO radius is the circular radius whose period is one sidereal day
 * (86,164.0905 s).
 *
 * Sources: Vallado, Fundamentals of Astrodynamics and Applications;
 * Curtis, Orbital Mechanics for Engineering Students; Bate, Mueller &
 * White, Fundamentals of Astrodynamics.
 */
(function (root) {
  "use strict";

  var MU_EARTH = 3.986004418e14; // m³/s²
  var R_EARTH_MEAN = 6371000;    // m
  var R_EARTH_EQ = 6378137;      // m, WGS-84 equatorial
  var SIDEREAL_DAY_S = 86164.0905;

  var BODIES = {
    earth: { name: "Earth", mu: MU_EARTH, radius: R_EARTH_MEAN, radiusEq: R_EARTH_EQ },
    moon: { name: "Moon", mu: 4.902800066e12, radius: 1737400 },
    mars: { name: "Mars", mu: 4.2828372e13, radius: 3389500 },
    sun: { name: "Sun", mu: 1.32712440018e20, radius: 695700000 }
  };

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function bodyParams(input) {
    var b = BODIES[(input && input.body) || "earth"] || BODIES.earth;
    var mu = input && input.mu != null && input.mu !== "" ? Number(input.mu) : b.mu;
    var radiusKey = input && input.earthRadius === "equatorial" ? (b.radiusEq || b.radius) : b.radius;
    var R = input && input.radius != null && input.radius !== "" ? Number(input.radius) : radiusKey;
    return { name: b.name, mu: mu, radius: R };
  }

  function radiusFromInput(input, R) {
    if (input.radiusM != null && input.radiusM !== "") {
      var r = Number(input.radiusM);
      return isFiniteNumber(r) && r > 0 ? r : NaN;
    }
    var alt = Number(input.altitudeM);
    if (!isFiniteNumber(alt) || alt < 0) return NaN;
    return R + alt;
  }

  function circular(mu, r) {
    var v = Math.sqrt(mu / r);
    var T = 2 * Math.PI * Math.sqrt((r * r * r) / mu);
    var vesc = Math.sqrt(2 * mu / r);
    return { radius: r, velocity: v, period: T, escapeVelocity: vesc };
  }

  function geoRadius(mu) {
    var T = SIDEREAL_DAY_S;
    return Math.pow(mu * T * T / (4 * Math.PI * Math.PI), 1 / 3);
  }

  /**
   * input.body, input.earthRadius ("mean"|"equatorial")
   * input.altitudeM  or input.radiusM
   * Optional ellipse: input.periapsisM, input.apoapsisM (radii from center,
   * or altitudes if input.apsidesAreAltitudes is true)
   */
  function compute(input) {
    if (!input) return null;
    var b = bodyParams(input);
    if (!isFiniteNumber(b.mu) || b.mu <= 0 || !isFiniteNumber(b.radius) || b.radius <= 0) return null;

    var peri = input.periapsisM != null && input.periapsisM !== "" ? Number(input.periapsisM) : NaN;
    var apo = input.apoapsisM != null && input.apoapsisM !== "" ? Number(input.apoapsisM) : NaN;
    var elliptical = isFiniteNumber(peri) && isFiniteNumber(apo);

    if (elliptical) {
      var rp = input.apsidesAreAltitudes ? peri + b.radius : peri;
      var ra = input.apsidesAreAltitudes ? apo + b.radius : apo;
      if (!(rp > 0) || !(ra > 0)) return null;
      if (ra < rp) { var tmp = ra; ra = rp; rp = tmp; }
      var a = 0.5 * (rp + ra);
      var e = (ra - rp) / (ra + rp);
      var vp = Math.sqrt(b.mu * (2 / rp - 1 / a));
      var va = Math.sqrt(b.mu * (2 / ra - 1 / a));
      var T = 2 * Math.PI * Math.sqrt((a * a * a) / b.mu);
      var circP = circular(b.mu, rp);
      var circA = circular(b.mu, ra);
      return {
        body: b.name,
        mu: b.mu,
        bodyRadius: b.radius,
        mode: "elliptical",
        periapsis: rp,
        apoapsis: ra,
        semiMajorAxis: a,
        eccentricity: e,
        periapsisVelocity: vp,
        apoapsisVelocity: va,
        period: T,
        periapsisAltitude: rp - b.radius,
        apoapsisAltitude: ra - b.radius,
        circularVelocityAtPeriapsis: circP.velocity,
        circularVelocityAtApoapsis: circA.velocity,
        escapeAtPeriapsis: circP.escapeVelocity
      };
    }

    var r = radiusFromInput(input, b.radius);
    if (!isFiniteNumber(r) || r <= 0) return null;
    var c = circular(b.mu, r);
    var geo = b.name === "Earth" ? geoRadius(b.mu) : null;
    return {
      body: b.name,
      mu: b.mu,
      bodyRadius: b.radius,
      mode: "circular",
      radius: c.radius,
      altitude: c.radius - b.radius,
      velocity: c.velocity,
      period: c.period,
      escapeVelocity: c.escapeVelocity,
      geoRadius: geo,
      geoAltitude: geo != null ? geo - b.radius : null,
      surfaceCircularVelocity: circular(b.mu, b.radius).velocity
    };
  }

  var api = {
    MU_EARTH: MU_EARTH,
    R_EARTH_MEAN: R_EARTH_MEAN,
    R_EARTH_EQ: R_EARTH_EQ,
    SIDEREAL_DAY_S: SIDEREAL_DAY_S,
    BODIES: BODIES,
    circular: circular,
    geoRadius: geoRadius,
    compute: compute
  };

  root.OrbitalVelocityPeriodCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

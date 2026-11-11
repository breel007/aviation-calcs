/**
 * Great-circle distance and initial/final true course on a sphere.
 *
 *   a = sin²(Δφ/2) + cos φ1 · cos φ2 · sin²(Δλ/2)
 *   δ = 2 atan2( √a , √(1−a) )          (central angle)
 *   d = R δ
 *
 * Initial true course (forward azimuth):
 *   θ = atan2( sin Δλ · cos φ2,
 *              cos φ1 · sin φ2 − sin φ1 · cos φ2 · cos Δλ )
 *
 * The final course is the initial course of the reverse geodesic, plus
 * 180°. Default radius is the mean spherical Earth 6,371,000 m (the
 * same mean radius used on this site's orbital and satellite pages),
 * which makes one degree of a great circle 60.04 NM, not a flat 60.
 *
 * This is a spherical model, not a WGS-84 geodesic (Vincenty / Karney).
 * Errors are typically a few tenths of a percent, small compared with
 * routing and wind. Latitude is positive north, longitude positive east,
 * in the range −90…90 and −180…180 (or 0…360 for longitude).
 *
 * Sources: FAA Pilot's Handbook of Aeronautical Knowledge (latitude,
 * longitude, great-circle routes); Veness, Movable Type Scripts
 * (haversine and forward azimuth, well-known spherical identities);
 * IAU / WGS-family mean radius 6,371 km.
 */
(function (root) {
  "use strict";

  var R_MEAN_M = 6371000;
  var M_PER_NM = 1852;
  var M_PER_SM = 1609.344;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function toRad(d) { return d * Math.PI / 180; }
  function toDeg(r) { return r * 180 / Math.PI; }
  function wrap360(deg) {
    var x = deg % 360;
    if (x < 0) x += 360;
    if (Math.abs(x - 360) < 1e-12) x = 0;
    return x;
  }
  function normalizeLon(lon) {
    var x = lon;
    while (x > 180) x -= 360;
    while (x < -180) x += 360;
    return x;
  }

  function compute(input) {
    if (!input) return null;
    var lat1 = Number(input.lat1), lon1 = Number(input.lon1);
    var lat2 = Number(input.lat2), lon2 = Number(input.lon2);
    if (!isFiniteNumber(lat1) || !isFiniteNumber(lon1) ||
        !isFiniteNumber(lat2) || !isFiniteNumber(lon2)) return null;
    if (Math.abs(lat1) > 90 || Math.abs(lat2) > 90) return null;
    lon1 = normalizeLon(lon1);
    lon2 = normalizeLon(lon2);

    var R = input.radiusM != null && input.radiusM !== ""
      ? Number(input.radiusM) : R_MEAN_M;
    if (!(R > 0)) return null;

    var p1 = toRad(lat1), p2 = toRad(lat2);
    var dP = p2 - p1;
    var dL = toRad(lon2 - lon1);
    var a = Math.sin(dP / 2) * Math.sin(dP / 2) +
      Math.cos(p1) * Math.cos(p2) * Math.sin(dL / 2) * Math.sin(dL / 2);
    if (a < 0) a = 0;
    if (a > 1) a = 1;
    var delta = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var distM = R * delta;

    var y = Math.sin(dL) * Math.cos(p2);
    var x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dL);
    var initial = wrap360(toDeg(Math.atan2(y, x)));

    var y2 = Math.sin(-dL) * Math.cos(p1);
    var x2 = Math.cos(p2) * Math.sin(p1) - Math.sin(p2) * Math.cos(p1) * Math.cos(-dL);
    var back = wrap360(toDeg(Math.atan2(y2, x2)));
    var finalCrs = wrap360(back + 180);

    var same = distM < 1e-6;
    var antipodal = !same && Math.abs(delta - Math.PI) < 1e-8;
    return {
      distanceM: distM,
      distanceNm: distM / M_PER_NM,
      distanceKm: distM / 1000,
      distanceSm: distM / M_PER_SM,
      centralAngleDeg: toDeg(delta),
      initialCourse: (same || antipodal) ? null : initial,
      finalCourse: (same || antipodal) ? null : finalCrs,
      radiusM: R,
      coincident: same,
      antipodal: antipodal
    };
  }

  var api = { R_MEAN_M: R_MEAN_M, wrap360: wrap360, compute: compute };
  root.GreatCircleDistanceCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

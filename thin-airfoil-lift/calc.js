/**
 * Thin-airfoil theory section lift: cl = 2π (α − α_L0).
 *
 * Angles in the formula are in radians. The section lift-curve slope
 * is a0 = 2π per radian, or about 0.1097 per degree, and the
 * zero-lift angle α_L0 is zero for a flat plate or symmetric section.
 * The quarter-chord pitching moment of a flat plate is zero in this
 * theory (the aerodynamic center is at c/4); a cambered section has a
 * constant cm_ac that this page does not try to invent from thickness.
 *
 * An optional dynamic pressure then gives a dimensional lift,
 * L = cl × ½ ρ V² S, with the same ½ρV² used on this site's lift-
 * coefficient page. The theory is inviscid, incompressible, and
 * two-dimensional; it does not predict stall.
 *
 * Sources: thin-airfoil theory, cl = 2π(α − α_L0) (Glauert; Abbott
 * and von Doenhoff, Theory of Wing Sections; Anderson, Fundamentals
 * of Aerodynamics).
 */
(function (root) {
  "use strict";

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function toRad(d, unit) {
    if (!isFiniteNumber(d)) return NaN;
    if (unit === "rad") return d;
    return d * Math.PI / 180;
  }

  function compute(input) {
    if (!input) return null;
    var unit = input.angleUnit || "deg";
    var alpha = toRad(Number(input.alpha), unit);
    var aL0 = toRad(input.alphaL0 == null || input.alphaL0 === "" ? 0 : Number(input.alphaL0), unit);
    if (!isFiniteNumber(alpha) || !isFiniteNumber(aL0)) return null;
    var a0 = input.a0 == null || input.a0 === "" ? 2 * Math.PI : Number(input.a0);
    if (!(a0 > 0)) return null;
    var cl = a0 * (alpha - aL0);
    var clPerDeg = a0 * Math.PI / 180;

    var liftN = null;
    if (input.q != null && input.q !== "" && input.area != null && input.area !== "") {
      var q = Number(input.q), S = Number(input.area);
      if (!(q >= 0) || !(S > 0)) return null;
      liftN = cl * q * S;
    } else if (input.speed != null && input.speed !== "" && input.area != null && input.area !== "") {
      var v = Number(input.speed);
      var vu = input.speedUnit || "mps";
      if (vu === "kt") v = v * 1852 / 3600;
      else if (vu === "mph") v = v * 1609.344 / 3600;
      else if (vu === "fps") v = v * 0.3048;
      var S2 = Number(input.area);
      if ((input.areaUnit || "m2") === "ft2") S2 = S2 * 0.3048 * 0.3048;
      var rho = input.density == null || input.density === "" ? 1.225 : Number(input.density);
      if (!(v >= 0) || !(S2 > 0) || !(rho > 0)) return null;
      liftN = cl * 0.5 * rho * v * v * S2;
    }

    return {
      alphaRad: alpha,
      alphaDeg: alpha * 180 / Math.PI,
      alphaL0Rad: aL0,
      alphaL0Deg: aL0 * 180 / Math.PI,
      a0PerRad: a0,
      a0PerDeg: clPerDeg,
      cl: cl,
      liftN: liftN
    };
  }

  var api = { compute: compute };
  root.ThinAirfoilLiftCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

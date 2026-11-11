/**
 * Propeller static thrust from momentum (actuator-disk) theory.
 *
 * At zero forward speed the ideal induced velocity and power satisfy
 *   v_i = √(T / (2 ρ A)),    P = T v_i,
 * which inverts to
 *   T = (2 ρ A P²)^{1/3}.
 *
 * A propeller or fan efficiency / static figure of merit η (or FM)
 * may be applied as P_ideal = η P_shaft, so the thrust uses the
 * useful power rather than the shaft power. This is a static
 * (V = 0) estimate, not a cruise thrust, and not the advance-ratio
 * / tip-Mach calculation on this site's propeller-advance-ratio page.
 *
 * Sources: momentum / actuator-disk theory (Glauert; McCormick,
 * Aerodynamics of V/STOL Flight; Leishman); T = (2 ρ A P²)^{1/3}
 * at zero flight speed.
 */
(function (root) {
  "use strict";

  var RHO0 = 1.225;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function toM(d, unit) {
    if (!isFiniteNumber(d) || d <= 0) return NaN;
    if (unit === "ft") return d * 0.3048;
    if (unit === "in") return d * 0.0254;
    if (unit === "cm") return d * 0.01;
    return d;
  }
  function toW(p, unit) {
    if (!isFiniteNumber(p) || p <= 0) return NaN;
    if (unit === "hp" || unit === "shp") return p * 745.69987158227;
    if (unit === "kw" || unit === "kW") return p * 1000;
    return p;
  }
  function toM2(a, unit) {
    if (!isFiniteNumber(a) || a <= 0) return NaN;
    if (unit === "ft2") return a * 0.3048 * 0.3048;
    return a;
  }

  function compute(input) {
    if (!input) return null;
    var pShaft = toW(Number(input.power), input.powerUnit || "w");
    if (!(pShaft > 0)) return null;
    var area;
    if (input.area != null && input.area !== "") {
      area = toM2(Number(input.area), input.areaUnit || "m2");
    } else {
      var dia = toM(Number(input.diameter), input.diaUnit || "m");
      if (!(dia > 0)) return null;
      area = Math.PI * (dia / 2) * (dia / 2);
    }
    if (!(area > 0)) return null;
    var rho = input.density == null || input.density === "" ? RHO0 : Number(input.density);
    if (!(rho > 0)) return null;
    var eta = input.eta == null || input.eta === "" ? 1 : Number(input.eta);
    if (!(eta > 0) || eta > 1) return null;
    var pIdeal = pShaft * eta;
    var thrust = Math.pow(2 * rho * area * pIdeal * pIdeal, 1 / 3);
    var vi = thrust / (2 * rho * area);
    // P = T v_i  => v_i = P/T, also v_i = T/(2ρA) for a hovering/static disk.
    // The two agree when T = (2ρA P²)^{1/3}. Use P/T as the outflow check.
    var viFromPower = pIdeal / thrust;

    return {
      powerShaftW: pShaft,
      powerIdealW: pIdeal,
      eta: eta,
      areaM2: area,
      density: rho,
      thrustN: thrust,
      thrustLbf: thrust / 4.4482216152605,
      inducedMps: viFromPower,
      inducedDiskMps: vi,
      diskLoadingPa: thrust / area
    };
  }

  var api = { RHO0: RHO0, compute: compute };
  root.PropellerStaticThrustCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

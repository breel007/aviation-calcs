/**
 * Multirotor hover thrust-to-weight and battery endurance from
 * actuator-disk (momentum) theory.
 *
 *   T_hover     = all-up weight
 *   T/W         = maximum total thrust / weight  (if a max thrust is given)
 *   v_i, one    = √(T_i / (2 ρ A))               per rotor, T_i = T / n
 *   P_ideal     = n T_i v_i = T √(T / (2 ρ n A))
 *   P_hover     = P_ideal / FM  +  P_avionics
 *   endurance   = usable battery energy / P_hover
 *
 * FM is a figure of merit (hover figure of merit / overall hover
 * efficiency), typically 0.5–0.75 for small multirotors. Usable
 * battery energy is capacity × voltage, or watt-hours, times a usable
 * fraction (default 80%). This is a hover estimate, not a cruise
 * range, and not a battery-management or manufacturer flight-time
 * rating.
 *
 * Sources: momentum / actuator-disk theory (Gessow and Myers, Leishman
 * Principles of Helicopter Aerodynamics); hover figure of merit;
 * electric energy endurance t = E / P.
 */
(function (root) {
  "use strict";

  var G0 = 9.80665;
  var RHO0 = 1.225;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function toKg(m, unit) {
    if (!isFiniteNumber(m) || m <= 0) return NaN;
    if (unit === "lb") return m * 0.45359237;
    if (unit === "n" || unit === "N") return m / G0;
    return m;
  }
  function toM(d, unit) {
    if (!isFiniteNumber(d) || d <= 0) return NaN;
    if (unit === "in") return d * 0.0254;
    if (unit === "ft") return d * 0.3048;
    if (unit === "cm") return d * 0.01;
    return d;
  }
  function toN(f, unit) {
    if (!isFiniteNumber(f) || f < 0) return NaN;
    if (unit === "kgf" || unit === "kg") return f * G0;
    if (unit === "lbf" || unit === "lb") return f * 4.4482216152605;
    return f;
  }

  function compute(input) {
    if (!input) return null;
    var mass = toKg(Number(input.mass), input.massUnit || "kg");
    var n = Number(input.rotors);
    var dia = toM(Number(input.diameter), input.diaUnit || "m");
    if (!(mass > 0) || !(n >= 1) || Math.round(n) !== n || !(dia > 0)) return null;
    var rho = input.density == null || input.density === "" ? RHO0 : Number(input.density);
    if (!(rho > 0)) return null;
    var fm = input.fm == null || input.fm === "" ? 0.6 : Number(input.fm);
    if (!(fm > 0) || fm > 1) return null;
    var pAv = 0;
    if (input.avionicsW != null && input.avionicsW !== "") {
      pAv = Number(input.avionicsW);
      if (!isFiniteNumber(pAv) || pAv < 0) return null;
    }

    var weightN = mass * G0;
    var area = Math.PI * (dia / 2) * (dia / 2);
    var ti = weightN / n;
    var vi = Math.sqrt(ti / (2 * rho * area));
    var pIdeal = n * ti * vi;
    var pHover = pIdeal / fm + pAv;

    var energyWh = null;
    if (input.energyWh != null && input.energyWh !== "") {
      energyWh = Number(input.energyWh);
    } else if (input.capacityMah != null && input.capacityMah !== "" && input.voltage != null && input.voltage !== "") {
      var mah = Number(input.capacityMah), volt = Number(input.voltage);
      if (!(mah > 0) || !(volt > 0)) return null;
      energyWh = (mah / 1000) * volt;
    }
    var usableFrac = input.usableFrac == null || input.usableFrac === "" ? 0.8 : Number(input.usableFrac);
    if (!isFiniteNumber(usableFrac) || usableFrac <= 0 || usableFrac > 1) return null;

    var enduranceMin = null, usableWh = null;
    if (energyWh != null) {
      if (!(energyWh > 0)) return null;
      usableWh = energyWh * usableFrac;
      enduranceMin = (usableWh * 3600 / pHover) / 60;
    }

    var tw = null, maxThrustN = null;
    if (input.maxThrust != null && input.maxThrust !== "") {
      maxThrustN = toN(Number(input.maxThrust), input.thrustUnit || "n");
      if (!(maxThrustN > 0)) return null;
      tw = maxThrustN / weightN;
    }

    return {
      massKg: mass,
      weightN: weightN,
      rotors: n,
      diameterM: dia,
      areaPerRotorM2: area,
      density: rho,
      figureOfMerit: fm,
      thrustPerRotorN: ti,
      inducedMps: vi,
      idealPowerW: pIdeal,
      hoverPowerW: pHover,
      avionicsW: pAv,
      energyWh: energyWh,
      usableWh: usableWh,
      usableFrac: usableFrac,
      enduranceMin: enduranceMin,
      thrustToWeight: tw,
      maxThrustN: maxThrustN
    };
  }

  var api = { G0: G0, RHO0: RHO0, compute: compute };
  root.DroneFlightTimeCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

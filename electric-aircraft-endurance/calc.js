/**
 * Battery-electric aircraft endurance and range from usable energy
 * and cruise power.
 *
 *   endurance  = E_usable / P_electric
 *   range      = V × endurance     (if a cruise speed is given)
 *
 * Cruise electric power may be entered directly, or estimated from
 * weight, speed, and a lift-to-drag ratio:
 *   P_req   = W V / (L/D)
 *   P_elec  = P_req / η
 * where η is a propulsive / motor / controller chain efficiency
 * (default 0.80). Usable energy is watt-hours times a usable
 * fraction (default 0.90). This is a constant-power, constant-speed
 * energy budget, not a Breguet fuel-fraction cruise, and not a
 * certified range.
 *
 * Sources: specific energy / power endurance t = E/P; level-flight
 * power P = W V / (L/D) (Anderson, Introduction to Flight; FAA Pilot's
 * Handbook, power required). Contrast with this site's Breguet range
 * and endurance calculator, which is a fuel-mass-fraction model.
 */
(function (root) {
  "use strict";

  var G0 = 9.80665;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function toKg(m, unit) {
    if (!isFiniteNumber(m) || m <= 0) return NaN;
    if (unit === "lb") return m * 0.45359237;
    return m;
  }
  function toMps(v, unit) {
    if (!isFiniteNumber(v) || v <= 0) return NaN;
    if (unit === "kt") return v * 1852 / 3600;
    if (unit === "mph") return v * 1609.344 / 3600;
    if (unit === "kph") return v / 3.6;
    if (unit === "fps") return v * 0.3048;
    return v;
  }

  function compute(input) {
    if (!input) return null;
    var energyWh;
    if (input.energyWh != null && input.energyWh !== "") {
      energyWh = Number(input.energyWh);
    } else if (input.capacityKwh != null && input.capacityKwh !== "") {
      energyWh = Number(input.capacityKwh) * 1000;
    } else {
      return null;
    }
    if (!(energyWh > 0)) return null;
    var usableFrac = input.usableFrac == null || input.usableFrac === "" ? 0.9 : Number(input.usableFrac);
    if (!(usableFrac > 0) || usableFrac > 1) return null;
    var usableWh = energyWh * usableFrac;

    var pElec, pReq = null, eta = null, mode = input.mode || "power";
    if (mode === "ld") {
      var mass = toKg(Number(input.mass), input.massUnit || "kg");
      var v = toMps(Number(input.speed), input.speedUnit || "kt");
      var ld = Number(input.liftToDrag);
      eta = input.eta == null || input.eta === "" ? 0.8 : Number(input.eta);
      if (!(mass > 0) || !(v > 0) || !(ld > 0) || !(eta > 0) || eta > 1) return null;
      pReq = mass * G0 * v / ld;
      pElec = pReq / eta;
    } else {
      pElec = Number(input.powerW);
      if (!(pElec > 0)) return null;
    }

    var tSec = usableWh * 3600 / pElec;
    var rangeM = null, speedMps = null;
    if (input.speed != null && input.speed !== "") {
      speedMps = toMps(Number(input.speed), input.speedUnit || "kt");
      if (!(speedMps > 0)) return null;
      rangeM = speedMps * tSec;
    } else if (mode === "ld") {
      speedMps = toMps(Number(input.speed), input.speedUnit || "kt");
      rangeM = speedMps * tSec;
    }

    return {
      energyWh: energyWh,
      usableWh: usableWh,
      usableFrac: usableFrac,
      electricPowerW: pElec,
      requiredPowerW: pReq,
      eta: eta,
      enduranceHours: tSec / 3600,
      enduranceMin: tSec / 60,
      speedMps: speedMps,
      rangeM: rangeM,
      rangeNm: rangeM == null ? null : rangeM / 1852,
      rangeKm: rangeM == null ? null : rangeM / 1000
    };
  }

  var api = { G0: G0, compute: compute };
  root.ElectricAircraftEnduranceCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

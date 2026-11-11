/**
 * Turbojet / ramjet net thrust from the momentum and pressure terms,
 * and thrust-specific fuel consumption (TSFC).
 *
 *   F    = ṁ_a [ (1+f) u_e − u_0 ] + (p_e − p_0) A_e
 *   f    = ṁ_f / ṁ_a
 *   TSFC = ṁ_f / F
 *
 * Exit velocity, flight speed, fuel/air ratio (or the two mass flows),
 * and an optional exit/ambient pressure-area term are the inputs.
 * A perfectly expanded nozzle has p_e = p_0 and the pressure term
 * drops out. This is a control-volume identity, not a cycle analysis
 * (for a Brayton thermal efficiency see the Brayton-cycle page) and
 * not the chamber-to-thrust coefficient on the C-D nozzle page.
 *
 * Sources: jet-engine momentum theorem (Hill and Peterson, Mechanics
 * and Thermodynamics of Propulsion; Mattingly, Elements of Propulsion;
 * Cumpsty, Jet Propulsion). TSFC as fuel-mass-flow per unit thrust.
 */
(function (root) {
  "use strict";

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function toMps(v, unit) {
    if (!isFiniteNumber(v) || v < 0) return NaN;
    if (unit === "kt") return v * 1852 / 3600;
    if (unit === "fps") return v * 0.3048;
    if (unit === "mph") return v * 1609.344 / 3600;
    return v;
  }
  function toKgS(m, unit) {
    if (!isFiniteNumber(m) || m < 0) return NaN;
    if (unit === "lb/s" || unit === "lbm/s") return m * 0.45359237;
    if (unit === "lb/h" || unit === "lbm/h" || unit === "pph") return m * 0.45359237 / 3600;
    return m;
  }

  function compute(input) {
    if (!input) return null;
    var mDotA = toKgS(Number(input.airflow), input.airUnit || "kg/s");
    var u0 = toMps(input.flightSpeed == null || input.flightSpeed === "" ? 0 : Number(input.flightSpeed), input.speedUnit || "mps");
    var ue = toMps(Number(input.exitSpeed), input.speedUnit || "mps");
    if (!(mDotA > 0) || !isFiniteNumber(u0) || u0 < 0 || !isFiniteNumber(ue) || ue < 0) return null;

    var f;
    if (input.far != null && input.far !== "") {
      f = Number(input.far);
    } else if (input.fuelFlow != null && input.fuelFlow !== "") {
      var mDotF = toKgS(Number(input.fuelFlow), input.fuelUnit || input.airUnit || "kg/s");
      if (!isFiniteNumber(mDotF) || mDotF < 0) return null;
      f = mDotF / mDotA;
    } else {
      f = 0;
    }
    if (!isFiniteNumber(f) || f < 0) return null;
    var mDotF2 = f * mDotA;

    var pressureTerm = 0;
    if (input.exitPressure != null && input.exitPressure !== "" &&
        input.ambientPressure != null && input.ambientPressure !== "" &&
        input.exitArea != null && input.exitArea !== "") {
      var pe = Number(input.exitPressure);
      var p0 = Number(input.ambientPressure);
      var Ae = Number(input.exitArea);
      if ((input.pressureUnit || "pa") === "kpa") { pe *= 1000; p0 *= 1000; }
      if ((input.areaUnit || "m2") === "ft2") Ae *= 0.3048 * 0.3048;
      if (!isFiniteNumber(pe) || !isFiniteNumber(p0) || !(Ae > 0)) return null;
      pressureTerm = (pe - p0) * Ae;
    }

    var F = mDotA * ((1 + f) * ue - u0) + pressureTerm;
    var tsfcKgNs = F !== 0 ? mDotF2 / F : null;
    // Also report (mg/s)/N and (lbm/h)/lbf, common aviation units.
    var tsfcMgN = tsfcKgNs == null ? null : tsfcKgNs * 1e6;
    var tsfcPphLbf = tsfcKgNs == null ? null : tsfcKgNs * (3600 / 0.45359237) * 4.4482216152605;

    return {
      airMassFlow: mDotA,
      fuelMassFlow: mDotF2,
      far: f,
      flightMps: u0,
      exitMps: ue,
      pressureTermN: pressureTerm,
      thrustN: F,
      thrustLbf: F / 4.4482216152605,
      tsfcKgPerNs: tsfcKgNs,
      tsfcMgPerNs: tsfcMgN,
      tsfcLbPerHrLbf: tsfcPphLbf
    };
  }

  var api = { compute: compute };
  root.JetEngineThrustCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

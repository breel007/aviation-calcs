/**
 * Dynamic hydroplaning speed from tire inflation pressure.
 *
 *   V_rotating  (kt) = 9.0 × √P        P in psi  (spinning tire)
 *   V_locked    (kt) = 7.7 × √P        locked / non-rotating tire
 *
 * The 9√P rule is Horne's dynamic-hydroplaning relation for a rotating
 * pneumatic tire, widely used in FAA and NASA material. The lower 7.7√P
 * figure applies once the wheel has stopped rotating (reverted-rubber or
 * locked-wheel hydroplaning on landing). These are estimates of the speed
 * at which a standing water film can lift the tire; they are not a
 * guarantee of grip above or below that speed, and they ignore tread
 * depth, water depth, and surface texture.
 *
 * 1 kt = 1.150779448 mph, so 9√P kt is the same as 10.35√P mph.
 *
 * Sources: NASA TN D-2056 (Horne & Dreher, 1963) and later NASA hydroplaning
 * reports; FAA Pilot's Handbook of Aeronautical Knowledge (aircraft tires,
 * hydroplaning); FAA Airplane Flying Handbook (wet-runway landing);
 * AC 91-79A (Mitigating the Risks of a Runway Overrun Upon Landing).
 */
(function (root) {
  "use strict";

  var KT_PER_MPH = 1 / 1.1507794480235425; // 1 mph in kt; 1 kt = 1.150779448 mph
  var MPH_PER_KT = 1.1507794480235425;
  var PSI_PER_BAR = 14.503773773;
  var PSI_PER_KPA = 0.14503773773;
  var KPA_PER_PSI = 6.894757293168;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function pressureToPsi(value, unit) {
    if (!isFiniteNumber(value) || value <= 0) return NaN;
    if (unit === "bar") return value * PSI_PER_BAR;
    if (unit === "kpa") return value * PSI_PER_KPA;
    if (unit === "pa") return value * PSI_PER_KPA / 1000;
    return value; // psi
  }

  function compute(input) {
    if (!input) return null;
    var psi = pressureToPsi(Number(input.pressure), input.pressureUnit || "psi");
    if (!isFiniteNumber(psi) || psi <= 0) return null;
    var rotatingKt = 9 * Math.sqrt(psi);
    var lockedKt = 7.7 * Math.sqrt(psi);
    return {
      pressurePsi: psi,
      pressureBar: psi / PSI_PER_BAR,
      pressureKpa: psi * KPA_PER_PSI,
      rotatingKt: rotatingKt,
      rotatingMph: rotatingKt * MPH_PER_KT,
      rotatingMps: rotatingKt * (1852 / 3600),
      lockedKt: lockedKt,
      lockedMph: lockedKt * MPH_PER_KT,
      lockedMps: lockedKt * (1852 / 3600),
      deltaKt: rotatingKt - lockedKt
    };
  }

  var api = {
    MPH_PER_KT: MPH_PER_KT,
    PSI_PER_BAR: PSI_PER_BAR,
    pressureToPsi: pressureToPsi,
    compute: compute
  };
  root.HydroplaningSpeedCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

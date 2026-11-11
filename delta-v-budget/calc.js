/**
 * Mission Δv budget: sum named impulsive (or equivalent) Δv items,
 * optionally invert the total through the ideal rocket equation, and
 * offer a pure plane-change helper.
 *
 *   Δv_total = Σ Δv_i
 *   m0/mf    = exp( Δv_total / ve ),   ve = Isp × g0
 *   plane-change: Δv = 2 V sin(θ/2)
 *
 * Items are a planning budget — gravity loss, drag loss, steering,
 * insertion, circularization, plane change, mid-course, landing, and
 * reserve are typical lines, but the names are yours. This page does
 * not simulate a trajectory. The plane-change formula is a single
 * impulsive burn that only changes inclination (or heading) at speed V;
 * a combined Hohmann-plus-plane-change burn is smaller and is not
 * computed here.
 *
 * g0 = 9.80665 m/s² (standard gravity, same Isp convention as this
 * site's specific-impulse and rocket-equation calculators).
 *
 * Sources: Vallado, Fundamentals of Astrodynamics and Applications
 * (impulsive Δv, plane-change Δv = 2 V sin(θ/2)); Curtis, Orbital
 * Mechanics for Engineering Students; Sutton and Biblarz, Rocket
 * Propulsion Elements (Tsiolkovsky mass ratio); this site's Hohmann
 * transfer and rocket-equation calculators for individual maneuvers.
 */
(function (root) {
  "use strict";

  var G0 = 9.80665;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function toMps(v, unit) {
    if (!isFiniteNumber(v)) return NaN;
    if (unit === "km/s") return v * 1000;
    if (unit === "ft/s" || unit === "fps") return v * 0.3048;
    if (unit === "km/h" || unit === "kph") return v * 1000 / 3600;
    if (unit === "mph") return v * 0.44704;
    if (unit === "kt") return v * (1852 / 3600);
    return v; // m/s
  }

  function planeChangeMps(speed, speedUnit, angleDeg) {
    var v = toMps(Number(speed), speedUnit || "m/s");
    var th = Number(angleDeg);
    if (!(v >= 0) || !isFiniteNumber(th)) return null;
    var rad = Math.abs(th) * Math.PI / 180;
    return 2 * v * Math.sin(rad / 2);
  }

  function massRatioFromDv(dvMps, ispSec) {
    if (!(dvMps >= 0) || !(ispSec > 0)) return null;
    var ve = ispSec * G0;
    var ratio = Math.exp(dvMps / ve);
    return { ve: ve, massRatio: ratio, propellantFraction: 1 - 1 / ratio, isp: ispSec };
  }

  function compute(input) {
    if (!input || !Array.isArray(input.items)) return null;
    var rows = [];
    var total = 0;
    for (var i = 0; i < input.items.length; i++) {
      var it = input.items[i] || {};
      var raw = it.value;
      if (raw == null || raw === "") continue;
      var val = Number(raw);
      if (!isFiniteNumber(val) || val < 0) return null;
      var unit = it.unit || "m/s";
      var mps = toMps(val, unit);
      if (!isFiniteNumber(mps)) return null;
      rows.push({
        name: it.name || ("Item " + (rows.length + 1)),
        tag: it.tag || "",
        value: val,
        unit: unit,
        mps: mps
      });
      total += mps;
    }
    if (rows.length === 0) return null;

    var byTag = {};
    rows.forEach(function (r) {
      var k = r.tag || "untagged";
      byTag[k] = (byTag[k] || 0) + r.mps;
    });

    var isp = null, mass = null;
    if (input.isp != null && input.isp !== "") {
      isp = Number(input.isp);
      if (!isFiniteNumber(isp) || isp <= 0) return null;
      mass = massRatioFromDv(total, isp);
    }

    var helper = null;
    if (input.planeChange && (input.planeChange.speed != null && input.planeChange.speed !== "") &&
        (input.planeChange.angle != null && input.planeChange.angle !== "")) {
      var pc = planeChangeMps(input.planeChange.speed, input.planeChange.speedUnit, input.planeChange.angle);
      if (pc == null) return null;
      helper = {
        mps: pc,
        speedMps: toMps(Number(input.planeChange.speed), input.planeChange.speedUnit || "m/s"),
        angleDeg: Number(input.planeChange.angle)
      };
    }

    return {
      items: rows,
      count: rows.length,
      deltaVMps: total,
      deltaVKmS: total / 1000,
      deltaVFtS: total / 0.3048,
      byTag: byTag,
      isp: isp,
      massRatio: mass ? mass.massRatio : null,
      propellantFraction: mass ? mass.propellantFraction : null,
      exhaustVelocity: mass ? mass.ve : null,
      planeChange: helper,
      g0: G0
    };
  }

  var api = {
    G0: G0,
    toMps: toMps,
    planeChangeMps: planeChangeMps,
    massRatioFromDv: massRatioFromDv,
    compute: compute
  };
  root.DeltaVBudgetCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

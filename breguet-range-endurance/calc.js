/**
 * Breguet range and endurance for jet and propeller airplanes, at
 * constant lift-to-drag ratio and (for the jet range equation) constant
 * true airspeed.
 *
 * Jet (thrust-specific fuel consumption ct):
 *   Range     R = (V / ct) (L/D) ln(Wi / Wf)
 *   Endurance E = (1  / ct) (L/D) ln(Wi / Wf)
 *
 * Propeller (power-specific fuel consumption c, propulsive efficiency η):
 *   Range     R = (η / c) (L/D) ln(Wi / Wf)
 *   Endurance E = (η / c) (L/D) (1/V) ln(Wi / Wf)     (constant speed)
 *
 * Units are converted so that ct in 1/h and V in knots give R in nautical
 * miles. For a propeller, c in lb/(hp·h) (or the SI equivalent) uses the
 * identity 1 hp·h = 325.87 nmi·lbf, so
 *   R_nmi = 325.87 (η / c) (L/D) ln(Wi / Wf).
 *
 * Sources: Breguet (1920s); Anderson, Introduction to Flight (Breguet
 * equations); NASA Glenn Beginner's Guide; FAA Pilot's Handbook of
 * Aeronautical Knowledge (range and endurance, qualitative).
 */
(function (root) {
  "use strict";

  var NM_FT = 6076.11548556;
  var HP_FT_LBF_PER_H = 550 * 3600; // 1,980,000
  var NM_PER_HP_H = HP_FT_LBF_PER_H / NM_FT; // 325.866...
  var KT_MPS = 1852 / 3600;
  var LB_N = 4.4482216152605;
  var W_PER_HP = 745.6998715822703;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function massLike(value, unit) {
    // Only the ratio matters; accept any consistent unit.
    var n = Number(value);
    return isFiniteNumber(n) && n > 0 ? n : NaN;
  }

  function velocityMps(value, unit) {
    var v = Number(value);
    if (!isFiniteNumber(v) || v <= 0) return NaN;
    if (unit === "kt") return v * KT_MPS;
    if (unit === "mph") return v * 0.44704;
    if (unit === "kmh") return v / 3.6;
    if (unit === "fps") return v * 0.3048;
    return v;
  }

  /**
   * input.kind: "jet" | "prop"
   * input.Wi, input.Wf  (same unit)
   * input.liftToDrag
   * input.velocity, input.velocityUnit
   * jet: input.tsfc  in  input.tsfcUnit: "per-h" (lb/lbf·h or 1/h), "per-s", "mg/N·s"
   * prop: input.eta (0–1), input.sfc, input.sfcUnit: "lb/hp-h" | "kg/W·s" | "g/kW·h"
   */
  function compute(input) {
    if (!input) return null;
    var Wi = massLike(input.Wi, input.weightUnit);
    var Wf = massLike(input.Wf, input.weightUnit);
    var LD = Number(input.liftToDrag);
    if (!isFiniteNumber(Wi) || !isFiniteNumber(Wf) || Wf > Wi) return null;
    if (!isFiniteNumber(LD) || LD <= 0) return null;
    var ln = Math.log(Wi / Wf);
    var kind = input.kind || "jet";
    var V = velocityMps(input.velocity, input.velocityUnit || "kt");

    if (kind === "prop") {
      var eta = Number(input.eta);
      if (!isFiniteNumber(eta) || eta <= 0 || eta > 1) return null;
      var sfc = Number(input.sfc);
      if (!isFiniteNumber(sfc) || sfc <= 0) return null;
      var sfcUnit = input.sfcUnit || "lb/hp-h";
      // Convert SFC to lb/(hp·h) equivalent so the 325.87 factor applies.
      var c_lb_hp_h;
      if (sfcUnit === "g/kW-h") {
        // 1 g/kW·h = 0.001 kg / (1000 W · h) ; 1 hp = 745.7 W
        // lb/(hp·h) = (g/kW·h) * 0.001 kg/g * 0.7457 kW/hp / 0.45359237 kg/lb
        c_lb_hp_h = sfc * 0.001 * (W_PER_HP / 1000) / 0.45359237;
      } else if (sfcUnit === "kg/W-s") {
        // kg/(W·s) → lb/(hp·h): * (3600 s/h) * (745.7 W/hp) / 0.45359237
        c_lb_hp_h = sfc * 3600 * W_PER_HP / 0.45359237;
      } else {
        c_lb_hp_h = sfc;
      }
      var R_nm = NM_PER_HP_H * (eta / c_lb_hp_h) * LD * ln;
      var E_s = null;
      if (isFiniteNumber(V)) {
        var R_m = R_nm * 1852;
        E_s = R_m / V;
      }
      return {
        kind: "prop",
        Wi: Wi,
        Wf: Wf,
        weightRatio: Wi / Wf,
        fuelFraction: 1 - Wf / Wi,
        liftToDrag: LD,
        eta: eta,
        ln: ln,
        rangeNm: R_nm,
        rangeM: R_nm * 1852,
        rangeKm: R_nm * 1.852,
        enduranceS: E_s,
        enduranceH: E_s != null ? E_s / 3600 : null,
        velocityMps: isFiniteNumber(V) ? V : null,
        sfcLbPerHpH: c_lb_hp_h,
        NM_PER_HP_H: NM_PER_HP_H
      };
    }

    // Jet
    var tsfc = Number(input.tsfc);
    if (!isFiniteNumber(tsfc) || tsfc <= 0) return null;
    var tu = input.tsfcUnit || "per-h";
    var ct_per_s;
    if (tu === "per-h") ct_per_s = tsfc / 3600;
    else if (tu === "mg/N-s") ct_per_s = tsfc * 1e-6; // mg/s per N → (kg/s)/N = 1/s
    else if (tu === "g/kN-s") ct_per_s = tsfc * 1e-6; // g/s per kN = 1e-3 / 1e3 / s
    else ct_per_s = tsfc; // already 1/s
    if (!isFiniteNumber(V)) return null;
    var R_m = (V / ct_per_s) * LD * ln;
    var E = (1 / ct_per_s) * LD * ln;
    return {
      kind: "jet",
      Wi: Wi,
      Wf: Wf,
      weightRatio: Wi / Wf,
      fuelFraction: 1 - Wf / Wi,
      liftToDrag: LD,
      ln: ln,
      rangeM: R_m,
      rangeNm: R_m / 1852,
      rangeKm: R_m / 1000,
      enduranceS: E,
      enduranceH: E / 3600,
      velocityMps: V,
      tsfcPerS: ct_per_s,
      tsfcPerH: ct_per_s * 3600
    };
  }

  var api = {
    NM_PER_HP_H: NM_PER_HP_H,
    compute: compute
  };

  root.BreguetRangeEnduranceCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

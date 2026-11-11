/**
 * Hot-air balloon static lift from the ideal-gas density difference
 * between the surrounding air and the heated air in the envelope.
 *
 * At the same pressure, ρ_hot / ρ_air = T_air / T_hot, so the gross
 * buoyant force is
 *   F = (ρ_air − ρ_hot) V g
 *     = ρ_air (1 − T_air / T_hot) V g
 * with temperatures absolute. Air density may be entered directly or
 * taken from a pressure and outside temperature (dry air,
 * ρ = p / (R_specific T), R_specific = 287.05287 J/(kg·K), the same
 * gas constant used on this site's atmosphere pages). The useful lift
 * is F minus the empty weight of the envelope, basket, and fuel you
 * enter.
 *
 * This is a static, still-air, dry-air figure. It does not include
 * humidity, venting, ram or dynamic effects, or a certified weight
 * schedule.
 *
 * Sources: Archimedes' principle; ideal-gas law at uniform pressure;
 * U.S. Standard Atmosphere / this site's standard-atmosphere page
 * (R_specific for dry air); FAA Balloon Flying Handbook (lift from
 * temperature difference — conceptual).
 */
(function (root) {
  "use strict";

  var R_SPEC = 287.05287; // J/(kg·K)
  var G0 = 9.80665;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function toK(t, unit) {
    if (!isFiniteNumber(t)) return NaN;
    if (unit === "C" || unit === "c") return t + 273.15;
    if (unit === "F" || unit === "f") return (t - 32) * 5 / 9 + 273.15;
    return t;
  }
  function toM3(v, unit) {
    if (!isFiniteNumber(v) || v <= 0) return NaN;
    if (unit === "ft3" || unit === "cuft") return v * Math.pow(0.3048, 3);
    if (unit === "ft") return v * Math.pow(0.3048, 3);
    return v;
  }
  function toPa(p, unit) {
    if (!isFiniteNumber(p) || p <= 0) return NaN;
    if (unit === "inhg") return p * 3386.389;
    if (unit === "hpa" || unit === "mb") return p * 100;
    if (unit === "psi") return p * 6894.757;
    return p;
  }
  function toKg(w, unit) {
    if (!isFiniteNumber(w) || w < 0) return NaN;
    if (unit === "lb") return w * 0.45359237;
    return w;
  }

  function compute(input) {
    if (!input) return null;
    var vol = toM3(Number(input.volume), input.volUnit || "m3");
    var tAir = toK(Number(input.tAir), input.tempUnit || "C");
    var tHot = toK(Number(input.tHot), input.tempUnit || "C");
    if (!(vol > 0) || !(tAir > 0) || !(tHot > 0)) return null;
    if (tHot <= tAir) return null;

    var rho;
    if (input.density != null && input.density !== "") {
      rho = Number(input.density);
      if (!(rho > 0)) return null;
      if ((input.densityUnit || "kgm3") === "slugft3") rho = rho * 515.3788184;
    } else {
      var p = toPa(input.pressure == null || input.pressure === "" ? 101325 : Number(input.pressure),
        input.pressureUnit || "pa");
      if (!(p > 0)) return null;
      rho = p / (R_SPEC * tAir);
    }
    var rhoHot = rho * (tAir / tHot);
    var liftN = (rho - rhoHot) * vol * G0;
    var liftKg = liftN / G0;
    var empty = 0;
    if (input.emptyWeight != null && input.emptyWeight !== "") {
      empty = toKg(Number(input.emptyWeight), input.weightUnit || "kg");
      if (!isFiniteNumber(empty) || empty < 0) return null;
    }
    var usefulKg = liftKg - empty;

    return {
      volumeM3: vol,
      tAirK: tAir,
      tHotK: tHot,
      rhoAir: rho,
      rhoHot: rhoHot,
      liftN: liftN,
      liftKg: liftKg,
      liftLb: liftKg / 0.45359237,
      emptyKg: empty,
      usefulKg: usefulKg,
      usefulLb: usefulKg / 0.45359237,
      G0: G0,
      R_SPEC: R_SPEC
    };
  }

  var api = { R_SPEC: R_SPEC, G0: G0, compute: compute };
  root.BalloonLiftCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

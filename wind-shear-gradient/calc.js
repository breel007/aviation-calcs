/**
 * Wind-speed change with height: a power-law profile or a constant
 * linear shear in knots per 100 feet.
 *
 * Power law (standard engineering / meteorology profile):
 *   V(h) = V_ref × (h / h_ref)^α
 * with a default exponent α = 1/7 (about 0.143), the common neutral-
 * stability "1/7-power" law over relatively smooth terrain. Other
 * typical exponents are ~0.11 over water and ~0.25–0.40 over rougher
 * or more stable conditions; you can type any α.
 *
 * Linear shear:
 *   V(h) = V_ref + (dV/dh) × (h − h_ref)
 * with dV/dh entered in knots per 100 feet (the usual aviation shear
 * figure). A decrease of wind with height is allowed (a negative shear).
 *
 * The page reports the wind at a second height and the shear between
 * the two heights. It is a profile estimate, not a microburst, LLWS
 * alert, or a reason to ignore a PIREP or a LLWAS.
 *
 * Sources: wind-profile power law (IEC 61400-1 and standard
 * meteorological / engineering references; the 1/7-power law);
 * FAA Aeronautical Information Manual 7-1-24 and Advisory Circular
 * 00-54, Pilot Windshear Guide (low-level wind shear as a change of
 * wind with height — this page models a smooth profile, not a
 * microburst).
 */
(function (root) {
  "use strict";

  var FT_PER_M = 1 / 0.3048;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function toFt(h, unit) {
    if (!isFiniteNumber(h) || h < 0) return NaN;
    if (unit === "m") return h * FT_PER_M;
    if (unit === "km") return h * 1000 * FT_PER_M;
    return h;
  }
  function toKt(v, unit) {
    if (!isFiniteNumber(v) || v < 0) return NaN;
    if (unit === "mph") return v / 1.1507794480235425;
    if (unit === "kph" || unit === "km/h") return v / 1.852;
    if (unit === "mps" || unit === "m/s") return v / (1852 / 3600);
    if (unit === "fps" || unit === "ft/s") return v / (1852 / 3600 / 0.3048);
    return v;
  }

  function compute(input) {
    if (!input) return null;
    var href = toFt(Number(input.href), input.altUnit || "ft");
    var vref = toKt(Number(input.vref), input.speedUnit || "kt");
    var h = toFt(Number(input.height), input.altUnit || "ft");
    if (!(href > 0) || !isFiniteNumber(vref) || vref < 0 || !isFiniteNumber(h) || h < 0) return null;

    var mode = input.mode || "power";
    var v, shearPer100, alpha = null, linearPer100 = null;
    if (mode === "linear") {
      linearPer100 = Number(input.shearPer100);
      if (!isFiniteNumber(linearPer100)) return null;
      v = vref + linearPer100 * (h - href) / 100;
      if (v < 0) v = 0;
      shearPer100 = linearPer100;
    } else {
      alpha = input.alpha == null || input.alpha === "" ? 1 / 7 : Number(input.alpha);
      if (!isFiniteNumber(alpha)) return null;
      if (h === 0) {
        v = 0;
      } else {
        v = vref * Math.pow(h / href, alpha);
      }
      var dv = v - vref;
      var dh = h - href;
      shearPer100 = Math.abs(dh) < 1e-12 ? 0 : dv / dh * 100;
    }

    return {
      mode: mode,
      hrefFt: href,
      vrefKt: vref,
      heightFt: h,
      windKt: v,
      deltaKt: v - vref,
      shearKtPer100ft: shearPer100,
      alpha: alpha,
      linearPer100: linearPer100
    };
  }

  var api = { DEFAULT_ALPHA: 1 / 7, compute: compute };
  root.WindShearGradientCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

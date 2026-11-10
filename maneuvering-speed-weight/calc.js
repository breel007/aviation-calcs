/**
 * Maneuvering speed versus weight:
 *
 *   Va(W) = Va_ref × √(W / W_ref)
 *
 * Va_ref is the published maneuvering speed at W_ref (usually maximum
 * certificated takeoff weight, or the weight printed next to Va in the
 * POH). Va decreases as the airplane gets lighter: the same limit load
 * factor is reached at a lower indicated speed because stall speed is
 * lower.
 *
 * Related identity, when a level-flight stall speed and a positive limit
 * load factor n_lim are known:
 *   Va ≈ Vs × √(n_lim)
 *
 * Typical certificated n_lim (14 CFR Part 23 / historic categories):
 * normal 3.8, utility 4.4, aerobatic 6.0 — always defer to the POH.
 *
 * Sources: FAA Pilot's Handbook of Aeronautical Knowledge (Va, load
 * factor, Chapter 5); FAA Airplane Flying Handbook; 14 CFR 23.337
 * (limit maneuvering load factors, historical / applicable amendment).
 */
(function (root) {
  "use strict";

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function scaleSpeed(vRef, w, wRef) {
    if (!(vRef > 0) || !(w > 0) || !(wRef > 0)) return NaN;
    return vRef * Math.sqrt(w / wRef);
  }

  function vaFromStall(vs, nLim) {
    if (!(vs > 0) || !(nLim > 0)) return NaN;
    return vs * Math.sqrt(nLim);
  }

  /**
   * input.vaRef, input.weightRef, input.weight
   * optional input.vs (at weightRef or at input.weight with input.vsAtCurrent)
   * optional input.nLim (default 3.8)
   * Speeds in the same unit (kt, mph, or km/h — unit is a label only).
   */
  function compute(input) {
    if (!input) return null;
    var W = Number(input.weight);
    var Wref = Number(input.weightRef);
    if (!isFiniteNumber(W) || !isFiniteNumber(Wref) || W <= 0 || Wref <= 0) return null;

    var vaRef = input.vaRef == null || input.vaRef === "" ? null : Number(input.vaRef);
    var vs = input.vs == null || input.vs === "" ? null : Number(input.vs);
    var nLim = input.nLim == null || input.nLim === "" ? 3.8 : Number(input.nLim);
    if (!isFiniteNumber(nLim) || nLim <= 0) return null;

    var vaAtRef = isFiniteNumber(vaRef) && vaRef > 0 ? vaRef : null;
    if (vaAtRef == null && isFiniteNumber(vs) && vs > 0) {
      var vsAtRef = input.vsAtCurrent ? vs * Math.sqrt(Wref / W) : vs;
      vaAtRef = vaFromStall(vsAtRef, nLim);
    }
    if (vaAtRef == null) return null;

    var va = scaleSpeed(vaAtRef, W, Wref);
    var vsAtW = null;
    var vsAtRefOut = null;
    if (isFiniteNumber(vs) && vs > 0) {
      if (input.vsAtCurrent) {
        vsAtW = vs;
        vsAtRefOut = vs * Math.sqrt(Wref / W);
      } else {
        vsAtRefOut = vs;
        vsAtW = scaleSpeed(vs, W, Wref);
      }
    } else {
      // Implied stall from Va_ref = Vs_ref √ n
      vsAtRefOut = vaAtRef / Math.sqrt(nLim);
      vsAtW = scaleSpeed(vsAtRefOut, W, Wref);
    }

    return {
      weight: W,
      weightRef: Wref,
      weightRatio: W / Wref,
      vaRef: vaAtRef,
      va: va,
      nLim: nLim,
      vsAtRef: vsAtRefOut,
      vsAtWeight: vsAtW,
      lighterThanRef: W < Wref,
      heavierThanRef: W > Wref
    };
  }

  var api = {
    scaleSpeed: scaleSpeed,
    vaFromStall: vaFromStall,
    compute: compute
  };

  root.ManeuveringSpeedWeightCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

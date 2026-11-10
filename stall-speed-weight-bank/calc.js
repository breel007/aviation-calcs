/**
 * Stall speed versus weight and bank (coordinated, level turn):
 *
 *   Vs(W, φ) = Vs_ref × √(W / W_ref) × √n
 *   n        = 1 / cos φ     (load factor in a level, coordinated turn)
 *
 * An accelerated stall at a user-entered load factor uses the same √n
 * factor. Flap configuration is handled by entering the stall speed that
 * belongs to that configuration (Vs1, Vs0, or a POH figure).
 *
 * Sources: FAA Pilot's Handbook of Aeronautical Knowledge, Chapter 5
 * (load factor, stall speed in a turn); FAA Airplane Flying Handbook;
 * NASA Glenn Beginner's Guide (lift, load factor). The site's turn-radius
 * calculator uses the same n and √n identities for radius and rate.
 */
(function (root) {
  "use strict";

  var DEG = Math.PI / 180;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function loadFactorFromBank(bankDeg) {
    if (!isFiniteNumber(bankDeg) || bankDeg < 0 || bankDeg >= 90) return NaN;
    return 1 / Math.cos(bankDeg * DEG);
  }

  function bankFromLoadFactor(n) {
    if (!isFiniteNumber(n) || n < 1) return NaN;
    return Math.acos(1 / n) / DEG;
  }

  function stallSpeed(vsRef, w, wRef, n) {
    if (!(vsRef > 0) || !(w > 0) || !(wRef > 0) || !(n > 0)) return NaN;
    return vsRef * Math.sqrt(w / wRef) * Math.sqrt(n);
  }

  /**
   * input.vsRef, input.weightRef (optional, defaults to input.weight),
   * input.weight, input.bankDeg  and/or input.loadFactor
   */
  function compute(input) {
    if (!input) return null;
    var vsRef = Number(input.vsRef);
    var W = Number(input.weight);
    var Wref = input.weightRef == null || input.weightRef === "" ? W : Number(input.weightRef);
    if (!isFiniteNumber(vsRef) || vsRef <= 0 || !isFiniteNumber(W) || W <= 0 || !isFiniteNumber(Wref) || Wref <= 0) {
      return null;
    }

    var bank = input.bankDeg == null || input.bankDeg === "" ? null : Number(input.bankDeg);
    var nIn = input.loadFactor == null || input.loadFactor === "" ? null : Number(input.loadFactor);
    var n, bankUsed, fromN = false;
    if (isFiniteNumber(nIn) && nIn > 0 && (bank == null || !isFiniteNumber(bank))) {
      n = nIn;
      bankUsed = n >= 1 ? bankFromLoadFactor(n) : 0;
      fromN = true;
    } else {
      if (!isFiniteNumber(bank) || bank < 0) bank = 0;
      if (bank >= 90) return null;
      n = loadFactorFromBank(bank);
      bankUsed = bank;
    }
    if (!isFiniteNumber(n)) return null;

    var vs = stallSpeed(vsRef, W, Wref, n);
    var vsWeightOnly = stallSpeed(vsRef, W, Wref, 1);
    var vsBankOnly = stallSpeed(vsRef, Wref, Wref, n);

    var table = [0, 15, 30, 45, 60].map(function (b) {
      var ni = loadFactorFromBank(b);
      return { bankDeg: b, loadFactor: ni, vs: stallSpeed(vsRef, W, Wref, ni) };
    });

    return {
      vsRef: vsRef,
      weight: W,
      weightRef: Wref,
      bankDeg: bankUsed,
      loadFactor: n,
      fromLoadFactor: fromN,
      vs: vs,
      vsWeightOnly: vsWeightOnly,
      vsBankOnly: vsBankOnly,
      weightFactor: Math.sqrt(W / Wref),
      bankFactor: Math.sqrt(n),
      table: table
    };
  }

  var api = {
    loadFactorFromBank: loadFactorFromBank,
    bankFromLoadFactor: bankFromLoadFactor,
    stallSpeed: stallSpeed,
    compute: compute
  };

  root.StallSpeedWeightBankCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

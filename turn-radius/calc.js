/**
 * Coordinated level turn performance.
 *
 *   rate of turn ω  = g · tan φ / V         (rad/s)
 *   turn radius  r  = V² / (g · tan φ)
 *   load factor  n  = 1 / cos φ
 *   stall speed  Vs(φ) = Vs(level) · √n
 *
 * Standard-rate turn = 3°/s (360° in 2 minutes).
 * Rule-of-thumb bank for standard rate: TAS/10 + 7 (TAS in knots).
 *
 * V must be TRUE airspeed for radius and rate (the geometry uses the speed
 * through the air mass). g = 9.80665 m/s².
 */
(function (root) {
  "use strict";

  var G = 9.80665;
  var KT_MPS = 1852 / 3600;
  var FT_M = 0.3048;
  var NM_M = 1852;
  var DEG = Math.PI / 180;
  var STANDARD_RATE_DPS = 3;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function rateOfTurnDps(tasKt, bankDeg) {
    if (!(tasKt > 0) || !isFiniteNumber(bankDeg) || bankDeg <= 0 || bankDeg >= 90) return NaN;
    var v = tasKt * KT_MPS;
    return (G * Math.tan(bankDeg * DEG) / v) / DEG;
  }

  function radiusM(tasKt, bankDeg) {
    if (!(tasKt > 0) || !isFiniteNumber(bankDeg) || bankDeg <= 0 || bankDeg >= 90) return NaN;
    var v = tasKt * KT_MPS;
    return (v * v) / (G * Math.tan(bankDeg * DEG));
  }

  function radiusFt(tasKt, bankDeg) {
    return radiusM(tasKt, bankDeg) / FT_M;
  }

  function radiusNm(tasKt, bankDeg) {
    return radiusM(tasKt, bankDeg) / NM_M;
  }

  function loadFactor(bankDeg) {
    if (!isFiniteNumber(bankDeg) || bankDeg < 0 || bankDeg >= 90) return NaN;
    return 1 / Math.cos(bankDeg * DEG);
  }

  function stallSpeedInBank(vsLevel, bankDeg) {
    var n = loadFactor(bankDeg);
    if (!isFiniteNumber(vsLevel) || vsLevel <= 0 || !isFiniteNumber(n)) return NaN;
    return vsLevel * Math.sqrt(n);
  }

  /** Exact bank angle (deg) for a desired rate of turn (deg/s). */
  function bankForRate(tasKt, rateDps) {
    if (!(tasKt > 0) || !(rateDps > 0)) return NaN;
    var v = tasKt * KT_MPS;
    var omega = rateDps * DEG;
    return Math.atan(omega * v / G) / DEG;
  }

  /** Bank angle (deg) for a desired turn radius (ft). */
  function bankForRadiusFt(tasKt, radiusFeet) {
    if (!(tasKt > 0) || !(radiusFeet > 0)) return NaN;
    var v = tasKt * KT_MPS;
    var r = radiusFeet * FT_M;
    return Math.atan((v * v) / (G * r)) / DEG;
  }

  function standardRateRuleOfThumb(tasKt) {
    if (!(tasKt > 0)) return NaN;
    return tasKt / 10 + 7;
  }

  /** Bank angle (deg) that produces a given load factor. */
  function bankForLoadFactor(n) {
    if (!(n >= 1)) return NaN;
    return Math.acos(1 / n) / DEG;
  }

  /**
   * input:
   *   tasKt (required)
   *   mode: "bank" (default) → use bankDeg
   *         "standard"       → exact standard-rate bank
   *         "rate"           → use rateDps
   *   bankDeg, rateDps
   *   stallSpeedKt (optional, level-flight Vs in any unit)
   */
  function compute(input) {
    input = input || {};
    var tas = input.tasKt;
    if (!isFiniteNumber(tas) || tas <= 0) return { error: "Enter a true airspeed greater than zero." };
    var mode = input.mode || "bank";
    var bank;
    if (mode === "standard") {
      bank = bankForRate(tas, STANDARD_RATE_DPS);
    } else if (mode === "rate") {
      if (!isFiniteNumber(input.rateDps) || input.rateDps <= 0) return { error: "Enter a rate of turn greater than zero." };
      bank = bankForRate(tas, input.rateDps);
    } else {
      bank = input.bankDeg;
      if (!isFiniteNumber(bank) || bank <= 0) return { error: "Enter a bank angle greater than zero." };
      if (bank >= 90) return { error: "Bank angle must be less than 90°." };
    }

    var n = loadFactor(bank);
    var rate = rateOfTurnDps(tas, bank);
    var rM = radiusM(tas, bank);
    var out = {
      mode: mode,
      tasKt: tas,
      bankDeg: bank,
      rateDps: rate,
      time360Sec: 360 / rate,
      radiusM: rM,
      radiusFt: rM / FT_M,
      radiusNm: rM / NM_M,
      diameterFt: 2 * rM / FT_M,
      diameterNm: 2 * rM / NM_M,
      loadFactor: n,
      stallIncreasePct: (Math.sqrt(n) - 1) * 100,
      standardRateBankExact: bankForRate(tas, STANDARD_RATE_DPS),
      standardRateBankRule: standardRateRuleOfThumb(tas),
      error: null
    };
    if (isFiniteNumber(input.stallSpeedKt) && input.stallSpeedKt > 0) {
      out.stallSpeedLevel = input.stallSpeedKt;
      out.stallSpeedBank = stallSpeedInBank(input.stallSpeedKt, bank);
    }
    return out;
  }

  var api = {
    G: G,
    KT_MPS: KT_MPS,
    FT_M: FT_M,
    NM_M: NM_M,
    STANDARD_RATE_DPS: STANDARD_RATE_DPS,
    isFiniteNumber: isFiniteNumber,
    rateOfTurnDps: rateOfTurnDps,
    radiusM: radiusM,
    radiusFt: radiusFt,
    radiusNm: radiusNm,
    loadFactor: loadFactor,
    stallSpeedInBank: stallSpeedInBank,
    bankForRate: bankForRate,
    bankForRadiusFt: bankForRadiusFt,
    bankForLoadFactor: bankForLoadFactor,
    standardRateRuleOfThumb: standardRateRuleOfThumb,
    compute: compute
  };

  root.TurnRadius = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

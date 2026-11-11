/**
 * Landing / approach speed from stall speed in the landing configuration
 * (typically Vref or Vapp = 1.3 × Vso), with a weight correction and the
 * FAA gust-factor additive.
 *
 *   Vref = k × Vso_ref × √(W / W_ref)
 *
 * The usual factor k is 1.3 (14 CFR / AFH / most POH Vref definitions).
 * A few transport manuals use a slightly different factor (for example
 * 1.23); you can enter k yourself. If you omit the reference weight,
 * the speed is just k × Vso.
 *
 * Gust factor (Airplane Flying Handbook / common POH wording):
 *   gust increment = gust speed − steady wind
 *   additive       = ½ × gust increment
 *   Vapp           = Vref + additive
 *
 * The steady wind itself is not added to indicated approach speed (it
 * already shows up as a lower groundspeed). Some transport operators
 * instead add ½ the headwind component plus the full gust increment,
 * often with a cap (commonly 20 kt). That optional method is reported
 * separately and labeled as such.
 *
 * Sources: FAA Airplane Flying Handbook (approach and landing, gust
 * factor); FAA Pilot's Handbook of Aeronautical Knowledge; typical
 * POH/AFM Vref = 1.3 Vso; stall-speed weight scaling already used on
 * this site's stall-speed calculator.
 */
(function (root) {
  "use strict";

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function toKt(v, unit) {
    if (!isFiniteNumber(v) || v < 0) return NaN;
    if (unit === "mph") return v / 1.1507794480235425;
    if (unit === "mps" || unit === "m/s") return v / (1852 / 3600);
    if (unit === "kph" || unit === "km/h") return v / 1.852;
    return v;
  }

  function compute(input) {
    if (!input) return null;
    var unit = input.speedUnit || "kt";
    var vso = toKt(Number(input.vso), unit);
    if (!isFiniteNumber(vso) || vso <= 0) return null;
    var k = input.factor == null || input.factor === "" ? 1.3 : Number(input.factor);
    if (!isFiniteNumber(k) || k <= 1) return null;

    var weightFactor = 1;
    var W = null, Wref = null;
    if (input.weight != null && input.weight !== "" &&
        input.weightRef != null && input.weightRef !== "") {
      W = Number(input.weight);
      Wref = Number(input.weightRef);
      if (!isFiniteNumber(W) || !isFiniteNumber(Wref) || W <= 0 || Wref <= 0) return null;
      weightFactor = Math.sqrt(W / Wref);
    }
    var vsoCorrected = vso * weightFactor;
    var vref = k * vsoCorrected;

    var steady = 0, gust = null, increment = 0, additive = 0;
    if (input.wind != null && input.wind !== "") {
      steady = toKt(Number(input.wind), unit);
      if (!isFiniteNumber(steady) || steady < 0) return null;
    }
    if (input.gust != null && input.gust !== "") {
      gust = toKt(Number(input.gust), unit);
      if (!isFiniteNumber(gust) || gust < 0) return null;
      if (gust < steady) gust = steady;
      increment = gust - steady;
      additive = 0.5 * increment;
    }
    var vapp = vref + additive;

    var hw = null, transportAdd = null, transportVapp = null, cap = 20;
    if (input.headwind != null && input.headwind !== "") {
      hw = toKt(Number(input.headwind), unit);
      if (!isFiniteNumber(hw)) return null;
    }
    if (input.transportCap != null && input.transportCap !== "") {
      cap = Number(input.transportCap);
      if (!isFiniteNumber(cap) || cap < 0) return null;
    }
    if (hw != null || increment > 0) {
      var halfHw = hw != null && hw > 0 ? 0.5 * hw : 0;
      transportAdd = Math.min(cap, halfHw + increment);
      transportVapp = vref + transportAdd;
    }

    return {
      vsoKt: vso,
      vsoCorrectedKt: vsoCorrected,
      factor: k,
      weightFactor: weightFactor,
      weight: W,
      weightRef: Wref,
      vrefKt: vref,
      windKt: steady,
      gustKt: gust,
      gustIncrementKt: increment,
      faaAdditiveKt: additive,
      vappKt: vapp,
      headwindKt: hw,
      transportAdditiveKt: transportAdd,
      transportVappKt: transportVapp,
      transportCapKt: cap
    };
  }

  var api = { toKt: toKt, compute: compute };
  root.ApproachSpeedCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

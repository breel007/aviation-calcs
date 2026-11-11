/**
 * Time to turn through a heading change at a chosen turn rate.
 *
 * A standard-rate (rate-one) turn is 3° per second — 360° in two
 * minutes — which is the FAA / AIM / ICAO reference rate. Half
 * standard is 1.5°/s (a four-minute turn). Time is simply
 *
 *   t = Δψ / rate
 *
 * If you also enter true airspeed and bank angle, the calculator
 * reports the actual turn rate
 *
 *   ω = (g tan φ) / V     (rad/s)
 *
 * and the time at that rate, using the same identities as this
 * site's turn-radius calculator. The shorter and longer ways between
 * two headings are both shown when you enter a from/to pair.
 *
 * Sources: FAA Airplane Flying Handbook (standard-rate turn, 3° per
 * second, two-minute turn); FAA Pilot's Handbook of Aeronautical
 * Knowledge; AIM (standard-rate in holding and instrument
 * procedure); turn-radius / load-factor identities on this site.
 */
(function (root) {
  "use strict";

  var STANDARD_DPS = 3;
  var HALF_DPS = 1.5;
  var G_FT = 32.17404855643044; // 9.80665 / 0.3048
  var KT_TO_FT_S = 1852 / 0.3048 / 3600;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function wrap360(deg) {
    var x = deg % 360;
    if (x < 0) x += 360;
    if (Math.abs(x - 360) < 1e-12) x = 0;
    return x;
  }
  function toKt(v, unit) {
    if (!isFiniteNumber(v) || v < 0) return NaN;
    if (unit === "mph") return v / 1.1507794480235425;
    if (unit === "mps" || unit === "m/s") return v / (1852 / 3600);
    if (unit === "kph" || unit === "km/h") return v / 1.852;
    return v;
  }

  function shortestChange(from, to) {
    var d = wrap360(to) - wrap360(from);
    if (d > 180) d -= 360;
    if (d <= -180) d += 360;
    return d; // signed, −180 < d ≤ 180 (180 kept positive)
  }

  function rateFromBank(tasKt, bankDeg) {
    if (!(tasKt > 0) || !isFiniteNumber(bankDeg)) return null;
    if (Math.abs(bankDeg) >= 90) return null;
    var v = tasKt * KT_TO_FT_S;
    var tanp = Math.tan(bankDeg * Math.PI / 180);
    var omegaRad = (G_FT * tanp) / v;
    return omegaRad * (180 / Math.PI); // deg/s, sign follows bank
  }

  function compute(input) {
    if (!input) return null;
    var mode = input.mode || "delta";
    var fromH = null, toH = null, delta, longWay;
    if (mode === "headings") {
      fromH = Number(input.fromHeading);
      toH = Number(input.toHeading);
      if (!isFiniteNumber(fromH) || !isFiniteNumber(toH)) return null;
      if (fromH < 0 || fromH > 360 || toH < 0 || toH > 360) return null;
      delta = shortestChange(fromH, toH);
      longWay = delta === 0 ? 360 : (delta > 0 ? delta - 360 : delta + 360);
    } else {
      delta = Number(input.change);
      if (!isFiniteNumber(delta) || delta === 0) return null;
      // Allow a signed change; time uses the absolute value of each path.
      longWay = delta > 0 ? delta - 360 : delta + 360;
      if (Math.abs(delta) > 360) {
        // A raw "turn this many degrees" (including more than a circle)
        // has no opposite "long way" of 360 − |Δ|.
        longWay = null;
      }
    }

    var rateKind = input.rateKind || "standard";
    var rate;
    if (rateKind === "half") {
      rate = HALF_DPS;
    } else if (rateKind === "custom") {
      rate = Number(input.rate);
      if (!isFiniteNumber(rate) || rate === 0) return null;
    } else {
      rate = STANDARD_DPS;
    }

    var absDelta = Math.abs(delta);
    var timeSec = absDelta / Math.abs(rate);
    var longSec = longWay == null ? null : Math.abs(longWay) / Math.abs(rate);

    var tasKt = null, bankDeg = null, bankRate = null, bankTimeSec = null;
    if (input.tas != null && input.tas !== "" &&
        input.bank != null && input.bank !== "") {
      tasKt = toKt(Number(input.tas), input.speedUnit || "kt");
      bankDeg = Number(input.bank);
      if (!isFiniteNumber(tasKt) || tasKt <= 0 || !isFiniteNumber(bankDeg)) return null;
      bankRate = rateFromBank(tasKt, bankDeg);
      if (bankRate != null && bankRate !== 0) {
        bankTimeSec = absDelta / Math.abs(bankRate);
      }
    }

    return {
      mode: mode,
      fromHeading: fromH,
      toHeading: toH,
      changeDeg: delta,
      changeAbsDeg: absDelta,
      longWayDeg: longWay == null ? null : Math.abs(longWay),
      rateDps: rate,
      rateKind: rateKind,
      timeSec: timeSec,
      timeMin: timeSec / 60,
      longWaySec: longSec,
      tasKt: tasKt,
      bankDeg: bankDeg,
      bankRateDps: bankRate,
      bankTimeSec: bankTimeSec,
      standardDps: STANDARD_DPS,
      halfDps: HALF_DPS
    };
  }

  var api = {
    STANDARD_DPS: STANDARD_DPS,
    wrap360: wrap360,
    shortestChange: shortestChange,
    rateFromBank: rateFromBank,
    compute: compute
  };
  root.TimeToTurnCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

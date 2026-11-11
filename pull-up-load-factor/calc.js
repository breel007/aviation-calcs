/**
 * Load factor in a vertical-plane pull-up or loop, and the matching
 * accelerated stall speed.
 *
 * At a true airspeed V and flight-path radius R, the centripetal
 * acceleration is V²/R. In a pull-up that starts from level flight,
 * lift must also support weight, so the load factor at the bottom is
 *
 *   n_bottom = 1 + V² / (g R)
 *
 * At the top of a loop the airplane is inverted and weight helps the
 * turn, so
 *
 *   n_top = V² / (g R) − 1
 *
 * (n_top is only physical when V²/(g R) > 1.) A push-over from level
 * flight is n = 1 − V²/(g R). Accelerated stall speed scales as
 * Vs √n, the same rule used on this site's stall-speed calculator.
 *
 * Invert any two of {V, R, n_bottom} for the third:
 *   R = V² / (g (n − 1))     at the bottom, n > 1
 *   V = √( g R (n − 1) )
 *
 * Sources: FAA Pilot's Handbook of Aeronautical Knowledge (load
 * factor, accelerated stall); FAA Airplane Flying Handbook; NASA
 * Glenn Beginner's Guide (lift and load factor); Anderson,
 * Introduction to Flight (pull-up / loop).
 */
(function (root) {
  "use strict";

  var G_FT = 32.17404855643044; // 9.80665 m/s² in ft/s²
  var G_M = 9.80665;
  var KT_TO_FT_S = 1852 / 0.3048 / 3600;
  var FT_PER_NM = 1852 / 0.3048;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function toFtS(v, unit) {
    if (!isFiniteNumber(v) || v < 0) return NaN;
    if (unit === "mph") return (v / 1.1507794480235425) * KT_TO_FT_S;
    if (unit === "mps" || unit === "m/s") return v / 0.3048;
    if (unit === "kph" || unit === "km/h") return (v / 1.852) * KT_TO_FT_S;
    if (unit === "fps" || unit === "ft/s") return v;
    return v * KT_TO_FT_S; // kt
  }
  function toFt(r, unit) {
    if (!isFiniteNumber(r) || r <= 0) return NaN;
    if (unit === "m") return r / 0.3048;
    if (unit === "km") return (r * 1000) / 0.3048;
    if (unit === "nm") return r * FT_PER_NM;
    return r; // ft
  }

  function compute(input) {
    if (!input) return null;
    var mode = input.mode || "vr"; // vr | vn | nr
    var spdUnit = input.speedUnit || "kt";
    var radUnit = input.radiusUnit || "ft";
    var vFtS, rFt, nBottom;

    if (mode === "vn") {
      vFtS = toFtS(Number(input.speed), spdUnit);
      nBottom = Number(input.n);
      if (!(vFtS > 0) || !isFiniteNumber(nBottom) || nBottom <= 1) return null;
      rFt = (vFtS * vFtS) / (G_FT * (nBottom - 1));
    } else if (mode === "nr") {
      nBottom = Number(input.n);
      rFt = toFt(Number(input.radius), radUnit);
      if (!isFiniteNumber(nBottom) || nBottom <= 1 || !(rFt > 0)) return null;
      vFtS = Math.sqrt(G_FT * rFt * (nBottom - 1));
    } else {
      vFtS = toFtS(Number(input.speed), spdUnit);
      rFt = toFt(Number(input.radius), radUnit);
      if (!(vFtS > 0) || !(rFt > 0)) return null;
      nBottom = 1 + (vFtS * vFtS) / (G_FT * rFt);
    }

    var centripetalG = (vFtS * vFtS) / (G_FT * rFt); // V²/(gR)
    var nTop = centripetalG - 1;
    var nPushover = 1 - centripetalG;
    var topPossible = nTop > 0;

    var vs = null, vsUnit = input.vsUnit || spdUnit;
    var vsAcc = null;
    if (input.vs != null && input.vs !== "") {
      vs = Number(input.vs);
      if (!isFiniteNumber(vs) || vs < 0) return null;
      vsAcc = vs * Math.sqrt(nBottom);
    }

    return {
      mode: mode,
      speedFtS: vFtS,
      speedKt: vFtS / KT_TO_FT_S,
      radiusFt: rFt,
      radiusM: rFt * 0.3048,
      nBottom: nBottom,
      nTop: nTop,
      nPushover: nPushover,
      centripetalG: centripetalG,
      topPossible: topPossible,
      vs: vs,
      vsAccelerated: vsAcc,
      vsUnit: vsUnit,
      gFt: G_FT,
      gM: G_M
    };
  }

  var api = { G_FT: G_FT, G_M: G_M, toFtS: toFtS, toFt: toFt, compute: compute };
  root.PullUpLoadFactorCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

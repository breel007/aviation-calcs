/**
 * MacCready speed-to-fly from a glider polar and a next-thermal climb
 * rate.
 *
 * A quadratic sink polar (sink positive)
 *   w(V) = a + b V + c V²
 * has the MacCready speed-to-fly
 *   V_stf = √((a + Mc) / c)
 * where Mc is the expected climb rate in the next thermal (same units
 * as sink). The linear coefficient b cancels in the classic condition
 * w(V) + Mc = V w'(V). With Mc = 0 this is also the still-air best-
 * glide speed, V_bg = √(a / c). Minimum sink, when it exists, is at
 * V_ms = −b / (2c).
 *
 * You may enter the three coefficients directly, or two or three polar
 * points (airspeed and sink). Two points fit the simpler polar
 * w = a + c V² (no linear term). Three points fit a + b V + c V².
 *
 * Sources: P. B. MacCready, "Optimum Airspeed Selector," Soaring, 1958;
 * FAA Glider Flying Handbook (speed to fly, MacCready theory);
 * Helmut Reichmann, Cross-Country Soaring (quadratic polar and
 * speed-to-fly).
 */
(function (root) {
  "use strict";

  var KT_TO_FPM = (1852 / 0.3048) / 60; // 101.2686 ft/min per knot

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function toKt(v, unit) {
    if (!isFiniteNumber(v) || v <= 0) return NaN;
    if (unit === "mph") return v / 1.1507794480235425;
    if (unit === "kph" || unit === "km/h") return v / 1.852;
    if (unit === "mps" || unit === "m/s") return v / (1852 / 3600);
    if (unit === "fps") return v / (1852 / 3600 / 0.3048);
    return v;
  }
  function sinkToKt(s, unit) {
    if (!isFiniteNumber(s) || s < 0) return NaN;
    if (unit === "fpm" || unit === "ft/min") return s / KT_TO_FPM;
    if (unit === "mps" || unit === "m/s") return s / (1852 / 3600);
    if (unit === "kph") return s / 1.852;
    return s; // knots of sink
  }

  function fitTwo(v1, w1, v2, w2) {
    var d = v1 * v1 - v2 * v2;
    if (Math.abs(d) < 1e-15) return null;
    var c = (w1 - w2) / d;
    var a = w1 - c * v1 * v1;
    return { a: a, b: 0, c: c };
  }

  function fitThree(v1, w1, v2, w2, v3, w3) {
    // Vandermonde for a + b V + c V²
    var M = [
      [1, v1, v1 * v1],
      [1, v2, v2 * v2],
      [1, v3, v3 * v3]
    ];
    var rhs = [w1, w2, w3];
    var det = function (A) {
      return A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1])
           - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0])
           + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
    };
    var D = det(M);
    if (Math.abs(D) < 1e-15) return null;
    function replaceCol(col, vec) {
      var B = M.map(function (row, i) {
        return row.map(function (x, j) { return j === col ? vec[i] : x; });
      });
      return det(B) / D;
    }
    return { a: replaceCol(0, rhs), b: replaceCol(1, rhs), c: replaceCol(2, rhs) };
  }

  function compute(input) {
    if (!input) return null;
    var speedUnit = input.speedUnit || "kt";
    var sinkUnit = input.sinkUnit || "kt";
    var coef, mode = input.mode || "points";

    if (mode === "coefficients") {
      var a = Number(input.a), b = input.b == null || input.b === "" ? 0 : Number(input.b), c = Number(input.c);
      if (!isFiniteNumber(a) || !isFiniteNumber(b) || !isFiniteNumber(c)) return null;
      coef = { a: a, b: b, c: c };
    } else {
      var v1 = toKt(Number(input.v1), speedUnit);
      var w1 = sinkToKt(Number(input.w1), sinkUnit);
      var v2 = toKt(Number(input.v2), speedUnit);
      var w2 = sinkToKt(Number(input.w2), sinkUnit);
      if (!(v1 > 0) || !(v2 > 0) || !isFiniteNumber(w1) || !isFiniteNumber(w2)) return null;
      if (input.v3 != null && input.v3 !== "" && input.w3 != null && input.w3 !== "") {
        var v3 = toKt(Number(input.v3), speedUnit);
        var w3 = sinkToKt(Number(input.w3), sinkUnit);
        if (!(v3 > 0) || !isFiniteNumber(w3)) return null;
        coef = fitThree(v1, w1, v2, w2, v3, w3);
      } else {
        coef = fitTwo(v1, w1, v2, w2);
      }
      if (!coef) return null;
    }
    if (!(coef.c > 0)) return null;

    var mc = 0;
    if (input.maccready != null && input.maccready !== "") {
      mc = sinkToKt(Number(input.maccready), input.mcUnit || sinkUnit);
      if (!isFiniteNumber(mc) || mc < 0) return null;
    }

    if (coef.a + mc <= 0) return null;
    var vstf = Math.sqrt((coef.a + mc) / coef.c);
    var wStf = coef.a + coef.b * vstf + coef.c * vstf * vstf;
    var ldStf = vstf / wStf;

    var vBg = coef.a > 0 ? Math.sqrt(coef.a / coef.c) : null;
    var wBg = vBg != null ? coef.a + coef.b * vBg + coef.c * vBg * vBg : null;
    var ldBg = vBg != null && wBg > 0 ? vBg / wBg : null;

    var vMs = null, wMs = null;
    if (Math.abs(coef.c) > 0) {
      var vm = -coef.b / (2 * coef.c);
      if (vm > 0) {
        vMs = vm;
        wMs = coef.a + coef.b * vMs + coef.c * vMs * vMs;
      }
    }

    return {
      a: coef.a,
      b: coef.b,
      c: coef.c,
      maccreadyKt: mc,
      maccreadyFpm: mc * KT_TO_FPM,
      speedToFlyKt: vstf,
      sinkAtStfKt: wStf,
      sinkAtStfFpm: wStf * KT_TO_FPM,
      glideRatioAtStf: ldStf,
      bestGlideKt: vBg,
      bestGlideRatio: ldBg,
      minSinkKt: vMs,
      minSinkKtRate: wMs,
      minSinkFpm: wMs == null ? null : wMs * KT_TO_FPM,
      KT_TO_FPM: KT_TO_FPM
    };
  }

  var api = { KT_TO_FPM: KT_TO_FPM, fitTwo: fitTwo, fitThree: fitThree, compute: compute };
  root.MaccreadyCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

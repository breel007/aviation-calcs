/**
 * Parachute (or any high-drag descent system) time-to-ground, optional
 * terminal speed from Cd A, and wind drift.
 *
 * Terminal speed, when not entered directly, is the same identity used
 * on this site's terminal-velocity page:
 *   v_t = √(2 m g / (ρ Cd A))
 *
 * Time and drift:
 *   Constant-v_t approximation:  t = h / v_t,   drift = wind × t
 *   From rest, with quadratic drag: v = v_t tanh(g t / v_t) and
 *   h = (v_t² / g) ln cosh(g t / v_t), so
 *   t = (v_t / g) acosh( exp(g h / v_t²) ).
 * After a few time constants v_t/g the two times nearly agree; from a
 * typical parachute opening height they are already close.
 *
 * Sources: quadratic-drag terminal velocity (this site's
 * terminal-velocity calculator); integration of m dv/dt = mg − (1/2)ρ Cd A v²
 * (standard ballistic descent); FAA Parachute Rigger Handbook /
 * Airplane Flying Handbook (descent rate and drift — conceptual).
 */
(function (root) {
  "use strict";

  var G0 = 9.80665;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function toM(h, unit) {
    if (!isFiniteNumber(h) || h < 0) return NaN;
    if (unit === "ft") return h * 0.3048;
    if (unit === "km") return h * 1000;
    if (unit === "nm") return h * 1852;
    return h;
  }
  function toMps(v, unit) {
    if (!isFiniteNumber(v) || v < 0) return NaN;
    if (unit === "kt") return v * 1852 / 3600;
    if (unit === "mph") return v * 1609.344 / 3600;
    if (unit === "fpm" || unit === "ft/min") return v * 0.3048 / 60;
    if (unit === "fps" || unit === "ft/s") return v * 0.3048;
    if (unit === "kph") return v / 3.6;
    return v;
  }
  function toKg(m, unit) {
    if (!isFiniteNumber(m) || m <= 0) return NaN;
    if (unit === "lb") return m * 0.45359237;
    return m;
  }
  function toM2(a, unit) {
    if (!isFiniteNumber(a) || a <= 0) return NaN;
    if (unit === "ft2") return a * 0.3048 * 0.3048;
    return a;
  }
  function acosh(x) {
    if (x < 1) return NaN;
    return Math.log(x + Math.sqrt(x * x - 1));
  }

  function compute(input) {
    if (!input) return null;
    var h = toM(Number(input.height), input.altUnit || "ft");
    if (!(h >= 0)) return null;

    var vt;
    if (input.vt != null && input.vt !== "") {
      vt = toMps(Number(input.vt), input.vtUnit || "fpm");
      if (!(vt > 0)) return null;
    } else {
      var mass = toKg(Number(input.mass), input.massUnit || "kg");
      var cd = Number(input.cd);
      var area = toM2(Number(input.area), input.areaUnit || "m2");
      var rho = input.density == null || input.density === "" ? 1.225 : Number(input.density);
      if (!(mass > 0) || !(cd > 0) || !(area > 0) || !(rho > 0)) return null;
      vt = Math.sqrt(2 * mass * G0 / (rho * cd * area));
    }

    var tConst = h / vt;
    var arg = Math.exp(G0 * h / (vt * vt));
    var tFromRest = (vt / G0) * acosh(arg);
    var wind = 0;
    if (input.wind != null && input.wind !== "") {
      wind = toMps(Number(input.wind), input.windUnit || "kt");
      if (!isFiniteNumber(wind) || wind < 0) return null;
    }
    var driftConst = wind * tConst;
    var driftRest = wind * tFromRest;

    return {
      heightM: h,
      heightFt: h / 0.3048,
      vtMps: vt,
      vtFpm: vt / 0.3048 * 60,
      vtKt: vt / (1852 / 3600),
      timeConstSec: tConst,
      timeFromRestSec: tFromRest,
      windMps: wind,
      windKt: wind / (1852 / 3600),
      driftConstM: driftConst,
      driftConstNm: driftConst / 1852,
      driftConstFt: driftConst / 0.3048,
      driftRestM: driftRest,
      driftRestFt: driftRest / 0.3048,
      G0: G0
    };
  }

  var api = { G0: G0, compute: compute };
  root.ParachuteDescentCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

/**
 * Educational accelerate-stop distance from constant-acceleration
 * kinematics. This is not a certified accelerate-stop distance (ASDR),
 * not a V1 calculation, and not a substitute for AFM/POH data.
 *
 *   s_accel   = V1² / (2 a)          (or a given distance to V1)
 *   s_react   = V1 × t_react
 *   s_stop    = V1² / (2 d)
 *   ASD       = s_accel + s_react + s_stop
 *
 * Acceleration a and deceleration d may be entered as speeds gained or
 * lost in a given distance, as knots per second, or as a fraction of g.
 * Speeds are true / ground speeds in this model (no wind, no slope,
 * no configuration change). A rejected takeoff in the real airplane
 * depends on V1 as published for the weight, flap setting, runway, and
 * braking condition of the day.
 *
 * Sources: constant-acceleration kinematics (s = v² / 2a); FAA Airplane
 * Flying Handbook and Pilot's Handbook of Aeronautical Knowledge
 * (rejected takeoff, V1 as a decision speed — conceptual only);
 * 14 CFR 25.109 / 23.55 (certified ASDR is a much richer model than
 * this page and is not implemented here).
 */
(function (root) {
  "use strict";

  var KT_TO_FPS = 1852 / 3600 / 0.3048; // 1.68781 ft/s per knot
  var G_FPS2 = 32.17405;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function toKt(v, unit) {
    if (!isFiniteNumber(v) || v < 0) return NaN;
    if (unit === "mph") return v / 1.1507794480235425;
    if (unit === "kph" || unit === "km/h") return v / 1.852;
    if (unit === "fps" || unit === "ft/s") return v / KT_TO_FPS;
    if (unit === "mps" || unit === "m/s") return v / (1852 / 3600);
    return v;
  }
  function toFt(x, unit) {
    if (!isFiniteNumber(x) || x < 0) return NaN;
    if (unit === "m") return x / 0.3048;
    if (unit === "nm") return x * (1852 / 0.3048);
    return x;
  }

  function accelFps2(input, prefix, v1Fps) {
    // prefix is "accel" or "decel"
    var kind = input[prefix + "Kind"] || "kts-per-s";
    if (kind === "distance") {
      var dist = toFt(Number(input[prefix + "Distance"]), input[prefix + "DistUnit"] || "ft");
      if (!(dist > 0) || !(v1Fps > 0)) return NaN;
      return v1Fps * v1Fps / (2 * dist);
    }
    if (kind === "g") {
      var g = Number(input[prefix + "G"]);
      if (!isFiniteNumber(g) || g <= 0) return NaN;
      return g * G_FPS2;
    }
    if (kind === "fps2") {
      var a = Number(input[prefix + "Fps2"]);
      return a > 0 ? a : NaN;
    }
    // default: knots per second
    var kps = Number(input[prefix + "KtsPerSec"]);
    if (!(kps > 0)) return NaN;
    return kps * KT_TO_FPS;
  }

  function compute(input) {
    if (!input) return null;
    var v1Kt = toKt(Number(input.v1), input.v1Unit || "kt");
    if (!(v1Kt > 0)) return null;
    var v1Fps = v1Kt * KT_TO_FPS;
    var tReact = input.reactionSec == null || input.reactionSec === "" ? 1 : Number(input.reactionSec);
    if (!isFiniteNumber(tReact) || tReact < 0) return null;

    var a = accelFps2(input, "accel", v1Fps);
    var d = accelFps2(input, "decel", v1Fps);
    if (!(a > 0) || !(d > 0)) return null;

    var sAccel, tAccel;
    if (input.accelKind === "distance") {
      sAccel = toFt(Number(input.accelDistance), input.accelDistUnit || "ft");
      tAccel = v1Fps / a;
    } else {
      sAccel = v1Fps * v1Fps / (2 * a);
      tAccel = v1Fps / a;
    }
    var sReact = v1Fps * tReact;
    var sStop = v1Fps * v1Fps / (2 * d);
    var tStop = v1Fps / d;
    var total = sAccel + sReact + sStop;
    var totalTime = tAccel + tReact + tStop;

    return {
      v1Kt: v1Kt,
      v1Fps: v1Fps,
      accelFps2: a,
      decelFps2: d,
      accelG: a / G_FPS2,
      decelG: d / G_FPS2,
      reactionSec: tReact,
      accelFt: sAccel,
      reactionFt: sReact,
      stopFt: sStop,
      totalFt: total,
      totalM: total * 0.3048,
      accelSec: tAccel,
      stopSec: tStop,
      totalSec: totalTime
    };
  }

  var api = { KT_TO_FPS: KT_TO_FPS, G_FPS2: G_FPS2, compute: compute };
  root.AccelerateStopCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

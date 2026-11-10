/**
 * Time–speed–distance: solve any one of time, speed, or distance,
 * plus an ETA from a departure time and the enroute time.
 *
 *   distance = speed × time
 *
 * Internally everything is stored as hours, knots, and nautical miles,
 * using the international nautical mile (1 852 m) and statute mile
 * (1 609.344 m).
 */
(function (root) {
  "use strict";

  var NM_M = 1852;
  var SM_M = 1609.344;
  var KM_M = 1000;
  var KT_TO_MPH = NM_M / SM_M;
  var KT_TO_KMH = 1.852;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function distanceToNm(value, unit) {
    if (!isFiniteNumber(value)) return NaN;
    switch (unit) {
      case "sm": return value * SM_M / NM_M;
      case "km": return value * KM_M / NM_M;
      case "m": return value / NM_M;
      default: return value; // nm
    }
  }

  function nmToDistance(nm, unit) {
    if (!isFiniteNumber(nm)) return NaN;
    switch (unit) {
      case "sm": return nm * NM_M / SM_M;
      case "km": return nm * NM_M / KM_M;
      case "m": return nm * NM_M;
      default: return nm;
    }
  }

  function speedToKt(value, unit) {
    if (!isFiniteNumber(value)) return NaN;
    switch (unit) {
      case "mph": return value / KT_TO_MPH;
      case "kmh": return value / KT_TO_KMH;
      case "mps": return value / (NM_M / 3600);
      default: return value; // kt
    }
  }

  function ktToSpeed(kt, unit) {
    if (!isFiniteNumber(kt)) return NaN;
    switch (unit) {
      case "mph": return kt * KT_TO_MPH;
      case "kmh": return kt * KT_TO_KMH;
      case "mps": return kt * (NM_M / 3600);
      default: return kt;
    }
  }

  /** Accept hours, or hours + minutes, or a total in minutes. */
  function toHours(input) {
    if (input == null) return NaN;
    if (typeof input === "number") return input;
    var h = input.hours;
    var m = input.minutes;
    var sec = input.seconds;
    var totalMin = input.totalMinutes;
    if (isFiniteNumber(totalMin) && !isFiniteNumber(h) && !isFiniteNumber(m)) {
      return totalMin / 60;
    }
    var hours = isFiniteNumber(h) ? h : 0;
    var minutes = isFiniteNumber(m) ? m : 0;
    var seconds = isFiniteNumber(sec) ? sec : 0;
    if (!isFiniteNumber(h) && !isFiniteNumber(m) && !isFiniteNumber(sec)) return NaN;
    return hours + minutes / 60 + seconds / 3600;
  }

  function splitHours(hours) {
    if (!isFiniteNumber(hours) || hours < 0) {
      return { hours: NaN, minutes: NaN, seconds: NaN, totalMinutes: NaN, plusOneDay: false };
    }
    var totalSeconds = Math.round(hours * 3600);
    var plusOneDay = false;
    // Keep a raw copy for duration display; ETA may roll past 24 h
    var h = Math.floor(totalSeconds / 3600);
    var rem = totalSeconds - h * 3600;
    var m = Math.floor(rem / 60);
    var s = rem - m * 60;
    return {
      hours: h,
      minutes: m,
      seconds: s,
      totalMinutes: totalSeconds / 60,
      totalHours: hours,
      plusOneDay: plusOneDay
    };
  }

  /**
   * Solve for the missing quantity.
   * solveFor: "time" | "speed" | "distance"
   * Provide the other two of { timeHours, speedKt, distanceNm }.
   */
  function solve(input) {
    input = input || {};
    var solveFor = input.solveFor;
    var t = isFiniteNumber(input.timeHours) ? input.timeHours : toHours(input.time);
    var v = input.speedKt;
    var d = input.distanceNm;
    var error = null;

    if (solveFor !== "time" && solveFor !== "speed" && solveFor !== "distance") {
      // Infer: whichever is missing
      var missing = [];
      if (!isFiniteNumber(t)) missing.push("time");
      if (!isFiniteNumber(v)) missing.push("speed");
      if (!isFiniteNumber(d)) missing.push("distance");
      if (missing.length === 1) solveFor = missing[0];
      else if (missing.length === 0) {
        // All three given — recompute time from speed and distance as a check
        solveFor = "time";
      } else {
        return { error: "Enter any two of time, speed, and distance." };
      }
    }

    if (solveFor === "time") {
      if (!isFiniteNumber(v) || v <= 0) return { error: "Enter a speed greater than zero." };
      if (!isFiniteNumber(d) || d < 0) return { error: "Enter a distance." };
      t = d / v;
    } else if (solveFor === "speed") {
      if (!isFiniteNumber(t) || t <= 0) return { error: "Enter a time greater than zero." };
      if (!isFiniteNumber(d) || d < 0) return { error: "Enter a distance." };
      v = d / t;
    } else if (solveFor === "distance") {
      if (!isFiniteNumber(v) || v < 0) return { error: "Enter a speed." };
      if (!isFiniteNumber(t) || t < 0) return { error: "Enter a time." };
      d = v * t;
    }

    var parts = splitHours(t);
    return {
      solveFor: solveFor,
      timeHours: t,
      speedKt: v,
      distanceNm: d,
      duration: parts,
      error: error
    };
  }

  /**
   * departure is { hours, minutes } in a 24-hour clock (0–23, 0–59),
   * or a string "HH:MM" / "HH:MM:SS".
   * Returns arrival clock time and whether the arrival is the next day
   * (or later).
   */
  function parseClock(value) {
    if (value && typeof value === "object" && isFiniteNumber(value.hours)) {
      return {
        hours: value.hours,
        minutes: isFiniteNumber(value.minutes) ? value.minutes : 0,
        seconds: isFiniteNumber(value.seconds) ? value.seconds : 0
      };
    }
    if (typeof value !== "string") return null;
    var m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
    if (!m) return null;
    var h = Number(m[1]);
    var min = Number(m[2]);
    var s = m[3] != null ? Number(m[3]) : 0;
    if (h < 0 || h > 23 || min < 0 || min > 59 || s < 0 || s > 59) return null;
    return { hours: h, minutes: min, seconds: s };
  }

  function formatClock(h, min, s) {
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    var out = pad(h) + ":" + pad(min);
    if (s) out += ":" + pad(s);
    return out;
  }

  function eta(departure, timeHours) {
    var dep = parseClock(departure);
    if (!dep) return { error: "Enter a departure time as HH:MM." };
    if (!isFiniteNumber(timeHours) || timeHours < 0) return { error: "Need a non-negative enroute time to compute ETA." };
    var depSeconds = dep.hours * 3600 + dep.minutes * 60 + dep.seconds;
    var add = Math.round(timeHours * 3600);
    var total = depSeconds + add;
    var days = Math.floor(total / 86400);
    var rem = total - days * 86400;
    var h = Math.floor(rem / 3600);
    rem -= h * 3600;
    var min = Math.floor(rem / 60);
    var s = rem - min * 60;
    return {
      departure: formatClock(dep.hours, dep.minutes, dep.seconds),
      arrival: formatClock(h, min, s),
      arrivalHours: h,
      arrivalMinutes: min,
      arrivalSeconds: s,
      plusDays: days,
      enrouteHours: timeHours,
      error: null
    };
  }

  function compute(input) {
    input = input || {};
    var solved = solve(input);
    if (solved.error) return solved;
    var out = solved;
    if (input.departure) {
      out.eta = eta(input.departure, solved.timeHours);
    }
    return out;
  }

  var api = {
    NM_M: NM_M,
    SM_M: SM_M,
    KT_TO_MPH: KT_TO_MPH,
    KT_TO_KMH: KT_TO_KMH,
    isFiniteNumber: isFiniteNumber,
    distanceToNm: distanceToNm,
    nmToDistance: nmToDistance,
    speedToKt: speedToKt,
    ktToSpeed: ktToSpeed,
    toHours: toHours,
    splitHours: splitHours,
    solve: solve,
    parseClock: parseClock,
    formatClock: formatClock,
    eta: eta,
    compute: compute
  };

  root.TimeSpeedDistance = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

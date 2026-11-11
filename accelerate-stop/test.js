#!/usr/bin/env node
"use strict";
var C = require("./calc.js");
var failed = 0, passed = 0;
function nearly(a, b, tol, label) {
  if (isFinite(a) && isFinite(b) && Math.abs(a - b) <= tol) { passed += 1; console.log("  PASS  " + label); }
  else { failed += 1; console.log("  FAIL  " + label + "\n        got " + a + "  expected " + b + "  ±" + tol); }
}
function isTrue(cond, label) {
  if (cond) { passed += 1; console.log("  PASS  " + label); }
  else { failed += 1; console.log("  FAIL  " + label); }
}
console.log("Accelerate-stop (educational kinematics)\n");

console.log("Case 1  80 kt, 4 kt/s accel, 8 kt/s decel, 1 s recognition");
var a = C.compute({ v1: 80, accelKind: "kts-per-s", accelKtsPerSec: 4, decelKind: "kts-per-s", decelKtsPerSec: 8, reactionSec: 1 });
var v = 80 * C.KT_TO_FPS;
nearly(a.accelFps2, 4 * C.KT_TO_FPS, 1e-12, "a = 4 kt/s in ft/s²");
nearly(a.accelFt, v * v / (2 * a.accelFps2), 1e-9, "s_accel = V²/2a");
nearly(a.accelSec, 80 / 4, 1e-12, "20 s to 80 kt at 4 kt/s");
nearly(a.reactionFt, v * 1, 1e-9, "s_react = V × 1 s");
nearly(a.stopFt, v * v / (2 * a.decelFps2), 1e-9, "s_stop = V²/2d");
nearly(a.stopSec, 10, 1e-12, "10 s to stop at 8 kt/s");
nearly(a.totalFt, a.accelFt + a.reactionFt + a.stopFt, 1e-9, "total is the sum");
// Hand check in feet: V = 80 * 1.68781 = 135.0248 ft/s
// s_accel = 135.0248² / (2*6.75124) = 1350.25 ft
// s_react = 135.025 ft
// s_stop  = 135.0248² / (2*13.5025) = 675.12 ft
// total   ≈ 2160.4 ft
nearly(a.totalFt, 2160.4, 0.5, "hand check ≈ 2,160 ft");

console.log("\nCase 2  Distance-given acceleration matches V²/2s");
var b = C.compute({ v1: 80, accelKind: "distance", accelDistance: a.accelFt, decelKind: "kts-per-s", decelKtsPerSec: 8, reactionSec: 1 });
nearly(b.totalFt, a.totalFt, 1e-6, "entering s_accel as a distance reproduces the total");

console.log("\nCase 3  Invalid");
isTrue(C.compute({ v1: 0, accelKtsPerSec: 4, decelKtsPerSec: 8 }) === null, "zero V1 → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

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
console.log("MacCready speed-to-fly\n");

console.log("Case 1  Polar w = 1 + 0.0025 V² (V, w in knots), Mc = 3 kt");
var a = C.compute({ mode: "coefficients", a: 1, b: 0, c: 0.0025, maccready: 3, mcUnit: "kt" });
nearly(a.speedToFlyKt, Math.sqrt((1 + 3) / 0.0025), 1e-12, "V_stf = √((a+Mc)/c)");
nearly(a.speedToFlyKt, 40, 1e-12, "hand check 40 kt");
nearly(a.bestGlideKt, Math.sqrt(1 / 0.0025), 1e-12, "Mc = 0 is √(a/c) = 20 kt");
nearly(a.sinkAtStfKt, 1 + 0.0025 * 40 * 40, 1e-12, "sink at 40 kt is 5 kt");

console.log("\nCase 2  Two polar points recover the same polar");
// w(20)=1+0.0025*400=2; w(40)=1+0.0025*1600=5
var b = C.compute({ mode: "points", v1: 20, w1: 2, v2: 40, w2: 5, maccready: 3, speedUnit: "kt", sinkUnit: "kt", mcUnit: "kt" });
nearly(b.a, 1, 1e-12, "fitted a");
nearly(b.c, 0.0025, 1e-15, "fitted c");
nearly(b.speedToFlyKt, 40, 1e-12, "same speed to fly");

console.log("\nCase 3  Three-point polar with a linear term: b cancels in V_stf");
// w = 1.5 - 0.04 V + 0.0025 V²; a+Mc = 1.5+2.5 = 4, V_stf = √(4/0.0025)=40
var c3 = C.compute({ mode: "coefficients", a: 1.5, b: -0.04, c: 0.0025, maccready: 2.5, mcUnit: "kt" });
nearly(c3.speedToFlyKt, 40, 1e-12, "V_stf still √((a+Mc)/c) when b ≠ 0");
nearly(c3.minSinkKt, 0.04 / (2 * 0.0025), 1e-12, "V_ms = −b/(2c) = 8 kt");

console.log("\nCase 4  Invalid");
isTrue(C.compute({ mode: "coefficients", a: 1, c: 0, maccready: 0 }) === null, "c = 0 → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

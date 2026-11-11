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
console.log("Synodic period\n");

console.log("Case 1  Earth–Mars");
var a = C.compute({ body1: "earth", body2: "mars" });
var tE = C.PERIODS_DAY.earth, tM = C.PERIODS_DAY.mars;
nearly(a.synodicDays, 1 / Math.abs(1 / tE - 1 / tM), 1e-12, "1/S = |1/T1 − 1/T2|");
nearly(a.synodicDays, 779.9, 1.0, "hand check ≈ 780 days");

console.log("\nCase 2  Two custom periods");
var b = C.compute({ period1: 10, period2: 15, unit: "day" });
nearly(b.synodicDays, 30, 1e-12, "10 d and 15 d meet every 30 d");

console.log("\nCase 3  Invalid");
isTrue(C.compute({ period1: 10, period2: 10 }) === null, "equal periods → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

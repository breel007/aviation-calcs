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
console.log("Brayton cycle efficiency\n");

console.log("Case 1  r_p = 10, γ = 1.4");
var a = C.compute({ pressureRatio: 10, gamma: 1.4 });
nearly(a.efficiency, 1 - 1 / Math.pow(10, 0.4 / 1.4), 1e-15, "η = 1 − 1/r_p^{(γ−1)/γ}");
nearly(a.efficiency, 0.4821, 0.0002, "hand check ≈ 48.21%");

console.log("\nCase 2  Temperatures recover the same efficiency");
var b = C.compute({ pressureRatio: 10, t1: 300, t3: 1400, tempUnit: "K" });
nearly(b.T2, 300 * Math.pow(10, 0.4 / 1.4), 1e-12, "T2 = T1 r_p^{(γ−1)/γ}");
nearly(b.efficiencyFromTemps, a.efficiency, 1e-12, "η from station temperatures matches");
isTrue(b.T3 > b.T2 && b.T4 > b.T1, "T3 > T2 and T4 > T1 on an ideal cycle");

console.log("\nCase 3  Invalid");
isTrue(C.compute({ pressureRatio: 1 }) === null, "r_p = 1 → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

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

console.log("Maneuvering speed vs weight\n");

console.log("Case 1  Cessna 172S-class: Va 105 kt at 2,550 lb, flown at 2,200 lb (hand-checked)");
var r = C.compute({ vaRef: 105, weightRef: 2550, weight: 2200 });
nearly(r.va, 105 * Math.sqrt(2200 / 2550), 1e-12, "Va = 105 √(2200/2550)");
nearly(r.va, 97.53, 0.02, "Va ≈ 97.5 kt (hand-checked)");
isTrue(r.lighterThanRef === true, "lighter than the reference weight");

console.log("\nCase 2  Va from Vs and n_lim = 3.8");
// Vs = 47 kt at 2,550, Va = 47√3.8 ≈ 91.6 kt at that weight
var s = C.compute({ vs: 47, nLim: 3.8, weightRef: 2550, weight: 2550 });
nearly(s.va, 47 * Math.sqrt(3.8), 1e-12, "Va = Vs √n_lim");
nearly(s.va, 91.62, 0.02, "47 kt × √3.8 ≈ 91.6 kt");

console.log("\nCase 3  Scale is an exact inverse");
var t = C.compute({ vaRef: r.va, weightRef: 2200, weight: 2550 });
nearly(t.va, 105, 1e-10, "scaling back to 2,550 lb recovers 105 kt");

console.log("\nCase 4  Invalid");
isTrue(C.compute({ vaRef: 100, weightRef: 0, weight: 2000 }) === null, "zero weight → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

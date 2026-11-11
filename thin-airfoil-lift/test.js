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
console.log("Thin-airfoil lift\n");

console.log("Case 1  Flat plate at 5°");
var a = C.compute({ alpha: 5, alphaL0: 0, angleUnit: "deg" });
nearly(a.cl, 2 * Math.PI * 5 * Math.PI / 180, 1e-12, "cl = 2π α (α in radians)");
nearly(a.cl, 0.5483, 0.0001, "hand check 2π × 5π/180 ≈ 0.5483");
nearly(a.a0PerDeg, 2 * Math.PI * Math.PI / 180, 1e-15, "slope ≈ 0.1097 /deg");

console.log("\nCase 2  Cambered: α_L0 = −2°, α = 4°");
var b = C.compute({ alpha: 4, alphaL0: -2, angleUnit: "deg" });
nearly(b.cl, 2 * Math.PI * 6 * Math.PI / 180, 1e-12, "cl uses (α − α_L0) = 6°");

console.log("\nCase 3  Dimensional lift");
var c = C.compute({ alpha: 5, area: 1, speed: 0, speedUnit: "mps" });
nearly(c.liftN, 0, 1e-12, "zero speed → zero lift");

console.log("\nCase 4  Invalid");
isTrue(C.compute({ alpha: 5, a0: 0 }) === null, "zero slope → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

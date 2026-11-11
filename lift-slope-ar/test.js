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
console.log("Aspect-ratio lift-slope (Prandtl / Helmbold)\n");

console.log("Case 1  Thin airfoil, AR = 6, e = 1");
var a = C.compute({ aspectRatio: 6, a0: 2 * Math.PI, oswald: 1 });
var a0 = 2 * Math.PI;
nearly(a.prandtlPerRad, a0 / (1 + a0 / (Math.PI * 6)), 1e-12, "Prandtl a = a0/(1+a0/(π AR))");
var x = a0 / (Math.PI * 6);
nearly(a.helmboldPerRad, a0 / (Math.sqrt(1 + x * x) + x), 1e-12, "Helmbold formula");
// Hand check Prandtl: a0=6.2832, a0/(πAR)=0.3333, a=6.2832/1.3333=4.7124 /rad
nearly(a.prandtlPerRad, 4.7124, 0.0002, "hand check Prandtl ≈ 4.712 /rad");
isTrue(a.helmboldPerRad < a.prandtlPerRad, "Helmbold is a little below Prandtl at AR 6");

console.log("\nCase 2  Large AR approaches a0");
var b = C.compute({ aspectRatio: 1e5 });
nearly(b.prandtlPerRad / a0, 1, 2e-4, "Prandtl / a0 → 1 at AR = 10⁵");
nearly(b.helmboldPerRad / a0, 1, 2e-4, "Helmbold / a0 → 1 at AR = 10⁵");

console.log("\nCase 3  Invalid");
isTrue(C.compute({ aspectRatio: 0 }) === null, "AR 0 → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

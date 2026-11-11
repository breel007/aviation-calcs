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
console.log("Drag polar and L/D max\n");

console.log("Case 1  CD0 = 0.02, e = 0.8, AR = 8");
var r = C.compute({ CD0: 0.02, e: 0.8, AR: 8, CL: Math.sqrt(0.02 / (1 / (Math.PI * 0.8 * 8))) });
var k = 1 / (Math.PI * 0.8 * 8);
nearly(r.k, k, 1e-15, "k = 1/(π e AR)");
nearly(r.k, 0.049735921, 1e-8, "hand check k ≈ 0.049736");
nearly(r.CL_LDmax, Math.sqrt(0.02 / k), 1e-12, "CL* = √(CD0/k)");
nearly(r.CD_LDmax, 0.04, 1e-12, "CD* = 2 CD0 = 0.04");
nearly(r.LDmax, 1 / (2 * Math.sqrt(0.02 * k)), 1e-12, "(L/D)max = 1/(2√(CD0 k))");
nearly(r.LDmax, r.CL_LDmax / r.CD_LDmax, 1e-12, "(L/D)max also equals CL*/CD*");
nearly(r.LDmax, 15.8533, 0.001, "hand check (L/D)max ≈ 15.85");
nearly(r.point.LD, r.LDmax, 1e-12, "polar at CL* recovers (L/D)max");

console.log("\nCase 2  Prop endurance and jet-range CL");
nearly(r.CL_propEndurance, Math.sqrt(3) * r.CL_LDmax, 1e-12, "prop endurance CL = √3 CL*");
nearly(r.CL_jetRange, r.CL_LDmax / Math.sqrt(3), 1e-12, "jet range CL = CL*/√3");
isTrue(r.LD_propEndurance < r.LDmax && r.LD_jetRange < r.LDmax, "those points have a lower L/D than max");

console.log("\nCase 3  Direct k, and invalid");
var s = C.compute({ CD0: 0.025, k: 0.05, CL: 0.5 });
nearly(s.point.CD, 0.025 + 0.05 * 0.25, 1e-12, "CD = 0.025 + 0.05×0.25 = 0.0375");
nearly(s.point.LD, 0.5 / 0.0375, 1e-12, "L/D = 13.333");
isTrue(C.compute({ CD0: 0, e: 0.8, AR: 8 }) === null, "zero CD0 → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

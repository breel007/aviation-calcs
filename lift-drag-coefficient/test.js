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

console.log("Lift and drag coefficients\n");

console.log("Case 1  Level flight, 1,000 kg, 50 m/s, S = 10 m², sea-level density (hand-checked)");
var r = C.compute({
  weight: 1000, weightUnit: "kg",
  area: 10, areaUnit: "m2",
  velocity: 50, velocityUnit: "m/s",
  rho: 1.225,
  loadFactor: 1
});
var W = 1000 * 9.80665;
var q = 0.5 * 1.225 * 50 * 50; // 1531.25 Pa
nearly(r.dynamicPressurePa, q, 1e-9, "q = 1531.25 Pa");
nearly(r.CL, W / (q * 10), 1e-12, "CL = W/(qS)");
nearly(r.CL, 0.64044, 2e-5, "CL ≈ 0.640 (hand-checked)");
nearly(r.liftN, W, 1e-9, "L = W in level flight");

console.log("\nCase 2  Known L and D → coefficients and L/D");
var d = C.compute({
  lift: 9806.65, liftUnit: "N",
  drag: 9806.65 / 12, dragUnit: "N",
  area: 10, velocity: 50, rho: 1.225
});
nearly(d.liftToDrag, 12, 1e-9, "L/D = 12");
nearly(d.CD, d.CL / 12, 1e-12, "CD = CL / (L/D)");

console.log("\nCase 3  Force from coefficients");
var f = C.compute({ CL: 0.5, CD: 0.03, area: 16, areaUnit: "m2", velocity: 80, rho: 1.225 });
nearly(f.liftN, 0.5 * 0.5 * 1.225 * 80 * 80 * 16, 1e-6, "L = CL q S");
nearly(f.liftToDrag, 0.5 / 0.03, 1e-12, "L/D = 16.667");

console.log("\nCase 4  Invalid");
isTrue(C.compute({ area: 0, velocity: 50, rho: 1.225, CL: 0.5 }) === null, "zero area → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

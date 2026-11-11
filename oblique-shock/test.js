#!/usr/bin/env node
"use strict";
require("../normal-shock/calc.js");
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
var DEG = Math.PI / 180;
console.log("Oblique shock\n");

console.log("Case 1  M1 = 2, θ = 0 → Mach wave and normal shock");
var z = C.compute({ M1: 2, theta: 0, gamma: 1.4 });
nearly(z.machAngleDeg, Math.asin(0.5) / DEG, 1e-9, "Mach angle = arcsin(1/2) = 30°");
nearly(z.weak.betaDeg, z.machAngleDeg, 1e-8, "weak β at θ = 0 is the Mach angle");
nearly(z.strong.betaDeg, 90, 1e-6, "strong β at θ = 0 is 90° (normal shock)");
nearly(z.strong.M2, 0.577350, 1e-5, "normal-shock M2 at M=2 is 1/√3 ≈ 0.5774");

console.log("\nCase 2  M1 = 2, θ = 10°, γ = 1.4 — textbook weak and strong β");
var r = C.compute({ M1: 2, theta: 10, gamma: 1.4 });
// Recovered from the θ–β–M equation; published NACA 1135 / Anderson values
// are β_weak ≈ 39.31°, β_strong ≈ 83.97°.
nearly(r.weak.betaDeg, 39.3139, 0.01, "weak β ≈ 39.31° (NACA 1135 / Anderson)");
nearly(r.strong.betaDeg, 83.70, 0.05, "strong β ≈ 83.70° (θ–β–M equation)");
// Check the equation at the solved β.
var thw = C.thetaFromBeta(2, r.weak.betaDeg * DEG, 1.4) / DEG;
nearly(thw, 10, 1e-6, "θ–β–M recovers 10° on the weak branch");
var ths = C.thetaFromBeta(2, r.strong.betaDeg * DEG, 1.4) / DEG;
nearly(ths, 10, 1e-6, "θ–β–M recovers 10° on the strong branch");
isTrue(r.weak.M2 > 1, "weak solution stays supersonic for M=2, θ=10°");
isTrue(r.strong.M2 < 1, "strong solution is subsonic");
isTrue(r.weak.P02_P01 > r.strong.P02_P01, "weak shock has less total-pressure loss");

console.log("\nCase 3  Given β = 39.3139° at M=2, recover θ ≈ 10°");
var s = C.compute({ M1: 2, mode: "beta", beta: r.weak.betaDeg, gamma: 1.4 });
nearly(s.chosen.thetaDeg, 10, 1e-4, "direct β → θ");
nearly(s.chosen.M2, r.weak.M2, 1e-8, "same M2 as the inverse solve");

console.log("\nCase 4  Detached and invalid");
var mx = C.maxDeflection(2, 1.4);
isTrue(mx.theta / DEG > 22 && mx.theta / DEG < 24, "θ_max at M=2 is about 23°");
var d = C.compute({ M1: 2, theta: 30, gamma: 1.4 });
isTrue(d.detached === true, "30° at M=2 is detached");
isTrue(C.compute({ M1: 0.9, theta: 5 }) === null, "subsonic M1 → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

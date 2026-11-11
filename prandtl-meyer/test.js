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
var DEG = Math.PI / 180;
console.log("Prandtl–Meyer expansion\n");

console.log("Case 1  ν(1) = 0, ν_max (γ = 1.4) = 130.45°");
nearly(C.nu(1, 1.4), 0, 0, "ν(1) = 0");
nearly(C.nuMax(1.4) / DEG, 90 * (Math.sqrt(2.4 / 0.4) - 1), 1e-12, "ν_max = 90°(√((γ+1)/(γ−1)) − 1)");
nearly(C.nuMax(1.4) / DEG, 130.4541, 0.001, "hand check 130.45°");

console.log("\nCase 2  ν(2) for γ = 1.4 is 26.3798° (NACA 1135 / standard tables)");
var n2 = C.nu(2, 1.4) / DEG;
nearly(n2, 26.3798, 0.001, "ν(2) ≈ 26.380°");
nearly(C.machFromNu(C.nu(2, 1.4), 1.4), 2, 1e-9, "inverting ν(2) recovers M = 2");

console.log("\nCase 3  Expand 10° from M = 2");
var r = C.compute({ mode: "expand", M1: 2, theta: 10, gamma: 1.4 });
nearly(r.nu1Deg, n2, 1e-9, "upstream ν");
nearly(r.nu2Deg, n2 + 10, 1e-9, "ν2 = ν1 + 10°");
nearly(C.nu(r.M2, 1.4) / DEG, r.nu2Deg, 1e-8, "M2 satisfies ν(M2) = ν2");
isTrue(r.M2 > 2 && r.M2 < 2.45, "M2 is a little above 2 (about 2.38)");
nearly(r.M2, 2.385, 0.01, "M2 ≈ 2.385");
isTrue(r.P2_P1 < 1 && r.T2_T1 < 1, "expansion drops static P and T");
nearly(r.P02_P01, 1, 0, "isentropic: total pressure is constant");

console.log("\nCase 4  Over-expansion past ν_max, and invalid");
var v = C.compute({ M1: 2, theta: 120, gamma: 1.4 });
isTrue(v.vacuum === true, "turning past ν_max is flagged");
isTrue(C.compute({ M1: 0.8, theta: 5 }) === null, "subsonic M1 → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

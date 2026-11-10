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

console.log("Normal shock — NACA Report 1135, γ = 1.4\n");

console.log("Case 1  M1 = 2 (classic NACA 1135 values, exact for γ = 1.4)");
var r = C.compute({ mode: "M1", value: 2, gamma: 1.4 });
nearly(r.M2, Math.sqrt(1 / 3), 1e-12, "M2 = 1/√3 = 0.577350");
nearly(r.P2_P1, 4.5, 1e-12, "P2/P1 = 4.5000");
nearly(r.rho2_rho1, 2.6666666667, 1e-9, "ρ2/ρ1 = 8/3 = 2.66667");
nearly(r.T2_T1, 1.6875, 1e-12, "T2/T1 = 1.6875");
nearly(r.T02_T01, 1, 0, "T0 is continuous across the shock");
// P02/P01 at M=2 is a standard table value 0.72087
nearly(r.P02_P01, 0.72087, 2e-5, "P02/P01 ≈ 0.72087 (NACA 1135)");
nearly(r.P02_P01, r.P02_P01_check, 1e-10, "two total-pressure formulas agree");

console.log("\nCase 2  M1 = 1, vanishing shock");
var s = C.relations(1, 1.4);
nearly(s.M2, 1, 1e-12, "M2 = 1");
nearly(s.P2_P1, 1, 1e-12, "P2/P1 = 1");
nearly(s.T2_T1, 1, 1e-12, "T2/T1 = 1");
nearly(s.P02_P01, 1, 1e-12, "P02/P01 = 1");

console.log("\nCase 3  M1 = 3 (NACA 1135)");
var m3 = C.compute({ mode: "M1", value: 3 });
nearly(m3.P2_P1, 10.33333, 5e-5, "P2/P1 = 10.333 (1 + (7/6)*8)");
nearly(m3.rho2_rho1, 3.85714, 5e-5, "ρ2/ρ1 = 3.85714");
nearly(m3.M2, 0.47519, 2e-5, "M2 ≈ 0.47519 (NACA 1135)");
nearly(m3.P02_P01, 0.32834, 2e-5, "P02/P01 ≈ 0.32834 (NACA 1135)");

console.log("\nCase 4  Invert P2/P1 and ρ2/ρ1");
var invP = C.compute({ mode: "P2_P1", value: 4.5 });
nearly(invP.M1, 2, 1e-10, "P2/P1 = 4.5 → M1 = 2");
var invR = C.compute({ mode: "rho2_rho1", value: 8 / 3 });
nearly(invR.M1, 2, 1e-10, "ρ2/ρ1 = 8/3 → M1 = 2");

console.log("\nCase 5  Invalid");
isTrue(C.compute({ mode: "M1", value: 0.8 }) === null, "subsonic M1 → null");
isTrue(C.compute({ mode: "P2_P1", value: 0.5 }) === null, "P2/P1 < 1 → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

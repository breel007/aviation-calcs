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
console.log("Rayleigh flow\n");

console.log("Case 1  Sonic reference, M = 1, γ = 1.4");
var s = C.compute({ mach: 1 });
nearly(s.P_Pstar, 1, 1e-12, "P/P* = 1");
nearly(s.T_Tstar, 1, 1e-12, "T/T* = 1");
nearly(s.T0_T0star, 1, 1e-12, "T0/T0* = 1");
nearly(s.P0_P0star, 1, 1e-12, "P0/P0* = 1");

console.log("\nCase 2  M = 0.50, γ = 1.4");
var a = C.compute({ mach: 0.5, gamma: 1.4 });
nearly(a.P_Pstar, 2.4 / 1.35, 1e-12, "P/P* = (1+γ)/(1+γM²) = 1.777…");
nearly(a.T_Tstar, Math.pow(0.5 * 2.4 / 1.35, 2), 1e-12, "T/T* = [M(1+γ)/(1+γM²)]²");
nearly(a.T_Tstar, 0.7901, 0.0002, "hand check T/T* ≈ 0.790");

console.log("\nCase 3  Invalid");
isTrue(C.compute({ mach: 0 }) === null, "M = 0 → null");

console.log("\nWorked example (as published on the page)");
var we = C.compute({ mach: 0.5, gamma: 1.4 });
nearly(we.P_Pstar, 1.777778, 0.001, "worked example: Rayleigh M=0.5, P/P* ≈ 1.778");
nearly(we.T_Tstar, 0.790123, 0.001, "T/T* ≈ 0.790");
nearly(we.rho_rhostar, 2.25, 0.001, "ρ/ρ* = 2.250");
nearly(we.P0_P0star, 1.114053, 0.001, "P0/P0* ≈ 1.114");
nearly(we.T0_T0star, 0.691358, 0.001, "T0/T0* ≈ 0.691");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

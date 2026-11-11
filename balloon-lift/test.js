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
console.log("Hot-air balloon lift\n");

console.log("Case 1  2,800 m³, 15 °C air, 100 °C envelope, ISA sea-level pressure, no empty weight");
var a = C.compute({ volume: 2800, volUnit: "m3", tAir: 15, tHot: 100, tempUnit: "C", pressure: 101325, pressureUnit: "pa" });
var rho = 101325 / (C.R_SPEC * 288.15);
nearly(a.rhoAir, rho, 1e-12, "ρ = p/(R T)");
nearly(a.rhoAir, 1.225, 0.001, "ISA sea-level density ≈ 1.225 kg/m³");
nearly(a.rhoHot, rho * 288.15 / 373.15, 1e-12, "ρ_hot = ρ T_air/T_hot");
nearly(a.liftKg, (rho - a.rhoHot) * 2800, 1e-9, "lift mass = Δρ V");
// Hand check: 1.225 * (1 - 288.15/373.15) * 2800 ≈ 780.8 kg
nearly(a.liftKg, 780.8, 1.0, "hand check ≈ 781 kg");

console.log("\nCase 2  Empty weight 400 kg leaves useful lift");
var b = C.compute({ volume: 2800, tAir: 15, tHot: 100, tempUnit: "C", emptyWeight: 400, weightUnit: "kg" });
nearly(b.usefulKg, b.liftKg - 400, 1e-12, "useful = gross − empty");

console.log("\nCase 3  Invalid");
isTrue(C.compute({ volume: 2800, tAir: 15, tHot: 15, tempUnit: "C" }) === null, "T_hot ≤ T_air → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

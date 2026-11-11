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
console.log("Hover power / disk loading\n");

console.log("Case 1  20 kN on a 10 m radius disk, FM 0.7, sea level");
var A = Math.PI * 100;
var a = C.compute({ thrust: 20000, diameter: 20, fm: 0.7, altitude: 0, altUnit: "m" });
nearly(a.areaM2, A, 1e-12, "A = π R²");
nearly(a.diskLoadingPa, 20000 / A, 1e-12, "DL = T/A");
nearly(a.inducedMps, Math.sqrt(a.diskLoadingPa / (2 * a.density)), 1e-12, "v_i = √(DL/2ρ)");
nearly(a.idealPowerW, 20000 * a.inducedMps, 1e-8, "P_i = T v_i");
nearly(a.shaftPowerW, a.idealPowerW / 0.7, 1e-8, "P = P_i / FM");

console.log("\nCase 2  Density inversion at the tropopause and a ceiling");
nearly(C.isaDensity(0), C.RHO0, 1e-7, "ISA sea-level density matches 1.225 to the usual rounding");
nearly(C.altitudeFromDensity(C.RHO0), 0, 1e-9, "invert sea-level density");
nearly(C.altitudeFromDensity(C.isaDensity(11000)), 11000, 1e-3, "invert tropopause density");
var pSL = a.shaftPowerW;
var ceil = C.compute({ thrust: 20000, diameter: 20, fm: 0.7, powerAvail: pSL, powerUnit: "w" });
nearly(ceil.hoverCeilingFt, 0, 1, "available power equal to SL hover power → ceiling ≈ 0");
var more = C.compute({ thrust: 20000, diameter: 20, fm: 0.7, powerAvail: pSL * 1.5, powerUnit: "w" });
isTrue(more.hoverCeilingFt > 1000, "50% more power gives a positive hover ceiling");

console.log("\nCase 3  Invalid");
isTrue(C.compute({ thrust: 0, diameter: 20 }) === null, "zero thrust → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

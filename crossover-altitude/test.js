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
console.log("Vmo/Mmo crossover altitude\n");

console.log("Case 1  Identity: CAS(Mmo, p) recovers Vmo");
var a = C.compute({ vmo: 350, vmoUnit: "kt", mmo: 0.80 });
isTrue(a != null, "350 KCAS / M 0.80 has a crossover");
nearly(a.casAtCrossoverMps, a.vmoMps, 1e-8, "CAS from Mmo at the solved p equals Vmo");
nearly(C.machFromCasPa(a.vmoMps, a.ambientPa), 0.80, 1e-10, "Mach from Vmo at that p is Mmo");
// Pressure-altitude inversion consistency
nearly(C.isaPressurePa(a.crossoverM), a.ambientPa, 1e-6, "ISA p(h) recovers the solved pressure");

console.log("\nCase 2  Hand-check pressure and a typical airliner-ish pair");
// qc/p0 = (1+0.2 (V/a0)^2)^3.5 - 1, V = 350 kt = 180.111 m/s, a0=340.294
var V = 350 * 1852 / 3600;
var qc = C.P0 * (Math.pow(1 + 0.2 * Math.pow(V / C.A0, 2), 3.5) - 1);
var p = qc / (Math.pow(1 + 0.2 * 0.80 * 0.80, 3.5) - 1);
nearly(a.ambientPa, p, 1e-6, "p = q_c / ((1+0.2 M²)^3.5 − 1)");
// Order of magnitude: crossover for 350/0.80 is around mid-20s of thousands of feet
isTrue(a.crossoverFt > 20000 && a.crossoverFt < 35000, "350 kt / M 0.80 crossover is in the mid 20s–low 30s of thousands of feet (" + a.crossoverFt.toFixed(0) + " ft)");

console.log("\nCase 3  Invalid");
isTrue(C.compute({ vmo: 350, mmo: 1.2 }) === null, "supersonic Mmo is outside the subsonic pitot formula");
isTrue(C.compute({ vmo: 0, mmo: 0.8 }) === null, "zero Vmo → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

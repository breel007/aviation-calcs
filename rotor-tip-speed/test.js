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
console.log("Rotor tip speed / advance ratio\n");

console.log("Case 1  400 rpm, 5.5 m radius, 120 kt, 15 °C");
var a = C.compute({ rpm: 400, radius: 5.5, speed: 120, speedUnit: "kt", oat: 15, tempUnit: "C" });
var omega = 400 * 2 * Math.PI / 60;
var tip = omega * 5.5;
nearly(a.omegaRadS, omega, 1e-12, "Ω from rpm");
nearly(a.tipMps, tip, 1e-12, "ΩR");
nearly(a.advanceRatio, (120 * 1852 / 3600) / tip, 1e-12, "μ = V / ΩR");
nearly(a.speedOfSoundMps, C.A0, 1e-9, "a at 15 °C is A0");
nearly(a.tipMach, tip / C.A0, 1e-12, "M_t = ΩR / a");
nearly(a.helicalTipMach, Math.sqrt(tip * tip + Math.pow(120 * 1852 / 3600, 2)) / C.A0, 1e-12, "helical tip Mach");
// Hand check: 400 rpm = 41.888 rad/s, ΩR = 230.38 m/s, M ≈ 0.677
nearly(a.tipMps, 230.38, 0.02, "hand check ΩR ≈ 230.38 m/s");
nearly(a.tipMach, 0.677, 0.002, "hand check M_t ≈ 0.677");

console.log("\nCase 2  Invalid");
isTrue(C.compute({ rpm: 0, radius: 5.5 }) === null, "zero rpm → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

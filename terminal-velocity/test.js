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
console.log("Terminal velocity / ballistic re-entry\n");

console.log("Case 1  Sea-level terminal velocity, 80 kg, Cd 1, A 0.5 m²");
var a = C.compute({ mass: 80, cd: 1, area: 0.5 });
nearly(a.ballisticCoefficient, 160, 1e-12, "β = m/(Cd A) = 160 kg/m²");
nearly(a.density, 1.225, 1e-12, "default ρ is USSA sea-level 1.225 kg/m³");
nearly(a.terminalMps, Math.sqrt(2 * 160 * C.G0 / 1.225), 1e-12, "vt = √(2βg/ρ)");
nearly(a.terminalMps, 50.61, 0.02, "hand check ≈ 50.61 m/s");

console.log("\nCase 2  ISA density at 11 km geometric, same body");
var rho11 = C.isaDensity(11000, true);
isTrue(rho11 > 0.3 && rho11 < 0.4, "11 km density is about 0.36 kg/m³");
var b = C.compute({ mass: 80, cd: 1, area: 0.5, altitude: 11, altUnit: "km" });
nearly(b.density, rho11, 1e-12, "compute() uses the same ISA density");
isTrue(b.terminalMps > a.terminalMps, "thinner air → higher terminal speed");

console.log("\nCase 3  Allen–Eggers pulse, 7.8 km/s at 5°, β = 160");
var c = C.compute({ mass: 80, cd: 1, area: 0.5, entrySpeed: 7.8, entrySpeedUnit: "km/s", gamma: 5 });
var ve = 7800, sinG = Math.sin(5 * Math.PI / 180);
nearly(c.entry.aMaxMps2, (ve * ve * sinG) / (2 * Math.E * C.H_SCALE), 1e-9, "a_max = V_E² sinγ / (2 e H)");
nearly(c.entry.aMaxG, 13.89, 0.05, "hand check ≈ 13.9 g");
nearly(c.entry.speedAtPeakMps, ve / Math.sqrt(Math.E), 1e-9, "V at peak = V_E / √e");
nearly(c.entry.rhoPeak, 160 * sinG / C.H_SCALE, 1e-12, "ρ_peak = β sinγ / H");
isTrue(c.entry.belowSurface === false, "peak is above the surface for this β and γ");
isTrue(c.entry.altitudePeakM > 30000 && c.entry.altitudePeakM < 50000, "peak altitude in the mid-stratosphere / lower mesosphere for this example");

console.log("\nCase 4  Invalid / edge");
isTrue(C.compute({ mass: 0, cd: 1, area: 1 }) === null, "zero mass → null");
isTrue(C.compute({ mass: 80, cd: 1, area: 0.5, entrySpeed: 7.8, gamma: 0 }) === null, "γ = 0 → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

#!/usr/bin/env node
"use strict";
// Load the standard atmosphere first so ISA lookups work under Node.
require("../standard-atmosphere/calc.js");
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

console.log("Reynolds number\n");

console.log("Case 1  Sea-level ISA, 50 m/s, 1 m chord (hand-checked)");
// μ0 = 1.458e-6 * 288.15^1.5 / (288.15+110.4) = 1.7894e-5
// ρ0 = 1.225, Re = 1.225 * 50 * 1 / μ0
var sl = C.compute({ source: "isa", altitudeM: 0, velocity: 50, velocityUnit: "m/s", length: 1, lengthUnit: "m" });
var mu0 = C.sutherlandMu(288.15);
nearly(sl.dynamicViscosity, mu0, 1e-12, "ISA μ matches Sutherland at 288.15 K");
nearly(sl.reynolds, sl.densityKgM3 * 50 * 1 / sl.dynamicViscosity, 1e-6, "Re = ρVL/μ at sea level, 50 m/s, 1 m");
// ~3.423e6
nearly(sl.reynolds, 3.4234e6, 2e3, "Re ≈ 3.423×10⁶ (hand-checked)");

console.log("\nCase 2  Direct ν and unit conversions");
var byNu = C.compute({ source: "nu", nu: 1.4607e-5, velocity: 50, length: 1 });
nearly(byNu.reynolds, 50 / 1.4607e-5, 1, "Re = VL/ν");
var kt = C.compute({ source: "isa", altitudeM: 0, velocity: 100, velocityUnit: "kt", length: 5, lengthUnit: "ft" });
var V = 100 * 1852 / 3600, L = 5 * 0.3048;
nearly(kt.reynolds, 1.225 * V * L / mu0, 50, "100 kt, 5 ft chord at SL ISA");

console.log("\nCase 3  Pressure and temperature (equation of state + Sutherland)");
var pt = C.compute({ source: "pressure-temp", pressurePa: 101325, tempK: 288.15, velocity: 50, length: 1 });
nearly(pt.reynolds, sl.reynolds, sl.reynolds * 1e-4 + 50, "P,T path matches ISA sea level");

console.log("\nCase 4  Tropopause 11 km, same V and L — Re falls with density");
var trop = C.compute({ source: "isa", altitudeM: 11000, velocity: 50, length: 1 });
isTrue(trop.reynolds < sl.reynolds, "Re at 11 km is lower than at sea level");
nearly(trop.reynolds, trop.densityKgM3 * 50 * 1 / trop.dynamicViscosity, 1, "Re identity at 11 km");

console.log("\nCase 5  Invalid");
isTrue(C.compute({ source: "nu", nu: 0, velocity: 50, length: 1 }) === null, "ν = 0 → null");
isTrue(C.compute({ source: "isa", altitudeM: 200000, velocity: 50, length: 1 }).error != null, "too high → error");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

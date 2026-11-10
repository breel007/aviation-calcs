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

console.log("Fuel weight\n");

console.log("Case 1  Planning densities (FAA / PHAK figures)");
var av = C.compute({ fuelType: "100LL", direction: "volume-to-mass", volume: 50, volumeUnit: "us-gal" });
nearly(av.pounds, 300, 1e-12, "50 US gal of 100LL = 300 lb at 6.0 lb/gal");
var jet = C.compute({ fuelType: "JET-A", direction: "volume-to-mass", volume: 50, volumeUnit: "us-gal" });
nearly(jet.pounds, 335, 1e-12, "50 US gal of Jet-A = 335 lb at 6.7 lb/gal");
nearly(jet.kilograms, 335 * C.LB_TO_KG, 1e-9, "lb → kg");

console.log("\nCase 2  Litres and the inverse (mass → volume)");
var lit = C.compute({ fuelType: "JET-A", volume: 100, volumeUnit: "L" });
nearly(lit.usGallons, 100 / C.US_GAL_TO_L, 1e-12, "100 L → US gallons");
nearly(lit.pounds, (100 / C.US_GAL_TO_L) * 6.7, 1e-9, "100 L of Jet-A at 6.7 lb/gal");
var inv = C.compute({ fuelType: "100LL", direction: "mass-to-volume", mass: 300, massUnit: "lb" });
nearly(inv.usGallons, 50, 1e-12, "300 lb of 100LL → 50 US gal");

console.log("\nCase 3  Jet-B planning figure 6.4 lb/gal");
var jb = C.compute({ fuelType: "JET-B", volume: 10 });
nearly(jb.pounds, 64, 1e-12, "10 gal Jet-B = 64 lb");

console.log("\nCase 4  Temperature correction lowers density when warm");
var warm = C.compute({ fuelType: "JET-A", volume: 100, useTemperature: true, tempC: 35 });
var cold = C.compute({ fuelType: "JET-A", volume: 100, useTemperature: true, tempC: 0 });
isTrue(warm.pounds < cold.pounds, "warmer fuel is lighter for the same volume");
isTrue(Math.abs(warm.usedLbPerUsGal - 6.7) > 0.05, "temp-corrected density is not the planning 6.7");

console.log("\nCase 5  Invalid");
isTrue(C.compute({ fuelType: "custom", customLbGal: 0, volume: 10 }) === null, "zero custom density → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

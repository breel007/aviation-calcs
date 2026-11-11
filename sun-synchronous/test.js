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
console.log("Sun-synchronous inclination\n");

console.log("Case 1  800 km circular, default J2 and solar rate");
var a = C.compute({ altitude: 800, altUnit: "km", eccentricity: 0 });
var sma = C.REQ + 800000;
nearly(a.smaM, sma, 1e-9, "a = R_eq + h");
isTrue(a.inclinationDeg > 90 && a.inclinationDeg < 110, "SSO is retrograde, a little over 90°");
nearly(a.inclinationDeg, 98.6, 0.3, "hand check ≈ 98.6° at 800 km");
nearly(a.precessionDegPerDay, C.DEG_PER_DAY, 1e-12, "default rate is 360° / 365.24219 d");
isTrue(a.cosInclination < 0, "cos i is negative (retrograde)");

console.log("\nCase 2  Identity: plug i back into the J2 formula");
var n = Math.sqrt(C.MU / (sma * sma * sma));
var factor = (-1.5) * n * C.J2 * Math.pow(C.REQ / sma, 2);
var rate = factor * Math.cos(a.inclinationRad);
nearly(rate * 180 / Math.PI * 86400, C.DEG_PER_DAY, 1e-10, "Ω̇(i) recovers the mean-solar rate");

console.log("\nCase 3  Invalid");
isTrue(C.compute({ altitude: -10, altUnit: "km" }) === null, "negative altitude → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

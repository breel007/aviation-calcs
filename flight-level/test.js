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
console.log("Flight level / transition\n");

console.log("Case 1  18,000 ft PA is FL180");
var a = C.compute({ pressureAltitude: 18000 });
nearly(a.flightLevel, 180, 1e-12, "FL = PA/100");
isTrue(a.flightLevelLabel === "FL180", "label FL180");
isTrue(a.atOrAboveTransitionLevel === true, "at US TL (FL180)");
isTrue(a.belowTransitionAltitude === false, "not below US TA");

console.log("\nCase 2  From a flight level, and a European-style layer");
var b = C.compute({ mode: "fl", flightLevel: 60, transitionAltitude: 5000, transitionLevel: 70 });
nearly(b.pressureAltitudeFt, 6000, 1e-12, "FL60 = 6,000 ft PA");
isTrue(b.inTransitionLayer === true, "FL60 is in a 5,000 ft–FL70 layer");
isTrue(C.compute({ mode: "fl", flightLevel: 18000 }).flightLevel === 180, "18000-style slip is taken as feet");

console.log("\nCase 3  QNH offset 1,000 ft per inHg");
var c = C.compute({ pressureAltitude: 5000, qnh: 29.42, qnhUnit: "inhg" });
nearly(c.qnhOffsetFt, 1000 * (C.STD_INHG - 29.42), 1e-9, "offset = 1000 × (29.92 − QNH)");
nearly(c.qnhAltitudeFt, 5000 - c.qnhOffsetFt, 1e-9, "QNH altitude ≈ PA − offset");

console.log("\nCase 4  Invalid");
isTrue(C.compute({ pressureAltitude: 10000, transitionAltitude: 18000, transitionLevel: 150 }) === null,
  "TL below TA is rejected");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

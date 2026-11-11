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
console.log("True / magnetic / compass heading\n");

console.log("Case 1  True 360, variation 15°E → magnetic 345");
var a = C.compute({ from: "true", heading: 360, variation: 15, variationDir: "E" });
nearly(a.trueHeading, 0, 1e-12, "360 wraps to 000° true");
nearly(a.magneticHeading, 345, 1e-12, "east is least: 360 − 15 = 345");

console.log("\nCase 2  True 090, variation 10°W → magnetic 100");
var b = C.compute({ from: "true", heading: 90, variation: 10, variationDir: "W" });
nearly(b.magneticHeading, 100, 1e-12, "west is best: 090 + 10 = 100");
nearly(b.variationEast, -10, 1e-12, "west variation stored as −10");

console.log("\nCase 3  Magnetic 345, 15°E, back to true 000, plus 4°E deviation");
var c = C.compute({ from: "magnetic", heading: 345, variation: 15, variationDir: "E", deviation: 4, deviationDir: "E" });
nearly(c.trueHeading, 0, 1e-12, "345 + 15 = 360 → 000 true");
nearly(c.compassHeading, 341, 1e-12, "compass = magnetic − 4°E = 341");

console.log("\nCase 4  Compass 341, invert to magnetic 345 and true 000");
var d = C.compute({ from: "compass", heading: 341, variation: 15, variationDir: "E", deviation: 4, deviationDir: "E" });
nearly(d.magneticHeading, 345, 1e-12, "magnetic = compass + 4°E");
nearly(d.trueHeading, 0, 1e-12, "true = magnetic + 15°E");

console.log("\nCase 5  Invalid");
isTrue(C.compute({ heading: -1 }) === null, "negative heading → null");
isTrue(C.compute({ heading: 361 }) === null, "361° → null");
nearly(C.wrap360(-15), 345, 1e-12, "wrap −15 → 345");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

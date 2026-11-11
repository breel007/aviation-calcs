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
console.log("Thunderstorm flash-to-bang distance\n");

console.log("Case 1  5 seconds at 15 °C");
var a = C.compute({ seconds: 5, temperature: 15, tempUnit: "C" });
var aSound = C.A0 * Math.sqrt((15 + 273.15) / C.T0);
nearly(a.speedOfSoundMps, aSound, 1e-12, "a = a0 √(T/T0)");
nearly(a.distanceM, aSound * 5, 1e-12, "d = a t");
nearly(a.distanceSm, aSound * 5 / 1609.344, 1e-12, "statute miles");
nearly(a.secondsPerSm, 1609.344 / aSound, 1e-12, "seconds per SM");
nearly(a.secondsPerSm, 4.73, 0.05, "about 4.7 s per SM at 15 °C");
nearly(a.rule5SecPerSm, 1, 1e-12, "5-second memory item = 1 SM");
isTrue(a.distanceSm > 1, "acoustic distance at 15 °C is a little more than the 5 s/SM rule");

console.log("\nCase 2  Default temperature is 15 °C");
var b = C.compute({ seconds: 5 });
nearly(b.distanceM, a.distanceM, 1e-12, "default T is 15 °C");

console.log("\nCase 3  Invalid");
isTrue(C.compute({ seconds: -1 }) === null, "negative time → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

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
console.log("Hydroplaning speed\n");
console.log("Case 1  100 psi → 90 kt rotating (exact 9√100)");
var a = C.compute({ pressure: 100, pressureUnit: "psi" });
nearly(a.rotatingKt, 90, 1e-12, "9 × √100 = 90 kt");
nearly(a.lockedKt, 77, 1e-12, "7.7 × √100 = 77 kt");
nearly(a.rotatingMph, 90 * C.MPH_PER_KT, 1e-9, "90 kt in mph is 9√P × 1.15078");

console.log("\nCase 2  Typical light-airplane tire, 32 psi");
var b = C.compute({ pressure: 32, pressureUnit: "psi" });
nearly(b.rotatingKt, 9 * Math.sqrt(32), 1e-12, "32 psi rotating = 9√32 ≈ 50.91 kt");
nearly(b.rotatingKt, 50.911688, 1e-5, "hand check 9 × 5.656854 = 50.9117 kt");
nearly(b.lockedKt, 7.7 * Math.sqrt(32), 1e-12, "32 psi locked ≈ 43.56 kt");

console.log("\nCase 3  200 psi transport tire, entered in bar");
var bar = 200 / C.PSI_PER_BAR;
var c = C.compute({ pressure: bar, pressureUnit: "bar" });
nearly(c.pressurePsi, 200, 1e-9, "bar → 200 psi");
nearly(c.rotatingKt, 9 * Math.sqrt(200), 1e-9, "9√200 ≈ 127.28 kt");

console.log("\nCase 4  Invalid");
isTrue(C.compute({ pressure: 0 }) === null, "zero pressure → null");
isTrue(C.compute({ pressure: -10, pressureUnit: "psi" }) === null, "negative → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

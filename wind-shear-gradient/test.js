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
console.log("Wind shear / gradient\n");

console.log("Case 1  1/7-power law, 20 kt at 30 ft, wind at 1,000 ft");
var a = C.compute({ mode: "power", vref: 20, href: 30, height: 1000, alpha: 1/7 });
nearly(a.windKt, 20 * Math.pow(1000/30, 1/7), 1e-12, "V = 20 (1000/30)^(1/7)");
nearly(a.windKt, 33.01, 0.05, "hand check ≈ 33.0 kt");

console.log("\nCase 2  Default α is 1/7");
var b = C.compute({ vref: 20, href: 30, height: 1000 });
nearly(b.windKt, a.windKt, 1e-12, "omitting α uses 1/7");

console.log("\nCase 3  Linear 3 kt / 100 ft");
var c = C.compute({ mode: "linear", vref: 20, href: 1000, height: 2000, shearPer100: 3 });
nearly(c.windKt, 50, 1e-12, "20 + 3 × 10 = 50 kt");
nearly(c.shearKtPer100ft, 3, 1e-12, "reports the entered shear");

console.log("\nCase 4  Invalid");
isTrue(C.compute({ vref: 20, href: 0, height: 1000 }) === null, "zero reference height → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

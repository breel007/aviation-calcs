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

console.log("Stall speed vs weight and bank\n");

console.log("Case 1  Load factor identities (PHAK)");
nearly(C.loadFactorFromBank(0), 1, 1e-12, "n = 1 at 0°");
nearly(C.loadFactorFromBank(60), 2, 1e-12, "n = 2 at 60°");
nearly(C.loadFactorFromBank(45), Math.SQRT2, 1e-12, "n = √2 at 45°");
nearly(C.bankFromLoadFactor(2), 60, 1e-10, "60° from n = 2");

console.log("\nCase 2  Vs = 48 kt at 2,550 lb, flown at 2,200 lb in a 45° bank (hand-checked)");
var r = C.compute({ vsRef: 48, weightRef: 2550, weight: 2200, bankDeg: 45 });
var vsW = 48 * Math.sqrt(2200 / 2550);
var vs = vsW * Math.sqrt(Math.SQRT2);
nearly(r.vsWeightOnly, vsW, 1e-12, "weight-only Vs");
nearly(r.vs, vs, 1e-12, "Vs × √(W/Wref) × √n");
nearly(r.vs, 53.02, 0.02, "≈ 53.0 kt (hand-checked)");
nearly(r.loadFactor, Math.SQRT2, 1e-12, "n = √2");
nearly(r.table[4].vs, C.stallSpeed(48, 2200, 2550, 2), 1e-12, "60° table row uses n = 2");

console.log("\nCase 3  Accelerated stall from a load factor");
var a = C.compute({ vsRef: 50, weight: 2000, loadFactor: 2 });
nearly(a.vs, 50 * Math.sqrt(2), 1e-12, "Vs × √2 at n = 2, same weight");
nearly(a.bankDeg, 60, 1e-10, "implied bank for n = 2 in a level turn is 60°");

console.log("\nCase 4  Invalid");
isTrue(C.compute({ vsRef: 50, weight: 2000, bankDeg: 90 }) === null, "90° bank → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

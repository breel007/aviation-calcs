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
console.log("Fanno flow\n");

console.log("Case 1  Sonic reference, M = 1, γ = 1.4");
var s = C.compute({ mach: 1 });
nearly(s.T_Tstar, 1, 1e-12, "T/T* = 1");
nearly(s.P_Pstar, 1, 1e-12, "P/P* = 1");
nearly(s.P0_P0star, 1, 1e-12, "P0/P0* = 1");
nearly(s.fourFLStarOverD, 0, 1e-12, "4fL* / D = 0 at M = 1");

console.log("\nCase 2  M = 0.50, γ = 1.4, standard table");
var a = C.compute({ mach: 0.5, gamma: 1.4 });
nearly(a.fourFLStarOverD, 1.06906, 0.0001, "table 4fL* / D ≈ 1.0691");
nearly(a.T_Tstar, 2.4 / (2 + 0.4 * 0.25), 1e-12, "T/T* = (γ+1)/(2+(γ−1)M²)");
nearly(a.P_Pstar, (1 / 0.5) * Math.sqrt(2.4 / 2.1), 1e-12, "P/P* formula");

console.log("\nCase 3  Invalid");
isTrue(C.compute({ mach: 0 }) === null, "M = 0 → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

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
console.log("CG percent MAC\n");

console.log("Case 1  LEMAC 70, MAC 60, CG 85 → 25% MAC");
var r = C.compute({ mode: "from-cg", lemac: 70, mac: 60, cg: 85, fwdLimit: 16, aftLimit: 31 });
nearly(r.percentMac, 25, 1e-12, "(85 − 70)/60 × 100 = 25%");
nearly(r.temac, 130, 1e-12, "TEMAC = 70 + 60");
isTrue(r.withinLimits === true, "25% is inside 16–31%");

console.log("\nCase 2  Inverse: 25% MAC → station 85");
var s = C.compute({ mode: "from-percent", lemac: 70, mac: 60, percentMac: 25 });
nearly(s.cg, 85, 1e-12, "LEMAC + 0.25 × MAC = 85");

console.log("\nCase 3  Tapered-wing MAC, τ = 0.5, root 8");
var mac = C.taperedMac(8, 4);
// (2/3)*8*(1+0.5+0.25)/(1.5) = 16/3 * 1.75/1.5 = 112/18 = 6.222...
nearly(mac, 112 / 18, 1e-12, "MAC = 6.2̄22 for τ = 0.5, cr = 8");
nearly(C.taperedMac(5, 5), 5, 1e-12, "rectangular wing MAC = chord");
nearly(C.yMacFromRoot(30, 0.5), (30 / 6) * (1 + 1) / 1.5, 1e-12, "y_MAC = (b/6)(1+2τ)/(1+τ) = 6.667");

console.log("\nCase 4  Forward of the limit");
var t = C.compute({ lemac: 70, mac: 60, cg: 75, fwdLimit: 16, aftLimit: 31 });
nearly(t.percentMac, 8.333333, 1e-5, "CG 75 is 8.33% MAC");
isTrue(t.withinLimits === false, "8.33% is forward of 16%");
isTrue(C.compute({ lemac: 70, mac: 0, cg: 85 }) === null, "zero MAC → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

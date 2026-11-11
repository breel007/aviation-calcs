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
console.log("Service ceiling (linear ROC vs DA)\n");

console.log("Case 1  1,200 fpm at SL, absolute ceiling 12,000 ft, 100 fpm service");
var a = C.compute({ mode: "ceiling", roc0: 1200, absoluteCeiling: 12000, serviceRoc: 100 });
nearly(a.serviceCeilingFt, 12000 * (1 - 100 / 1200), 1e-12, "h_svc = 12,000 × (1 − 100/1,200)");
nearly(a.serviceCeilingFt, 11000, 1e-12, "hand check 11,000 ft");
var q = C.compute({ mode: "ceiling", roc0: 1200, absoluteCeiling: 12000, serviceRoc: 100, hQuery: 6000 });
nearly(q.rocAtQueryFpm, 600, 1e-12, "halfway to the absolute ceiling is 600 fpm");

console.log("\nCase 2  Two-point fit: 1,000 fpm at 0, 400 fpm at 8,000 ft");
var b = C.compute({ mode: "two-points", h1: 0, roc1: 1000, h2: 8000, roc2: 400, serviceRoc: 100 });
// slope = (400-1000)/8000 = -0.075 fpm/ft; ROC0=1000; hAbs = 1000/0.075 = 13,333.33 ft
nearly(b.roc0Fpm, 1000, 1e-9, "ROC0 from the sea-level point");
nearly(b.absoluteCeilingFt, 1000 / 0.075, 1e-6, "h_abs = 13,333.3 ft");
nearly(b.serviceCeilingFt, (1000 / 0.075) * (1 - 100 / 1000), 1e-6, "service at 100 fpm");

console.log("\nCase 3  Invalid");
isTrue(C.compute({ mode: "ceiling", roc0: 1000, absoluteCeiling: 10000, serviceRoc: 1200 }) === null,
  "service ROC above ROC0 → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

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
console.log("Wind chill (NWS 2001)\n");

console.log("Case 1  0 °F, 10 mph — formula and chart");
var raw = C.wctF(0, 10);
var vs = Math.pow(10, 0.16);
nearly(raw, 35.74 - 35.75 * vs, 1e-12, "WCT at T=0 reduces to 35.74 − 35.75 V^0.16");
nearly(raw, -16.0, 0.6, "NWS chart cell is −16 °F");
var a = C.compute({ temperature: 0, wind: 10, tempUnit: "F", windUnit: "mph" });
isTrue(a.applicable === true, "0 °F / 10 mph is inside the official domain");
nearly(a.windChillF, raw, 1e-12, "compute() uses the official formula");

console.log("\nCase 2  Below the 3 mph threshold");
var b = C.compute({ temperature: 20, wind: 2, tempUnit: "F", windUnit: "mph" });
isTrue(b.applicable === false, "2 mph is below the 3 mph threshold");
nearly(b.windChillF, 20, 1e-12, "reports air temperature, not a WCT");

console.log("\nCase 3  Metric input matches English");
var c = C.compute({ temperature: C.fToC(0), wind: 16.09344, tempUnit: "C", windUnit: "km/h" });
nearly(c.windChillF, a.windChillF, 0.05, "10 mph = 16.09 km/h, same WCT");

console.log("\nCase 4  Invalid");
isTrue(C.compute({ temperature: 200, wind: 10, tempUnit: "F" }) === null, "out-of-range T → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

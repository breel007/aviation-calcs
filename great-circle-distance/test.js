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
console.log("Great-circle distance\n");

console.log("Case 1  Meridian arc of 90°");
var a = C.compute({ lat1: 0, lon1: 0, lat2: 90, lon2: 0 });
nearly(a.distanceM, C.R_MEAN_M * Math.PI / 2, 1e-6, "quarter meridian = πR/2");
nearly(a.distanceNm, C.R_MEAN_M * Math.PI / 2 / 1852, 1e-9, "in NM");
nearly(a.distanceNm, 5403.5, 0.2, "hand check ≈ 5,403.5 NM (not 5,400)");
nearly(a.initialCourse, 0, 1e-9, "due north");

console.log("\nCase 2  Equatorial 90° of longitude");
var b = C.compute({ lat1: 0, lon1: 0, lat2: 0, lon2: 90 });
nearly(b.distanceM, a.distanceM, 1e-6, "same quarter-circumference");
nearly(b.initialCourse, 90, 1e-9, "due east");
nearly(b.finalCourse, 90, 1e-9, "final course still east on the equator");

console.log("\nCase 3  Antipodes and coincident");
var c = C.compute({ lat1: 10, lon1: 20, lat2: -10, lon2: -160 });
nearly(c.centralAngleDeg, 180, 1e-5, "antipodes, 180°");
nearly(c.distanceM, C.R_MEAN_M * Math.PI, 1, "half circumference to within 1 m");
var d = C.compute({ lat1: 40, lon1: -74, lat2: 40, lon2: -74 });
isTrue(d.coincident === true && d.distanceM < 1e-6, "same point → zero distance");

console.log("\nCase 4  Invalid");
isTrue(C.compute({ lat1: 91, lon1: 0, lat2: 0, lon2: 0 }) === null, "latitude 91 → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

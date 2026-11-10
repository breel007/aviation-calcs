#!/usr/bin/env node
"use strict";
require("../standard-atmosphere/calc.js");
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

console.log("Pressure altitude\n");

console.log("Case 1  Standard setting at a 5,000 ft field → PA = 5,000 ft");
var r = C.compute({ mode: "qnh-elevation", altimeter: 29.92, altimeterUnit: "inhg", elevation: 5000, elevationUnit: "ft" });
nearly(r.qnhInHg, C.P0_INHG, 1e-9, "typed 29.92 is canonical 29.92126 inHg");
nearly(r.pressureAltitudeFt, 5000, 0.6, "PA = field elevation on a standard setting");
nearly(r.ruleOfThumbFt, 5000, 1e-9, "rule of thumb also 5,000 ft at 29.92");

console.log("\nCase 2  Sea-level station, 28.92 inHg (1.00 in below standard)");
var s = C.compute({ mode: "qnh-elevation", altimeter: 28.92, altimeterUnit: "inhg", elevation: 0, elevationUnit: "ft" });
nearly(s.ruleOfThumbFt, 1000, 1e-9, "rule of thumb: +1,000 ft for −1.00 inHg");
// Exact ISA is close but not identical to 1,000 ft / inHg
isTrue(Math.abs(s.pressureAltitudeFt - 1000) < 80, "exact PA is near 1,000 ft (ISA scale height)");
isTrue(s.qfeHpa === s.stationPressureHpa, "QFE is station pressure at the field");

console.log("\nCase 3  Station pressure = 1013.25 hPa → PA = 0");
var p = C.compute({ mode: "station-pressure", stationPressure: 1013.25, stationUnit: "hpa" });
nearly(p.pressureAltitudeFt, 0, 0.05, "standard sea-level pressure → 0 ft PA");

console.log("\nCase 4  226.321 hPa is the 11 km tropopause");
var t = C.compute({ mode: "station-pressure", stationPressure: 226.321, stationUnit: "hpa" });
nearly(t.pressureAltitudeM, 11000, 2, "226.321 hPa → 11 km PA");

console.log("\nCase 5  Invalid");
isTrue(C.compute({ mode: "qnh-elevation", altimeter: 0, elevation: 0 }) === null, "zero QNH → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

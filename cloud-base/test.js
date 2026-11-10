#!/usr/bin/env node
"use strict";

var C = require("./calc.js");
var failed = 0, passed = 0;
function nearly(a, b, tol, label) {
  if (Math.abs(a - b) <= tol) { passed += 1; console.log("  PASS  " + label); }
  else { failed += 1; console.log("  FAIL  " + label + "\n        got " + a + "  expected " + b + "  ±" + tol); }
}
function isTrue(cond, label) {
  if (cond) { passed += 1; console.log("  PASS  " + label); }
  else { failed += 1; console.log("  FAIL  " + label); }
}

console.log("Cloud base — formula verification\n");

console.log("Case 1  Classic 10 °C / 5 °C spread (PHAK 2.5 °C rule)");
var r = C.compute({ temp: 10, dewpoint: 5, unit: "C", elevation: 0, lapse: 2 });
nearly(r.spreadC, 5, 1e-9, "spread = 5 °C");
nearly(r.cloudBaseAglFtC, 2000, 1e-9, "(5 / 2.5) × 1,000 = 2,000 ft AGL");
nearly(r.cloudBaseAglThumb, 2000, 1e-9, "400 ft/°C rule also gives 2,000 ft");
nearly(r.cloudBaseMslFtC, 2000, 1e-9, "MSL = AGL at a sea-level field");

console.log("\nCase 2  Fahrenheit 4.4 °F convention, 70 °F / 50 °F");
var f = C.compute({ temp: 70, dewpoint: 50, unit: "F", elevation: 1000, lapse: 2 });
nearly(f.spreadF, 20, 1e-9, "spread = 20 °F");
nearly(f.cloudBaseAglFtF, 20 / 4.4 * 1000, 1e-9, "(20 / 4.4) × 1,000 ≈ 4,545 ft AGL");
nearly(f.cloudBaseMslFtF, 1000 + 20 / 4.4 * 1000, 1e-9, "MSL = 1,000 + AGL");
// The °C and °F conventions are deliberately slightly different
isTrue(Math.abs(f.cloudBaseAglFtC - f.cloudBaseAglFtF) > 10, "2.5 °C and 4.4 °F conventions differ slightly (4.5 vs 4.4)");

console.log("\nCase 3  Relative humidity (Bolton / Magnus)");
// At T = Td, RH = 100%. At a wide spread, RH is lower.
nearly(C.relativeHumidity(15, 15), 100, 1e-9, "T = Td → 100% RH");
var rh = C.relativeHumidity(20, 10);
isTrue(rh > 50 && rh < 55, "20 °C / 10 °C dewpoint is about 52% RH (got " + rh.toFixed(2) + ")");
var tdBack = C.dewpointFromRh(20, rh);
nearly(tdBack, 10, 1e-6, "dewpoint-from-RH inverts RH-from-dewpoint");

console.log("\nCase 4  Freezing level");
nearly(C.freezingLevelAglFt(10, 2), 5000, 1e-9, "10 °C at 2 °C/1,000 ft → FZ 5,000 ft AGL");
nearly(C.freezingLevelAglFt(9, 3), 3000, 1e-9, "9 °C at the dry adiabatic 3 °C/1,000 ft → 3,000 ft");
nearly(C.freezingLevelAglFt(-2, 2), 0, 1e-9, "already below freezing → FZ at the surface");
var icy = C.compute({ temp: 2, dewpoint: -2, unit: "C", elevation: 0, lapse: 2 });
// cloud base = 4/2.5*1000 = 1600 ft; FZ = 2/2*1000 = 1000 ft → base is above FZ
isTrue(icy.baseAtOrBelowFreezing === true, "cloud base above the freezing level is flagged");

console.log("\nCase 5  Elevation in metres, unit conversions");
nearly(C.cToF(0), 32, 1e-12, "0 °C = 32 °F");
nearly(C.fToC(32), 0, 1e-12, "32 °F = 0 °C");
var m = C.compute({ temp: 15, dewpoint: 10, unit: "C", elevation: 300, elevationUnit: "m", lapse: 2 });
nearly(m.elevationFt, 300 * 3.280839895, 1e-9, "300 m elevation converted to feet");

console.log("\nCase 6  Invalid / dewpoint above temperature");
var bad = C.compute({ temp: 10, dewpoint: 15, unit: "C" });
isTrue(bad && bad.error === "dewpoint-above-temp", "dewpoint above OAT is flagged");
isTrue(C.compute({ temp: "x", dewpoint: 5, unit: "C" }) === null, "non-numeric → null");
isTrue(C.relativeHumidity(10, 15) === null, "RH undefined when Td > T");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

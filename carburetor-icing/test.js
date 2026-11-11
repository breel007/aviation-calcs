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
console.log("Carburetor icing, dewpoint, frost point\n");

console.log("Case 1  PHAK high-potential example: 18 °C / 15 °C dewpoint");
var a = C.compute({ temperature: 18, dewpoint: 15, tempUnit: "C" });
nearly(a.temperatureF, 64.4, 1e-9, "18 °C = 64.4 °F");
isTrue(a.relativeHumidity > 82 && a.relativeHumidity < 84, "RH ≈ 83% (Magnus)");
isTrue(a.phakZone === "high", "20–70 °F and RH ≥ 80% → high potential");
isTrue(a.ac20_113Spread === true, "spread ≪ 20 °F, AC 20-113 screen is on");

console.log("\nCase 2  Warm and dry: 30 °C / 12 °C → outside both zones");
var b = C.compute({ temperature: 30, dewpoint: 12, tempUnit: "C" });
isTrue(b.relativeHumidity > 32 && b.relativeHumidity < 35, "RH ≈ 33%");
isTrue(b.phakZone === "outside", "RH < 50% → outside Fig. 7-12 zones");

console.log("\nCase 3  Possible but not high: 80 °F, RH 60%");
var c = C.compute({ temperature: 80, rh: 60, tempUnit: "F", mode: "rh" });
isTrue(c.phakZone === "possible", "80 °F and 60% RH is in the 'possible' zone");
nearly(c.temperatureC, C.fToC(80), 1e-12, "round-trip °F");
// RH in → dewpoint out should recover 60%
nearly(c.relativeHumidity, 60, 1e-9, "entered RH is preserved");

console.log("\nCase 4  Frost point vs dewpoint at −10 °C dewpoint");
var fp = C.frostPointC(-10);
isTrue(fp > -10 && fp < 0, "frost point is warmer than a sub-freezing dewpoint");
nearly(C.frostPointC(0), 0, 0.05, "frost point ≈ dewpoint at 0 °C");
var d = C.compute({ temperature: -5, dewpoint: -10, tempUnit: "C" });
nearly(d.frostPointC, fp, 1e-9, "compute() reports the same frost point");
nearly(d.spreadC, 5, 1e-12, "spread 5 °C");

console.log("\nCase 5  Invalid (dewpoint above temperature)");
isTrue(C.compute({ temperature: 10, dewpoint: 12 }) === null, "Td > T → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

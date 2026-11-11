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
console.log("Fuel cost\n");

console.log("Case 1  8.5 gph × $6.50 / gal, 2.0 h trip");
var r = C.compute({ price: 6.5, flow: 8.5, flowUnit: "gph", time: 2, timeUnit: "h", fuelType: "100ll" });
nearly(r.costPerHour, 55.25, 1e-12, "8.5 × 6.50 = $55.25 / h");
nearly(r.gallons, 17, 1e-12, "8.5 gph × 2 h = 17 gal");
nearly(r.tripFuelCost, 110.5, 1e-12, "17 × 6.50 = $110.50");
nearly(r.poundsPerHour, 51, 1e-12, "8.5 × 6.0 lb/gal = 51 lb/h");

console.log("\nCase 2  Same trip from 17 gallons only");
var s = C.compute({ price: 6.5, gallons: 17 });
nearly(s.tripFuelCost, 110.5, 1e-12, "gallons × price");
isTrue(s.costPerHour == null, "no time or flow → no hourly cost");

console.log("\nCase 3  Jet-A at 600 lb/h, $5.00 / gal, 90 minutes");
var t = C.compute({ price: 5, flow: 600, flowUnit: "pph", time: 90, timeUnit: "min", fuelType: "jeta" });
nearly(t.gph, 600 / 6.7, 1e-12, "600 lb/h / 6.7 lb/gal");
nearly(t.hours, 1.5, 1e-12, "90 min = 1.5 h");
nearly(t.tripFuelCost, (600 / 6.7) * 1.5 * 5, 1e-9, "trip cost from pph");

console.log("\nCase 4  Oil 0.5 qt/h at $8 / qt");
var u = C.compute({ price: 6.5, flow: 8.5, time: 2, oilQtPerHour: 0.5, oilPrice: 8 });
nearly(u.oilPerHour, 4, 1e-12, "oil $4 / h");
nearly(u.totalTrip, 110.5 + 8, 1e-12, "fuel + oil for 2 hours = $118.50");
isTrue(C.compute({ price: -1, flow: 8 }) === null, "negative price → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

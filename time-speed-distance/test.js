#!/usr/bin/env node
/**
 * Verification for time–speed–distance math in calc.js.
 * Run:  node test.js
 */
"use strict";

var TSD = require("./calc.js");
var failed = 0;
var passed = 0;

function nearly(a, b, tol, label) {
  var ok = Math.abs(a - b) <= tol;
  if (ok) { passed += 1; console.log("  PASS  " + label); console.log("        got " + a + "  expected " + b + "  ±" + tol); }
  else { failed += 1; console.log("  FAIL  " + label); console.log("        got " + a + "  expected " + b + "  ±" + tol); }
}

function isTrue(cond, label) {
  if (cond) { passed += 1; console.log("  PASS  " + label); }
  else { failed += 1; console.log("  FAIL  " + label); }
}

console.log("Time–speed–distance — formula verification\n");

console.log("Case 1  120 kt, 180 nm → 1.5 h = 90 min");
var c1 = TSD.solve({ speedKt: 120, distanceNm: 180, solveFor: "time" });
nearly(c1.timeHours, 1.5, 1e-12, "time = 180/120 = 1.5 h");
nearly(c1.duration.hours, 1, 0, "1 hour");
nearly(c1.duration.minutes, 30, 0, "30 minutes");
nearly(c1.duration.totalMinutes, 90, 1e-9, "90 total minutes");

console.log("\nCase 2  90 kt, 45 min → 67.5 nm");
var c2 = TSD.solve({ speedKt: 90, time: { hours: 0, minutes: 45 }, solveFor: "distance" });
nearly(c2.distanceNm, 67.5, 1e-12, "distance = 90 × 0.75 = 67.5 nm");

console.log("\nCase 3  200 nm in 1:20 → 150 kt");
var c3 = TSD.solve({ distanceNm: 200, time: { hours: 1, minutes: 20 }, solveFor: "speed" });
nearly(c3.speedKt, 150, 1e-12, "speed = 200 / (4/3) = 150 kt");

console.log("\nCase 4  Infer the missing quantity");
var c4 = TSD.solve({ speedKt: 100, distanceNm: 25 });
isTrue(c4.solveFor === "time", "infers solve-for = time");
nearly(c4.timeHours, 0.25, 1e-12, "15 minutes");

console.log("\nCase 5  Unit conversions");
nearly(TSD.distanceToNm(1852, "m"), 1, 1e-12, "1852 m = 1 nm");
nearly(TSD.distanceToNm(1, "sm"), 1609.344 / 1852, 1e-12, "1 sm in nm");
nearly(TSD.speedToKt(1.852, "kmh"), 1, 1e-12, "1.852 km/h = 1 kt");
nearly(TSD.ktToSpeed(100, "mph"), 100 * 1852 / 1609.344, 1e-12, "100 kt in mph");

console.log("\nCase 6  ETA same day and next day");
var e1 = TSD.eta("13:15", 1.5);
isTrue(e1.error == null, "ETA 13:15 + 1.5 h succeeds");
isTrue(e1.arrival === "14:45", "13:15 + 1:30 = 14:45 (got " + e1.arrival + ")");
nearly(e1.plusDays, 0, 0, "same day");
var e2 = TSD.eta("23:30", 2);
isTrue(e2.arrival === "01:30", "23:30 + 2:00 = 01:30 next day (got " + e2.arrival + ")");
nearly(e2.plusDays, 1, 0, "rolls to the next day");
var e3 = TSD.eta({ hours: 8, minutes: 0, seconds: 0 }, 0.5);
isTrue(e3.arrival === "08:30", "08:00 + 30 min = 08:30");

console.log("\nCase 7  toHours from totalMinutes");
nearly(TSD.toHours({ totalMinutes: 90 }), 1.5, 1e-12, "90 minutes = 1.5 h");
nearly(TSD.toHours({ hours: 1, minutes: 15, seconds: 30 }), 1 + 15 / 60 + 30 / 3600, 1e-12, "1:15:30");

console.log("\nCase 8  compute() with departure");
var c8 = TSD.compute({ speedKt: 120, distanceNm: 60, departure: "09:00" });
nearly(c8.timeHours, 0.5, 1e-12, "60 nm at 120 kt = 30 min");
isTrue(c8.eta.arrival === "09:30", "ETA 09:30");

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);

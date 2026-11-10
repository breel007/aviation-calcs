#!/usr/bin/env node
"use strict";

var R = require("./calc.js");
var failed = 0, passed = 0;
function nearly(a, b, tol, label) {
  if (Math.abs(a - b) <= tol) { passed += 1; console.log("  PASS  " + label); }
  else { failed += 1; console.log("  FAIL  " + label + "\n        got " + a + "  expected " + b); }
}
function isTrue(cond, label) {
  if (cond) { passed += 1; console.log("  PASS  " + label); }
  else { failed += 1; console.log("  FAIL  " + label); }
}

console.log("Aircraft rental cost — formula verification\n");

console.log("Case 1  Wet rental, Hobbs 1.6, two passengers + pilot");
var w = R.compute({
  timeMode: "hours", hours: 1.6, rate: 180, rateType: "wet",
  fuelGallons: 0, fuelPrice: 0, instructorRate: 0, instructorHours: 0,
  landingFees: 15, otherFees: 0, passengers: 2
});
nearly(w.aircraft, 288, 0.01, "1.6 × $180 = $288");
nearly(w.fees, 15, 0.01, "landing fee $15");
nearly(w.total, 303, 0.01, "total $303");
nearly(w.people, 3, 1e-9, "pilot + 2 passengers = 3");
nearly(w.equalShare, 303 / 3, 0.01, "equal share = $101 (61.113 pro-rata)");
nearly(w.pilotMinimum, 101, 0.01, "pilot must pay at least the equal share");

console.log("\nCase 2  Dry rental plus fuel");
var d = R.compute({
  timeMode: "hours", hours: 2, rate: 140, rateType: "dry",
  fuelGallons: 16, fuelPrice: 6.50, instructorRate: 0,
  landingFees: 0, otherFees: 0, passengers: 0
});
nearly(d.aircraft, 280, 0.01, "2.0 × $140 = $280");
nearly(d.fuel, 104, 0.01, "16 gal × $6.50 = $104");
nearly(d.total, 384, 0.01, "dry total $384");
nearly(d.effectiveWetRate, 192, 0.01, "effective wet rate = $192/hr");

console.log("\nCase 3  Wet rate with a fuel credit (bought fuel away)");
var c = R.compute({
  timeMode: "hours", hours: 3, rate: 175, rateType: "wet", fuelCredit: true,
  fuelGallons: 20, fuelPrice: 6, instructorRate: 0,
  landingFees: 0, otherFees: 0, passengers: 0
});
nearly(c.fuel, -120, 0.01, "fuel credit = −$120");
nearly(c.total, 525 - 120, 0.01, "net = wet charge minus fuel receipt");

console.log("\nCase 4  Hobbs meter and instruction");
var h = R.compute({
  timeMode: "meter", meterStart: 1234.2, meterEnd: 1236.0,
  rate: 160, rateType: "wet",
  fuelGallons: 0, fuelPrice: 0,
  instructorRate: 60, instructorHours: 1.8,
  landingFees: 0, otherFees: 10, passengers: 0
});
nearly(h.hours, 1.8, 1e-9, "Hobbs 1236.0 − 1234.2 = 1.8");
nearly(h.instructor, 108, 0.01, "1.8 × $60 = $108");
nearly(h.total, 1.8 * 160 + 108 + 10, 0.01, "aircraft + instructor + fees");
isTrue(R.elapsed(10, 9) === null, "end before start → null");

console.log("\nCase 5  Tach / Hobbs conversions");
nearly(R.hobbsToTach(1.15, 1.15), 1.0, 1e-12, "1.15 Hobbs at 1.15 ratio = 1.0 tach");
nearly(R.tachToHobbs(1.0, 1.15), 1.15, 1e-12, "inverse converts back");
nearly(R.equivalentRate(200, "hobbs", 1.15), 230, 1e-9, "a $200 Hobbs rate is $230 on the tach at 1.15");
nearly(R.equivalentRate(230, "tach", 1.15), 200, 1e-9, "inverse equivalent rate");

console.log("\nCase 6  Invalid");
isTrue(R.compute({ hours: 0, rate: 100, rateType: "wet" }) === null, "zero hours → null");
isTrue(R.compute({ hours: 1, rate: -5, rateType: "wet" }) === null, "negative rate → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

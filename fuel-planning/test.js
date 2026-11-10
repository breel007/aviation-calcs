#!/usr/bin/env node
/**
 * Verification for fuel-planning math in calc.js.
 * Run:  node test.js
 *
 * Densities: 100LL = 6.0 lb/US gal, Jet-A = 6.7 lb/US gal (planning figures).
 * Reserves: 14 CFR 91.151 VFR 30 min day / 45 min night; 91.167 IFR 45 min.
 * 1 US gal = 3.785411784 L; 1 lb = 0.45359237 kg.
 */
"use strict";

var FP = require("./calc.js");
var failed = 0;
var passed = 0;

function nearly(a, b, tol, label) {
  var ok = Math.abs(a - b) <= tol;
  if (ok) {
    passed += 1;
    console.log("  PASS  " + label);
    console.log("        got " + a + "  expected " + b + "  ±" + tol);
  } else {
    failed += 1;
    console.log("  FAIL  " + label);
    console.log("        got " + a + "  expected " + b + "  ±" + tol);
  }
}

function isTrue(cond, label) {
  if (cond) { passed += 1; console.log("  PASS  " + label); }
  else { failed += 1; console.log("  FAIL  " + label); }
}

console.log("Fuel planning — formula verification\n");

console.log("Case 1  Fuel weight conversions");
nearly(FP.gallonsToPounds(50, 6.0), 300, 1e-9, "50 gal 100LL = 300 lb");
nearly(FP.gallonsToPounds(100, 6.7), 670, 1e-9, "100 gal Jet-A = 670 lb");
nearly(FP.poundsToGallons(300, 6.0), 50, 1e-9, "300 lb 100LL = 50 gal");
nearly(FP.gallonsToLiters(1), 3.785411784, 1e-12, "1 US gal = 3.785411784 L");
nearly(FP.poundsToKg(1), 0.45359237, 1e-12, "1 lb = 0.45359237 kg");
nearly(FP.convertFuel(10, "gal", "lb", 6.0), 60, 1e-9, "10 gal → 60 lb at 6.0");
nearly(FP.convertFuel(67, "lb", "gal", 6.7), 10, 1e-9, "67 lb Jet-A → 10 gal");
nearly(FP.convertFuel(3.785411784, "l", "gal", 6.0), 1, 1e-12, "3.785411784 L → 1 gal");

console.log("\nCase 2  Time and trip fuel");
nearly(FP.hoursFromDistance(180, 120), 1.5, 1e-12, "180 nm at 120 kt = 1.5 h");
var c2 = FP.compute({
  distanceNm: 180,
  groundspeedKt: 120,
  burn: 10,
  burnUnit: "gph",
  fuelType: "100LL",
  reserveKind: "vfr-day"
});
nearly(c2.tripHours, 1.5, 1e-12, "trip time 1.5 h");
nearly(c2.tripGal, 15, 1e-12, "trip fuel = 1.5 × 10 = 15 gal");
nearly(c2.reserveMinutes, 30, 0, "VFR day reserve is 30 minutes (91.151)");
nearly(c2.reserveGal, 5, 1e-12, "30 min at 10 gph = 5 gal");
nearly(c2.totalGal, 20, 1e-12, "total without taxi = 15 + 5 = 20 gal");
nearly(c2.totalLb, 120, 1e-12, "20 gal × 6.0 = 120 lb");

console.log("\nCase 3  VFR night and IFR reserves");
var night = FP.compute({ distanceNm: 120, groundspeedKt: 120, burn: 10, fuelType: "100LL", reserveKind: "vfr-night" });
nearly(night.reserveMinutes, 45, 0, "VFR night reserve is 45 minutes (91.151)");
nearly(night.reserveGal, 7.5, 1e-12, "45 min at 10 gph = 7.5 gal");
var ifr = FP.compute({
  distanceNm: 180, groundspeedKt: 120, burn: 10, fuelType: "100LL",
  reserveKind: "ifr", includeAlternate: true, alternateNm: 60
});
nearly(ifr.tripGal, 15, 1e-12, "IFR trip 180 nm / 120 kt × 10 gph = 15 gal");
nearly(ifr.alternateGal, 5, 1e-12, "alternate 60 nm / 120 kt × 10 gph = 5 gal");
nearly(ifr.reserveGal, 7.5, 1e-12, "IFR reserve 45 min = 7.5 gal (91.167)");
nearly(ifr.totalGal, 27.5, 1e-12, "total 15 + 5 + 7.5 = 27.5 gal");

console.log("\nCase 4  Taxi fuel, endurance, surplus");
var c4 = FP.compute({
  distanceNm: 180, groundspeedKt: 120, burn: 10, fuelType: "100LL",
  reserveKind: "vfr-day", taxiGal: 1.5, onboardGal: 40
});
nearly(c4.totalGal, 21.5, 1e-12, "20 + 1.5 taxi = 21.5 gal required");
nearly(c4.enduranceHours, 4, 1e-12, "40 gal / 10 gph = 4.0 h endurance");
nearly(c4.surplusGal, 18.5, 1e-12, "surplus 40 − 21.5 = 18.5 gal");
nearly(c4.rangeNm, 480, 1e-12, "range = 4 h × 120 kt = 480 nm");

console.log("\nCase 5  Burn in pph (Jet-A)");
var c5 = FP.compute({
  distanceNm: 400, groundspeedKt: 200, burn: 670, burnUnit: "pph",
  fuelType: "JET-A", reserveKind: "ifr"
});
nearly(c5.gph, 100, 1e-12, "670 pph / 6.7 lb/gal = 100 gph");
nearly(c5.tripHours, 2, 1e-12, "400 nm / 200 kt = 2 h");
nearly(c5.tripGal, 200, 1e-12, "trip 200 gal");
nearly(c5.reserveGal, 75, 1e-12, "45 min at 100 gph = 75 gal");

console.log("\nCase 6  Density helpers");
nearly(FP.densityLbPerGal("100LL"), 6.0, 0, "100LL planning density 6.0");
nearly(FP.densityLbPerGal("JET-A"), 6.7, 0, "Jet-A planning density 6.7");
nearly(FP.densityLbPerGal("custom", 6.3), 6.3, 0, "custom density is honored");
nearly(FP.RESERVE_MINUTES["vfr-day"], 30, 0, "VFR day minutes");
nearly(FP.RESERVE_MINUTES["vfr-night"], 45, 0, "VFR night minutes");
nearly(FP.RESERVE_MINUTES.ifr, 45, 0, "IFR minutes");

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);

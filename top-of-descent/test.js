#!/usr/bin/env node
/**
 * Verification for top-of-descent math in calc.js.
 * Run:  node test.js
 *
 * 1 nm = 1852/0.3048 ft. A 3° path is tan(3°) × that, ≈ 318.3 ft/nm.
 * Rule of thumb: 3 nm per 1,000 ft; descent rate ≈ GS × 5.
 */
"use strict";

var TOD = require("./calc.js");
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

var FT_PER_NM = 1852 / 0.3048;
var FT_PER_NM_3DEG = Math.tan(3 * Math.PI / 180) * FT_PER_NM;

console.log("Top of descent — formula verification\n");

console.log("Case 1  Constants and 3° gradient");
nearly(TOD.FT_PER_NM, FT_PER_NM, 1e-12, "1 nm = 1852/0.3048 ft");
nearly(TOD.ftPerNm(3), FT_PER_NM_3DEG, 1e-12, "3° gradient matches tan(3°) × ft/nm");
isTrue(TOD.ftPerNm(3) > 318 && TOD.ftPerNm(3) < 319, "3° is about 318.3 ft/nm");

console.log("\nCase 2  6,000 ft to lose at 3°, 120 kt");
var c2 = TOD.compute({ cruiseAltFt: 7000, targetAltFt: 1000, groundspeedKt: 120, angleDeg: 3 });
nearly(c2.altToLoseFt, 6000, 0, "altitude to lose = 6,000 ft");
nearly(c2.descentDistanceNm, 6000 / FT_PER_NM_3DEG, 1e-12, "exact TOD = 6000 / (tan 3° × 6076) ≈ 18.85 nm");
nearly(c2.ruleDistanceNm, 18, 1e-12, "3-to-1 rule: 6 × 3 = 18 nm");
nearly(c2.rateFpm, 120 * FT_PER_NM_3DEG / 60, 1e-12, "exact rate = GS × 318.3 / 60 ≈ 637 fpm");
nearly(c2.ruleRateFpm, 600, 0, "GS × 5 rule = 600 fpm");
nearly(c2.descentTimeMin, 6000 / c2.rateFpm, 1e-12, "time = altitude / rate");

console.log("\nCase 3  10,000 ft, 3°");
var c3 = TOD.compute({ cruiseAltFt: 10000, targetAltFt: 0, groundspeedKt: 150, angleDeg: 3 });
nearly(c3.ruleDistanceNm, 30, 0, "3-to-1 rule: 10 × 3 = 30 nm");
nearly(c3.descentDistanceNm, 10000 / FT_PER_NM_3DEG, 1e-12, "exact ≈ 31.41 nm");

console.log("\nCase 4  Custom 2.5° path and a buffer");
var c4 = TOD.compute({ cruiseAltFt: 11000, targetAltFt: 2000, groundspeedKt: 140, angleDeg: 2.5, bufferNm: 2 });
var grad = Math.tan(2.5 * Math.PI / 180) * FT_PER_NM;
nearly(c4.descentDistanceNm, 9000 / grad, 1e-9, "2.5° distance");
nearly(c4.todDistanceNm, c4.descentDistanceNm + 2, 1e-12, "TOD includes a 2 nm buffer");

console.log("\nCase 5  Rate method: 500 fpm at 120 kt, 5,000 ft to lose");
var c5 = TOD.compute({ cruiseAltFt: 6000, targetAltFt: 1000, groundspeedKt: 120, method: "rate", rateFpm: 500 });
nearly(c5.descentTimeMin, 10, 1e-12, "5,000 ft / 500 fpm = 10 min");
nearly(c5.descentDistanceNm, 20, 1e-12, "10 min at 120 kt = 20 nm");
var ang = TOD.angleFromRate(500, 120);
nearly(c5.angleDeg, ang, 1e-12, "implied angle from rate and GS");

console.log("\nCase 6  Inverse helpers");
nearly(TOD.angleFromDistance(TOD.ftPerNm(3), 1), 3, 1e-9, "exact inverse of ftPerNm(3)");
nearly(TOD.angleFromDistance(TOD.ftPerNm(4), 1), 4, 1e-9, "exact inverse of ftPerNm(4)");

console.log("\nCase 7  Rejects a climb");
var bad = TOD.compute({ cruiseAltFt: 1000, targetAltFt: 3000, groundspeedKt: 100, angleDeg: 3 });
isTrue(!!bad.error, "error when target is above cruise");

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);

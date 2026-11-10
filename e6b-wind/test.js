#!/usr/bin/env node
/**
 * Verification for E6B wind-triangle math in calc.js.
 * Run:  node test.js
 *
 * Forward: WCA = arcsin(crosswind / TAS), heading = course + WCA,
 *          GS = sqrt(TAS² − XW²) − headwind.
 * Reverse: wind = ground vector − air vector.
 */
"use strict";

var E6B = require("./calc.js");
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
  if (cond) {
    passed += 1;
    console.log("  PASS  " + label);
  } else {
    failed += 1;
    console.log("  FAIL  " + label);
  }
}

function headingOf(north, east) {
  var deg = Math.atan2(east, north) * 180 / Math.PI;
  return E6B.normalizeHeading(deg);
}

console.log("E6B wind triangle — formula verification\n");

console.log("Case 1  No wind: TC 090, TAS 120, wind 000/0");
var c1 = E6B.solveHeadingAndGs(90, 120, 360, 0);
nearly(c1.wca, 0, 1e-9, "WCA = 0");
nearly(c1.trueHeading, 90, 1e-9, "heading = 090");
nearly(c1.groundspeed, 120, 1e-9, "GS = TAS = 120");

console.log("\nCase 2  Direct headwind: TC 090, TAS 100, wind 090/20");
var c2 = E6B.solveHeadingAndGs(90, 100, 90, 20);
nearly(c2.wca, 0, 1e-9, "WCA = 0");
nearly(c2.trueHeading, 90, 1e-9, "heading = 090");
nearly(c2.groundspeed, 80, 1e-9, "GS = 100 − 20 = 80");
nearly(c2.headwind, 20, 1e-9, "headwind = 20");

console.log("\nCase 3  Direct tailwind: TC 090, TAS 100, wind 270/20");
var c3 = E6B.solveHeadingAndGs(90, 100, 270, 20);
nearly(c3.wca, 0, 1e-9, "WCA = 0");
nearly(c3.groundspeed, 120, 1e-9, "GS = 100 + 20 = 120");
nearly(c3.headwind, -20, 1e-9, "headwind = −20 (tailwind)");

console.log("\nCase 4  Direct right crosswind: TC 360, TAS 100, wind 090/20");
var c4 = E6B.solveHeadingAndGs(360, 100, 90, 20);
var wca4 = Math.asin(20 / 100) * 180 / Math.PI;
nearly(c4.wca, wca4, 1e-9, "WCA = arcsin(20/100) ≈ 11.537° right");
nearly(c4.trueHeading, wca4, 1e-9, "heading = 011.5");
nearly(c4.groundspeed, Math.sqrt(100 * 100 - 20 * 20), 1e-9, "GS = sqrt(100² − 20²) ≈ 97.98");
isTrue(c4.wca > 0, "right crosswind produces a right (positive) WCA");

console.log("\nCase 5  Direct left crosswind: TC 360, TAS 100, wind 270/20");
var c5 = E6B.solveHeadingAndGs(360, 100, 270, 20);
nearly(c5.wca, -wca4, 1e-9, "WCA is equal and opposite");
isTrue(c5.wca < 0, "left crosswind produces a left (negative) WCA");

console.log("\nCase 6  Classic mixed wind: TC 090, TAS 120, wind 225/20");
var c6 = E6B.solveHeadingAndGs(90, 120, 225, 20);
var xw6 = 20 * Math.sin(135 * Math.PI / 180);
var hw6 = 20 * Math.cos(135 * Math.PI / 180);
var wca6 = Math.asin(xw6 / 120) * 180 / Math.PI;
var gs6 = Math.sqrt(120 * 120 - xw6 * xw6) - hw6;
nearly(c6.crosswind, xw6, 1e-9, "crosswind = 20 sin 135° ≈ 14.14 from the right");
nearly(c6.headwind, hw6, 1e-9, "headwind = 20 cos 135° ≈ −14.14 (tailwind)");
nearly(c6.wca, wca6, 1e-9, "WCA ≈ 6.77° right");
nearly(c6.trueHeading, E6B.normalizeHeading(90 + wca6), 1e-9, "heading ≈ 096.8");
nearly(c6.groundspeed, gs6, 1e-9, "GS ≈ 133.3 kt");

// Independent vector check: air + wind should equal ground along the course
var th = c6.trueHeading * Math.PI / 180;
var tc = 90 * Math.PI / 180;
var wd = 225 * Math.PI / 180;
var airN = 120 * Math.cos(th);
var airE = 120 * Math.sin(th);
var winN = -20 * Math.cos(wd);
var winE = -20 * Math.sin(wd);
var gN = airN + winN;
var gE = airE + winE;
var gsVec = Math.sqrt(gN * gN + gE * gE);
var track = headingOf(gN, gE);
nearly(gsVec, c6.groundspeed, 1e-9, "vector GS matches closed-form GS");
nearly(track, 90, 1e-6, "ground track equals the true course (090)");

console.log("\nCase 7  Reverse: recover the Case 6 wind from heading and GS");
var rev = E6B.solveWind(c6.trueHeading, 120, 90, c6.groundspeed);
nearly(rev.windFrom, 225, 1e-6, "recovered wind from = 225°");
nearly(rev.windSpeed, 20, 1e-6, "recovered wind speed = 20 kt");
nearly(rev.wca, c6.wca, 1e-6, "recovered WCA matches");

console.log("\nCase 8  Reverse of a pure headwind");
var rev2 = E6B.solveWind(90, 100, 90, 80);
nearly(rev2.windFrom, 90, 1e-6, "wind from = 090");
nearly(rev2.windSpeed, 20, 1e-6, "wind speed = 20");

console.log("\nCase 9  Impossible: 80 kt direct crosswind, TAS 60");
var bad = E6B.solveHeadingAndGs(360, 60, 90, 80);
isTrue(!!bad.error, "returns an error when crosswind > TAS");
isTrue(bad.impossible === true, "flags the course as impossible");

console.log("\nCase 10  Heading wrap: course 350, WCA +20 → heading 010");
// Construct a wind that produces about +20° WCA at TAS 100, course 350
// sin(WCA)=XW/TAS → XW = 100*sin(20)
var wantXW = 100 * Math.sin(20 * Math.PI / 180);
var c10 = E6B.solveHeadingAndGs(350, 100, 350 + 90, wantXW); // wind from the right of 350, i.e. 080
nearly(c10.wca, 20, 1e-6, "WCA ≈ 20° right");
nearly(c10.trueHeading, 10, 1e-6, "heading wraps 350+20 → 010");

console.log("\nCase 11  compute() mode switch and 0°/360° wind");
var fwd = E6B.compute({ mode: "heading", trueCourse: 180, tas: 90, windFrom: 0, windSpeed: 10 });
var fwd360 = E6B.compute({ mode: "heading", trueCourse: 180, tas: 90, windFrom: 360, windSpeed: 10 });
nearly(fwd.groundspeed, fwd360.groundspeed, 1e-9, "wind 000 and 360 are the same (tailwind on southbound)");
nearly(fwd.groundspeed, 100, 1e-9, "southbound with north wind 10 kt → GS 100");

console.log("\nCase 12  Units constants");
nearly(E6B.KT_TO_KMH, 1.852, 0, "1 kt = 1.852 km/h exactly");
nearly(E6B.KT_TO_MPH, 1852 / 1609.344, 1e-12, "1 kt = 1852/1609.344 mph");

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);

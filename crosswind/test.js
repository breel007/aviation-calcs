#!/usr/bin/env node
/**
 * Verification for crosswind/headwind math in calc.js.
 * Run:  node test.js
 *
 * Formula (E6B / flight-computer convention):
 *   angle = wind_direction − runway_heading
 *   crosswind = speed × sin(angle)    (+ from the right)
 *   headwind = speed × cos(angle)     (+ headwind, − tailwind)
 */
"use strict";

var CW = require("./calc.js");
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

console.log("Crosswind component calculator — formula verification\n");

console.log("Case 1  Direct headwind: runway 36, wind 360 at 20 kt");
var c1 = CW.components(360, 360, 20);
nearly(c1.headwind, 20, 1e-9, "headwind = 20 kt");
nearly(c1.crosswind, 0, 1e-9, "crosswind = 0");
isTrue(c1.flow === "headwind", "flow is headwind");

console.log("\nCase 2  Direct right crosswind: runway 36, wind 090 at 20 kt");
var c2 = CW.components(360, 90, 20);
nearly(c2.headwind, 0, 1e-9, "headwind = 0");
nearly(c2.crosswind, 20, 1e-9, "crosswind = +20 kt (from the right)");
isTrue(c2.crossFrom === "right", "from the right");

console.log("\nCase 3  Direct left crosswind: runway 36, wind 270 at 20 kt");
var c3 = CW.components(360, 270, 20);
nearly(c3.crosswind, -20, 1e-9, "crosswind = −20 kt (from the left)");
isTrue(c3.crossFrom === "left", "from the left");

console.log("\nCase 4  Direct tailwind: runway 18, wind 360 at 15 kt");
var c4 = CW.components(180, 360, 15);
nearly(c4.headwind, -15, 1e-9, "headwind = −15 kt (tailwind)");
isTrue(c4.flow === "tailwind", "flow is tailwind");

console.log("\nCase 5  Classic 30° example: runway 27, wind 300 at 20 kt");
var c5 = CW.components(270, 300, 20);
nearly(c5.angleDeg, 30, 1e-9, "wind angle = 30°");
nearly(c5.crosswind, 10, 1e-9, "crosswind = 20 × sin(30°) = 10 kt from the right");
nearly(c5.headwind, 20 * Math.sqrt(3) / 2, 1e-9, "headwind = 20 × cos(30°) ≈ 17.32 kt");

console.log("\nCase 6  Both runway ends (compute)");
var both = CW.compute({ runway: "27", runwayMode: "runway", windDirection: 300, speed: 20, windReference: "magnetic" });
isTrue(both != null, "compute returns a result");
nearly(both.runway.heading, 270, 1e-9, "runway 27 heading is 270°");
nearly(both.reciprocal.heading, 90, 1e-9, "opposite end is 090°");
isTrue(both.reciprocal.label === "09", "opposite label is 09");
nearly(both.thisEnd.crosswind, 10, 1e-9, "27: 10 kt right XW");
nearly(both.otherEnd.headwind, -both.thisEnd.headwind, 1e-9, "opposite end reverses headwind sign");
nearly(both.otherEnd.crosswind, -both.thisEnd.crosswind, 1e-9, "opposite end reverses crosswind sign");
isTrue(both.preferredEnd === "this", "preferred end is the one with the headwind (27)");

console.log("\nCase 7  Runway parsing");
nearly(CW.parseRunwayOrHeading("27", "runway").heading, 270, 0, "27 → 270°");
nearly(CW.parseRunwayOrHeading("09L", "runway").heading, 90, 0, "09L → 090°");
isTrue(CW.parseRunwayOrHeading("09L", "runway").suffix === "L", "suffix L preserved");
nearly(CW.parseRunwayOrHeading("36", "runway").heading, 360, 0, "36 → 360°");
nearly(CW.parseRunwayOrHeading("9", "auto").heading, 90, 0, "auto 9 → runway 09");
nearly(CW.parseRunwayOrHeading("270", "auto").heading, 270, 0, "auto 270 → heading 270°");
nearly(CW.parseRunwayOrHeading("360", "heading").heading, 360, 0, "heading 360 stays 360");
isTrue(CW.parseRunwayOrHeading("99", "runway") === null, "runway 99 is invalid");

console.log("\nCase 8  Gust components scale with gust speed");
var g = CW.compute({
  runway: "36",
  runwayMode: "runway",
  windDirection: 90,
  speed: 20,
  gust: 30,
  windReference: "magnetic"
});
nearly(g.thisEnd.crosswind, 20, 1e-9, "sustained XW = 20 kt");
nearly(g.thisGust.crosswind, 30, 1e-9, "gust XW = 30 kt");
nearly(g.thisGust.headwind, 0, 1e-9, "gust headwind still 0 on a 90° wind");

console.log("\nCase 9  Magnetic variation (true wind → magnetic)");
nearly(CW.trueToMagnetic(270, 15), 255, 1e-9, "true 270°, 15°E → magnetic 255°");
nearly(CW.trueToMagnetic(10, 15), 355, 1e-9, "true 010°, 15°E wraps to magnetic 355°");
nearly(CW.trueToMagnetic(270, -10), 280, 1e-9, "true 270°, 10°W → magnetic 280°");
var tv = CW.compute({
  runway: "27",
  runwayMode: "runway",
  windDirection: 300,
  windReference: "true",
  variationEast: 15,
  speed: 20
});
// magnetic wind = 300 − 15 = 285; angle vs 270 = 15°
nearly(tv.windMagnetic, 285, 1e-9, "applied variation: magnetic wind 285°");
nearly(tv.thisEnd.angleDeg, 15, 1e-9, "angle after variation is 15°");

console.log("\nCase 10  Max demonstrated crosswind comparison");
var dem = CW.compute({
  runway: "36",
  runwayMode: "runway",
  windDirection: 90,
  speed: 12,
  gust: 18,
  maxDemonstrated: 15,
  windReference: "magnetic"
});
isTrue(!dem.thisCompare.sustainedExceeds, "12 kt sustained is within 15 kt demonstrated");
isTrue(dem.thisCompare.gustExceeds, "18 kt gust exceeds 15 kt demonstrated");
nearly(dem.thisCompare.sustainedMargin, 3, 1e-9, "sustained margin +3 kt");
nearly(dem.thisCompare.gustMargin, -3, 1e-9, "gust margin −3 kt");

console.log("\nCase 11  Unit conversion and invalid input");
nearly(CW.convertSpeed(20, "kt", "kt"), 20, 1e-12, "20 kt = 20 kt");
nearly(CW.convertSpeed(1, "kt", "mph"), CW.KT_TO_MPH, 1e-12, "1 kt → mph");
nearly(CW.convertSpeed(CW.KT_TO_MPH, "mph", "kt"), 1, 1e-12, "mph → kt round trip");
isTrue(CW.compute({ runway: "27", windDirection: 300 }) === null, "missing speed → null");
isTrue(CW.compute({ runway: "xx", windDirection: 300, speed: 10 }) === null, "bad runway → null");
isTrue(CW.components(360, 90, -5) === null, "negative speed → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

#!/usr/bin/env node
"use strict";

var G = require("./calc.js");
var failed = 0, passed = 0;
function nearly(a, b, tol, label) {
  if (Math.abs(a - b) <= tol) { passed += 1; console.log("  PASS  " + label); }
  else { failed += 1; console.log("  FAIL  " + label + "\n        got " + a + "  expected " + b + "  ±" + tol); }
}
function isTrue(cond, label) {
  if (cond) { passed += 1; console.log("  PASS  " + label); }
  else { failed += 1; console.log("  FAIL  " + label); }
}

console.log("Glide distance — formula verification\n");

console.log("Case 1  Still-air distance: 9:1 from 6,000 ft AGL (typical 172)");
var c1 = G.compute({ altitude: 6000, glideRatio: 9 });
var expectNm = 6000 / G.FT_PER_NM * 9;
nearly(c1.stillAirNm, expectNm, 1e-9, "still-air = 6,000 / 6,076.12 × 9 ≈ 8.89 NM");
nearly(c1.stillAirFt, 54000, 1e-9, "still-air = 54,000 ft");
nearly(c1.stillAirSm, 6000 / 5280 * 9, 1e-9, "still-air in statute miles");
nearly(c1.angleDeg, G.angleFromRatio(9), 1e-12, "glide angle = arctan(1/9)");

console.log("\nCase 2  Ratio ↔ angle round trip");
nearly(G.ratioFromAngle(G.angleFromRatio(17)), 17, 1e-9, "17:1 round-trips through the angle");
nearly(G.angleFromRatio(1), 45, 1e-9, "1:1 is a 45° descent");

console.log("\nCase 3  Wind: 10:1 from 6,076.12 ft, Vg = 60 kt, 10 kt headwind");
// Altitude of 1 NM, ratio 10 → still-air 10 NM.
// Sink = 60 * KT_TO_FPM / 10. Time = 6076.12 / sink = 10 / 60 hours = 10 min.
var c3 = G.compute({
  altitude: G.FT_PER_NM, glideRatio: 10, bestGlide: 60,
  windMode: "component", headwind: 10
});
nearly(c3.stillAirNm, 10, 1e-9, "still-air = 10 NM");
nearly(c3.timeMin, 10, 1e-9, "time to the ground = 10 minutes");
nearly(c3.alongCourseNm, 50 / 6, 1e-9, "into a 10 kt headwind, GS=50, distance=50×10/60 ≈ 8.33 NM");
nearly(c3.intoWindNm, 50 / 6, 1e-9, "into-wind range matches");
nearly(c3.downWindNm, 70 / 6, 1e-9, "downwind range = 70 kt × 10 min");
nearly(c3.windOffsetNm, 10 / 6, 1e-9, "circle is shifted 10 kt × 10 min downwind");

console.log("\nCase 4  Vector wind and a reachability check");
var c4 = G.compute({
  altitude: G.FT_PER_NM, glideRatio: 10, bestGlide: 60,
  windMode: "vector", windFrom: 270, windSpeed: 10, course: 270,
  targetDistance: 5, targetBearing: 90
});
// Wind from the west, target 5 NM east (downwind) — well inside 11.67 NM downwind range
isTrue(c4.canReach === true, "5 NM downwind is reachable");
var c4b = G.compute({
  altitude: G.FT_PER_NM, glideRatio: 10, bestGlide: 60,
  windMode: "vector", windFrom: 270, windSpeed: 10,
  targetDistance: 12, targetBearing: 90
});
isTrue(c4b.canReach === false, "12 NM downwind is beyond the 11.67 NM max range");

console.log("\nCase 5  Wind components (E6B convention, wind FROM)");
var wc = G.windComponents(360, 360, 20);
nearly(wc.headwind, 20, 1e-9, "wind from the nose: 20 kt headwind");
var wc2 = G.windComponents(360, 180, 20);
nearly(wc2.headwind, -20, 1e-9, "wind from behind: 20 kt tailwind");

console.log("\nCase 6  Invalid");
isTrue(G.compute({ altitude: 0, glideRatio: 9 }) === null, "zero altitude → null");
isTrue(G.compute({ altitude: 1000, glideRatio: 0 }) === null, "zero ratio → null");
isTrue(G.ratioFromAngle(90) === null, "90° angle is invalid");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

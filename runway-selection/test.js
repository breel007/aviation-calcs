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
function row(res, num) {
  return res.runways.filter(function (r) { return r.runway === num; })[0];
}
console.log("Runway selection\n");

console.log("Case 1  Wind 270/20, runways 27 and 09 — straight headwind");
var r = C.compute({ windDir: 270, windSpeed: 20, runways: "27", crosswindLimit: 15 });
nearly(row(r, 27).headwind, 20, 1e-12, "RWY 27 headwind = 20");
nearly(row(r, 27).crosswind, 0, 1e-12, "RWY 27 crosswind = 0");
nearly(row(r, 9).headwind, -20, 1e-12, "RWY 09 is a 20 kt tailwind");
isTrue(r.recommended.runway === 27, "recommends 27");

console.log("\nCase 2  Wind 300/20 on runway 27 — 30° angle");
var s = C.compute({ windDir: 300, windSpeed: 20, runways: "27", includeReciprocal: false, crosswindLimit: 15 });
nearly(row(s, 27).headwind, 20 * Math.cos(30 * Math.PI / 180), 1e-9, "HW = 20 cos 30° = 17.32");
nearly(row(s, 27).crosswindAbs, 20 * Math.sin(30 * Math.PI / 180), 1e-9, "XW = 20 sin 30° = 10");
nearly(row(s, 27).headwind, 17.320508, 1e-5, "hand check 17.32 kt");

console.log("\nCase 3  True wind 360, variation 15°E, magnetic runway 01");
// magnetic wind = 360 − 15 = 345. RWY 01 heading 010. Angle = 345 − 010 = −25°.
var t = C.compute({ windDir: 360, windSpeed: 20, windRef: "true", variation: 15, variationDir: "E", runways: "01", includeReciprocal: false, crosswindLimit: 15 });
nearly(t.windDirMagnetic, 345, 1e-9, "true 360° − 15°E = magnetic 345°");
nearly(row(t, 1).headwind, 20 * Math.cos(-25 * Math.PI / 180), 1e-9, "angle −25° from 010");

console.log("\nCase 4  Limit exceeded — still names the least-bad into-wind runway");
var u = C.compute({ windDir: 330, windSpeed: 30, runways: "27", crosswindLimit: 12 });
// 330 vs 270 = 60°, XW = 30 sin 60 = 25.98, over 12. RWY 09 is tailwind.
isTrue(u.anyWithinLimit === false, "30 kt at 60° exceeds 12 kt limit");
isTrue(u.recommended.runway === 27, "still prefers the into-wind end");

console.log("\nCase 5  Parse '09/27, 13, 31'");
var p = C.parseRunways("09/27, 13, 31");
isTrue(p.join(",") === "9,27,13,31", "parses runway list");
isTrue(C.reciprocal(27) === 9 && C.reciprocal(9) === 27, "reciprocals 09/27");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

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

console.log("VOR / DME and 1-in-60\n");

console.log("Case 1  5° off course at 30 NM (classic 1-in-60 example)");
var r = C.compute({ mode: "offset", distanceNm: 30, degrees: 5 });
nearly(r.offsetRuleNm, 2.5, 1e-12, "1-in-60: 30 × 5 / 60 = 2.5 NM");
nearly(r.offsetNm, 30 * Math.sin(5 * Math.PI / 180), 1e-12, "exact: 30 sin 5° ≈ 2.615 NM");
nearly(r.offsetNm, 2.6147, 0.001, "hand-checked exact offset");

console.log("\nCase 2  Time to station: 10° of bearing change in 2 minutes");
var t = C.compute({ mode: "time-to-station", elapsedMin: 2, degreesChanged: 10, groundspeedKt: 120 });
nearly(t.timeToStationMin, 12, 1e-12, "tts = 60 × 2 / 10 = 12 min");
nearly(t.distanceNm, 24, 1e-12, "distance = 120 kt × 12/60 = 24 NM");

console.log("\nCase 3  DME slant at 6,076 ft and 2.0 NM DME (height ≈ 1 NM)");
var s = C.compute({ mode: "slant", dmeNm: 2, heightFt: C.FT_PER_NM });
nearly(s.heightNm, 1, 1e-12, "6,076 ft = 1 NM of height");
nearly(s.horizontalNm, Math.sqrt(3), 1e-12, "horizontal = √(4−1) = √3 NM");

console.log("\nCase 4  Slant range shorter than height is rejected");
var bad = C.compute({ mode: "slant", dmeNm: 0.5, heightFt: 6000 });
isTrue(bad.error != null, "impossible slant range → error");

console.log("\nCase 5  Lead radial uses a real turn radius");
var l = C.compute({ mode: "lead", distanceNm: 10, tasKt: 120, standardRate: true });
isTrue(l.leadDeg > 0 && l.turnRadiusNm > 0, "lead angle and radius are positive");
nearly(l.leadDeg, Math.atan(l.turnRadiusNm / 10) * 180 / Math.PI, 1e-10, "lead = atan(r/d)");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

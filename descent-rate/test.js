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
console.log("Descent rate / glideslope VSI\n");

console.log("Case 1  120 kt on a 3° path — exact and GS × 5");
var r = C.compute({ mode: "angle", groundspeed: 120, angle: 3 });
var ftNm = Math.tan(3 * Math.PI / 180) * (1852 / 0.3048);
nearly(r.ftPerNm, ftNm, 1e-9, "ft/NM = tan(3°) × 1852/0.3048");
nearly(r.ftPerNm, 318.4, 0.05, "3° is about 318.4 ft/NM");
nearly(r.fpm, 120 * ftNm / 60, 1e-9, "fpm = GS × ft/NM / 60");
nearly(r.fpm, 636.8, 0.2, "hand check 120 kt × 3° ≈ 637 fpm");
nearly(r.ruleTimes5Fpm, 600, 0, "GS × 5 = 600 fpm");
isTrue(r.fpm - r.ruleTimes5Fpm > 30 && r.fpm - r.ruleTimes5Fpm < 45, "times-5 is ~37 fpm shallow at 120 kt");
nearly(r.nmPerThousandFt, 1000 / ftNm, 1e-9, "NM per 1,000 ft is the 3-to-1 cousin");
nearly(r.nmPerThousandFt, 3.14, 0.02, "about 3.14 NM per 1,000 ft on 3°");

console.log("\nCase 2  Inverse: 637 fpm at 120 kt is about 3°");
var s = C.compute({ mode: "rate", groundspeed: 120, fpm: r.fpm });
nearly(s.angleDeg, 3, 1e-9, "inverting the exact rate recovers 3°");

console.log("\nCase 3  90 kt, 3.25° path (common steeper ILS)");
var t = C.compute({ mode: "angle", groundspeed: 90, angle: 3.25 });
var ftNm2 = Math.tan(3.25 * Math.PI / 180) * C.FT_PER_NM;
nearly(t.fpm, 90 * ftNm2 / 60, 1e-9, "custom angle rate");
isTrue(t.fpm > C.compute({ groundspeed: 90, angle: 3 }).fpm, "3.25° is steeper than 3°");

console.log("\nCase 4  Invalid");
isTrue(C.compute({ groundspeed: 120, angle: 0 }) === null, "zero angle → null");
isTrue(C.compute({ mode: "rate", groundspeed: 0, fpm: 600 }) === null, "rate mode needs speed");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

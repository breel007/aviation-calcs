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

console.log("Visual descent point\n");

console.log("Case 1  3° path, HAT 300 ft (hand-checked)");
var r = C.compute({ hatFt: 300, angleDeg: 3, groundspeedKt: 90 });
var slope = C.FT_PER_NM * Math.tan(3 * Math.PI / 180);
nearly(r.ftPerNm, slope, 1e-9, "3° is tan(3°) × 6,076.12 ft/NM");
nearly(r.ftPerNm, 318.4, 0.15, "3° ≈ 318.4 ft/NM");
nearly(r.vdpNm, 300 / slope, 1e-12, "VDP = HAT / slope ≈ 0.94 NM");
nearly(r.rule300Nm, 1, 1e-12, "HAT/300 rule of thumb = 1.00 NM");
nearly(r.descentRateFpm, slope * 90 / 60, 1e-9, "fpm = (ft/NM) × GS / 60");
// times-five: 90 × 5 = 450 fpm; exact is about 477
nearly(r.timesFiveFpm, 450, 1e-9, "times-five rule at 90 kt / 3° = 450 fpm");

console.log("\nCase 2  HAT from MDA and TDZE, plus a DME");
var s = C.compute({ mdaFt: 740, tdzeFt: 240, angleDeg: 3, thresholdDme: 0.2 });
nearly(s.hatFt, 500, 1e-12, "HAT = MDA − TDZE = 500 ft");
nearly(s.rule300Nm, 500 / 300, 1e-12, "500/300 ≈ 1.67 NM");
nearly(s.vdpDme, 0.2 + s.vdpNm, 1e-12, "VDP DME = threshold DME + VDP distance");

console.log("\nCase 3  Invalid");
isTrue(C.compute({ hatFt: -10 }) === null, "negative HAT → null");
isTrue(C.compute({ hatFt: 400, angleDeg: 90 }) === null, "90° path → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

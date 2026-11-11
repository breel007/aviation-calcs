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
console.log("ILS glideslope height / TCH\n");

console.log("Case 1  3° path, 50 ft TCH, 1 NM from the threshold");
var a = C.compute({ distance: 1, distUnit: "nm", angle: 3, tch: 50 });
nearly(a.ftPerNm, C.FT_PER_NM * Math.tan(3 * Math.PI / 180), 1e-12, "ft/NM = 6076.115 tan θ");
nearly(a.ftPerNm, 318.4, 0.1, "3.00° is 318.4 ft/NM");
nearly(a.heightFt, 50 + a.ftPerNm, 1e-12, "height = TCH + 1 NM of path");
nearly(a.heightFt, 368.4, 0.1, "hand check 50 + 318.4 ≈ 368.4 ft");

console.log("\nCase 2  Invert height to distance, and DME offset");
var b = C.compute({ mode: "height", height: a.heightFt, angle: 3, tch: 50 });
nearly(b.distanceToThresholdNm, 1, 1e-9, "invert 368.4 ft back to 1 NM");
var c = C.compute({ distance: 1, distUnit: "nm", distanceIsDme: true, antennaOffset: 1000, offsetUnit: "ft", angle: 3, tch: 50 });
var x = 1 - 1000 / C.FT_PER_NM;
nearly(c.distanceToThresholdNm, x, 1e-12, "x = DME − 1,000 ft offset");
nearly(c.heightFt, 50 + x * a.ftPerNm, 1e-9, "height uses the threshold distance");

console.log("\nCase 3  Descent rate at 90 kt matches GS × ft/NM / 60");
var d = C.compute({ distance: 1, angle: 3, tch: 50, groundspeed: 90 });
nearly(d.descentFpm, 90 * a.ftPerNm / 60, 1e-12, "fpm identity");
nearly(d.descentFpm, 477.6, 0.5, "about 478 fpm, near the GS × 5 rule of 450");

console.log("\nCase 4  Invalid");
isTrue(C.compute({ distance: 1, angle: 0 }) === null, "zero angle → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

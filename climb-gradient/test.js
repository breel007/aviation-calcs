#!/usr/bin/env node
"use strict";

var C = require("./calc.js");
var failed = 0, passed = 0;
function nearly(a, b, tol, label) {
  if (Math.abs(a - b) <= tol) { passed += 1; console.log("  PASS  " + label); }
  else { failed += 1; console.log("  FAIL  " + label + "\n        got " + a + "  expected " + b + "  ±" + tol); }
}
function isTrue(cond, label) {
  if (cond) { passed += 1; console.log("  PASS  " + label); }
  else { failed += 1; console.log("  FAIL  " + label); }
}

console.log("Climb gradient — formula verification\n");

console.log("Case 1  Standard 200 ft/NM at 90 kt (the usual light-airplane DP check)");
// fpm = 200 × 90 / 60 = 300
var r = C.compute({ mode: "ftnm", value: 200, groundspeed: 90 });
nearly(r.fpm, 300, 1e-9, "200 ft/NM at 90 kt = 300 fpm");
nearly(r.percent, 200 / C.FT_PER_NM * 100, 1e-12, "200 ft/NM ≈ 3.29%");
nearly(r.degrees, Math.atan(200 / C.FT_PER_NM) * 180 / Math.PI, 1e-12, "degrees = arctan(200/6076)");
isTrue(r.meetsRequired === true, "exactly 200 ft/NM meets the standard DP");
nearly(r.requiredFpm, 300, 1e-9, "required fpm at 90 kt is 300");

console.log("\nCase 2  Conversions are inverses");
var fpm = C.compute({ mode: "fpm", value: 500, groundspeed: 120 });
nearly(fpm.ftPerNm, 500 * 60 / 120, 1e-9, "500 fpm at 120 kt = 250 ft/NM");
var pct = C.compute({ mode: "percent", value: r.percent, groundspeed: 90 });
nearly(pct.ftPerNm, 200, 1e-9, "percent → ft/NM inverts");
var deg = C.compute({ mode: "degrees", value: r.degrees, groundspeed: 90 });
nearly(deg.ftPerNm, 200, 1e-9, "degrees → ft/NM inverts");

console.log("\nCase 3  A 400 ft/NM SID at 140 kt");
var sid = C.compute({ mode: "ftnm", value: 400, groundspeed: 140, requiredFtNm: 400 });
nearly(sid.fpm, 400 * 140 / 60, 1e-9, "required 933.3 fpm");
isTrue(sid.meetsRequired === true, "meets its own requirement");
var short = C.compute({ mode: "fpm", value: 400, groundspeed: 140, requiredFtNm: 400 });
isTrue(short.meetsRequired === false, "400 fpm at 140 kt is only 171 ft/NM, short of 400");
nearly(short.marginFtNm, 400 * 60 / 140 - 400, 1e-9, "negative margin");

console.log("\nCase 4  Zero / missing groundspeed");
var noGs = C.compute({ mode: "ftnm", value: 200 });
isTrue(noGs != null && noGs.fpm === null, "ft/NM works without groundspeed; fpm is blank");
isTrue(C.compute({ mode: "fpm", value: 500 }) === null, "fpm without groundspeed → null");

console.log("\nCase 5  Invalid");
isTrue(C.compute({ mode: "ftnm", value: -10, groundspeed: 90 }) === null, "negative gradient → null");
isTrue(C.compute({ mode: "degrees", value: 90, groundspeed: 90 }) === null, "90° is invalid");
isTrue(C.compute({ mode: "fpm", value: 300, groundspeed: 0 }) === null, "zero GS → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

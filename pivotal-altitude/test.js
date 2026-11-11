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
console.log("Pivotal altitude\n");
console.log("Case 1  90 kt, handbook 11.3 and exact V²/g");
var r = C.compute({ groundspeed: 90, speedUnit: "kt" });
nearly(r.afhFt, 90 * 90 / 11.3, 1e-12, "AFH: 90²/11.3 = 716.814 ft");
nearly(r.afhFt, 716.814159, 1e-5, "hand check 8100/11.3");
// exact: V = 90 * 1852/3600 m/s, h = V²/g0 in metres, then feet
var v = 90 * 1852 / 3600;
var hM = v * v / 9.80665;
nearly(r.exactM, hM, 1e-9, "exact height is V²/g0");
nearly(r.exactFt, hM / 0.3048, 1e-9, "exact height in feet");
isTrue(r.exactFt > r.afhFt && r.exactFt - r.afhFt < 2, "11.3 is a few feet below exact at 90 kt");

console.log("\nCase 2  100 mph → AFH 100²/15 = 666.67 ft");
var s = C.compute({ groundspeed: 100, speedUnit: "mph" });
nearly(s.afhFromMphFt, 10000 / 15, 1e-12, "AFH mph constant: 666.667 ft");
nearly(s.groundspeedMph, 100, 1e-9, "speed preserved in mph");
// 100 mph = 146.666... ft/s; h = V²/32.17405 ft
var fps = 100 * 5280 / 3600;
nearly(s.exactFt, fps * fps / (9.80665 / 0.3048), 1e-6, "exact from 100 mph in ft/s");

console.log("\nCase 3  Zero and invalid");
nearly(C.compute({ groundspeed: 0, speedUnit: "kt" }).exactFt, 0, 0, "zero speed → 0 ft");
isTrue(C.compute({ groundspeed: -10, speedUnit: "kt" }) === null, "negative → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

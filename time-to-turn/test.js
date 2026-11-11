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
console.log("Time to turn\n");

console.log("Case 1  Standard-rate 90 / 180 / 360");
var a = C.compute({ change: 90 });
nearly(a.timeSec, 30, 1e-12, "90° at 3°/s = 30 s");
nearly(C.compute({ change: 180 }).timeSec, 60, 1e-12, "180° = 1 min");
nearly(C.compute({ change: 360 }).timeSec, 120, 1e-12, "360° = 2 min");
nearly(C.compute({ change: 90, rateKind: "half" }).timeSec, 60, 1e-12, "90° at half-standard = 60 s");

console.log("\nCase 2  From 090 to 360, shorter way is left 90°");
var b = C.compute({ mode: "headings", fromHeading: 90, toHeading: 360 });
nearly(b.changeDeg, -90, 1e-12, "shortest change −90° (left)");
nearly(b.timeSec, 30, 1e-12, "30 s the short way");
nearly(b.longWayDeg, 270, 1e-12, "long way 270°");
nearly(b.longWaySec, 90, 1e-12, "long way 90 s at standard rate");

console.log("\nCase 3  Bank and TAS give the actual rate");
// 100 kt, 15° bank: ω = g tanφ / V
var r = C.rateFromBank(100, 15);
var v = 100 * (1852 / 0.3048 / 3600);
var expect = (32.17404855643044 * Math.tan(15 * Math.PI / 180) / v) * 180 / Math.PI;
nearly(r, expect, 1e-12, "rate from g tanφ / V");
var c = C.compute({ change: 90, tas: 100, bank: 15 });
nearly(c.bankTimeSec, 90 / Math.abs(r), 1e-12, "time at the banked rate");

console.log("\nCase 4  Custom 2°/s, 45°");
nearly(C.compute({ change: 45, rateKind: "custom", rate: 2 }).timeSec, 22.5, 1e-12, "45 / 2 = 22.5 s");

console.log("\nCase 5  Invalid");
isTrue(C.compute({ change: 0 }) === null, "zero change → null");
isTrue(C.compute({ mode: "headings", fromHeading: 90, toHeading: 400 }) === null, "heading 400 → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

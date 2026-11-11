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
console.log("RVR / visibility comparable values\n");

console.log("Case 1  14 CFR 91.175(h)(2) exact rows");
var a = C.compute({ mode: "rvr", rvr: 1600, rvrUnit: "ft" });
nearly(a.exact.sm, 0.25, 0, "1,600 ft → 1/4 SM");
isTrue(a.exact.smLabel === "1/4", "label 1/4");
var b = C.compute({ rvr: 2400 });
nearly(b.exact.sm, 0.5, 0, "2,400 ft → 1/2 SM");
var c = C.compute({ rvr: 5000 });
nearly(c.exact.sm, 1, 0, "5,000 ft → 1 SM");
var d = C.compute({ rvr: 6000 });
nearly(d.exact.sm, 1.25, 0, "6,000 ft → 1 1/4 SM");
isTrue(C.compute({ rvr: 3200 }).exact.smLabel === "5/8", "3,200 → 5/8");
isTrue(C.compute({ rvr: 4000 }).exact.smLabel === "3/4", "4,000 → 3/4");
isTrue(C.compute({ rvr: 4500 }).exact.smLabel === "7/8", "4,500 → 7/8");

console.log("\nCase 2  Between rows: 4,800 RVR uses next higher 5,000 (TPP legend example)");
var e = C.compute({ rvr: 4800 });
isTrue(e.exact === null, "4,800 is not an exact 91.175 row");
isTrue(e.betweenRows === true, "flagged as between rows");
nearly(e.nextHigher.rvrFt, 5000, 0, "next higher listed RVR is 5,000");
nearly(e.nextHigher.sm, 1, 0, "comparable visibility is 1 SM");

console.log("\nCase 3  RVR 24 shorthand (hundreds of feet) and inverse SM");
var f = C.compute({ rvr: 24, rvrUnit: "x100" });
nearly(f.rvrFt, 2400, 0, "RVR 24 = 2,400 ft");
nearly(f.exact.sm, 0.5, 0, "same as 2,400 ft");
var g = C.compute({ mode: "sm", visibility: 0.5 });
nearly(g.exact.rvrFt, 2400, 0, "1/2 SM → 2,400 ft RVR");
isTrue(C.compute({ mode: "sm", visibility: 0.6 }).exact === null, "0.6 SM is not a table row");

console.log("\nCase 4  Below / above the table, invalid");
var h = C.compute({ rvr: 1000 });
isTrue(h.belowTable === true && h.nextHigher.rvrFt === 1600, "1,000 ft is below the table; next higher is 1,600");
isTrue(C.compute({ rvr: 7000 }).aboveTable === true, "7,000 ft is above the 6,000 ft row");
isTrue(C.compute({ rvr: 0 }) === null, "zero → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

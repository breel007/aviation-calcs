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

console.log("Oxygen requirements and TUC\n");

console.log("Case 1  Part 91 unpressurized, 12,000 ft for 20 min — no 91.211 crew requirement");
var a = C.compute({ cabinAltitudeFt: 12000, durationMin: 20 });
isTrue(a.part91.crewMustUse === false, "12,000 ft is not above 12,500");
isTrue(a.part135.crewMustUse === false && a.part135.crewAfter30 === true, "135.89: above 10,000, oxygen after 30 min");

console.log("\nCase 2  13,000 ft for 45 min — 91.211(a)(1) crew must use");
var b = C.compute({ cabinAltitudeFt: 13000, durationMin: 45 });
isTrue(b.part91.crewMustUse === true, "crew oxygen required after 30 min between 12,500 and 14,000");
isTrue(b.part91.occupantsProvided === false, "occupants not required under 91.211(a)(3) below 15,000");

console.log("\nCase 3  13,000 ft for 20 min — 30-minute threshold not reached under Part 91");
var c = C.compute({ cabinAltitudeFt: 13000, durationMin: 20 });
isTrue(c.part91.crewMustUse === false && c.part91.crewAfter30 === true, "under 30 min at 13,000, Part 91 not yet required");

console.log("\nCase 4  14,500 ft — crew must use for the entire time; 16,000 — occupants provided");
var d = C.compute({ cabinAltitudeFt: 14500, durationMin: 1 });
isTrue(d.part91.crewMustUse === true, "above 14,000, crew uses oxygen the entire time");
var e = C.compute({ cabinAltitudeFt: 16000, durationMin: 1 });
isTrue(e.part91.occupantsProvided === true, "above 15,000, occupants must be provided oxygen");

console.log("\nCase 5  TUC table: 25,000 ft is 3–5 minutes (FAA / CAMI)");
var t = C.tucFor(25000);
isTrue(t.label === "3–5 minutes", "TUC at 25,000 ft = 3–5 min");
isTrue(t.nearestAlt === 25000, "exact table row");
var t18 = C.tucFor(18000);
isTrue(t18.label === "20–30 minutes", "TUC at 18,000 ft = 20–30 min");
var t40 = C.tucFor(40000);
isTrue(t40.label === "15–20 seconds", "TUC at 40,000 ft = 15–20 s");
isTrue(C.tucFor(8000).belowTable === true, "8,000 ft is below the TUC table");

console.log("\nCase 6  135.89 is stricter than 91.211 at 11,000 ft for 40 min");
var f = C.compute({ cabinAltitudeFt: 11000, durationMin: 40 });
isTrue(f.part91.crewMustUse === false, "Part 91 does not require oxygen at 11,000");
isTrue(f.part135.crewMustUse === true, "Part 135 does, after 30 min above 10,000");

console.log("\nCase 7  Invalid");
isTrue(C.compute({ cabinAltitudeFt: -1 }) === null, "negative altitude → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

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
console.log("Radio / geometric horizon\n");

console.log("Case 1  1,000 ft antenna, 4/3 Earth, versus 1.23 √h");
var a = C.compute({ height1: 1000, altUnit: "ft" });
var h = 1000 * 0.3048;
nearly(a.radioM, Math.sqrt(2 * (4 / 3) * C.R_MEAN_M * h + h * h), 1e-9, "d = √(2 k R h + h²)");
nearly(a.rule123Nm, 1.23 * Math.sqrt(1000), 1e-12, "1.23 √1000 ≈ 38.90 NM");
nearly(a.radioNm, a.rule123Nm, 0.15, "exact 4/3-Earth range agrees with 1.23 √h to ~0.1 NM at 1,000 ft");
nearly(a.geometricNm, a.rule106Nm, 0.15, "geometric range agrees with 1.06 √h");

console.log("\nCase 2  Two antennas add");
var b = C.compute({ height1: 1000, height2: 1000, altUnit: "ft" });
nearly(b.radioNm, 2 * a.radioNm, 1e-12, "equal heights: range doubles");
nearly(b.rule123Nm, 2 * 1.23 * Math.sqrt(1000), 1e-12, "1.23 (√h1 + √h2)");

console.log("\nCase 3  Zero height and invalid");
nearly(C.compute({ height1: 0, altUnit: "ft" }).radioNm, 0, 0, "zero height → zero range");
isTrue(C.compute({ height1: -1 }) === null, "negative height → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

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
console.log("Parachute descent\n");

console.log("Case 1  1,000 ft, 1,000 fpm, 10 kt wind, entered v_t");
var a = C.compute({ height: 1000, altUnit: "ft", vt: 1000, vtUnit: "fpm", wind: 10, windUnit: "kt" });
nearly(a.timeConstSec, 60, 1e-12, "t = 1,000 ft / 1,000 fpm = 60 s");
nearly(a.driftConstNm, 10 / 60, 1e-12, "drift = 10 kt × 1 min = 1/6 NM");
// From rest should be a little longer than 60 s
isTrue(a.timeFromRestSec > 60, "from-rest time is longer than h/v_t (starts at 0)");
// For a long drop (h >> vt²/g) the times converge. 1000 ft at 1000 fpm:
// vt = 5.08 m/s, vt²/g ≈ 2.63 m, h = 304.8 m >> 2.63, so very close.
nearly(a.timeFromRestSec, 60, 1.0, "from a typical opening height, within 1 s of h/v_t");

console.log("\nCase 2  v_t from mass, Cd, area");
// m=100 kg, Cd=1.5, A=80 m², ρ=1.225 → vt = sqrt(2*100*9.80665/(1.225*1.5*80))
var vt = Math.sqrt(2 * 100 * C.G0 / (1.225 * 1.5 * 80));
var b = C.compute({ height: 1000, altUnit: "ft", mass: 100, massUnit: "kg", cd: 1.5, area: 80, areaUnit: "m2" });
nearly(b.vtMps, vt, 1e-12, "v_t = √(2mg/(ρ Cd A))");

console.log("\nCase 3  Invalid");
isTrue(C.compute({ height: 1000, altUnit: "ft", vt: 0 }) === null, "zero v_t → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

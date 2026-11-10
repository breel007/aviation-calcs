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

console.log("True altitude\n");

console.log("Case 1  PA 10,000 ft, OAT −25 °C (ISA is −5 °C) — the classic cold-weather example");
var r = C.compute({ pressureAltitudeFt: 10000, oat: -25, tempUnit: "C" });
nearly(r.isaTempC, -4.812, 0.02, "ISA at 10,000 ft ≈ −5 °C (actually −4.81 from 1.98 °C/1,000 ft)");
nearly(r.trueAltitudeFt, 10000 * (r.oatC + 273.15) / r.isaTempK, 1e-9, "TA = PA × T/TISA");
// 10,000 × 248.15 / 268.338 ≈ 9,247 ft (using exact ISA, not the rounded −5 °C)
nearly(r.trueAltitudeFt, 9247, 5, "TA ≈ 9,247 ft (hand-checked with exact ISA)");
isTrue(r.colderThanIsa === true, "colder than ISA → true altitude below PA");
// Rule of thumb: 4 ft/°C/1,000 ft × (−20 °C) × 10 ≈ −800 ft if ISA is taken as −5
isTrue(r.ruleOfThumbTrueFt < 10000, "rule of thumb also 'look out below'");

console.log("\nCase 2  Standard ISA column: TA = PA");
var s = C.compute({ pressureAltitudeFt: 5000, isaDeviationC: 0, tempSource: "isa-dev" });
nearly(s.trueAltitudeFt, 5000, 1e-9, "zero ISA deviation → TA = PA");
nearly(s.correctionFt, 0, 1e-9, "zero correction");

console.log("\nCase 3  Hot day, ISA +20 at 3,000 ft");
var h = C.compute({ pressureAltitudeFt: 3000, isaDeviationC: 20, tempSource: "isa-dev" });
isTrue(h.trueAltitudeFt > 3000, "warmer than ISA → true altitude above PA");

console.log("\nCase 4  Fahrenheit input");
var f = C.compute({ pressureAltitudeFt: 0, oat: 59, tempUnit: "F" });
nearly(f.oatC, 15, 1e-12, "59 °F = 15 °C");
nearly(f.trueAltitudeFt, 0, 1e-9, "SL ISA → TA = 0");

console.log("\nCase 5  Invalid");
isTrue(C.compute({ pressureAltitudeFt: 10000 }) === null, "missing temperature → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

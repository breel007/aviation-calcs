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
console.log("Cold temperature correction\n");

console.log("Case 1  Worked example: airport 1,000 ft, −25 °C, published 3,000 ft (H = 2,000)");
var r = C.compute({ temperature: -25, elevation: 1000, publishedAltitude: 3000 });
// t0 = -25 + 0.00198*1000 = -23.02
// denom = 273 + (-23.02) - 0.5*0.00198*(2000+1000) = 249.98 - 2.97 = 247.01
// Δh = 2000 * 38.02 / 247.01 ≈ 307.84
nearly(r.heightFt, 2000, 1e-12, "H = published − elevation");
nearly(r.formulaFt, 2000 * (15 - (-23.02)) / (273 + (-23.02) - 0.5 * 0.00198 * 3000), 1e-6, "Doc 8168 formula");
nearly(r.formulaFt, 307.84, 0.1, "hand check ≈ 308 ft");
nearly(r.indicatedToFlyFt, 3000 + r.formulaFt, 1e-9, "altitude to fly = published + correction");
nearly(r.indicatedToFlyRound10, 3310, 1e-9, "round the correction up to the next 10 ft → 3,310");
isTrue(r.trueIfUncorrectedFt < 3000, "uncorrected, true altitude is below published");

console.log("\nCase 2  AIM table exact cells");
nearly(C.tableLookup(2000, -20), 280, 0, "table 2,000 ft / −20 °C = 280 ft");
nearly(C.tableLookup(1000, 0), 60, 0, "table 1,000 ft / 0 °C = 60 ft");
nearly(C.tableLookup(5000, -50), 1500, 0, "table 5,000 ft / −50 °C = 1,500 ft");
nearly(C.tableLookup(200, 10), 10, 0, "table 200 ft / +10 °C = 10 ft");

console.log("\nCase 3  Sea-level, 0 °C, 1,000 ft: formula vs 4% rule");
var s = C.compute({ temperature: 0, elevation: 0, height: 1000 });
// t0=0, Δh = 1000*(15-0)/(273+0-0.5*0.00198*1000) = 15000/272.01 ≈ 55.15
nearly(s.formulaFt, 15000 / (273 - 0.99), 1e-6, "sea-level formula");
nearly(s.rule4pctFt, 1000 * 0.04 * (15 / 10), 1e-12, "4% rule: 4% × 1.5 × 1,000 = 60 ft");
nearly(s.tableFt, 60, 0, "table at this point is 60 ft");

console.log("\nCase 4  Standard day at sea level → ~0 correction");
var t = C.compute({ temperature: 15, elevation: 0, height: 2000 });
nearly(t.formulaFt, 0, 1e-12, "15 °C at sea level, formula is 0");
nearly(t.addFt, 0, 0, "nothing to add");
isTrue(C.compute({ temperature: -10, publishedAltitude: 500, elevation: 1000 }) === null, "published below field → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

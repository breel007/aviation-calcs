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
console.log("Approach / landing speed\n");

console.log("Case 1  1.3 × 40 kt Vso = 52 kt");
var a = C.compute({ vso: 40 });
nearly(a.vrefKt, 52, 1e-12, "1.3 × 40 = 52 kt");
nearly(a.vappKt, 52, 1e-12, "no gust → Vapp = Vref");
nearly(a.factor, 1.3, 0, "default factor 1.3");

console.log("\nCase 2  Weight 2,000 lb vs 2,400 lb reference");
var b = C.compute({ vso: 40, weight: 2000, weightRef: 2400 });
nearly(b.weightFactor, Math.sqrt(2000 / 2400), 1e-12, "√(W/Wref)");
nearly(b.vrefKt, 52 * Math.sqrt(2000 / 2400), 1e-12, "Vref scaled by √(W/Wref)");
nearly(b.vrefKt, 47.469, 0.002, "hand check 52 × √(5/6) ≈ 47.47 kt");

console.log("\nCase 3  FAA gust factor: 15 G 25 → add 5 kt");
var c = C.compute({ vso: 40, wind: 15, gust: 25 });
nearly(c.gustIncrementKt, 10, 1e-12, "gust increment = 25 − 15 = 10 kt");
nearly(c.faaAdditiveKt, 5, 1e-12, "additive = ½ × 10 = 5 kt");
nearly(c.vappKt, 57, 1e-12, "Vapp = 52 + 5 = 57 kt");

console.log("\nCase 4  Transport additive ½ HW + full gust, cap 20");
var d = C.compute({ vso: 50, wind: 10, gust: 20, headwind: 10, transportCap: 20 });
// Vref = 65; increment = 10; ½ HW = 5; sum = 15, under cap
nearly(d.vrefKt, 65, 1e-12, "1.3 × 50 = 65");
nearly(d.transportAdditiveKt, 15, 1e-12, "½×10 + 10 = 15 kt");
nearly(d.transportVappKt, 80, 1e-12, "65 + 15 = 80 kt");
isTrue(d.faaAdditiveKt === 5, "FAA method still adds only half the gust increment");

console.log("\nCase 5  Invalid");
isTrue(C.compute({ vso: 0 }) === null, "zero Vso → null");
isTrue(C.compute({ vso: 40, factor: 1 }) === null, "factor must be > 1");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

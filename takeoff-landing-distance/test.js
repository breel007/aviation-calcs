#!/usr/bin/env node
"use strict";
require("../standard-atmosphere/calc.js");
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
console.log("Takeoff / landing distance corrections\n");

console.log("Case 1  PHAK wind: 10% of V headwind and tailwind, 1,000 ft baseline");
var hw = C.compute({ kind: "takeoff", distance: 1000, speed: 60, headwind: 6 });
nearly(hw.fWind, 0.81, 1e-12, "10% headwind factor = 0.9² = 0.81 (19% reduction)");
nearly(hw.correctedFt, 810, 1e-9, "1,000 × 0.81 = 810 ft");
var tw = C.compute({ kind: "takeoff", distance: 1000, speed: 60, headwind: -6 });
nearly(tw.fWind, 1.21, 1e-12, "10% tailwind factor = 1.1² = 1.21 (21% increase)");
nearly(tw.correctedFt, 1210, 1e-9, "1,000 × 1.21 = 1,210 ft");

console.log("\nCase 2  Weight 10% high → 21% more distance");
var w = C.compute({ kind: "takeoff", distance: 1000, weight: 2200, weightRef: 2000 });
nearly(w.fWeight, 1.21, 1e-12, "(1.1)² = 1.21");
nearly(w.correctedFt, 1210, 1e-9, "1,210 ft");

console.log("\nCase 3  Density altitude 3,000 ft vs sea-level baseline");
var d = C.compute({ kind: "takeoff", distance: 1000, densityAltitude: 3000, densityAltitudeRef: 0 });
nearly(d.fDaThumb, 1.30, 1e-12, "10% per 1,000 ft DA → 1.30");
isTrue(d.sigma < 1 && d.fDaSigma > 1, "σ < 1 and 1/σ > 1 at 3,000 ft DA");
// ISA σ at 3000 ft ≈ 0.915 (hand: roughly 0.91–0.92), 1/σ ≈ 1.09
nearly(d.fDaSigma, d.sigmaRef / d.sigma, 1e-12, "constant-thrust factor is σ_ref / σ");
isTrue(d.fDaSigma > 1.08 && d.fDaSigma < 1.12, "1/σ at 3,000 ft is about 1.09, less than the 1.30 thumb rule");

console.log("\nCase 4  2% upslope takeoff / landing and dry grass");
var sl = C.compute({ kind: "takeoff", distance: 1000, slope: 2, surface: "paved-dry" });
nearly(sl.fSlope, 1.10, 1e-12, "2% upslope takeoff × 1.10");
nearly(sl.correctedFt, 1100, 1e-9, "1,100 ft");
var ld = C.compute({ kind: "landing", distance: 1000, slope: 2, surface: "paved-dry" });
nearly(ld.fSlope, 0.90, 1e-12, "2% upslope shortens the landing roll");
var gr = C.compute({ kind: "takeoff", distance: 1000, surface: "grass-dry" });
nearly(gr.fSurface, 1.20, 1e-12, "dry grass takeoff × 1.20");
var lg = C.compute({ kind: "landing", distance: 1000, surface: "grass-wet" });
nearly(lg.fSurface, 1.35, 1e-12, "wet grass landing × 1.35");

console.log("\nCase 5  Combined and invalid");
var all = C.compute({
  kind: "takeoff", distance: 1500, speed: 60, headwind: 6,
  weight: 2200, weightRef: 2000, slope: 0, surface: "paved-dry"
});
nearly(all.correctedFt, 1500 * 1.21 * 0.81, 1e-9, "weight and wind multiply: 1,500 × 1.21 × 0.81");
isTrue(C.compute({ kind: "takeoff", distance: 1000, surface: "soft" }).error === "surface", "soft surface is refused");
isTrue(C.compute({ kind: "takeoff", distance: 1000, speed: 50, headwind: 50 }).error === "wind", "Vw ≥ V refused");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

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

console.log("Wing loading and aspect ratio\n");

console.log("Case 1  Cessna 172S-class numbers (hand-checked): 2,550 lb, 174 ft², 36.1 ft span");
var r = C.compute({
  weight: 2550, weightUnit: "lb",
  area: 174, areaUnit: "ft2",
  span: 36.1, spanUnit: "ft",
  CLmax: 1.6
});
nearly(r.wingLoadingPsf, 2550 / 174, 1e-9, "W/S = 14.655 psf");
nearly(r.aspectRatio, 36.1 * 36.1 / 174, 1e-9, "AR = b²/S ≈ 7.49");
var Vs = Math.sqrt(2 * r.wingLoadingPa / (1.225 * 1.6));
nearly(r.stallSpeedMps, Vs, 1e-9, "Vs = √(2 (W/S)/(ρ CLmax))");
nearly(r.stallSpeedKt, Vs / (1852 / 3600), 1e-9, "Vs in knots");

console.log("\nCase 2  Tapered wing MAC");
// τ = 0.5, S and b known: cr = 2S/(b(1+τ)), MAC = (2/3) cr (1+τ+τ²)/(1+τ)
var t = C.compute({ area: 20, span: 10, taper: 0.5 });
nearly(t.aspectRatio, 5, 1e-12, "AR = 5");
nearly(t.rootChordM, 2 * 20 / (10 * 1.5), 1e-12, "cr = 2S/(b(1+τ)) = 2.667 m");
nearly(t.tipChordM, t.rootChordM * 0.5, 1e-12, "ct = τ cr");
nearly(t.macM, (2 / 3) * t.rootChordM * (1 + 0.5 + 0.25) / 1.5, 1e-12, "MAC formula for linear taper");

console.log("\nCase 3  Recover S from b and AR");
var s = C.compute({ span: 12, aspectRatio: 8, weight: 8000, weightUnit: "N" });
nearly(s.areaM2, 12 * 12 / 8, 1e-12, "S = b²/AR = 18 m²");
nearly(s.wingLoadingPa, 8000 / 18, 1e-12, "W/S in Pa");

console.log("\nCase 4  Invalid");
isTrue(C.compute({ area: 10 }) == null || C.compute({ area: 10 }).aspectRatio == null, "one dimension is not enough for AR");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

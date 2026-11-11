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
console.log("Pull-up load factor\n");

var KT_TO_FT_S = 1852 / 0.3048 / 3600;
var G = C.G_FT;

console.log("Case 1  100 kt, 1,000 ft radius");
var a = C.compute({ speed: 100, radius: 1000, speedUnit: "kt", radiusUnit: "ft" });
var v = 100 * KT_TO_FT_S;
var v2gR = (v * v) / (G * 1000);
nearly(a.nBottom, 1 + v2gR, 1e-12, "n_bottom = 1 + V²/(gR)");
nearly(a.nBottom, 1.8852, 0.0005, "hand check ≈ 1.885 g");
nearly(a.nTop, v2gR - 1, 1e-12, "n_top = V²/(gR) − 1");
isTrue(a.topPossible === false, "V²/(gR) < 1: top of a loop is not possible at this speed/radius");
nearly(a.nPushover, 1 - v2gR, 1e-12, "push-over n = 1 − V²/(gR)");

console.log("\nCase 2  Invert: n = 3 at 120 kt → radius");
var b = C.compute({ mode: "vn", speed: 120, n: 3, speedUnit: "kt" });
var v2 = 120 * KT_TO_FT_S;
nearly(b.radiusFt, (v2 * v2) / (G * 2), 1e-6, "R = V² / (g(n−1))");
var c = C.compute({ mode: "nr", n: 3, radius: b.radiusFt, radiusUnit: "ft" });
nearly(c.speedKt, 120, 1e-8, "round-trip speed from n and R");

console.log("\nCase 3  Accelerated stall: Vs 60 kt at n = 2.25 → 90 kt");
var d = C.compute({ mode: "vn", speed: 150, n: 2.25, vs: 60 });
nearly(d.vsAccelerated, 90, 1e-12, "60 × √2.25 = 90");

console.log("\nCase 4  Top of a loop possible when V²/(gR) > 1");
var e = C.compute({ speed: 200, radius: 800, speedUnit: "kt", radiusUnit: "ft" });
isTrue(e.topPossible === true && e.nTop > 0, "faster / tighter: n_top is positive");

console.log("\nCase 5  Invalid");
isTrue(C.compute({ speed: 0, radius: 1000 }) === null, "zero speed → null");
isTrue(C.compute({ mode: "vn", speed: 100, n: 1 }) === null, "n ≤ 1 cannot invert for a pull-up radius");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

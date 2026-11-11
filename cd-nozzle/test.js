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
console.log("Convergent-divergent nozzle\n");

console.log("Case 1  Sonic throat, Ae/At = 1");
var a = C.compute({ areaRatio: 1, gamma: 1.4 });
nearly(a.exitMach, 1, 1e-10, "Me = 1 at Ae/At = 1");
nearly(a.pe_p0, Math.pow(1.2, -3.5), 1e-12, "pe/p0 = (1+(γ−1)/2)^{−γ/(γ−1)} = 1.2^−3.5");
nearly(a.pe_p0, 0.528282, 1e-6, "hand check 1.2^{-3.5} ≈ 0.528282");

console.log("\nCase 2  Design Mach 2, γ = 1.4 (NACA 1135)");
var b = C.compute({ mode: "mach", mach: 2, gamma: 1.4 });
nearly(b.areaRatio, 1.6875, 1e-12, "A/A* at M=2 is exactly 1.6875 for γ=1.4");
nearly(b.pe_p0, 0.1278045255, 1e-8, "p/p0 at M=2 ≈ 0.12780");
var c = C.compute({ areaRatio: b.areaRatio, gamma: 1.4 });
nearly(c.exitMach, 2, 1e-8, "invert Ae/At back to Me = 2");

console.log("\nCase 3  Perfectly expanded Cf at M=2");
var d = C.compute({ mode: "mach", mach: 2, gamma: 1.4, pa_p0: b.pe_p0 });
isTrue(d.regime === "perfectly expanded", "pa = pe → perfectly expanded");
var cfMom = C.idealMomentumCf(b.pe_p0, 1.4);
nearly(d.CfMomentum, cfMom, 1e-12, "momentum Cf from the Sutton formula");
nearly(d.Cf, cfMom, 1e-8, "pressure term vanishes when pe = pa");
nearly(d.CfVacuum, cfMom + b.pe_p0 * b.areaRatio, 1e-12, "vacuum Cf adds (pe/p0)(Ae/At)");
// Published-scale hand check: Cf_opt at M=2, γ=1.4 is about 1.221
nearly(d.Cf, 1.2078, 0.0002, "ideal Cf at M=2, γ=1.4 ≈ 1.2078");

console.log("\nCase 4  Over- / under-expanded and dimensional thrust");
var over = C.compute({ mode: "mach", mach: 2, gamma: 1.4, p0: 10, pa: 2, At: 1 });
isTrue(over.regime === "overexpanded", "pa > pe (pe/p0≈0.128, pa/p0=0.2) → overexpanded");
nearly(over.thrust, over.Cf * 10 * 1, 1e-12, "F = Cf p0 At");
var under = C.compute({ mode: "mach", mach: 2, gamma: 1.4, pa_p0: 0.05 });
isTrue(under.regime === "underexpanded", "pa < pe → underexpanded");

console.log("\nCase 5  Invalid");
isTrue(C.compute({ areaRatio: 0.8 }) === null, "Ae/At < 1 → null");
isTrue(C.compute({ mode: "mach", mach: 0.8 }) === null, "C-D design Mach must be ≥ 1");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

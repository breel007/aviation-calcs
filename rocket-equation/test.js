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

console.log("Rocket equation\n");

console.log("Case 1  Mass ratio e, Δv = ve (hand-checked identity)");
var r = C.compute({ mode: "delta-v", ve: 3000, m0: Math.E, mf: 1 });
nearly(r.deltaV, 3000, 1e-8, "Δv = ve ln(e) = ve");
nearly(r.massRatio, Math.E, 1e-12, "MR = e");
nearly(r.Isp, 3000 / 9.80665, 1e-9, "Isp = ve/g0");

console.log("\nCase 2  Isp = 300 s, MR = 5 (hand-checked)");
// Δv = 300 × 9.80665 × ln(5) = 2941.995 × 1.6094379 = 4735.02 m/s
var s = C.compute({ mode: "delta-v", Isp: 300, m0: 5000, mf: 1000 });
nearly(s.deltaV, 300 * 9.80665 * Math.log(5), 1e-8, "Δv = Isp g0 ln(5)");
nearly(s.deltaV, 4734.96, 0.05, "Δv ≈ 4,735 m/s (hand-checked)");
nearly(s.propellantFraction, 0.8, 1e-12, "propellant fraction = 1 − 1/MR = 0.8");

console.log("\nCase 3  Invert: required mass ratio for a Δv");
var inv = C.compute({ mode: "mass-ratio", Isp: 300, deltaV: s.deltaV, m0: 5000 });
nearly(inv.massRatio, 5, 1e-10, "MR inverts");
nearly(inv.mf, 1000, 1e-6, "mf inverts");

console.log("\nCase 4  Two stages add");
var two = C.compute({
  stages: [
    { Isp: 280, m0: 100000, mf: 20000 },
    { Isp: 450, m0: 18000, mf: 6000 }
  ]
});
nearly(two.deltaV, two.stages[0].deltaV + two.stages[1].deltaV, 1e-12, "stage Δv sums");
isTrue(two.stageCount === 2, "two stages");

console.log("\nCase 5  Invalid");
isTrue(C.compute({ Isp: 300, m0: 1, mf: 2 }) === null, "mf > m0 → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

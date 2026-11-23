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
console.log("Propeller static thrust\n");

console.log("Case 1  100 kW, 2 m diameter, η = 1, ISA sea-level density");
var a = C.compute({ power: 100, powerUnit: "kw", diameter: 2, diaUnit: "m", eta: 1 });
var A = Math.PI;
var T = Math.pow(2 * C.RHO0 * A * 100000 * 100000, 1/3);
nearly(a.areaM2, A, 1e-12, "A = π R² = π m²");
nearly(a.thrustN, T, 1e-8, "T = (2 ρ A P²)^{1/3}");
// Hand check: 2*1.225*π*1e10 = 7.697e10, cbrt ≈ 4,254 N (≈ 956 lbf), as in the article
nearly(a.thrustN, 4254, 0.5, "hand check ≈ 4,254 N");
nearly(a.thrustN / 4.4482216, 956, 0.5, "≈ 956 lbf");
nearly(a.inducedMps, 100000 / a.thrustN, 1e-9, "v_i = P/T");
nearly(a.inducedDiskMps, a.thrustN / (2 * C.RHO0 * A), 1e-9, "v_i = T/(2ρA) agrees");

console.log("\nCase 2  70% useful power reduces thrust by 0.70^{2/3}");
var b = C.compute({ power: 100, powerUnit: "kw", diameter: 2, eta: 0.7 });
nearly(b.thrustN, T * Math.pow(0.7, 2/3), 1e-6, "T scales as η^{2/3}");

console.log("\nCase 3  Invalid");
isTrue(C.compute({ power: 100, diameter: 0 }) === null, "zero diameter → null");

console.log("\nWorked example (as published on the page)");
var we = C.compute({ power: 100, powerUnit: "kw", diameter: 2, diaUnit: "m", eta: 1 });
nearly(we.thrustN, 4253.75, 1, "worked example: 100 kW, 2 m, η = 1 → ≈ 4,254 N");
nearly(we.thrustLbf, 956.28, 0.5, "≈ 956 lbf");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

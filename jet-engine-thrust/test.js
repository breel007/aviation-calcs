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
console.log("Jet engine thrust / TSFC\n");

console.log("Case 1  Static, perfectly expanded, ṁ_a = 50 kg/s, u_e = 600 m/s, f = 0.02");
var a = C.compute({ airflow: 50, exitSpeed: 600, flightSpeed: 0, far: 0.02 });
nearly(a.thrustN, 50 * (1.02 * 600 - 0), 1e-9, "F = ṁ_a ((1+f)ue − u0)");
nearly(a.thrustN, 30600, 1e-9, "hand check 30,600 N");
nearly(a.fuelMassFlow, 1.0, 1e-12, "ṁ_f = f ṁ_a = 1 kg/s");
nearly(a.tsfcKgPerNs, 1 / 30600, 1e-18, "TSFC = ṁ_f / F");

console.log("\nCase 2  Pressure term and a flight speed");
var b = C.compute({ airflow: 50, exitSpeed: 600, flightSpeed: 200, far: 0.02, exitPressure: 110000, ambientPressure: 101325, exitArea: 0.4 });
nearly(b.pressureTermN, (110000 - 101325) * 0.4, 1e-9, "(pe−p0)Ae");
nearly(b.thrustN, 50 * (1.02 * 600 - 200) + b.pressureTermN, 1e-9, "momentum plus pressure");

console.log("\nCase 3  Invalid");
isTrue(C.compute({ airflow: 0, exitSpeed: 600 }) === null, "zero airflow → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

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
console.log("Electric aircraft endurance\n");

console.log("Case 1  20 kWh usable 90%, 40 kW, 100 kt");
var a = C.compute({ energyWh: 20000, usableFrac: 0.9, powerW: 40000, speed: 100, speedUnit: "kt" });
nearly(a.usableWh, 18000, 1e-12, "90% of 20 kWh is 18 kWh");
nearly(a.enduranceHours, 18000 / 40000, 1e-12, "t = 18 kWh / 40 kW = 0.45 h");
nearly(a.rangeNm, 100 * 0.45, 1e-12, "range = 100 kt × 0.45 h = 45 NM");

console.log("\nCase 2  Power from W, V, L/D");
// 1,000 kg, 100 kt, L/D 15, η 0.8
var v = 100 * 1852 / 3600;
var pReq = 1000 * C.G0 * v / 15;
var b = C.compute({ mode: "ld", capacityKwh: 20, usableFrac: 0.9, mass: 1000, speed: 100, speedUnit: "kt", liftToDrag: 15, eta: 0.8 });
nearly(b.requiredPowerW, pReq, 1e-9, "P_req = W V / (L/D)");
nearly(b.electricPowerW, pReq / 0.8, 1e-9, "P_elec = P_req / η");
nearly(b.enduranceHours, 18000 / b.electricPowerW, 1e-12, "endurance from derived power");

console.log("\nCase 3  Invalid");
isTrue(C.compute({ energyWh: 20000, powerW: 0 }) === null, "zero power → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

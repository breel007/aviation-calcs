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
console.log("Thrust and power required\n");

console.log("Case 1  2,400 lbf, 174 ft², 100 kt, sea level, CD0=0.02, e=0.8, AR=8");
var r = C.compute({ weight: 2400, weightUnit: "lbf", area: 174, areaUnit: "ft2", speed: 100, speedUnit: "kt", CD0: 0.02, e: 0.8, AR: 8, densityAltitude: 0 });
var W = 2400 * 4.4482216152605;
var S = 174 * 0.3048 * 0.3048;
var V = 100 * 1852 / 3600;
var rho = require("../standard-atmosphere/calc.js").propertiesFromGeometric(0).densityKgM3;
var q = 0.5 * rho * V * V;
var k = 1 / (Math.PI * 0.8 * 8);
var CL = W / (q * S);
var CD = 0.02 + k * CL * CL;
var D = q * S * CD;
nearly(r.CL, CL, 1e-12, "CL = W/(qS)");
nearly(r.CD, CD, 1e-12, "CD = CD0 + k CL²");
nearly(r.thrustRequiredN, D, 1e-8, "T_req = D");
nearly(r.powerRequiredW, D * V, 1e-6, "P_req = D V");
nearly(r.LD, CL / CD, 1e-12, "L/D at this speed");
nearly(r.LDmax, 1 / (2 * Math.sqrt(0.02 * k)), 1e-12, "(L/D)max matches the drag-polar page");
isTrue(r.speedLDmaxKt > 0 && r.speedMinPowerKt < r.speedLDmaxKt, "min-power speed is slower than (L/D)max speed");

console.log("\nCase 2  Propeller efficiency 0.80 → shaft power");
var s = C.compute({ weight: 2400, area: 174, speed: 100, CD0: 0.02, e: 0.8, AR: 8, eta: 0.8 });
nearly(s.shaftPowerW, s.powerRequiredW / 0.8, 1e-9, "P_shaft = P_req / η");

console.log("\nCase 3  Invalid");
isTrue(C.compute({ weight: 2400, area: 174, speed: 100, CD0: 0 }) === null, "zero CD0 → null");
isTrue(C.compute({ weight: 0, area: 174, speed: 100, CD0: 0.02, k: 0.05 }) === null, "zero weight → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

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

console.log("Breguet range and endurance\n");

console.log("Case 1  Jet: 450 kt, TSFC 0.5 /h, L/D = 16, Wi/Wf = 1.2 (hand-checked)");
var j = C.compute({
  kind: "jet",
  Wi: 120000, Wf: 100000,
  liftToDrag: 16,
  velocity: 450, velocityUnit: "kt",
  tsfc: 0.5, tsfcUnit: "per-h"
});
var ln = Math.log(1.2);
// R_nm = (V_kt / ct_per_h) * (L/D) * ln = (450/0.5)*16*ln(1.2)
nearly(j.ln, ln, 1e-12, "ln(Wi/Wf) = ln(1.2)");
nearly(j.rangeNm, (450 / 0.5) * 16 * ln, 1e-8, "R = (V/ct)(L/D)ln(Wi/Wf) in nm");
nearly(j.rangeNm, 2625.35, 0.1, "R ≈ 2,625 nm (hand-checked)");
// E = (1/ct)(L/D)ln = (1/0.5)*16*ln(1.2) hours
nearly(j.enduranceH, (1 / 0.5) * 16 * ln, 1e-10, "E = (1/ct)(L/D)ln hours");
nearly(j.enduranceH, 5.834, 0.002, "E ≈ 5.83 h");
nearly(j.rangeNm, 450 * j.enduranceH, 1e-8, "range = V × endurance at constant speed");

console.log("\nCase 2  Propeller: η = 0.80, c = 0.45 lb/(hp·h), L/D = 14, Wi/Wf = 1.15");
var p = C.compute({
  kind: "prop",
  Wi: 2300, Wf: 2300 / 1.15,
  liftToDrag: 14,
  eta: 0.80,
  sfc: 0.45, sfcUnit: "lb/hp-h",
  velocity: 120, velocityUnit: "kt"
});
var lnP = Math.log(1.15);
var R = C.NM_PER_HP_H * (0.8 / 0.45) * 14 * lnP;
nearly(p.rangeNm, R, 1e-8, "R_nmi = 325.87 (η/c)(L/D)ln");
nearly(C.NM_PER_HP_H, 550 * 3600 / 6076.11548556, 1e-8, "325.87 nmi per hp·h identity");
isTrue(p.enduranceH > 0, "endurance from range / V");
nearly(p.rangeNm, 120 * p.enduranceH, 1e-6, "prop range = V × endurance at constant speed");

console.log("\nCase 3  Invalid");
isTrue(C.compute({ kind: "jet", Wi: 100, Wf: 120, liftToDrag: 16, velocity: 400, tsfc: 0.5 }) === null, "Wf > Wi → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

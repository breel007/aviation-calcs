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
console.log("Propeller advance ratio and tip Mach\n");

console.log("Case 1  100 kt, 2,400 rpm, 6.5 ft diameter, sea-level ISA");
var r = C.compute({ tas: 100, tasUnit: "kt", rpm: 2400, diameter: 6.5, diameterUnit: "ft", altitude: 0 });
var V = 100 * 1852 / 3600;
var n = 2400 / 60;
var D = 6.5 * 0.3048;
nearly(r.J, V / (n * D), 1e-12, "J = V/(nD)");
nearly(r.J, 0.64916, 1e-5, "hand check J ≈ 0.649");
var tipRot = Math.PI * n * D;
nearly(r.tipSpeedRotMps, tipRot, 1e-12, "rotational tip speed = π n D");
nearly(r.tipSpeedHelMps, Math.sqrt(V * V + tipRot * tipRot), 1e-12, "helical tip speed");
var Atm = require("../standard-atmosphere/calc.js");
var a = Atm.propertiesFromGeometric(0).speedOfSoundMps;
nearly(r.speedOfSoundMps, a, 1e-9, "ISA sea-level speed of sound");
nearly(r.tipMachRot, tipRot / a, 1e-12, "rotational tip Mach");
nearly(r.tipMachHel, Math.sqrt(V * V + tipRot * tipRot) / a, 1e-12, "helical tip Mach");
isTrue(r.tipMachHel > r.tipMachRot, "helical Mach is higher than rotational");

console.log("\nCase 2  Diameter in inches, static (TAS = 0)");
var s = C.compute({ tas: 0, rpm: 2700, diameter: 72, diameterUnit: "in" });
nearly(s.J, 0, 0, "static advance ratio is 0");
nearly(s.diameterM, 72 * 0.0254, 1e-12, "72 in = 1.8288 m");
nearly(s.tipMachHel, s.tipMachRot, 1e-12, "static: helical = rotational tip Mach");

console.log("\nCase 3  Invalid");
isTrue(C.compute({ tas: 100, rpm: 0, diameter: 6 }) === null, "zero rpm → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

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
console.log("Satellite footprint / FOV\n");

var R = 6371000, h = 400000, r = R + h;

console.log("Case 1  400 km circular, spherical mean Earth");
var a = C.compute({ altitude: 400, altUnit: "km" });
nearly(a.etaHorizonDeg, Math.asin(R / r) * 180 / Math.PI, 1e-12, "η_horizon = arcsin(R/(R+h))");
nearly(a.lambdaHorizonDeg, Math.acos(R / r) * 180 / Math.PI, 1e-12, "λ_horizon = arccos(R/(R+h))");
nearly(a.etaHorizonDeg, 70.207, 0.01, "hand check η_horizon ≈ 70.21°");
nearly(a.lambdaHorizonDeg, 19.793, 0.01, "hand check λ_horizon ≈ 19.79°");
nearly(a.horizonRadiusM, R * a.lambdaHorizonRad, 1e-6, "horizon radius = R λ");
nearly(a.horizonRadiusM / 1000, 2199.5, 2, "horizon radius ≈ 2,200 km");

console.log("\nCase 2  15° half-angle nadir FOV at 400 km");
var b = C.compute({ altitude: 400, altUnit: "km", nadirAngle: 15 });
var eta = 15 * Math.PI / 180;
var lam = Math.asin((r / R) * Math.sin(eta)) - eta;
nearly(b.lambdaRad, lam, 1e-12, "λ = arcsin(((R+h)/R) sin η) − η");
nearly(b.lambdaDeg, 0.966, 0.005, "hand check λ ≈ 0.966°");
nearly(b.groundRangeM, R * lam, 1e-6, "ground range = R λ");
nearly(b.swathM, 2 * b.groundRangeM, 1e-9, "swath is twice the ground range");
isTrue(b.belowHorizon === true, "15° is inside the 70° horizon");

console.log("\nCase 3  Look past the limb");
var c = C.compute({ altitude: 400, altUnit: "km", nadirAngle: 80 });
isTrue(c.belowHorizon === false, "80° > η_horizon → no geometric intersection");
isTrue(c.groundRangeM == null, "no ground range past the limb");

console.log("\nCase 4  Period and speeds");
nearly(a.periodSec, 2 * Math.PI * Math.sqrt(r * r * r / C.MU_EARTH), 1e-6, "T = 2π √(a³/μ)");
nearly(a.periodMin, 92.4, 0.2, "400 km period ≈ 92.4 min");
nearly(a.orbitalSpeedMps, Math.sqrt(C.MU_EARTH / r), 1e-6, "V = √(μ/a)");
nearly(a.subsatelliteSpeedMps, a.orbitalSpeedMps * R / r, 1e-9, "ground speed = V R/(R+h)");

console.log("\nCase 5  Invalid");
isTrue(C.compute({ altitude: -10 }) === null, "negative altitude → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

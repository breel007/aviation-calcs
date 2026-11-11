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
console.log("Planetary Hohmann transfer\n");

console.log("Case 1  Earth–Mars");
var a = C.compute({ body1: "earth", body2: "mars" });
var r1 = C.AU, r2 = C.PLANETS_AU.mars * C.AU, at = 0.5 * (r1 + r2);
nearly(a.transferSmaM, at, 1e-3, "a_t = (r1+r2)/2");
nearly(a.timeOfFlightSec, Math.PI * Math.sqrt(at * at * at / C.MU_SUN), 1e-6, "TOF = π √(a_t³/μ)");
nearly(a.timeOfFlightDays, 259, 3, "hand check ≈ 259 days");
nearly(a.dvTotalMps, a.dv1Mps + a.dv2Mps, 1e-12, "total Δv is the sum");
isTrue(a.dv1Mps > 0 && a.dv2Mps > 0, "both impulses are positive");
// Synodic should match the synodic-period page's Earth–Mars to ~a day (slightly different T from Kepler vs tabulated)
nearly(a.synodicDays, 780, 5, "synodic wait ≈ 780 days");

console.log("\nCase 2  Round trip identity: swap bodies, same TOF and total Δv");
var b = C.compute({ body1: "mars", body2: "earth" });
nearly(b.timeOfFlightDays, a.timeOfFlightDays, 1e-12, "TOF is the same either way");
nearly(b.dvTotalMps, a.dvTotalMps, 1e-9, "total heliocentric Δv is the same");

console.log("\nCase 3  Invalid");
isTrue(C.compute({ body1: "earth", body2: "earth" }) === null, "same orbit → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

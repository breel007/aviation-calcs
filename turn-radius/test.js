#!/usr/bin/env node
/**
 * Verification for turn-radius / standard-rate math in calc.js.
 * Run:  node test.js
 *
 * ω = g tanφ / V;  r = V² / (g tanφ);  n = 1/cosφ;  Vs,φ = Vs √n
 * Standard rate = 3°/s. Bank rule of thumb: TAS/10 + 7.
 */
"use strict";

var TR = require("./calc.js");
var failed = 0;
var passed = 0;

function nearly(a, b, tol, label) {
  var ok = Math.abs(a - b) <= tol;
  if (ok) { passed += 1; console.log("  PASS  " + label); console.log("        got " + a + "  expected " + b + "  ±" + tol); }
  else { failed += 1; console.log("  FAIL  " + label); console.log("        got " + a + "  expected " + b + "  ±" + tol); }
}

function isTrue(cond, label) {
  if (cond) { passed += 1; console.log("  PASS  " + label); }
  else { failed += 1; console.log("  FAIL  " + label); }
}

var G = 9.80665;
var KT = 1852 / 3600;
var DEG = Math.PI / 180;

console.log("Turn radius / standard-rate bank — formula verification\n");

console.log("Case 1  Load factor and stall speed in a bank");
nearly(TR.loadFactor(0), 1, 1e-12, "n = 1 in wings-level flight");
nearly(TR.loadFactor(60), 2, 1e-12, "n = 2 in a 60° bank");
nearly(TR.loadFactor(45), 1 / Math.cos(45 * DEG), 1e-12, "n = 1/cos 45° ≈ 1.414");
nearly(TR.loadFactor(30), 1 / Math.cos(30 * DEG), 1e-12, "n = 1/cos 30° ≈ 1.1547");
nearly(TR.stallSpeedInBank(60, 60), 60 * Math.SQRT2, 1e-12, "60 kt stall × √2 at 60° bank");
nearly(TR.stallSpeedInBank(70, 45), 70 * Math.sqrt(1 / Math.cos(45 * DEG)), 1e-12, "stall at 45°");
nearly(TR.bankForLoadFactor(2), 60, 1e-12, "inverse: n = 2 → 60° bank");

console.log("\nCase 2  Standard-rate bank, 120 kt — exact and rule of thumb");
var v = 120 * KT;
var omega = 3 * DEG;
var phiExact = Math.atan(omega * v / G) / DEG;
nearly(TR.bankForRate(120, 3), phiExact, 1e-12, "exact std-rate bank at 120 kt");
nearly(TR.standardRateRuleOfThumb(120), 19, 0, "rule of thumb: 120/10 + 7 = 19°");
var c2 = TR.compute({ tasKt: 120, mode: "standard" });
nearly(c2.bankDeg, phiExact, 1e-12, "compute(mode=standard) uses the exact bank");
nearly(c2.rateDps, 3, 1e-12, "rate is 3°/s");
nearly(c2.time360Sec, 120, 1e-9, "a standard-rate 360° takes 120 s");

console.log("\nCase 3  Radius at 120 kt, standard rate");
// r = V / ω  (since a_n = Vω = g tanφ)
var rM = v / omega;
nearly(TR.radiusM(120, phiExact), rM, 1e-9, "radius = V/ω in metres");
nearly(c2.radiusM, rM, 1e-9, "compute() radius matches V/ω");
nearly(c2.radiusFt, rM / 0.3048, 1e-9, "radius in feet");
nearly(c2.radiusNm, rM / 1852, 1e-12, "radius in nautical miles");
// Also: circumference of a 2-minute turn is GS × 2 min
var circNm = 120 * (2 / 60);
nearly(2 * Math.PI * c2.radiusNm, circNm, 1e-9, "circumference = GS × 2 minutes");

console.log("\nCase 4  30° bank at 100 kt — rate formula 1091 tanφ / TAS");
var c4 = TR.compute({ tasKt: 100, mode: "bank", bankDeg: 30, stallSpeedKt: 50 });
var rate4 = (G * Math.tan(30 * DEG) / (100 * KT)) / DEG;
nearly(c4.rateDps, rate4, 1e-12, "ω = g tanφ / V");
// Published rule: deg/s ≈ 1,091 × tanφ / TAS_kt
var rule1091 = 1091 * Math.tan(30 * DEG) / 100;
nearly(c4.rateDps, rule1091, 0.01, "agrees with 1,091 tanφ / TAS to within 0.01°/s");
nearly(c4.loadFactor, 1 / Math.cos(30 * DEG), 1e-12, "load factor at 30°");
nearly(c4.stallSpeedBank, 50 * Math.sqrt(c4.loadFactor), 1e-12, "stall in the bank");

console.log("\nCase 5  Rule of thumb at a few speeds");
nearly(TR.standardRateRuleOfThumb(80), 15, 0, "80 kt → 15°");
nearly(TR.standardRateRuleOfThumb(100), 17, 0, "100 kt → 17°");
nearly(TR.standardRateRuleOfThumb(200), 27, 0, "200 kt → 27°");

console.log("\nCase 6  Inverse radius");
var bank = TR.bankForRadiusFt(120, c2.radiusFt);
nearly(bank, c2.bankDeg, 1e-8, "bankForRadiusFt inverts radiusFt");

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);

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

console.log("Mach number and dynamic pressure\n");

console.log("Case 1  Sea level, 100 kt TAS (hand-checked)");
var r = C.compute({ atmosphere: "isa", altitudeM: 0, speedMode: "velocity", velocity: 100, velocityUnit: "kt" });
var V = 100 * 1852 / 3600;
nearly(r.velocityMps, V, 1e-9, "100 kt → 51.444 m/s");
nearly(r.speedOfSoundMps, 340.294, 0.01, "a0 = 340.294 m/s");
nearly(r.mach, V / r.speedOfSoundMps, 1e-12, "M = V/a");
var q = 0.5 * 1.225 * V * V;
nearly(r.dynamicPressurePa, q, 0.05, "q = ½ ρ V²");
nearly(r.dynamicPressurePa, 0.5 * 1.4 * 101325 * r.mach * r.mach, 0.2, "q = ½ γ P M²");
nearly(r.dynamicPressurePsf, r.dynamicPressurePa / C.PA_PER_PSF, 1e-12, "q in psf = q/47.88");
// 100 kt at SL is essentially 100 kt EAS
nearly(r.easKt, 100, 0.05, "EAS ≈ TAS at sea-level density");
// Hand-checked: q ≈ 1621.6 Pa ≈ 33.87 psf; 100²/33.87 ≈ 295
nearly(r.dynamicPressurePsf, 33.87, 0.05, "q ≈ 33.87 psf at 100 kt SL (hand-checked)");

console.log("\nCase 2  Mach 0.8 at sea-level ISA");
var m = C.compute({ atmosphere: "isa", altitudeM: 0, speedMode: "mach", mach: 0.8 });
nearly(m.mach, 0.8, 1e-12, "M = 0.8");
nearly(m.velocityMps, 0.8 * m.speedOfSoundMps, 1e-9, "V = M a");
nearly(m.dynamicPressurePa, 0.7 * 101325 * 0.64, 1, "q = 0.7 P M²");

console.log("\nCase 3  Inverse atmosphere from T and P");
var man = C.compute({ atmosphere: "manual", tempK: 216.65, pressurePa: 22632.1, speedMode: "mach", mach: 0.85 });
nearly(man.speedOfSoundMps, 295.07, 0.05, "a at 216.65 K");
isTrue(man.isSupersonic === false, "M 0.85 is subsonic");

console.log("\nCase 4  Invalid");
isTrue(C.compute({ atmosphere: "isa", altitudeM: -1, speedMode: "mach", mach: 0.5 }).error != null ||
       C.compute({ atmosphere: "isa", altitudeM: -1, speedMode: "mach", mach: 0.5 }) == null, "negative altitude rejected");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

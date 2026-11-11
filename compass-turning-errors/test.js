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
console.log("Compass turning errors (UNOS / ANDS)\n");

console.log("Case 1  Dipole dip tan I = 2 tan λ");
nearly(C.dipFromLatitude(0), 0, 1e-12, "equator: I = 0");
nearly(C.dipFromLatitude(45), 180 / Math.PI * Math.atan(2), 1e-12, "45°: I = atan(2) ≈ 63.43°");
nearly(C.dipFromLatitude(45), 63.435, 0.001, "hand check atan(2) ≈ 63.435°");
nearly(C.dipFromLatitude(-45), -C.dipFromLatitude(45), 1e-12, "southern dip is opposite");
nearly(C.dipFromLatitude(90), 90, 1e-12, "pole: I = 90°");

console.log("\nCase 2  UNOS in the northern hemisphere");
var n = C.compute({ latitude: 40, heading: 0 });
isTrue(n.turnRule === "UNOS" && n.accelerationRule === "ANDS", "40°N uses UNOS / ANDS");
isTrue(n.rollout.action.indexOf("early") >= 0, "roll out early on north");
var s = C.compute({ latitude: 40, heading: 180 });
isTrue(s.rollout.action.indexOf("late") >= 0, "roll out late on south");
var e = C.compute({ latitude: 40, heading: 90 });
isTrue(e.acceleration.effect.indexOf("ANDS") >= 0, "east: ANDS acceleration error");

console.log("\nCase 3  Southern hemisphere reverses the sense");
var sn = C.compute({ latitude: -40, heading: 0 });
isTrue(sn.turnRule === "OSUN", "40°S uses OSUN");
isTrue(sn.rollout.action.indexOf("late") >= 0, "roll out late on north in the south");
isTrue(C.compute({ latitude: 0, heading: 0 }).rollout.action.indexOf("on heading") >= 0, "equator: no turning error");

console.log("\nCase 4  Invalid");
isTrue(C.compute({ latitude: 91 }) === null, "latitude 91 → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

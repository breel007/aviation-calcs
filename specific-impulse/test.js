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
console.log("Specific impulse\n");

console.log("Case 1  ve = 2,941.995 m/s → Isp = 300 s exactly");
var r = C.compute({ ve: 9.80665 * 300, veUnit: "m/s" });
nearly(r.Isp, 300, 1e-12, "Isp = ve/g0 = 300 s");
nearly(r.veMps, 2941.995, 1e-9, "ve = 300 × 9.80665");

console.log("\nCase 2  10,000 N at 300 s → mass flow");
var s = C.compute({ thrust: 10000, thrustUnit: "N", Isp: 300 });
nearly(s.mdotKgS, 10000 / (300 * 9.80665), 1e-12, "ṁ = F/(Isp g0) = 3.3993 kg/s");
nearly(s.mdotKgS, 3.399, 5e-4, "hand check 10000/(300*9.80665) ~ 3.399 kg/s");
nearly(s.veMps, 300 * 9.80665, 1e-12, "ve inferred from Isp");

console.log("\nCase 3  Infer Isp from thrust and ṁ, plus a mass-ratio Δv");
var t = C.compute({ thrust: 10000, mdot: 10000 / (300 * 9.80665), massRatio: Math.E });
nearly(t.Isp, 300, 1e-9, "Isp from F and ṁ");
nearly(t.deltaVMps, t.veMps, 1e-9, "Δv = ve ln(e) = ve");

console.log("\nCase 4  US customary: 1 lbf and 1 lbf/s → Isp = 1 s");
var u = C.compute({ thrust: 1, thrustUnit: "lbf", mdot: 1, mdotUnit: "lbf/s" });
nearly(u.Isp, 1, 1e-9, "Isp (s) = F(lbf) / ẇ(lbf/s)");
isTrue(C.compute({ Isp: 0 }) === null, "zero Isp → null");
isTrue(C.compute({ Isp: 300, ve: 1000 }) === null, "inconsistent ve and Isp → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

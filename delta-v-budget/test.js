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
console.log("Delta-v budget\n");

console.log("Case 1  Three items sum to 350 m/s");
var a = C.compute({
  items: [
    { name: "Gravity losses", value: 100, unit: "m/s", tag: "losses" },
    { name: "Drag losses", value: 200, unit: "m/s", tag: "losses" },
    { name: "Reserve", value: 50, unit: "m/s", tag: "reserve" }
  ]
});
nearly(a.deltaVMps, 350, 1e-12, "100+200+50 = 350 m/s");
nearly(a.deltaVKmS, 0.35, 1e-12, "0.35 km/s");
nearly(a.byTag.losses, 300, 1e-12, "losses tag subtotals 300 m/s");
nearly(a.byTag.reserve, 50, 1e-12, "reserve tag 50 m/s");
nearly(a.count, 3, 0, "three items");

console.log("\nCase 2  Plane change at 7.67 km/s through 30°");
var pc = C.planeChangeMps(7.67, "km/s", 30);
nearly(pc, 2 * 7670 * Math.sin(15 * Math.PI / 180), 1e-9, "Δv = 2 V sin(θ/2)");
nearly(pc / 1000, 3.9703, 0.0002, "hand check ≈ 3.970 km/s");
var b = C.compute({
  items: [{ name: "Plane change", value: pc, unit: "m/s" }],
  planeChange: { speed: 7.67, speedUnit: "km/s", angle: 30 }
});
nearly(b.planeChange.mps, pc, 1e-12, "helper matches the item");

console.log("\nCase 3  Mass ratio for 9.5 km/s at Isp 300 s");
var c = C.compute({
  items: [{ name: "Mission", value: 9.5, unit: "km/s" }],
  isp: 300
});
var ve = 300 * C.G0;
nearly(c.exhaustVelocity, ve, 1e-12, "ve = Isp g0");
nearly(c.massRatio, Math.exp(9500 / ve), 1e-12, "m0/mf = exp(Δv/ve)");
nearly(c.massRatio, 25.26, 0.02, "hand check ≈ 25.3");
nearly(c.propellantFraction, 1 - 1 / c.massRatio, 1e-12, "propellant fraction 1 − mf/m0");

console.log("\nCase 4  Invalid");
isTrue(C.compute({ items: [{ value: -1 }] }) === null, "negative Δv → null");
isTrue(C.compute({ items: [] }) === null, "empty list → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

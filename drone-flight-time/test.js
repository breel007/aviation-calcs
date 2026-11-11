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
console.log("Drone / multirotor flight time\n");

console.log("Case 1  2 kg, 4 × 0.25 m props, FM 0.6, 100 Wh usable 80%");
var a = C.compute({ mass: 2, rotors: 4, diameter: 0.25, fm: 0.6, energyWh: 100, usableFrac: 0.8 });
var W = 2 * C.G0;
var A = Math.PI * 0.125 * 0.125;
var pIdeal = W * Math.sqrt(W / (2 * C.RHO0 * 4 * A));
nearly(a.idealPowerW, pIdeal, 1e-9, "P_ideal = T √(T/(2ρ n A))");
nearly(a.hoverPowerW, pIdeal / 0.6, 1e-9, "P_hover = P_ideal / FM");
nearly(a.enduranceMin, (80 * 3600 / a.hoverPowerW) / 60, 1e-12, "t = usable Wh / P");
// Hand-check order of magnitude: P_ideal is a few hundred watts
isTrue(a.hoverPowerW > 100 && a.hoverPowerW < 800, "hover power is a few hundred watts for this quad");
isTrue(a.enduranceMin > 5 && a.enduranceMin < 60, "endurance is tens of minutes");

console.log("\nCase 2  Thrust-to-weight 2:1");
var b = C.compute({ mass: 2, rotors: 4, diameter: 0.25, maxThrust: 2 * 2 * C.G0, thrustUnit: "n" });
nearly(b.thrustToWeight, 2, 1e-12, "T/W = 2");

console.log("\nCase 3  Capacity in mAh");
var c = C.compute({ mass: 2, rotors: 4, diameter: 0.25, capacityMah: 5000, voltage: 22.2, usableFrac: 0.8, fm: 0.6 });
nearly(c.energyWh, 5 * 22.2, 1e-12, "Wh = (mAh/1000) × V");

console.log("\nCase 4  Invalid");
isTrue(C.compute({ mass: 2, rotors: 3.5, diameter: 0.25 }) === null, "non-integer rotor count → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

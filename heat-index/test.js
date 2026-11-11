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
console.log("Heat index (NWS)\n");

console.log("Case 1  90 °F, 60% RH — NWS chart cell is 100 °F");
var a = C.compute({ temperature: 90, rh: 60, tempUnit: "F" });
isTrue(a.usedRothfusz === true, "uses Rothfusz (screen ≥ 80 °F)");
nearly(a.heatIndexF, 99.68, 0.05, "Rothfusz at 90/60 ≈ 99.7 °F (chart 100)");
isTrue(a.category === "extreme-caution", "99.7 °F is Extreme Caution (90–103)");

console.log("\nCase 2  80 °F, 40% RH — Steadman fallback");
var b = C.compute({ temperature: 80, rh: 40, tempUnit: "F" });
isTrue(b.usedRothfusz === false, "screen average is under 80 °F");
nearly(b.heatIndexF, C.steadman(80, 40), 1e-12, "reports the Steadman formula");
isTrue(b.heatIndexF < 80, "apparent temperature stays under 80 °F");

console.log("\nCase 3  Low-humidity adjustment: 90 °F, 10% RH");
var raw = C.rothfusz(90, 10);
var unadj = (function () {
  // Re-evaluate the regression only, then confirm the published
  // adjustment was subtracted (RH 10 < 13, T in 80–112).
  var T = 90, R = 10;
  return -42.379 + 2.04901523*T + 10.14333127*R - 0.22475541*T*R -
    0.00683783*T*T - 0.05481717*R*R + 0.00122874*T*T*R +
    0.00085282*T*R*R - 0.00000199*T*T*R*R;
})();
isTrue(raw < unadj, "low-RH adjustment is subtracted");
nearly(unadj - raw, ((13-10)/4)*Math.sqrt((17-Math.abs(90-95))/17), 1e-12, "adjustment matches NWS formula");

console.log("\nCase 4  32.2 °C, 60% RH equals 90 °F case");
var d = C.compute({ temperature: 32.222222, rh: 60, tempUnit: "C" });
nearly(d.heatIndexF, a.heatIndexF, 0.02, "Celsius input matches the 90 °F result");

console.log("\nCase 5  Invalid");
isTrue(C.compute({ temperature: 90, rh: 101 }) === null, "RH > 100 → null");
isTrue(C.compute({ temperature: 200, rh: 50, tempUnit: "F" }) === null, "out-of-range T → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

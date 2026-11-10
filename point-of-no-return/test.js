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

console.log("Point of no return and equal-time point\n");

console.log("Case 1  PNR: TAS 150, 30 kt outbound headwind, 5 h endurance (hand-checked)");
var r = C.compute({
  mode: "pnr",
  speedMode: "tas-wind",
  tas: 150,
  windComponent: -30,
  enduranceHours: 5
});
// O = 120, H = 180, d = 5*120*180/300 = 360 NM, t_out = 5*180/300 = 3 h
nearly(r.outboundGs, 120, 1e-12, "GS out = 120");
nearly(r.homeboundGs, 180, 1e-12, "GS home = 180");
nearly(r.distance, 360, 1e-12, "PNR = 360 NM");
nearly(r.timeOutHours, 3, 1e-12, "time out = 3 h");
nearly(r.timeBackHours, 2, 1e-12, "time back = 2 h");
nearly(r.timeOutHours + r.timeBackHours, 5, 1e-12, "times use the whole endurance");

console.log("\nCase 2  Still-air PNR is halfway in time");
var s = C.compute({ mode: "pnr", outboundGs: 140, homeboundGs: 140, enduranceHours: 4 });
nearly(s.distance, 280, 1e-12, "still air: d = 2 h × 140 kt = 280 NM");
nearly(s.timeOutHours, 2, 1e-12, "halfway in time");

console.log("\nCase 3  ETP: 600 NM trip, same 120 / 180 groundspeeds (hand-checked)");
var e = C.compute({ mode: "etp", outboundGs: 120, homeboundGs: 180, totalDistance: 600 });
nearly(e.distanceFromA, 360, 1e-12, "ETP = D × H / (O+H) = 360 NM from A");
nearly(e.timeToAHours, 2, 1e-12, "360 / 180 = 2 h back to A");
nearly(e.timeToBHours, 2, 1e-12, "240 / 120 = 2 h on to B");
nearly(e.timeToAHours, e.timeToBHours, 1e-12, "times are equal (the definition)");

console.log("\nCase 4  Invalid: a 80 kt wind on a 70 kt TAS makes a non-positive GS");
isTrue(C.compute({ mode: "pnr", speedMode: "tas-wind", tas: 70, windComponent: 80, enduranceHours: 3 }) === null,
  "negative homebound GS → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

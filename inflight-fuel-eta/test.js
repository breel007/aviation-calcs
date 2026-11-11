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
console.log("In-flight fuel and ETA\n");

console.log("Case 1  60 NM, 120 kt, 10 gph, 15 gal on board, VFR day");
var a = C.compute({ distance: 60, groundspeed: 120, fuelFlow: 10, onboard: 15, reserveKind: "vfr-day" });
nearly(a.eteHours, 0.5, 1e-12, "ETE = 60/120 = 0.5 h");
nearly(a.burn, 5, 1e-12, "burn = 5 gal");
nearly(a.atDestination, 10, 1e-12, "10 gal at the destination");
nearly(a.reserveHours, 0.5, 1e-12, "91.151 day reserve is 30 min");
nearly(a.reserveFuel, 5, 1e-12, "reserve 5 gal");
nearly(a.surplus, 5, 1e-12, "surplus 5 gal (30 min)");
isTrue(a.meetsReserve === true, "meets the VFR-day reserve");

console.log("\nCase 2  Same fuel, VFR night, does not meet 45 min");
var b = C.compute({ distance: 60, groundspeed: 120, fuelFlow: 10, onboard: 15, reserveKind: "vfr-night" });
nearly(b.reserveHours, 0.75, 1e-12, "91.151 night is 45 min");
nearly(b.surplus, 2.5, 1e-12, "10 − 7.5 = 2.5 gal surplus still, wait: 10-7.5=2.5, meets");
isTrue(b.meetsReserve === true, "10 gal still covers 7.5 gal night reserve");
var short = C.compute({ distance: 60, groundspeed: 120, fuelFlow: 10, onboard: 8, reserveKind: "vfr-day" });
nearly(short.atDestination, 3, 1e-12, "8 − 5 = 3 gal at dest");
isTrue(short.meetsReserve === false, "3 gal is short of a 5 gal / 30 min reserve");

console.log("\nCase 3  IFR with a 30 NM alternate, and an ETA");
var c = C.compute({ distance: 60, groundspeed: 120, fuelFlow: 10, onboard: 20, reserveKind: "ifr", alternateNm: 30, nowMinutes: 14 * 60 });
nearly(c.alternateHours, 0.25, 1e-12, "30 NM at 120 kt = 0.25 h");
nearly(c.reserveHours, 1.0, 1e-12, "45 min + 0.25 h alternate = 1.0 h");
nearly(c.etaMinutes, 14 * 60 + 30, 1e-12, "ETE 30 min after 14:00 is 14:30");

console.log("\nCase 4  Invalid");
isTrue(C.compute({ distance: 60, groundspeed: 0, fuelFlow: 10, onboard: 15 }) === null, "zero GS → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

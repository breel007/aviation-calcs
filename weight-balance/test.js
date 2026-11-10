#!/usr/bin/env node
/**
 * Verification for weight-and-balance / CG math in calc.js.
 * Run:  node test.js
 *
 *   moment = weight × arm
 *   CG     = total moment / total weight
 */
"use strict";

var WB = require("./calc.js");
var failed = 0;
var passed = 0;

function nearly(a, b, tol, label) {
  var ok = Math.abs(a - b) <= tol;
  if (ok) {
    passed += 1;
    console.log("  PASS  " + label);
    console.log("        got " + a + "  expected " + b + "  ±" + tol);
  } else {
    failed += 1;
    console.log("  FAIL  " + label);
    console.log("        got " + a + "  expected " + b + "  ±" + tol);
  }
}

function isTrue(cond, label) {
  if (cond) {
    passed += 1;
    console.log("  PASS  " + label);
  } else {
    failed += 1;
    console.log("  FAIL  " + label);
  }
}

console.log("Weight and balance calculator — formula verification\n");

console.log("Case 1  Single station: 1,000 lb at 40 in");
var s1 = WB.totals([{ name: "A", kind: "mass", weight: 1000, arm: 40 }], "100LL");
nearly(s1.weight, 1000, 1e-9, "weight = 1,000 lb");
nearly(s1.moment, 40000, 1e-9, "moment = 40,000 in-lb");
nearly(s1.cg, 40, 1e-12, "CG = 40.0 in");

console.log("\nCase 2  Two stations");
var s2 = WB.totals([
  { kind: "mass", weight: 1000, arm: 40 },
  { kind: "mass", weight: 200, arm: 50 }
], "100LL");
nearly(s2.weight, 1200, 1e-9, "weight = 1,200 lb");
nearly(s2.moment, 50000, 1e-9, "moment = 50,000 in-lb");
nearly(s2.cg, 50000 / 1200, 1e-12, "CG = 41.666… in");

console.log("\nCase 3  Fuel density");
nearly(WB.fuelDensity("100LL"), 6.0, 1e-12, "100LL = 6.0 lb/gal");
nearly(WB.fuelDensity("Jet-A"), 6.7, 1e-12, "Jet-A = 6.7 lb/gal");
nearly(WB.stationWeight({ kind: "fuel", gallons: 50, arm: 48 }, "100LL"), 300, 1e-12, "50 gal × 6.0 = 300 lb");
nearly(WB.stationWeight({ kind: "fuel", gallons: 10, arm: 48 }, "Jet-A"), 67, 1e-12, "10 gal × 6.7 = 67 lb");

console.log("\nCase 4  Takeoff and landing after taxi + trip burn");
var burned = WB.compute({
  fuelType: "100LL",
  taxiGallons: 1.3,
  tripGallons: 10,
  stations: [
    { name: "Empty", kind: "mass", weight: 1663, arm: 40 },
    { name: "Fuel", kind: "fuel", gallons: 40, arm: 48 }
  ]
});
nearly(burned.ramp.weight, 1663 + 240, 1e-9, "ramp = empty + 40 gal");
nearly(burned.takeoff.rows[1].gallons, 40 - 1.3, 1e-9, "takeoff fuel = 38.7 gal after taxi");
nearly(burned.takeoff.weight, 1663 + 38.7 * 6, 1e-9, "takeoff weight after 1.3 gal taxi");
nearly(burned.landing.rows[1].gallons, 28.7, 1e-9, "landing fuel = 28.7 gal after 10 gal trip");
nearly(burned.landing.weight, 1663 + 28.7 * 6, 1e-9, "landing weight");
isTrue(burned.landing.weight < burned.takeoff.weight, "landing is lighter than takeoff");
isTrue(burned.landing.cg < burned.takeoff.cg, "burning fuel at 48 in, aft of the 40 in empty CG, moves CG forward");

console.log("\nCase 5  Fuel burn will not go below zero");
var dry = WB.burnFuel([{ kind: "fuel", gallons: 3, arm: 48 }], 10);
nearly(dry[0].gallons, 0, 1e-12, "gallons floored at 0");

console.log("\nCase 6  C172S example envelope — point in / out of limits");
var env = WB.PRESETS.c172s.envelope;
isTrue(WB.pointInPolygon(42.0, 2200, env), "2,200 lb at 42.0 in is inside the C172S normal envelope");
isTrue(WB.pointInPolygon(41.0, 2550, env), "2,550 lb at the 41.0 in forward corner is on the boundary (in limits)");
isTrue(WB.pointInPolygon(35.0, 1950, env), "1,950 lb at 35.0 in (forward break) is on the boundary");
isTrue(!WB.pointInPolygon(40.5, 2550, env), "2,550 lb at 40.5 in is forward of 41.0 and out of limits");
isTrue(!WB.pointInPolygon(48.0, 2200, env), "2,200 lb at 48.0 in is aft of 47.3 and out of limits");
isTrue(!WB.pointInPolygon(42.0, 2600, env), "2,600 lb is above max takeoff and outside the polygon");
isTrue(!WB.pointInPolygon(34.0, 1800, env), "1,800 lb at 34.0 in is forward of 35.0 and out of limits");

console.log("\nCase 7  Worked C172S example loading (illustrative empty weight)");
var c172 = WB.compute({
  fuelType: "100LL",
  taxiGallons: 1.3,
  tripGallons: 18,
  stations: WB.PRESETS.c172s.stations,
  envelope: WB.PRESETS.c172s.envelope,
  limits: WB.PRESETS.c172s.limits
});
// Empty 1663@40, front 340@37, rear 0, fuel 40 gal@48, bag1 20@95, bag2 0
// Ramp weight = 1663+340+240+20 = 2263
nearly(c172.ramp.weight, 2263, 0.05, "example ramp weight = 2,263 lb");
nearly(c172.ramp.moment, 1663 * 40 + 340 * 37 + 240 * 48 + 20 * 95, 0.05, "ramp moment");
nearly(c172.ramp.cg, c172.ramp.moment / c172.ramp.weight, 1e-9, "ramp CG = moment / weight");
isTrue(c172.takeoffStatus.insideEnvelope === true, "example takeoff CG is inside the envelope");
isTrue(c172.landingStatus.insideEnvelope === true, "example landing CG is inside the envelope");
isTrue(c172.takeoff.weight <= 2550, "example takeoff is at or below 2,550 lb");

console.log("\nCase 8  Piper Archer and C152 presets have a closed envelope");
isTrue(WB.PRESETS.pa28.envelope.length >= 5, "PA-28-181 envelope has polygon vertices");
isTrue(WB.pointInPolygon(90.0, 2200, WB.PRESETS.pa28.envelope), "2,200 lb at 90.0 in is inside the Archer example envelope");
isTrue(!WB.pointInPolygon(80.0, 2200, WB.PRESETS.pa28.envelope), "2,200 lb at 80.0 in is forward of 82–88.6 and out");
isTrue(WB.pointInPolygon(34.0, 1500, WB.PRESETS.c152.envelope), "1,500 lb at 34.0 in is inside the C152 envelope");
isTrue(!WB.pointInPolygon(30.0, 1500, WB.PRESETS.c152.envelope), "1,500 lb at 30.0 in is forward of 31.0 and out");

console.log("\nCase 9  Over-gross is flagged even when CG would otherwise look fine");
var heavy = WB.compute({
  stations: [
    { kind: "mass", weight: 2000, arm: 42 },
    { kind: "mass", weight: 800, arm: 42 }
  ],
  envelope: WB.PRESETS.c172s.envelope,
  limits: WB.PRESETS.c172s.limits
});
isTrue(heavy.takeoff.weight === 2800, "combined weight 2,800 lb");
isTrue(heavy.takeoffStatus.exceedsMaxTakeoff > 0, "exceeds 2,550 lb max takeoff");
isTrue(heavy.takeoffStatus.insideEnvelope === false, "point is outside the drawn envelope (above the top)");

console.log("\nCase 10  Empty totals");
var empty = WB.totals([], "100LL");
nearly(empty.weight, 0, 0, "no stations → 0 lb");
isTrue(empty.cg === null, "CG is null when weight is zero");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

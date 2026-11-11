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
console.log("Wake turbulence separation (AIM 7-4-9)\n");

console.log("Case 1  Weight classes");
isTrue(C.classFromWeight(41000) === "small", "41,000 lb is Small");
isTrue(C.classFromWeight(41001) === "large", "41,001 lb is Large");
isTrue(C.classFromWeight(300000) === "heavy", "300,000 lb is Heavy");
isTrue(C.classFromWeight(200000, false, true) === "b757", "B757 type overrides weight");

console.log("\nCase 2  Same-threshold departure (not waivable)");
var a = C.compute({ leader: "heavy", follower: "small", scenario: "same-threshold-departure" });
nearly(a.minutes, 2, 0, "2 minutes behind Heavy (7-4-9 b2)");
isTrue(a.waivable === false, "may not be waived");
nearly(C.compute({ leader: "super", follower: "large", scenario: "same-threshold-departure" }).minutes, 3, 0, "3 minutes behind Super");
nearly(C.compute({ leader: "b757", follower: "small", scenario: "same-threshold-departure" }).minutes, 2, 0, "2 minutes, Small behind B757");

console.log("\nCase 3  Radar in-trail and landing threshold");
nearly(C.compute({ leader: "super", follower: "small", scenario: "radar-in-trail" }).nm, 8, 0, "8 NM Small behind Super");
nearly(C.compute({ leader: "heavy", follower: "large", scenario: "radar-in-trail" }).nm, 5, 0, "5 NM Large behind Heavy");
nearly(C.compute({ leader: "heavy", follower: "small", scenario: "landing-threshold" }).nm, 6, 0, "6 NM Small landing behind Heavy");
nearly(C.compute({ leader: "large", follower: "small", scenario: "landing-threshold" }).nm, 4, 0, "4 NM Small landing behind Large");

console.log("\nCase 4  Intersection: waivable vs not");
var w = C.compute({ leader: "large", follower: "small", scenario: "intersection-departure" });
nearly(w.minutes, 3, 0, "3 minutes Small behind Large at an intersection");
isTrue(w.waivable === true, "7-4-9 c may be waived on pilot request");
var nw = C.compute({ leader: "b757", follower: "small", scenario: "intersection-departure" });
isTrue(nw.waivable === false && nw.minutes === 3, "Small behind B757 intersection is 3 min, not waivable");
nearly(C.compute({ leader: "super", follower: "heavy", scenario: "intersection-departure" }).minutes, 4, 0, "4 minutes behind Super at an intersection");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

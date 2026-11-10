#!/usr/bin/env node
"use strict";

var H = require("./calc.js");
var failed = 0, passed = 0;
function nearly(a, b, tol, label) {
  if (Math.abs(a - b) <= tol) { passed += 1; console.log("  PASS  " + label); }
  else { failed += 1; console.log("  FAIL  " + label + "\n        got " + a + "  expected " + b); }
}
function isTrue(cond, label) {
  if (cond) { passed += 1; console.log("  PASS  " + label); }
  else { failed += 1; console.log("  FAIL  " + label); }
}

console.log("Holding pattern entry — formula verification\n");

console.log("Case 1  Inbound heading is always a direct entry (either turn)");
isTrue(H.entry(360, "right", 360).entry === "direct", "inbound 360, hdg 360, right → direct");
isTrue(H.entry(360, "left", 360).entry === "direct", "inbound 360, hdg 360, left → direct");
isTrue(H.entry(90, "right", 90).entry === "direct", "inbound 090, hdg 090, right → direct");

console.log("\nCase 2  Standard (right) hold, inbound 360 — known sectors");
// Parallel: 70 < R < 180  (headings 070–180). Heading 090 (from the west, non-holding): parallel
isTrue(H.entry(360, "right", 90).entry === "parallel", "hdg 090, inbound 360, right → parallel");
// Teardrop: 180 ≤ R < 250 (headings 180–250). Heading 210 (from the NNE, holding side, behind): teardrop
isTrue(H.entry(360, "right", 210).entry === "teardrop", "hdg 210, inbound 360, right → teardrop");
// Direct: heading 270 (abeam, holding side, "front" 110° of direct)
isTrue(H.entry(360, "right", 270).entry === "direct", "hdg 270, inbound 360, right → direct");
isTrue(H.entry(360, "right", 30).entry === "direct", "hdg 030, inbound 360, right → direct");
isTrue(H.entry(360, "right", 150).entry === "parallel", "hdg 150, inbound 360, right → parallel");

console.log("\nCase 3  Boundaries and the 30° teardrop heading");
var b180 = H.entry(360, "right", 180);
isTrue(b180.entry === "teardrop" && b180.alternate === "parallel", "exactly outbound: teardrop or parallel");
var b70 = H.entry(360, "right", 70);
isTrue(b70.entry === "direct" && b70.alternate === "parallel", "R = 70°: direct or parallel");
var b250 = H.entry(360, "right", 250);
isTrue(b250.entry === "teardrop" && b250.alternate === "direct", "R = 250°: teardrop or direct");
nearly(H.entry(360, "right", 200).teardropHeading, 150, 1e-9, "right-turn teardrop heading = outbound − 30° = 150°");
nearly(H.entry(360, "left", 160).teardropHeading, 210, 1e-9, "left-turn teardrop heading = outbound + 30° = 210°");

console.log("\nCase 4  Nonstandard (left) hold is the mirror image");
isTrue(H.entry(360, "left", 90).entry === "direct", "hdg 090, inbound 360, left → direct (holding-side abeam)");
isTrue(H.entry(360, "left", 270).entry === "parallel", "hdg 270, inbound 360, left → parallel (non-holding abeam)");
isTrue(H.entry(360, "left", 150).entry === "teardrop", "hdg 150, inbound 360, left → teardrop");
isTrue(H.entry(360, "left", 210).entry === "parallel", "hdg 210, inbound 360, left → parallel");

console.log("\nCase 5  A published-style hold: inbound 270, right turns (hold east)");
// Heading 270: already inbound → direct
isTrue(H.entry(270, "right", 270).entry === "direct", "already inbound 270 → direct");
// Heading 360 (from the south): R = 90 → parallel (70–180)
isTrue(H.entry(270, "right", 360).entry === "parallel", "hdg 360 vs inbound 270, right → parallel");
// Heading 120 (from the WNW-ish behind, holding side = north of inbound 270):
// R = (120-270+360)%360 = 210 → teardrop
isTrue(H.entry(270, "right", 120).entry === "teardrop", "hdg 120 vs inbound 270, right → teardrop");

console.log("\nCase 6  Holding speeds and timing (AIM)");
nearly(H.holdingSpeeds(3000).maxKias, 200, 0, "≤ 6,000 ft: 200 KIAS");
nearly(H.holdingSpeeds(6000).maxKias, 200, 0, "exactly 6,000 ft: 200 KIAS");
nearly(H.holdingSpeeds(6001).maxKias, 230, 0, "6,001 ft: 230 KIAS");
nearly(H.holdingSpeeds(14000).maxKias, 230, 0, "exactly 14,000 ft: 230 KIAS (and 1-minute legs)");
nearly(H.holdingSpeeds(14001).maxKias, 265, 0, "14,001 ft: 265 KIAS");
nearly(H.legTiming(14000).inboundMin, 1, 0, "at or below 14,000: 1 minute");
nearly(H.legTiming(14001).inboundMin, 1.5, 0, "above 14,000: 1½ minutes");
isTrue(H.holdingSpeeds(8000).exception210 === true, "the 210 KIAS exception is noted in the mid band");
nearly(H.legLengthNm(1, 90), 1.5, 1e-9, "1 minute at 90 kt is 1.5 NM");

console.log("\nCase 7  compute() wires speeds, timing, and headings of 000/360");
var c = H.compute({ inbound: 0, turn: "right", heading: 0, altitude: 8000, tas: 120 });
isTrue(c.entry === "direct", "000/360 inbound + heading → direct");
nearly(c.inbound, 360, 0, "inbound 0 is reported as 360");
nearly(c.speeds.maxKias, 230, 0, "8,000 ft → 230 KIAS");
nearly(c.timing.inboundMin, 1, 0, "8,000 ft → 1-minute legs");
nearly(c.legNm, 2, 1e-9, "1 minute at 120 kt = 2 NM");

console.log("\nCase 8  Invalid");
isTrue(H.entry(360, "up", 90) === null, "bad turn direction → null");
isTrue(H.entry("x", "right", 90) === null, "non-numeric inbound → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

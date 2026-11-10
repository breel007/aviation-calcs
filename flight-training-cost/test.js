#!/usr/bin/env node
"use strict";

var T = require("./calc.js");
var failed = 0, passed = 0;
function nearly(a, b, tol, label) {
  if (Math.abs(a - b) <= tol) { passed += 1; console.log("  PASS  " + label); }
  else { failed += 1; console.log("  FAIL  " + label + "\n        got " + a + "  expected " + b); }
}
function isTrue(cond, label) {
  if (cond) { passed += 1; console.log("  PASS  " + label); }
  else { failed += 1; console.log("  FAIL  " + label); }
}

console.log("Flight training cost — formula verification\n");

console.log("Case 1  Hand-computed private-pilot example");
var r = T.compute({
  dualHours: 45, soloHours: 25, groundHours: 20,
  aircraftRate: 175, instructorRate: 60,
  groundSchool: 300, knowledgeTest: 175, checkrideFee: 900,
  checkrideHours: 2, materials: 400, medical: 150, other: 0,
  contingencyPercent: 10
});
// dual acft 45*175=7875; dual cfi 45*60=2700; solo 25*175=4375;
// ground 20*60=1200; GS 300; written 175; DPE 900; checkride acft 350;
// materials 400; medical 150
// subtotal = 7875+2700+4375+1200+300+175+900+350+400+150 = 18425
// contingency 1842.50; total 20267.50
nearly(r.lines.dualAircraft, 7875, 0.01, "dual aircraft = 45 × $175");
nearly(r.lines.dualInstructor, 2700, 0.01, "dual instructor = 45 × $60");
nearly(r.lines.soloAircraft, 4375, 0.01, "solo aircraft = 25 × $175");
nearly(r.subtotal, 18425, 0.01, "subtotal = $18,425");
nearly(r.contingency, 1842.5, 0.01, "10% contingency = $1,842.50");
nearly(r.total, 20267.5, 0.01, "total = $20,267.50");
nearly(r.flightHours, 72, 1e-9, "flight hours = 45 + 25 + 2 checkride");
nearly(r.groups.flying, 7875 + 4375 + 350, 0.01, "flying group sums aircraft lines");

console.log("\nCase 2  FAA-minimum and average presets exist for all four certificates");
["private", "instrument", "commercial", "cfi"].forEach(function (c) {
  isTrue(T.preset(c, "part61") != null, c + " Part 61 preset");
  isTrue(T.preset(c, "part141") != null, c + " Part 141 preset");
  isTrue(T.preset(c, "average") != null, c + " average preset");
});
var ppl61 = T.preset("private", "part61");
nearly(ppl61.dualHours + ppl61.soloHours, 40, 1e-9, "Part 61 PPL preset totals 40 flight hours");
var ppl141 = T.preset("private", "part141");
nearly(ppl141.dualHours + ppl141.soloHours, 35, 1e-9, "Part 141 PPL preset totals 35 flight hours");

console.log("\nCase 3  Zero-to-CFI path is the sum of the four ratings");
var rates = { aircraftRate: 180, instructorRate: 65 };
var path = T.pathTotal(["private", "instrument", "commercial", "cfi"], "average", rates);
isTrue(path != null && path.parts.length === 4, "path has four parts");
var sum = 0;
path.parts.forEach(function (p) { sum += p.total; });
nearly(path.total, sum, 0.01, "path total is the sum of the parts");

console.log("\nCase 4  Pace estimate");
var paced = T.compute({
  dualHours: 20, soloHours: 10, groundHours: 0,
  aircraftRate: 100, instructorRate: 50,
  groundSchool: 0, knowledgeTest: 0, checkrideFee: 0,
  checkrideHours: 0, materials: 0, medical: 0, other: 0,
  contingencyPercent: 0,
  lessonsPerWeek: 2, hoursPerLesson: 1.5
});
nearly(paced.weeks, 30 / 3, 1e-9, "30 hours at 3 hours/week = 10 weeks");

console.log("\nCase 5  Invalid");
isTrue(T.compute({ dualHours: 0, soloHours: 0, aircraftRate: 100 }) === null, "zero flight hours → null");
isTrue(T.compute({ dualHours: -1, soloHours: 10, aircraftRate: 100 }) === null, "negative hours → null");
isTrue(T.preset("atp", "part61") === null, "unknown certificate → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

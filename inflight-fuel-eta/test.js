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

console.log("\nCase 2  Same fuel, VFR night 45 min still met; 8 gal on board is short");
var b = C.compute({ distance: 60, groundspeed: 120, fuelFlow: 10, onboard: 15, reserveKind: "vfr-night" });
nearly(b.reserveHours, 0.75, 1e-12, "91.151 night is 45 min");
nearly(b.surplus, 2.5, 1e-12, "10 gal at dest − 7.5 gal night reserve = 2.5 gal surplus");
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

console.log("\nCase 5  Rendered result text: units on every value, no undefined/NaN");
var fs = require("fs");
var path = require("path");
function allText(d) {
  return [d.hero.num, d.hero.unit, d.hero.sub].concat(d.stats.map(function (s) { return s.label + " " + s.value; })).join(" | ");
}
var UNIT_BY_LABEL = {
  "ETE": /^(\d+ h \d{2} min|\d+ min)$/,
  "ETA": /^\d{2}:\d{2}$/,
  "Endurance now": /^(\d+ h \d{2} min|\d+ min)$/,
  "Distance remaining": / NM$/,
  "Groundspeed": / kt$/,
  "Alternate leg": /^(\d+ h \d{2} min|\d+ min)$/
};
[
  { u: "gal", flow: "gph", inp: { distance: 60, groundspeed: 120, fuelFlow: 10, onboard: 15, reserveKind: "vfr-day", nowMinutes: 840 } },
  { u: "L", flow: "L/h", inp: { distance: 100, distUnit: "km", groundspeed: 180, speedUnit: "kph", fuelFlow: 38, onboard: 60, reserveKind: "vfr-night" } },
  { u: "lb", flow: "pph", inp: { distance: 60, groundspeed: 120, fuelFlow: 60, onboard: 40, reserveKind: "ifr", alternateNm: 30, nowMinutes: 1430 } },
  { u: "kg", flow: "kg/h", inp: { distance: 0, groundspeed: 90, fuelFlow: 20, onboard: 5, reserveKind: "custom", reserveHours: 0.25 } }
].forEach(function (c) {
  var d = C.describe(C.compute(c.inp), c.u);
  var txt = allText(d);
  isTrue(!/undefined|NaN|null/.test(txt), c.u + ": rendered text has no 'undefined', 'NaN', or 'null'");
  isTrue(d.hero.unit.indexOf(c.u + " ") === 0, c.u + ": hero value is labeled in " + c.u);
  d.stats.forEach(function (s) {
    var re = UNIT_BY_LABEL[s.label];
    if (s.label === "Fuel flow") re = new RegExp(" " + c.flow.replace("/", "\\/") + "$");
    else if (!re) re = new RegExp(" " + c.u + "( \\(|$)");
    isTrue(re.test(s.value), c.u + ": " + s.label + " = \"" + s.value + "\" has its unit");
  });
});
var d14 = C.describe(C.compute({ distance: 60, groundspeed: 120, fuelFlow: 10, onboard: 15, reserveKind: "vfr-day", nowMinutes: 840 }), "gal");
isTrue(d14.stats[1].label === "ETA" && d14.stats[1].value === "14:30", "ETA prints as HH:MM (14:30)");
var wrap = C.describe(C.compute({ distance: 60, groundspeed: 120, fuelFlow: 10, onboard: 15, nowMinutes: 1430 }), "gal");
isTrue(wrap.stats[1].value === "00:20", "ETA wraps past midnight (23:50 + 30 min = 00:20)");
isTrue(C.parseClock("14:00") === 840 && C.parseClock("") === undefined && isNaN(C.parseClock("2pm")), "clock parsing: HH:MM, blank, and bad input");

console.log("\nCase 6  Page markup");
var html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
isTrue(!/undefined/.test(html), "index.html has no literal 'undefined'");
isTrue(/<p class="brand-name">In-Flight Fuel and ETA<\/p>/.test(html), "header title is set");
isTrue(/<aside class="disclaimer"[\s\S]*POH\/AFM[\s\S]*<\/aside>/.test(html), "disclaimer names the POH/AFM");
isTrue((html.match(/id="now2?"/g) || []).length === 1, "exactly one clock-time field");
var ctrls = html.match(/<(input|select)\b[^>]*>/g) || [];
isTrue(ctrls.length > 0 && ctrls.every(function (t) { return /class="input"/.test(t); }), "every input/select uses the site .input style");
isTrue(/id="calcBtn"/.test(html) && /class="btn btn-primary" id="calcBtn"/.test(html), "Calculate is the site primary button");
var app = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
isTrue(!/\$\((['"])out\1\)/.test(app) && !/\brender\(/.test(app), "app.js has no dead #out / render() references");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

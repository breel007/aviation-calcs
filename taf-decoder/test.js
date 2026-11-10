#!/usr/bin/env node
/**
 * Verification for the offline TAF parser in calc.js.
 * Run:  node test.js
 */
"use strict";

var T = require("./calc.js");
var failed = 0;
var passed = 0;

function nearly(a, b, tol, label) {
  var ok = Math.abs(a - b) <= tol;
  if (ok) { passed += 1; console.log("  PASS  " + label); console.log("        got " + a + "  expected " + b + "  ±" + tol); }
  else { failed += 1; console.log("  FAIL  " + label); console.log("        got " + a + "  expected " + b + "  ±" + tol); }
}

function isTrue(cond, label) {
  if (cond) { passed += 1; console.log("  PASS  " + label); }
  else { failed += 1; console.log("  FAIL  " + label); }
}

function eq(a, b, label) {
  isTrue(a === b, label + " (got " + JSON.stringify(a) + ")");
}

console.log("TAF decoder — parser verification\n");

console.log("Case 1  Period and FM token helpers");
var p = T.parsePeriodToken("1006/1112");
eq(p.fromDay, 10, "from day 10");
eq(p.fromHour, 6, "from hour 06");
eq(p.toDay, 11, "to day 11");
eq(p.toHour, 12, "to hour 12");
var fm = T.parseFromToken("FM101000");
eq(fm.day, 10, "FM day 10");
eq(fm.hour, 10, "FM hour 10");
eq(fm.minute, 0, "FM minute 00");

console.log("\nCase 2  Multi-group TAF with FM and TEMPO");
var raw = [
  "TAF KLAX 100520Z 1006/1112 25008KT P6SM FEW015 SCT250",
  "FM101000 23012KT P6SM SCT020",
  "TEMPO 1016/1020 23015G25KT 5SM -SHRA BKN015",
  "FM110200 21008KT P6SM SKC"
].join(" ");
var t2 = T.parseTaf(raw);
eq(t2.error, null, "parses without error");
eq(t2.station, "KLAX", "station");
eq(t2.issued.hour, 5, "issued 0520Z");
eq(t2.valid.fromHour, 6, "valid from 06Z");
eq(t2.valid.toDay, 11, "valid to the 11th");
eq(t2.groups.length, 4, "four groups (prevailing + FM + TEMPO + FM)");
eq(t2.groups[0].kind, "INITIAL", "first group is prevailing");
eq(t2.groups[0].wind.direction, 250, "prevailing wind 250");
eq(t2.groups[0].flightCategory, "VFR", "prevailing VFR");
eq(t2.groups[1].kind, "FM", "second group is FM");
eq(t2.groups[1].from.hour, 10, "FM at 1000Z");
eq(t2.groups[1].wind.speedKt, 12, "FM wind 12 kt");
eq(t2.groups[2].kind, "TEMPO", "TEMPO group");
eq(t2.groups[2].period.fromHour, 16, "TEMPO from 16Z");
eq(t2.groups[2].wind.gustKt, 25, "TEMPO gust 25");
eq(t2.groups[2].visibility.statuteMiles, 5, "TEMPO 5 SM");
eq(t2.groups[2].ceilingFt, 1500, "TEMPO BKN015 ceiling 1,500");
eq(t2.groups[2].flightCategory, "MVFR", "TEMPO is MVFR (5 SM and 1,500 ft ceiling)");
isTrue(/shower/.test(t2.groups[2].weather[0].text) && /rain/.test(t2.groups[2].weather[0].text), "−SHRA is light showers of rain");
eq(t2.groups[3].kind, "FM", "final FM");
eq(t2.groups[3].sky[0].cover, "SKC", "SKC");
isTrue(/KLAX/.test(t2.plainEnglish), "plain English names the station");

console.log("\nCase 3  AMD, BECMG, PROB30");
var raw3 = [
  "TAF AMD KJFK 101145Z 1012/1118 05012KT 1/2SM FG BKN002",
  "FM101600 05015KT 3SM BR BKN008",
  "BECMG 1020/1022 5SM SCT015",
  "PROB30 1100/1104 1SM -RA BR BKN005"
].join(" ");
var t3 = T.parseTaf(raw3);
isTrue(t3.amended, "AMD flag");
eq(t3.groups[0].flightCategory, "LIFR", "opening group is LIFR (1/2 SM, BKN002)");
eq(t3.groups[1].flightCategory, "IFR", "FM to 3 SM BKN008 is IFR (800 ft ceiling beats 3 SM visibility)");
eq(t3.groups[2].kind, "BECMG", "BECMG group");
eq(t3.groups[2].period.fromHour, 20, "BECMG 20–22Z");
eq(t3.groups[2].visibility.statuteMiles, 5, "BECMG 5 SM");
eq(t3.groups[2].flightCategory, "MVFR", "5 SM and SCT (no ceiling) is MVFR on visibility");
eq(t3.groups[3].kind, "PROB", "PROB group");
eq(t3.groups[3].prob, 30, "PROB30");
eq(t3.groups[3].flightCategory, "IFR", "PROB 1 SM BKN005 is IFR (vis 1 SM; ceiling 500 is also IFR)");

console.log("\nCase 4  PROB30 TEMPO combination and CNL");
var t4 = T.parseTaf("TAF KMIA 101100Z 1012/1112 09010KT P6SM SCT030 PROB30 TEMPO 1018/1022 3SM TSRA BKN020CB");
eq(t4.groups.length, 2, "prevailing + PROB30 TEMPO");
eq(t4.groups[1].kind, "TEMPO", "PROB30 TEMPO is a TEMPO group with a probability");
eq(t4.groups[1].prob, 30, "probability 30");
isTrue(t4.groups[1].sky[0].cb, "CB layer");
isTrue(/thunderstorm/.test(t4.groups[1].weather[0].text), "TSRA includes thunderstorm");
var cnl = T.parseTaf("TAF KABC 100000Z 1000/1024 CNL");
isTrue(cnl.cancelled, "CNL sets cancelled");
isTrue(/cancelled/i.test(cnl.plainEnglish), "plain English says cancelled");

console.log("\nCase 5  24:00 end hour is accepted");
var p24 = T.parsePeriodToken("0918/1024");
eq(p24.toHour, 24, "valid to 24Z (end of the 10th)");
isTrue(/24:00/.test(T.formatPeriod(p24)), "formatted period shows 24:00");

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);

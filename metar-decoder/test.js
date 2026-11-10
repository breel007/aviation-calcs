#!/usr/bin/env node
/**
 * Verification for the offline METAR parser in calc.js.
 * Run:  node test.js
 *
 * Flight-category thresholds are from the FAA AIM (ceiling / visibility).
 */
"use strict";

var M = require("./calc.js");
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

console.log("METAR decoder — parser verification\n");

console.log("Case 1  Routine VFR METAR (KLAX)");
var k1 = M.parseMetar("METAR KLAX 100653Z 08004KT 10SM CLR 21/17 A3005 RMK AO2 SLP171 T02110167 $");
eq(k1.error, null, "parses without error");
eq(k1.station, "KLAX", "station KLAX");
eq(k1.reportType, "METAR", "type METAR");
eq(k1.time.day, 10, "day 10");
eq(k1.time.hour, 6, "hour 06");
eq(k1.time.minute, 53, "minute 53");
eq(k1.wind.direction, 80, "wind 080");
eq(k1.wind.speedKt, 4, "4 kt");
eq(k1.visibility.statuteMiles, 10, "10 SM");
eq(k1.sky[0].cover, "CLR", "CLR");
eq(k1.tempDew.tempC, 21, "temp 21°C");
eq(k1.tempDew.dewC, 17, "dew 17°C");
nearly(k1.altimeter.inHg, 30.05, 1e-9, "A3005 = 30.05 inHg");
eq(k1.flightCategory, "VFR", "VFR (10 SM, no ceiling)");
eq(k1.remarks.ao, "AO2", "AO2 remark");
nearly(k1.remarks.slpHpa, 1017.1, 1e-9, "SLP171 = 1017.1 hPa");
nearly(k1.remarks.tempPreciseC, 21.1, 1e-9, "T02110167 temp 21.1°C");
nearly(k1.remarks.dewPreciseC, 16.7, 1e-9, "dew 16.7°C");
isTrue(k1.remarks.maintenance, "maintenance $");
isTrue(/080/.test(k1.plainEnglish) && /4 kt/.test(k1.plainEnglish), "plain English mentions the wind");

console.log("\nCase 2  LIFR: 1/2 SM, fog, BKN002, gusts, RVR");
var k2 = M.parseMetar("SPECI KJFK 101151Z 05015G25KT 1/2SM R04R/2000V3000FT FG BKN002 08/08 A2910");
eq(k2.reportType, "SPECI", "SPECI");
eq(k2.station, "KJFK", "KJFK");
eq(k2.wind.speedKt, 15, "15 kt");
eq(k2.wind.gustKt, 25, "gust 25");
nearly(k2.visibility.statuteMiles, 0.5, 1e-12, "1/2 SM");
eq(k2.rvr[0].runway, "04R", "RVR runway 04R");
eq(k2.rvr[0].min.value, 2000, "RVR 2000");
eq(k2.rvr[0].max.value, 3000, "RVR 3000");
eq(k2.weather[0].text.indexOf("fog") >= 0, true, "weather includes fog");
eq(k2.sky[0].cover, "BKN", "BKN");
eq(k2.sky[0].heightFt, 200, "200 ft");
eq(k2.ceilingFt, 200, "ceiling 200 ft");
eq(k2.flightCategory, "LIFR", "LIFR (vis < 1 SM and ceiling < 500)");

console.log("\nCase 3  IFR on ceiling, even though vis is 3 SM (MVFR vis would be overridden)");
var k3 = M.parseMetar("METAR KSFO 101025Z 28012KT 3SM BR BKN008 15/14 A2990");
eq(k3.flightCategory, "IFR", "IFR (ceiling 800 ft is 500–999; vis 3 SM is MVFR, but the lower category wins)");
eq(k3.ceilingFt, 800, "ceiling 800 ft");
isTrue(/mist/.test(k3.weather[0].text), "BR is mist");

console.log("\nCase 3b  True MVFR: 5 SM, BKN015");
var k3b = M.parseMetar("METAR KSFO 101025Z 28012KT 5SM BR BKN015 15/14 A2990");
eq(k3b.flightCategory, "MVFR", "MVFR (ceiling 1,500 and vis 5 SM)");
eq(k3b.ceilingFt, 1500, "ceiling 1,500 ft");

console.log("\nCase 4  VFR with a high broken layer (BKN is a ceiling but 12,000 ft)");
var k4 = M.parseMetar("METAR KDEN 101553Z 36020G30KT 10SM SCT080 BKN120 05/M10 A2975");
eq(k4.ceilingFt, 12000, "ceiling is the BKN120, not the SCT");
eq(k4.flightCategory, "VFR", "VFR (ceiling 12,000, vis 10)");
eq(k4.tempDew.dewC, -10, "M10 is −10°C");
eq(k4.wind.direction, 360, "wind 360");

console.log("\nCase 5  International: CAVOK / QNH / NOSIG / 9999 / −RA");
var k5 = M.parseMetar("METAR EGLL 101250Z 27015KT 9999 -RA BKN012 09/07 Q1015 NOSIG");
eq(k5.visibility.meters, 9999, "9999 metres");
eq(k5.flightCategory, "MVFR", "BKN012 is a 1,200 ft ceiling → MVFR even with 9999 vis");
eq(k5.altimeter.hPa, 1015, "Q1015 = 1015 hPa");
isTrue(k5.nosig, "NOSIG");
isTrue(/light/.test(k5.weather[0].text) && /rain/.test(k5.weather[0].text), "−RA is light rain");
var k5b = M.parseMetar("METAR EGLL 101250Z 27015KT CAVOK 09/07 Q1015");
eq(k5b.cavok, true, "CAVOK flag");
eq(k5b.flightCategory, "VFR", "CAVOK is VFR");

console.log("\nCase 6  Calm, M1/4SM, +SN FZFG, VV001, AUTO");
var k6 = M.parseMetar("METAR KABC 100000Z AUTO 00000KT M1/4SM +SN FZFG VV001 M05/M05 A2940");
isTrue(k6.auto, "AUTO");
isTrue(k6.wind.calm, "calm wind");
isTrue(k6.visibility.minus, "M prefix (less than)");
nearly(k6.visibility.statuteMiles, 0.25, 1e-12, "1/4 SM");
eq(k6.sky[0].cover, "VV", "VV");
eq(k6.sky[0].heightFt, 100, "VV001 = 100 ft");
eq(k6.ceilingFt, 100, "VV is a ceiling");
eq(k6.flightCategory, "LIFR", "LIFR");
eq(k6.tempDew.tempC, -5, "M05 = −5°C");
isTrue(k6.weather.some(function (w) { return /heavy/.test(w.text) && /snow/.test(w.text); }), "heavy snow");
isTrue(k6.weather.some(function (w) { return /freezing/.test(w.text) && /fog/.test(w.text); }), "freezing fog");

console.log("\nCase 7  Variable wind and 1 1/2SM");
var k7 = M.parseMetar("METAR KXYZ 101200Z 21015KT 180V240 1 1/2SM HZ SCT040 22/10 A2992");
eq(k7.wind.variableDirection.from, 180, "variable from 180");
eq(k7.wind.variableDirection.to, 240, "variable to 240");
nearly(k7.visibility.statuteMiles, 1.5, 1e-12, "1 1/2 SM = 1.5");
eq(k7.flightCategory, "IFR", "1.5 SM is IFR (1 to < 3), no ceiling");

console.log("\nCase 8  VRB wind, P6SM, FEW/SCT (no ceiling) → VFR");
var k8 = M.parseMetar("KSEA 101530Z VRB03KT P6SM FEW020 SCT250 18/11 A3012");
isTrue(k8.wind.variable, "VRB");
eq(k8.wind.speedKt, 3, "3 kt");
isTrue(k8.visibility.plus, "P6SM");
eq(k8.ceilingFt, null, "FEW/SCT is not a ceiling");
eq(k8.flightCategory, "VFR", "P6SM and no ceiling → VFR");
eq(k8.station, "KSEA", "station without a leading METAR token");

console.log("\nCase 9  Flight-category boundaries");
eq(M.flightCategory(499, 10), "LIFR", "ceiling 499 → LIFR");
eq(M.flightCategory(500, 10), "IFR", "ceiling 500 → IFR");
eq(M.flightCategory(999, 10), "IFR", "ceiling 999 → IFR");
eq(M.flightCategory(1000, 10), "MVFR", "ceiling 1,000 → MVFR");
eq(M.flightCategory(3000, 10), "MVFR", "ceiling 3,000 → MVFR");
eq(M.flightCategory(3001, 10), "VFR", "ceiling 3,001 and vis 10 → VFR");
eq(M.flightCategory(10000, 0.9), "LIFR", "vis 0.9 SM → LIFR regardless of ceiling");
eq(M.flightCategory(10000, 1.0), "IFR", "vis 1.0 SM → IFR");
eq(M.flightCategory(10000, 2.9), "IFR", "vis 2.9 SM → IFR");
eq(M.flightCategory(10000, 3.0), "MVFR", "vis 3.0 SM → MVFR");
eq(M.flightCategory(10000, 5.0), "MVFR", "vis 5.0 SM → MVFR");
eq(M.flightCategory(10000, 5.1), "VFR", "vis 5.1 SM and high ceiling → VFR");

console.log("\nCase 10  Wind in m/s and CB");
var k10 = M.parseMetar("METAR LFPG 101230Z 27010MPS 9999 FEW020CB SCT040 12/08 Q1013");
nearly(k10.wind.speedKt, 10 * 3600 / 1852, 1e-9, "10 m/s in knots");
isTrue(k10.sky[0].cb, "FEW020CB flagged as cumulonimbus");

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);

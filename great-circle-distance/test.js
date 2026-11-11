#!/usr/bin/env node
"use strict";
var path = require("path");
var C = require("./calc.js");
var NavLookup = require("./lookup.js");
var failed = 0, passed = 0;
function nearly(a, b, tol, label) {
  if (isFinite(a) && isFinite(b) && Math.abs(a - b) <= tol) { passed += 1; console.log("  PASS  " + label); }
  else { failed += 1; console.log("  FAIL  " + label + "\n        got " + a + "  expected " + b + "  ±" + tol); }
}
function isTrue(cond, label) {
  if (cond) { passed += 1; console.log("  PASS  " + label); }
  else { failed += 1; console.log("  FAIL  " + label); }
}
function findType(matches, typ) {
  return (matches || []).filter(function (m) { return m.type === typ; });
}

console.log("Great-circle distance\n");

console.log("Case 1  Meridian arc of 90°");
var a = C.compute({ lat1: 0, lon1: 0, lat2: 90, lon2: 0 });
nearly(a.distanceM, C.R_MEAN_M * Math.PI / 2, 1e-6, "quarter meridian = πR/2");
nearly(a.distanceNm, C.R_MEAN_M * Math.PI / 2 / 1852, 1e-9, "in NM");
nearly(a.distanceNm, 5403.5, 0.2, "hand check ≈ 5,403.5 NM (not 5,400)");
nearly(a.initialCourse, 0, 1e-9, "due north");

console.log("\nCase 2  Equatorial 90° of longitude");
var b = C.compute({ lat1: 0, lon1: 0, lat2: 0, lon2: 90 });
nearly(b.distanceM, a.distanceM, 1e-6, "same quarter-circumference");
nearly(b.initialCourse, 90, 1e-9, "due east");
nearly(b.finalCourse, 90, 1e-9, "final course still east on the equator");

console.log("\nCase 3  Antipodes and coincident");
var c = C.compute({ lat1: 10, lon1: 20, lat2: -10, lon2: -160 });
nearly(c.centralAngleDeg, 180, 1e-5, "antipodes, 180°");
nearly(c.distanceM, C.R_MEAN_M * Math.PI, 1, "half circumference to within 1 m");
var d = C.compute({ lat1: 40, lon1: -74, lat2: 40, lon2: -74 });
isTrue(d.coincident === true && d.distanceM < 1e-6, "same point → zero distance");

console.log("\nCase 4  Invalid");
isTrue(C.compute({ lat1: 91, lon1: 0, lat2: 0, lon2: 0 }) === null, "latitude 91 → null");

console.log("\nCase 5  Identifier normalization");
isTrue(NavLookup.normalizeIdent(" ksba ") === "KSBA", "trim and uppercase");
isTrue(NavLookup.normalizeIdent("LAX VOR") === "LAX", "strip trailing VOR");
isTrue(NavLookup.normalizeIdent("LAX VORTAC") === "LAX", "strip trailing VORTAC");
isTrue(NavLookup.normalizeIdent("SADDE") === "SADDE", "five-letter fix unchanged");
isTrue(NavLookup.shardLetter("KSBA") === "K", "shard letter K");
isTrue(NavLookup.shardLetter("0O2") === "0", "numeric LID shards by digit");

var lookup = NavLookup.create({ dataDir: path.join(__dirname, "data") });

async function main() {
  var meta = await lookup.loadMeta();
  console.log("\nCase 6  NASR metadata");
  isTrue(meta && meta.cycle === "2026-10-29", "cycle is 2026-10-29");
  isTrue(meta && meta.counts && meta.counts.airport > 10000, "airport count loaded");
  isTrue(meta && meta.counts && meta.counts.navaid > 1000, "navaid count loaded");
  isTrue(meta && meta.counts && meta.counts.fix > 50000, "fix count loaded");

  console.log("\nCase 7  Lookup resolution (ICAO, LID, navaid, fix, OurAirports)");
  var klax = await lookup.lookup("KLAX");
  isTrue(klax.matches.length === 1, "KLAX is unique");
  isTrue(klax.matches[0] && klax.matches[0].type === "airport" && /Los Angeles/i.test(klax.matches[0].name),
    "KLAX is Los Angeles Intl");
  nearly(klax.matches[0].lat, 33.942496, 1e-6, "KLAX latitude");
  nearly(klax.matches[0].lon, -118.408049, 1e-6, "KLAX longitude");
  isTrue(klax.matches[0].icao === "KLAX" && klax.matches[0].id === "LAX", "KLAX exposes ICAO and LID");
  isTrue(klax.matches[0].state === "CA", "KLAX state is CA");

  var kjfk = await lookup.lookup("KJFK");
  isTrue(kjfk.matches.length === 1 && /Kennedy/i.test(kjfk.matches[0].name), "KJFK is John F Kennedy Intl");
  nearly(kjfk.matches[0].lat, 40.639928, 1e-6, "KJFK latitude");
  nearly(kjfk.matches[0].lon, -73.778692, 1e-6, "KJFK longitude");

  var sba = await lookup.lookup("SBA");
  var ksba = await lookup.lookup("KSBA");
  isTrue(sba.matches.length >= 1 && ksba.matches.length === 1, "SBA and KSBA both resolve");
  var sbaApt = sba.matches.find(function (m) { return m.type === "airport"; });
  isTrue(sbaApt && /Santa Barbara/i.test(sbaApt.name), "SBA LID is Santa Barbara Muni");
  isTrue(ksba.matches[0] && sbaApt && ksba.matches[0].lat === sbaApt.lat && ksba.matches[0].lon === sbaApt.lon,
    "KSBA and SBA are the same airport");

  var sadde = await lookup.lookup("SADDE");
  isTrue(sadde.matches.length === 1 && sadde.matches[0].type === "fix", "SADDE is a unique fix");
  isTrue(sadde.matches[0].state === "CA", "SADDE is in CA");
  nearly(sadde.matches[0].lat, 34.038994, 1e-6, "SADDE latitude");
  nearly(sadde.matches[0].lon, -118.764633, 1e-6, "SADDE longitude");

  var egll = await lookup.lookup("EGLL");
  isTrue(egll.matches.length === 1 && /Heathrow/i.test(egll.matches[0].name), "EGLL is Heathrow (OurAirports)");
  var yssy = await lookup.lookup("YSSY");
  isTrue(yssy.matches.length === 1 && /Sydney/i.test(yssy.matches[0].name), "YSSY is Sydney (OurAirports)");

  var miss = await lookup.lookup("ZZZZZ");
  isTrue(miss.matches.length === 0, "unknown ident has no matches");

  console.log("\nCase 8  Ambiguous identifiers");
  var lax = await lookup.lookup("LAX");
  isTrue(lax.matches.length >= 3, "LAX has at least airport, VORTAC, and VOT");
  isTrue(findType(lax.matches, "airport").length === 1, "LAX includes Los Angeles Intl");
  var laxVor = findType(lax.matches, "VORTAC")[0];
  isTrue(laxVor && laxVor.freq === 113.6 && laxVor.state === "CA", "LAX VORTAC 113.6 in CA");
  isTrue(findType(lax.matches, "VOT").length === 1, "LAX also matches the San Pedro Hill VOT");
  isTrue(findType(lax.matches, "airport")[0].name !== laxVor.name, "picker rows have distinct names");

  var aa = await lookup.lookup("AA");
  var aaNdbs = findType(aa.matches, "NDB");
  isTrue(aaNdbs.length >= 2, "AA is a duplicate NDB ident in different states");
  var states = aaNdbs.map(function (m) { return m.state; }).sort();
  isTrue(states.indexOf("ND") >= 0 && states.indexOf("GA") >= 0, "AA NDBs include ND and GA");

  var laxVorTyped = await lookup.lookup("LAX VOR");
  isTrue(laxVorTyped.normalized === "LAX" && laxVorTyped.matches.length === lax.matches.length,
    "“LAX VOR” normalizes to the same LAX set");

  console.log("\nCase 9  Hand-checked KLAX–KJFK on this page's sphere (R = 6,371,000 m)");
  var from = klax.matches[0], to = kjfk.matches[0];
  var pair = C.compute({ lat1: from.lat, lon1: from.lon, lat2: to.lat, lon2: to.lon });
  isTrue(pair && pair.radiusM === 6371000, "compute uses R = 6,371,000 m");
  // Hand check: ARP of KLAX to KJFK on a 6,371 km sphere is about 2,145 NM
  // (2,145.906 NM with the NASR 2026-10-29 coordinates rounded to 6 decimals).
  nearly(pair.distanceNm, 2145.906, 0.05, "KLAX–KJFK ≈ 2,145.906 NM");
  nearly(pair.distanceNm, 2145, 1, "hand check ≈ 2,145 NM");
  nearly(pair.distanceKm, 3974.218, 0.1, "KLAX–KJFK ≈ 3,974.2 km");
  isTrue(pair.initialCourse != null && pair.finalCourse != null, "non-antipodal pair has unique courses");

  console.log("\nCase 10  Route of great-circle legs");
  var via = sadde.matches[0];
  var route = C.computeRoute([
    { lat: from.lat, lon: from.lon },
    { lat: via.lat, lon: via.lon },
    { lat: to.lat, lon: to.lon }
  ]);
  var leg1 = C.compute({ lat1: from.lat, lon1: from.lon, lat2: via.lat, lon2: via.lon });
  var leg2 = C.compute({ lat1: via.lat, lon1: via.lon, lat2: to.lat, lon2: to.lon });
  nearly(route.distanceNm, leg1.distanceNm + leg2.distanceNm, 1e-9, "two-leg total is the sum of legs");
  nearly(route.initialCourse, leg1.initialCourse, 1e-9, "route initial course is first-leg course");
  nearly(route.finalCourse, leg2.finalCourse, 1e-9, "route arrival course is last-leg course");
  isTrue(route.legs.length === 2, "two legs recorded");

  var direct = C.computeRoute([{ lat: from.lat, lon: from.lon }, { lat: to.lat, lon: to.lon }]);
  nearly(direct.distanceNm, pair.distanceNm, 1e-9, "computeRoute of two points matches compute");

  console.log("\n----------------------------------------");
  console.log("Passed: " + passed + "   Failed: " + failed);
  process.exit(failed ? 1 : 0);
}

main().catch(function (err) {
  failed += 1;
  console.log("  FAIL  lookup tests threw: " + (err && err.stack || err));
  console.log("\n----------------------------------------");
  console.log("Passed: " + passed + "   Failed: " + failed);
  process.exit(1);
});

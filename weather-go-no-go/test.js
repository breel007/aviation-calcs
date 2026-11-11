#!/usr/bin/env node
/**
 * Verification for route weather go / no-go climatology (calc.js).
 * Run:  node test.js
 *
 * Geometry expected values are hand-computed with the same spherical
 * radius used in the module (3440.065 NM = 6371 km): 1° of latitude
 * is 3440.065 × π/180 = 60.04046073261873 NM. Ceiling, visibility
 * and weather-code cases use AIM 7-1 conventions. Percentages are
 * counted from the hand-built rows below, not from live archive data.
 */
"use strict";

var C = require("./calc.js");
var failed = 0;
var passed = 0;

function nearly(a, b, tol, label) {
  if (Math.abs(a - b) <= tol) {
    passed += 1;
    console.log("  PASS  " + label);
  } else {
    failed += 1;
    console.log("  FAIL  " + label + "\n        got " + a + "  expected " + b + "  ±" + tol);
  }
}

function isTrue(cond, label) {
  if (cond) { passed += 1; console.log("  PASS  " + label); }
  else { failed += 1; console.log("  FAIL  " + label); }
}

function eq(a, b, label) {
  isTrue(a === b, label + " (got " + JSON.stringify(a) + ", expected " + JSON.stringify(b) + ")");
}

var DEG_NM = C.NM_EARTH * Math.PI / 180; // 60.04046073261873

console.log("Route weather go / no-go — formula and statistic verification\n");

console.log("Case 1  Station-id mapping");
eq(C.toIemId("KSBA"), "SBA", "KSBA → SBA (CONUS K-prefix stripped)");
eq(C.toIemId("sba"), "SBA", "sba normalizes to SBA");
eq(C.toIemId("PHNL"), "PHNL", "PHNL kept (Hawaii ICAO is the IEM id)");
eq(C.toIemId("PANC"), "PANC", "PANC kept (Alaska)");
eq(C.toIemId("TJSJ"), "TJSJ", "TJSJ kept (Puerto Rico)");
eq(C.toIemId("CYYZ"), "CYYZ", "CYYZ kept (international 4-letter)");
eq(C.toIemId("EGLL"), "EGLL", "EGLL kept");
eq(C.toIemId("SBA"), "SBA", "already-short CONUS id is unchanged");

console.log("\nCase 2  Great-circle distance, cross-track and along-track");
// Equator, 0°N 0°E → 0°N 10°E. Distance is exactly 10°.
var route10 = C.haversineNm(0, 0, 0, 10);
nearly(route10, 10 * DEG_NM, 1e-9, "0° to 10° along the equator = 10 × 60.04046 NM");
nearly(C.crossTrackNm(0, 5, 0, 0, 0, 10), 0, 1e-9, "a point on the equator track has cross-track 0");
nearly(C.alongTrackNm(0, 5, 0, 0, 0, 10), 5 * DEG_NM, 1e-9, "midpoint along-track is 5°");
nearly(C.alongTrackFraction(0, 5, 0, 0, 0, 10), 0.5, 1e-9, "midpoint fraction is 0.5");
// North of the eastbound course is to the left → negative cross-track.
// 0.5° of latitude is exactly 0.5 × 60.04046 NM.
nearly(C.crossTrackNm(0.5, 5, 0, 0, 0, 10), -0.5 * DEG_NM, 1e-6, "0.5°N at mid-route is 30.020 NM left (negative)");
nearly(C.crossTrackNm(-0.5, 5, 0, 0, 0, 10), 0.5 * DEG_NM, 1e-6, "0.5°S at mid-route is 30.020 NM right (positive)");
nearly(C.alongTrackNm(0.5, 5, 0, 0, 0, 10), 5 * DEG_NM, 1e-6, "the north-offset midpoint is still at along-track 5°");
nearly(C.alongTrackFraction(0, -1, 0, 0, 0, 10), -0.1, 1e-9, "1° before the start has fraction −0.1");
nearly(C.alongTrackFraction(0, 11, 0, 0, 0, 10), 1.1, 1e-9, "1° past the destination has fraction 1.1");
// Meridian 40°N 0°E → 50°N 0°E: also 10° of latitude.
nearly(C.haversineNm(40, 0, 50, 0), 10 * DEG_NM, 1e-9, "40°N to 50°N along a meridian = 10 × 60.04046 NM");
nearly(C.crossTrackNm(45, 0, 40, 0, 50, 0), 0, 1e-9, "mid-meridian point is on track");
nearly(C.alongTrackFraction(45, 0, 40, 0, 50, 0), 0.5, 1e-9, "mid-meridian fraction is 0.5");
// 1° of longitude at 45°N is 60.04046 × cos(45°) ≈ 42.455 NM; the
// spherical cross-track of (45°N, 1°E) off a northbound meridian is
// 42.4539 NM (slightly inside the parallel arc).
nearly(C.crossTrackNm(45, 1, 40, 0, 50, 0), 42.45393916, 1e-5, "1°E of 45°N on a meridian is 42.4539 NM cross-track");

console.log("\nCase 3  Corridor membership and along-track ordering");
function eqSt(lon, sid, lat) {
  return { sid: sid, icao: sid, name: sid, lat: lat == null ? 0 : lat, lon: lon, tz: "UTC", state: "XX" };
}
var dep = eqSt(0, "DEP");
var dest = eqSt(10, "DEST");
var catalog = [];
for (var lon = 0; lon <= 10; lon++) catalog.push(eqSt(lon, "L" + lon));
catalog.push(eqSt(5, "OFF25", 0.6));   // 0.6° ≈ 36.0 NM off track, outside 25 NM
catalog.push(eqSt(5, "IN20", 0.3));    // 0.3° ≈ 18.0 NM off track, inside 25 NM
catalog.push(eqSt(12, "PAST"));        // fraction 1.2 — past dest
catalog.push(eqSt(-1, "BACK"));        // fraction −0.1 — before start
var corridor = C.stationsInCorridor(catalog, dep, dest, 25);
var corIds = corridor.map(function (c) { return c.station.sid; });
isTrue(corIds.indexOf("OFF25") === -1, "station 36 NM off the track is outside a 25 NM corridor");
isTrue(corIds.indexOf("IN20") !== -1, "station 18 NM off the track is inside a 25 NM corridor");
isTrue(corIds.indexOf("PAST") === -1, "station past the destination (fraction 1.2) is excluded");
isTrue(corIds.indexOf("BACK") === -1, "station before the departure (fraction −0.1) is excluded");
isTrue(corIds.indexOf("L0") !== -1 && corIds.indexOf("L10") !== -1, "endpoints are inside the corridor");
var ordered = true;
for (var i = 1; i < corridor.length; i++) {
  if (corridor[i].alongNm + 1e-9 < corridor[i - 1].alongNm) ordered = false;
}
isTrue(ordered, "corridor results are sorted by along-track distance");
// Widen the corridor to 40 NM and the 36 NM-offset station should appear.
var wide = C.stationsInCorridor(catalog, dep, dest, 40).map(function (c) { return c.station.sid; });
isTrue(wide.indexOf("OFF25") !== -1, "the same 36 NM-offset station is inside a 40 NM corridor");
nearly(C.crossTrackNm(0.3, 5, 0, 0, 0, 10), -0.3 * DEG_NM, 1e-6, "0.3°N offset is 18.012 NM left of track");

console.log("\nCase 4  Evenly spaced selection, caps, extras and removals");
var picked = C.selectRouteStations(catalog, dep, dest, { corridorNm: 25, maxStations: 5 });
var ids = picked.map(function (s) { return s.sid; });
eq(ids[0], "DEP", "first station is departure");
eq(ids[ids.length - 1], "DEST", "last station is destination");
eq(picked.length, 5, "maxStations 5 yields 5 stations (dep, dest, 3 auto)");
isTrue(ids.indexOf("L5") !== -1, "even spacing of 5 on a 10° route picks the midpoint L5");
// After picking the midpoint, the remaining midpoints are 2.5° and 7.5°.
// L2 and L3 are equally 0.5° from 2.5°; L2 wins because candidates are
// considered in along-track order and the score tie keeps the first.
isTrue(ids.indexOf("L2") !== -1 || ids.indexOf("L3") !== -1, "a station near 1/4 along-track is selected (L2 or L3)");
isTrue(ids.indexOf("L7") !== -1 || ids.indexOf("L8") !== -1, "a station near 3/4 along-track is selected (L7 or L8)");
isTrue(ids.indexOf("OFF25") === -1, "off-corridor station is not auto-selected");
isTrue(ids.indexOf("PAST") === -1 && ids.indexOf("BACK") === -1, "before/after stations are not auto-selected");
// Fractions increase
var fracOk = true;
for (var j = 1; j < picked.length; j++) {
  if (picked[j].alongFrac + 1e-9 < picked[j - 1].alongFrac) fracOk = false;
}
isTrue(fracOk, "selected stations are ordered by along-track fraction");

var withExtra = C.selectRouteStations(catalog, dep, dest, {
  corridorNm: 25,
  maxStations: 5,
  extras: [eqSt(5, "OFF25", 0.6)]
});
var exIds = withExtra.map(function (s) { return s.sid; });
isTrue(exIds.indexOf("OFF25") !== -1, "an off-corridor extra (alternate) is still included");
isTrue(exIds.indexOf("L5") !== -1 || withExtra.length >= 4, "auto fill still runs after an extra is added");
eq(withExtra.filter(function (s) { return s.sid === "OFF25"; })[0].role, "extra", "user-added off-track station is role=extra");

var removed = C.selectRouteStations(catalog, dep, dest, {
  corridorNm: 25,
  maxStations: 5,
  removed: ["L5"]
});
var rmIds = removed.map(function (s) { return s.sid; });
isTrue(rmIds.indexOf("L5") === -1, "a removed sid is not selected");
isTrue(rmIds.indexOf("IN20") !== -1 || rmIds.indexOf("L4") !== -1 || rmIds.indexOf("L6") !== -1, "removing L5 fills the midpoint with IN20 (same along-track, 18 NM off) or a neighbor (L4 or L6)");

var tight = C.selectRouteStations(catalog, dep, dest, { corridorNm: 25, maxStations: 2 });
eq(tight.length, 2, "maxStations 2 keeps only departure and destination");
eq(tight[0].sid + "-" + tight[1].sid, "DEP-DEST", "the two kept stations are DEP then DEST");

console.log("\nCase 5  Ceiling from BKN / OVC / VV layers (AIM)");
function sky(covers, heights) { return C.ceilingFromLayers(covers, heights); }
eq(sky(["BKN"], [500]).ceilingFt, 500, "BKN005 → ceiling 500 ft");
eq(sky(["OVC"], [1000]).ceilingFt, 1000, "OVC010 → ceiling 1,000 ft");
eq(sky(["VV"], [100]).ceilingFt, 100, "VV001 → ceiling 100 ft");
eq(sky(["FEW", "SCT"], [200, 400]).ceilingFt, null, "FEW/SCT only is not a ceiling");
eq(sky(["FEW", "SCT"], [200, 400]).missing, false, "FEW/SCT is present sky data, not missing");
eq(sky(["CLR"], [null]).ceilingFt, null, "CLR is unlimited (no ceiling)");
eq(sky(["SKC"], []).ceilingFt, null, "SKC is unlimited (no ceiling)");
eq(sky(["SCT", "BKN", "OVC"], [2000, 800, 1000]).ceilingFt, 800, "lowest BKN/OVC/VV wins: BKN008 over OVC010");
eq(sky(["BKN", "OVC"], [2500, 1200]).ceilingFt, 1200, "OVC012 under BKN025 → 1,200 ft");
isTrue(sky(["", "", "", ""], ["", "", "", ""]).missing === true, "all-empty sky layers are missing data");

console.log("\nCase 6  Weather-code flags (AIM 7-1 present weather)");
function f(code) { return C.wxFlags(code); }
isTrue(f("-RA").rain && !f("-RA").severe, "−RA is rain, not severe");
isTrue(f("+RA").rain && f("+RA").heavyRain && f("+RA").severe, "+RA is heavy rain and severe");
isTrue(f("TSRA").rain && f("TSRA").thunder && f("TSRA").severe, "TSRA is rain + thunderstorm + severe");
isTrue(f("VCTS").thunder && f("VCTS").severe, "VCTS (vicinity thunderstorm) is severe");
isTrue(f("FZRA").freezing && f("FZRA").rain, "FZRA is freezing rain");
isTrue(f("FZDZ").freezing && f("FZDZ").rain, "FZDZ is freezing drizzle (counts as rain and freezing)");
isTrue(f("SHSN").snow && !f("SHSN").rain, "SHSN is snow, not rain");
isTrue(f("PL").freezing, "PL (ice pellets) is freezing precipitation");
isTrue(f("GR").hail && f("GR").severe, "GR (hail) is severe");
isTrue(f("SQ").squall && f("SQ").severe, "SQ (squall) is severe");
isTrue(f("+FC").funnel && f("+FC").severe, "+FC (tornado / water spout) is severe");
isTrue(!f("HZ").rain && !f("HZ").severe && !f("HZ").snow, "HZ (haze) is not precipitation or severe");
isTrue(f("-RA BR").rain && !f("-RA BR").severe, "−RA BR still flags rain only");

console.log("\nCase 7  Personal-minimum evaluation (inclusive thresholds)");
function ev(ceil, vis, wx, wind, gust, mins) {
  var o = {
    ceilingFt: ceil,
    skyMissing: false,
    visibilitySm: vis,
    windKt: wind,
    gustKt: gust,
    wx: C.wxFlags(wx || ""),
    wxcodes: wx || ""
  };
  return C.evaluateObs(o, mins || { minCeilingFt: 3000, minVisibilitySm: 5 });
}
isTrue(ev(null, 10, "", 4, null).go === true, "CLR (no ceiling) and 10 SM meets 3000 / 5 VFR mins");
isTrue(ev(3000, 5, "", 4, null).go === true, "ceiling 3,000 and 5 SM meet inclusive 3000 / 5 mins");
isTrue(ev(2900, 10, "", 4, null).go === false && ev(2900, 10, "", 4, null).fail.ceiling, "BKN029 (2,900 ft) fails a 3,000 ft min");
isTrue(ev(null, 4.9, "", 4, null).fail.visibility, "4.9 SM fails a 5 SM min");
isTrue(ev(null, 10, "-RA", 4, null, { minCeilingFt: 3000, minVisibilitySm: 5, excludeRain: true }).fail.rain, "−RA fails when rain is excluded");
isTrue(ev(null, 10, "TS", 4, null, { minCeilingFt: 3000, minVisibilitySm: 5, excludeSevere: true }).fail.severe, "TS fails when severe weather is excluded");
isTrue(ev(null, 10, "", 16, null, { minVisibilitySm: 5, maxWindKt: 15 }).fail.wind, "16 kt sustained fails a 15 kt max wind");
isTrue(ev(null, 10, "", 10, 26, { minVisibilitySm: 5, maxGustKt: 25 }).fail.wind, "26 kt gust fails a 25 kt max gust");
isTrue(ev(null, 10, "", 10, null, { minVisibilitySm: 5, maxGustKt: 25 }).go === true, "a missing gust is not a gust-limit failure");
var missVis = C.evaluateObs({ ceilingFt: null, skyMissing: false, visibilitySm: null, wx: C.wxFlags(""), windKt: 0 }, { minVisibilitySm: 5 });
isTrue(missVis.evaluable === false && missVis.go === false, "missing visibility is not evaluable (not an automatic no-go)");
var missSky = C.evaluateObs({ ceilingFt: null, skyMissing: true, visibilitySm: 10, wx: C.wxFlags(""), windKt: 0 }, { minCeilingFt: 1000, minVisibilitySm: 3 });
isTrue(missSky.evaluable === false, "missing sky data is not evaluable when a ceiling min is set");

console.log("\nCase 8  Date windows, hours, and session keys");
var nowNov = new Date(Date.UTC(2026, 10, 10, 20, 0, 0)); // 2026-11-10 20:00 UTC
var weeks = C.dateWindows(6, 15, { years: 5, radiusDays: 3, now: nowNov, tz: "UTC" });
eq(weeks.length, 5, "default 5 years of windows");
eq(weeks[0].year, 2022, "latest complete year in Nov 2026 is 2026, so five years start at 2022");
eq(weeks[4].year, 2026, "2026 is included: 10 Nov is after the 18 Jun window end");
eq(weeks[2].start.month, 6, "June window start is in June");
eq(weeks[2].start.day, 12, "15 Jun ± 3 days starts on 12 Jun (hand count: 12,13,14,15,16,17,18)");
eq(weeks[2].end.day, 18, "15 Jun ± 3 days ends on 18 Jun");
var weeksEarly = C.dateWindows(6, 15, { years: 5, radiusDays: 3, now: new Date(Date.UTC(2026, 5, 15, 12, 0, 0)), tz: "UTC" });
eq(weeksEarly[4].year, 2025, "on 15 Jun 2026 the 12–18 Jun window is not yet complete, so the latest year is 2025");
var nye = C.dateWindows(12, 31, { years: 1, radiusDays: 3, endYear: 2023, tz: "UTC" })[0];
eq(nye.start.year, 2023, "31 Dec 2023 minus 3 days stays in 2023");
eq(nye.start.month + "-" + nye.start.day, "12-28", "31 Dec − 3 = 28 Dec");
eq(nye.end.year, 2024, "31 Dec 2023 plus 3 days crosses into 2024");
eq(nye.end.month + "-" + nye.end.day, "1-3", "31 Dec + 3 = 3 Jan");
isTrue(C.hourInWindow(7, 7, 10) === true, "07:00 is inside 07–10 (start inclusive)");
isTrue(C.hourInWindow(9, 7, 10) === true, "09:00 is inside 07–10");
isTrue(C.hourInWindow(10, 7, 10) === false, "10:00 is outside 07–10 (end exclusive)");
isTrue(C.hourInWindow(22, 22, 6) === true, "22:00 is inside an overnight 22–06 window");
isTrue(C.hourInWindow(5, 22, 6) === true, "05:00 is inside an overnight 22–06 window");
isTrue(C.hourInWindow(6, 22, 6) === false, "06:00 is outside 22–06 (end exclusive)");
isTrue(C.hourInWindow(12, 0, 0) === true, "start==end means all day, so 12:00 counts");
eq(C.sessionDateKey({ year: 2024, month: 6, day: 13, hour: 2 }, 22, 6), "2024-06-12", "02:00 in a 22–06 window belongs to the previous session date");
eq(C.sessionDateKey({ year: 2024, month: 6, day: 13, hour: 22 }, 22, 6), "2024-06-13", "22:00 starts the 13 Jun overnight session");

console.log("\nCase 9  Local-time conversion and CSV / URL helpers");
var utcValid = C.parseValidUtc("2024-06-15 14:53");
isTrue(utcValid instanceof Date && utcValid.getTime() === Date.UTC(2024, 5, 15, 14, 53, 0), "parseValidUtc reads '2024-06-15 14:53' as UTC");
var pdt = C.localTimeParts(utcValid, "America/Los_Angeles");
eq(pdt.year, 2024, "PDT year");
eq(pdt.month, 6, "PDT month");
eq(pdt.day, 15, "14:53 UTC on 15 Jun is still 15 Jun in PDT");
eq(pdt.hour, 7, "14:53 UTC = 07:53 PDT (UTC−7 in June)");
eq(pdt.minute, 53, "minutes preserved");
var csv = C.parseCsv("station,valid,skyc1,skyl1,vsby,wxcodes,sknt,gust\nSBA,2024-06-15 14:53,BKN,800,3.00,-RA,8.00,16.00\nSBA,2024-06-15 15:53,CLR,,10.00,,4.00,\n");
eq(csv.error, null, "CSV parses without error");
eq(csv.rows.length, 2, "two data rows");
eq(C.ceilingFromRow(csv.rows[0]).ceilingFt, 800, "CSV BKN / 800 → ceiling 800 ft");
eq(Number(csv.rows[0].vsby), 3, "CSV visibility 3.00 SM");
var url = C.buildAsosUrl(["KSBA", "SJC"], { year: 2024, month: 6, day: 11 }, { year: 2024, month: 6, day: 19 });
isTrue(/station=SBA/.test(url) && /station=SJC/.test(url), "ASOS URL includes both station ids (KSBA mapped to SBA)");
isTrue(/tz=UTC/.test(url) && /report_type=3/.test(url), "ASOS URL requests UTC and routine METARs (report_type=3)");
isTrue(/year1=2024/.test(url) && /day1=11/.test(url) && /day2=19/.test(url), "ASOS URL carries the padded date window");
isTrue(/data=skyc1/.test(url) && /data=vsby/.test(url) && /data=wxcodes/.test(url), "ASOS URL asks only for sky, vis, wx, wind fields");
var rl = C.parseCsv("Too many requests from your IP address, slow down.");
eq(rl.error, "rate-limited", "a rate-limit body is flagged rather than parsed as CSV");

console.log("\nCase 10  Hand-counted go / no-go percentages (single station)");
/*
 * Three mornings, 07/08/09 UTC, min 1000 ft / 3 SM, no wx exclusions.
 *   12 Jun: 07,08,09 all CLR/10SM          → 3 go
 *   13 Jun: 07,08 CLR/10SM; 09 BKN008      → 2 go, 1 ceiling fail
 *   14 Jun: 07,08,09 all BKN005            → 0 go, 3 ceiling fails
 * Hours: 5 go of 9 = 55.555…%
 * Days with any go hour: 12 and 13 → 2 of 3 = 66.666…%
 * Days with every hour go: only 12 → 1 of 3 = 33.333…%
 */
function nObs(station, stamp, ceil, vis, wx, wind) {
  var valid = C.parseValidUtc(stamp);
  return {
    station: station,
    valid: valid,
    validStamp: stamp,
    local: C.localTimeParts(valid, "UTC"),
    ceilingFt: ceil,
    skyMissing: false,
    visibilitySm: vis,
    windKt: wind == null ? 5 : wind,
    gustKt: null,
    wxcodes: wx || "",
    wx: C.wxFlags(wx || "")
  };
}
var windows = [{ year: 2024, start: { year: 2024, month: 6, day: 12 }, end: { year: 2024, month: 6, day: 18 }, center: { year: 2024, month: 6, day: 15 } }];
var mins = { minCeilingFt: 1000, minVisibilitySm: 3 };
var rowsA = [
  nObs("AAA", "2024-06-12 07:53", null, 10),
  nObs("AAA", "2024-06-12 08:53", null, 10),
  nObs("AAA", "2024-06-12 09:53", null, 10),
  nObs("AAA", "2024-06-13 07:53", null, 10),
  nObs("AAA", "2024-06-13 08:53", null, 10),
  nObs("AAA", "2024-06-13 09:53", 800, 10),
  nObs("AAA", "2024-06-14 07:53", 500, 10),
  nObs("AAA", "2024-06-14 08:53", 500, 10),
  nObs("AAA", "2024-06-14 09:53", 500, 10),
  nObs("AAA", "2024-06-12 10:53", 200, 0.5) // 10:00 is outside 07–10; must be ignored
];
var one = C.computeClimatology([{ sid: "AAA", name: "Alpha", rows: rowsA }], {
  tz: "UTC", hourStart: 7, hourEnd: 10, mins: mins, windows: windows
});
eq(one.stations[0].hours.n, 9, "9 in-window evaluable hours (the 10:53 row is excluded)");
eq(one.stations[0].hours.go, 5, "5 of those 9 hours meet 1000 / 3");
nearly(one.stations[0].hourPct, 100 * 5 / 9, 1e-12, "hour go rate = 5/9 ≈ 55.556%");
eq(one.stations[0].dayCount, 3, "3 mornings in the sample");
eq(one.stations[0].daysAnyGo, 2, "2 mornings have at least one go hour");
eq(one.stations[0].daysAllGo, 1, "1 morning is a solid go (every hour)");
nearly(one.stations[0].dayAnyPct, 100 * 2 / 3, 1e-12, "any-go day rate = 2/3 ≈ 66.667%");
nearly(one.stations[0].dayAllPct, 100 * 1 / 3, 1e-12, "all-go day rate = 1/3 ≈ 33.333%");
eq(one.stations[0].failCounts.ceiling, 4, "4 hour failures, all on ceiling (1 on the 13th, 3 on the 14th)");
eq(one.stations[0].failCounts.visibility, 0, "no visibility failures in this sample");

console.log("\nCase 11  Route (all stations simultaneously) percentages");
/*
 * Station B is go every hour except 12 Jun 08:53, when vis is 2 SM.
 * Simultaneous go hours (both evaluable and go):
 *   12/07 go, 12/08 no (B vis), 12/09 go,
 *   13/07 go, 13/08 go, 13/09 no (A ceiling),
 *   14/07 no, 14/08 no, 14/09 no (A ceiling).
 * Route hours: 4 go of 9 = 44.444…%
 * Route any-go days: 12 and 13 → 2 of 3
 * Route all-go days: none (every morning has at least one no-go hour)
 */
var rowsB = [
  nObs("BBB", "2024-06-12 07:53", null, 10),
  nObs("BBB", "2024-06-12 08:53", null, 2),
  nObs("BBB", "2024-06-12 09:53", null, 10),
  nObs("BBB", "2024-06-13 07:53", null, 10),
  nObs("BBB", "2024-06-13 08:53", null, 10),
  nObs("BBB", "2024-06-13 09:53", null, 10),
  nObs("BBB", "2024-06-14 07:53", null, 10),
  nObs("BBB", "2024-06-14 08:53", null, 10),
  nObs("BBB", "2024-06-14 09:53", null, 10)
];
var both = C.computeClimatology(
  [{ sid: "AAA", name: "Alpha", rows: rowsA }, { sid: "BBB", name: "Bravo", rows: rowsB }],
  { tz: "UTC", hourStart: 7, hourEnd: 10, mins: mins, windows: windows }
);
eq(both.route.hours.n, 9, "route hours require a complete set: 9 hours have both stations");
eq(both.route.hours.go, 4, "4 simultaneous go hours (12/07, 12/09, 13/07, 13/08)");
nearly(both.route.hourPct, 100 * 4 / 9, 1e-12, "route hour go rate = 4/9 ≈ 44.444%");
eq(both.route.daysAnyGo, 2, "2 days have at least one simultaneous-go hour");
eq(both.route.daysAllGo, 0, "no day is a solid route go");
nearly(both.route.dayAnyPct, 100 * 2 / 3, 1e-12, "route any-go day rate = 2/3");
eq(both.route.failCounts.visibility, 1, "route-hour failure breakdown: 1 visibility (12 Jun 08:00)");
eq(both.route.failCounts.ceiling, 4, "route-hour failure breakdown: 4 ceiling (13/09 and all of the 14th)");
eq(both.worstStation.sid, "AAA", "worst station by any-go day rate is AAA (2/3 vs BBB 3/3)");
eq(both.stations[1].hours.go, 8, "BBB has 8 go hours of 9");
eq(C.leadingFailure(both.route.failCounts).reason, "ceiling", "the limit that failed most often on the route is ceiling");
eq(C.leadingFailure(both.route.failCounts).count, 4, "ceiling failed on 4 route hours");

console.log("\nCase 12  Presets and a 24-hour-clock observation still in the date window");
eq(C.PRESETS.VFR.minCeilingFt, 3000, "VFR preset ceiling 3,000 ft");
eq(C.PRESETS.VFR.minVisibilitySm, 5, "VFR preset visibility 5 SM");
eq(C.PRESETS.MVFR.minCeilingFt, 1000, "MVFR-or-better preset ceiling 1,000 ft");
eq(C.PRESETS.MVFR.minVisibilitySm, 3, "MVFR-or-better preset visibility 3 SM");
eq(C.PRESETS.IFR.minCeilingFt, 500, "IFR personal preset ceiling 500 ft");
eq(C.PRESETS.IFR.minVisibilitySm, 1, "IFR personal preset visibility 1 SM");
isTrue(C.PRESETS.IFR.excludeSevere === true && C.PRESETS.IFR.excludeFreezing === true, "IFR personal preset also excludes freezing precip and severe weather");
eq(C.DEFAULT_YEARS, 5, "default history is 5 years");
eq(C.DEFAULT_CORRIDOR_NM, 25, "default corridor is 25 NM");
eq(C.DEFAULT_MAX_STATIONS, 10, "default cap is 10 stations");

console.log("\nCase 13  Short-archive stations are dropped from the route conjunction");
/*
 * CCC has observations only on 14 Jun (the last of the three mornings).
 * With dropSparse and keepInRoute [AAA, BBB], CCC is still reported
 * per-station but does not shrink the route sample to that one day.
 * Route hours should remain 4 go of 9, as in Case 11.
 */
var rowsC = [
  nObs("CCC", "2024-06-14 07:53", null, 10),
  nObs("CCC", "2024-06-14 08:53", null, 10),
  nObs("CCC", "2024-06-14 09:53", null, 10)
];
var sparse = C.computeClimatology(
  [
    { sid: "AAA", name: "Alpha", rows: rowsA },
    { sid: "BBB", name: "Bravo", rows: rowsB },
    { sid: "CCC", name: "Short", rows: rowsC }
  ],
  { tz: "UTC", hourStart: 7, hourEnd: 10, mins: mins, windows: windows, dropSparse: true, keepInRoute: ["AAA", "BBB"] }
);
isTrue(sparse.droppedFromRoute.some(function (d) { return d.sid === "CCC"; }), "CCC is flagged as sparse and dropped from the route AND");
eq(sparse.stations.length, 3, "CCC remains in the per-station table");
eq(sparse.route.hours.n, 9, "route hours stay at 9 (AAA+BBB), not the 3 hours CCC actually covers");
eq(sparse.route.hours.go, 4, "route go hours stay at 4, matching the two-station case");
eq(sparse.routeStationSids.join(","), "AAA,BBB", "route members are AAA and BBB");
var kept = C.computeClimatology(
  [
    { sid: "AAA", name: "Alpha", rows: rowsA },
    { sid: "BBB", name: "Bravo", rows: rowsB },
    { sid: "CCC", name: "Short", rows: rowsC }
  ],
  { tz: "UTC", hourStart: 7, hourEnd: 10, mins: mins, windows: windows }
);
eq(kept.route.hours.n, 3, "without dropSparse, the route sample shrinks to the 3 hours all three stations share");

console.log("\nCase 14  Route-token parsing and two-point polyline equivalence");
eq(C.parseRouteTokens("PRB SNS").join(","), "PRB,SNS", "space-separated waypoints");
eq(C.parseRouteTokens("KSBA, PRB, KSJC").join(","), "KSBA,PRB,KSJC", "comma-separated full route");
eq(C.parseRouteTokens("KSBA → PRB → KSJC").join(","), "KSBA,PRB,KSJC", "arrow-separated full route");
eq(C.parseRouteTokens("  prb/sns  ").join(","), "PRB,SNS", "lowercase and slash separators");
eq(C.trimRouteTokens(C.parseRouteTokens("KSBA PRB KSJC"), { icao: "KSBA", sid: "SBA" }, { icao: "KSJC", sid: "SJC" }).join(","), "PRB", "full route trims dep and dest");
eq(C.trimRouteTokens(C.parseRouteTokens("PRB SNS"), { icao: "KSBA", sid: "SBA" }, { icao: "KSJC", sid: "SJC" }).join(","), "PRB,SNS", "intermediate-only list is unchanged");
eq(C.trimRouteTokens(C.parseRouteTokens(""), { icao: "KSBA" }, { icao: "KSJC" }).length, 0, "empty route string yields no tokens");

function eqPt(lat, lon, sid) {
  return { sid: sid, icao: sid, name: sid, lat: lat, lon: lon, tz: "UTC", state: "XX" };
}
var offBend = eqPt(0.15, 5.15, "OFFBEND");
var straightDep = eqPt(0, 0, "DEP");
var straightDest = eqPt(5, 5, "DEST");
var gDirect = C.routeGeometry(offBend, straightDep, straightDest);
var gPoly2 = C.polylineGeometry(offBend, [straightDep, straightDest]);
nearly(gPoly2.routeNm, gDirect.routeNm, 1e-12, "two-point polyline route length matches routeGeometry");
nearly(gPoly2.alongNm, gDirect.alongNm, 1e-12, "two-point polyline along-track matches routeGeometry");
nearly(gPoly2.alongFrac, gDirect.alongFrac, 1e-12, "two-point polyline fraction matches routeGeometry");
nearly(gPoly2.crossNm, gDirect.crossNm, 1e-12, "two-point polyline signed cross-track matches routeGeometry");
nearly(gPoly2.absCrossNm, gDirect.absCrossNm, 1e-12, "two-point polyline abs cross-track matches routeGeometry");
nearly(gPoly2.distanceToDepNm, gDirect.distanceToDepNm, 1e-12, "two-point polyline distance-to-dep matches routeGeometry");
nearly(gDirect.absCrossNm, 212.54323700124849, 1e-8, "OFFBEND is 212.543 NM off the straight (0,0)→(5,5) track");

console.log("\nCase 15  Multi-leg corridor: a dog-leg picks the bend and misses the shortcut");
/*
 * Equator-then-meridian dog-leg, hand-checked with NM_EARTH = 3440.065:
 *   dep (0°, 0°) → wp (0°, 5°E) → dest (5°N, 5°E).
 * Each leg is exactly 5° of a great circle (equator, then a meridian),
 * so the polyline length is 10 × 60.04046073261873 = 600.4046073261873 NM.
 * The straight great-circle from dep to dest is 424.2803821325909 NM.
 *
 * OFFBEND (0.15°N, 5.15°E) sits ~9.006 NM off the bend — inside a 25 NM
 * corridor of the dog-leg, but 212.543 NM off the straight track.
 * SHORTCUT (2.5°N, 2.5°E) sits 0.303 NM off the straight track, but
 * ~149.958 NM from both legs of the dog-leg.
 */
var wp = eqPt(0, 5, "WP");
var shortcut = eqPt(2.5, 2.5, "SHORTCUT");
var mid1 = eqPt(0, 2.5, "MID1");
var mid2 = eqPt(2.5, 5, "MID2");
var off36 = eqPt(-0.6, 5, "OFF36");
var path = C.buildRoutePath(straightDep, straightDest, [wp]);
nearly(path.routeNm, 10 * DEG_NM, 1e-9, "dog-leg length is 10 × 60.04046 NM (5° + 5°)");
eq(path.legs.length, 2, "dog-leg has two legs");
nearly(path.legs[0].nm, 5 * DEG_NM, 1e-9, "first leg (along the equator) is 5°");
nearly(path.legs[1].nm, 5 * DEG_NM, 1e-9, "second leg (along the meridian) is 5°");

var gWp = C.polylineGeometry(wp, path);
nearly(gWp.alongNm, 5 * DEG_NM, 1e-9, "waypoint along-track is 5° (end of the first leg)");
nearly(gWp.absCrossNm, 0, 1e-9, "waypoint sits on the polyline");
nearly(gWp.alongFrac, 0.5, 1e-9, "waypoint is halfway along a 10° polyline");

var gMid1 = C.polylineGeometry(mid1, path);
nearly(gMid1.alongNm, 2.5 * DEG_NM, 1e-9, "MID1 along-track is 2.5°");
nearly(gMid1.absCrossNm, 0, 1e-9, "MID1 is on the first leg");
eq(gMid1.legIndex, 0, "MID1 is attributed to leg 0");

var gMid2 = C.polylineGeometry(mid2, path);
nearly(gMid2.alongNm, 7.5 * DEG_NM, 1e-9, "MID2 along-track is 7.5° (cumulative)");
nearly(gMid2.absCrossNm, 0, 1e-9, "MID2 is on the second leg");
eq(gMid2.legIndex, 1, "MID2 is attributed to leg 1");

var gOffb = C.polylineGeometry(offBend, path);
nearly(gOffb.absCrossNm, 9.00603825, 1e-6, "OFFBEND is 9.006 NM off the polyline near the bend");
nearly(gOffb.alongNm, 309.20840364, 1e-6, "OFFBEND cumulative along-track is 309.208 NM");
isTrue(gOffb.absCrossNm <= 25, "OFFBEND is inside a 25 NM polyline corridor");
isTrue(gDirect.absCrossNm > 25, "OFFBEND is outside a 25 NM straight-line corridor");

var gCut = C.polylineGeometry(shortcut, path);
nearly(gCut.absCrossNm, 149.95819819, 1e-6, "SHORTCUT is 149.958 NM off the polyline");
var gCutStraight = C.routeGeometry(shortcut, straightDep, straightDest);
nearly(gCutStraight.absCrossNm, 0.3033, 5e-4, "SHORTCUT is 0.303 NM off the straight track");
isTrue(gCut.absCrossNm > 25, "SHORTCUT is outside a 25 NM polyline corridor");
isTrue(gCutStraight.absCrossNm <= 25, "SHORTCUT is inside a 25 NM straight-line corridor");

var gOff36 = C.polylineGeometry(off36, path);
nearly(gOff36.absCrossNm, 0.6 * DEG_NM, 1e-6, "OFF36 is 0.6° = 36.024 NM off the bend");

var dogCatalog = [
  straightDep, wp, straightDest, shortcut, offBend, off36, mid1, mid2
];
for (var lon = 1; lon <= 4; lon++) dogCatalog.push(eqPt(0, lon, "L" + lon));
for (var lat = 1; lat <= 4; lat++) dogCatalog.push(eqPt(lat, 5, "M" + lat));

var dogCorridor = C.stationsInCorridor(dogCatalog, straightDep, straightDest, 25, [wp]).map(function (c) { return c.station.sid; });
var straightCorridor = C.stationsInCorridor(dogCatalog, straightDep, straightDest, 25).map(function (c) { return c.station.sid; });
isTrue(dogCorridor.indexOf("OFFBEND") !== -1, "dog-leg corridor includes the near-bend station OFFBEND");
isTrue(dogCorridor.indexOf("WP") !== -1 && dogCorridor.indexOf("MID1") !== -1 && dogCorridor.indexOf("MID2") !== -1, "dog-leg corridor includes the waypoint and mid-leg stations");
isTrue(dogCorridor.indexOf("SHORTCUT") === -1, "dog-leg corridor excludes the straight-line shortcut");
isTrue(dogCorridor.indexOf("OFF36") === -1, "dog-leg corridor excludes a station 36 NM off the bend");
isTrue(straightCorridor.indexOf("SHORTCUT") !== -1, "straight corridor includes the shortcut");
isTrue(straightCorridor.indexOf("OFFBEND") === -1 && straightCorridor.indexOf("WP") === -1, "straight corridor misses the bend (OFFBEND and WP)");

var dogPicked = C.selectRouteStations(dogCatalog, straightDep, straightDest, {
  corridorNm: 25, maxStations: 6, waypoints: [wp]
});
var dogIds = dogPicked.map(function (s) { return s.sid; });
eq(dogIds[0], "DEP", "dog-leg selection still starts at departure");
eq(dogIds[dogIds.length - 1], "DEST", "dog-leg selection still ends at destination");
isTrue(dogIds.indexOf("WP") !== -1, "dog-leg selection includes the waypoint station at the bend");
isTrue(dogIds.indexOf("OFFBEND") !== -1 || dogIds.indexOf("MID1") !== -1 || dogIds.indexOf("M1") !== -1, "dog-leg selection includes a station at or near the bend");
isTrue(dogIds.indexOf("SHORTCUT") === -1, "dog-leg selection does not pick the straight-line shortcut");
var dogOrdered = true;
for (var di = 1; di < dogPicked.length; di++) {
  if (dogPicked[di].alongNm + 1e-9 < dogPicked[di - 1].alongNm) dogOrdered = false;
}
isTrue(dogOrdered, "dog-leg selection is ordered by cumulative along-track distance");
nearly(dogPicked[dogPicked.length - 1].alongNm, 10 * DEG_NM, 1e-9, "destination along-track is the full polyline length");

var summary = C.formatRouteSummary(straightDep, straightDest, [{ ident: "WP", lat: 0, lon: 5, sid: "WP" }]);
eq(summary.label, "DEP → WP → DEST, 600 NM", "resolved-route label is 'DEP → WP → DEST, 600 NM'");
eq(summary.legCount, 2, "summary reports two legs");

console.log("\nCase 16  Empty waypoints match the current great-circle behavior; single-airport still works");
var emptyWp = C.selectRouteStations(catalog, dep, dest, { corridorNm: 25, maxStations: 5, waypoints: [] });
var omittedWp = C.selectRouteStations(catalog, dep, dest, { corridorNm: 25, maxStations: 5 });
eq(emptyWp.map(function (s) { return s.sid; }).join(","), omittedWp.map(function (s) { return s.sid; }).join(","), "waypoints: [] selects the same stations as omitting waypoints");
isTrue(emptyWp.every(function (s, i) {
  return Math.abs((s.alongNm || 0) - (omittedWp[i].alongNm || 0)) < 1e-12 &&
    Math.abs((s.absCrossNm || 0) - (omittedWp[i].absCrossNm || 0)) < 1e-12;
}), "waypoints: [] also matches along-track and cross-track of the great-circle path");
eq(C.stationsInCorridor(catalog, dep, dest, 25, []).map(function (c) { return c.station.sid; }).join(","),
  C.stationsInCorridor(catalog, dep, dest, 25).map(function (c) { return c.station.sid; }).join(","),
  "empty-waypoints corridor membership matches the single great-circle corridor");

var onlyDep = C.selectRouteStations(catalog, dep, null, { corridorNm: 25, maxStations: 10, waypoints: [] });
eq(onlyDep.length, 1, "destination omitted keeps a single station");
eq(onlyDep[0].sid, "DEP", "that station is the departure");
var sameEnds = C.selectRouteStations(catalog, dep, dep, { corridorNm: 25, maxStations: 10, waypoints: [] });
eq(sameEnds.length, 1, "departure equal to destination keeps a single station");
eq(sameEnds[0].sid, "DEP", "dep==dest does not auto-pick corridor stations");

var S = require("./stations.js");
var sba = S.find("KSBA");
var prb = S.find("PRB");
var sjc = S.find("KSJC");
isTrue(!!sba && !!prb && !!sjc, "KSBA, PRB, and KSJC are in the bundled ASOS list");
var viaPrb = C.selectRouteStations(S.all(), sba, sjc, {
  corridorNm: 25,
  maxStations: 10,
  waypoints: [Object.assign({ ident: "PRB" }, prb)]
});
var viaIds = viaPrb.map(function (s) { return s.icao || s.sid; });
isTrue(viaIds.indexOf("KPRB") !== -1, "KSBA → PRB → KSJC includes Paso Robles (KPRB)");
isTrue(viaIds.indexOf("KSBP") !== -1, "KSBA → PRB → KSJC also includes nearby San Luis Obispo (KSBP, 26 NM from PRB)");
eq(viaIds[0], "KSBA", "real-route selection starts at KSBA");
eq(viaIds[viaIds.length - 1], "KSJC", "real-route selection ends at KSJC");
var prbRow = viaPrb.filter(function (s) { return s.sid === "PRB"; })[0];
nearly(prbRow.absCrossNm, 0, 1e-6, "KPRB sits on the KSBA–PRB–KSJC polyline (cross-track 0)");
var prbLabel = C.formatRouteSummary(sba, sjc, [Object.assign({ ident: "PRB" }, prb)]);
eq(prbLabel.label, "KSBA → PRB → KSJC, 203 NM", "resolved-route label for the California example");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);


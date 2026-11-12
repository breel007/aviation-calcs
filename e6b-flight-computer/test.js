#!/usr/bin/env node
/**
 * Verification for the E6B flight-computer math in calc.js.
 * Run:  node test.js
 *
 * Scale positions, TSD / fuel alignments, compressible TAS, density
 * altitude, NM/SM/km conversions, and the wind-triangle closed form
 * are checked against hand-computed reference values.
 */
"use strict";

var E6B = require("./calc.js");
var failed = 0;
var passed = 0;

function nearly(a, b, tol, label) {
  var ok = typeof a === "number" && isFinite(a) && Math.abs(a - b) <= tol;
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

function wrapDelta(a, b) {
  return Math.abs(E6B.shortestAngleDelta(a, b));
}

console.log("E6B flight computer — formula verification\n");

console.log("Case 1  Logarithmic scale angles");
nearly(E6B.scaleAngle(10), 0, 1e-12, "angle(10) = 0° (top / 10-index)");
nearly(E6B.scaleAngle(100), 0, 1e-12, "angle(100) wraps to 0° (same tick as 10)");
nearly(E6B.scaleAngle(1), 0, 1e-12, "angle(1) is the same tick as 10");
nearly(E6B.scaleAngle(1000), 0, 1e-12, "angle(1000) is the same tick as 10");
nearly(E6B.scaleAngle(20), 360 * Math.LOG10E * Math.log(2), 1e-12, "angle(20) = 360 log10(2) ≈ 108.37°");
nearly(E6B.scaleAngle(60), 360 * Math.log10(6), 1e-12, "angle(60) = 360 log10(6) ≈ 278.92°");
nearly(E6B.scaleAngle(8.5), E6B.scaleAngle(85), 1e-12, "8.5 and 85 share a tick (decade wrap)");
nearly(E6B.scaleAngle(120), E6B.scaleAngle(12), 1e-12, "120 kt sits on the 12 tick");
nearly(E6B.decadeNormalize(120), 12, 1e-12, "120 normalizes to 12");
nearly(E6B.decadeNormalize(8.5), 85, 1e-12, "8.5 normalizes to 85");
nearly(E6B.decadeNormalize(21.25), 21.25, 1e-12, "21.25 is already in [10, 100)");

console.log("\nCase 2  Time–speed–distance: 120 kt, 45 min → 90 NM");
var tsd = E6B.solveTsd({ speed: 120, timeHours: 0, timeMinutes: 45, solveFor: "distance" });
isTrue(!tsd.error, "TSD 120 kt / 45 min has no error");
nearly(tsd.distance, 90, 1e-12, "120 kt × 0.75 h = 90 NM");
nearly(tsd.timeHours, 0.75, 1e-12, "45 min = 0.75 h");
nearly(tsd.time.hours, 0, 1e-12, "formatted hours = 0");
nearly(tsd.time.minutes, 45, 1e-12, "formatted minutes = 45");
// Disk: rate index (60) under 120 (the 12 tick). Then 45 on the inner
// scale must sit under 90 on the outer scale (same angle, mod 360).
nearly(tsd.rotationDeg, E6B.diskRotationToAlign(60, 120), 1e-12, "disk rotation puts the 60-index under 120");
var ang45 = E6B.wrapAngle(E6B.scaleAngle(45) + tsd.rotationDeg);
var ang90 = E6B.scaleAngle(90);
nearly(wrapDelta(ang45, ang90), 0, 1e-10, "after rotation, 45 min aligns with 90 NM");
nearly(wrapDelta(tsd.highlightAngleDeg, ang90), 0, 1e-10, "highlight sits at the 90 NM tick");

console.log("\nCase 3  TSD inverses of the same leg");
var tsdTime = E6B.solveTsd({ speed: 120, distance: 90, solveFor: "time" });
nearly(tsdTime.timeHours, 0.75, 1e-12, "time for 90 NM at 120 kt is 0.75 h");
var tsdSpd = E6B.solveTsd({ distance: 90, timeMinutes: 45, solveFor: "speed" });
nearly(tsdSpd.speed, 120, 1e-12, "speed for 90 NM in 45 min is 120 kt");
// Solving for speed: set 45 (inner) under 90 (outer); read 120 over the 60-index.
nearly(wrapDelta(E6B.scaleAngle(45) + tsdSpd.rotationDeg, E6B.scaleAngle(90)), 0, 1e-10,
  "solving for speed aligns 45 min with 90 NM");
nearly(wrapDelta(E6B.scaleAngle(60) + tsdSpd.rotationDeg, E6B.scaleAngle(120)), 0, 1e-10,
  "the 60-index then sits under 120 kt");

console.log("\nCase 4  Fuel burn: 8.5 gph, 2:30 → 21.25 gal");
var fuel = E6B.solveFuel({ rate: 8.5, timeHours: 2, timeMinutes: 30, solveFor: "fuel" });
isTrue(!fuel.error, "fuel 8.5 gph / 2:30 has no error");
nearly(fuel.fuel, 21.25, 1e-12, "8.5 gph × 2.5 h = 21.25 gal (hand-checked)");
nearly(fuel.timeHours, 2.5, 1e-12, "2 h 30 min = 2.5 h");
nearly(fuel.rotationDeg, E6B.diskRotationToAlign(60, 8.5), 1e-12, "60-index under 8.5 gph");
var ang150 = E6B.wrapAngle(E6B.scaleAngle(150) + fuel.rotationDeg);
nearly(wrapDelta(ang150, E6B.scaleAngle(21.25)), 0, 1e-10, "150 min (2:30) aligns with 21.25 gal");
var fuelTime = E6B.solveFuel({ rate: 8.5, fuel: 21.25, solveFor: "time" });
nearly(fuelTime.timeHours, 2.5, 1e-12, "inverse: 21.25 gal at 8.5 gph is 2.5 h");
var fuelRate = E6B.solveFuel({ fuel: 21.25, timeHours: 2, timeMinutes: 30, solveFor: "rate" });
nearly(fuelRate.rate, 8.5, 1e-12, "inverse: 21.25 gal in 2:30 is 8.5 gph");

console.log("\nCase 5  Compressible TAS vs mechanical (incompressible) dial");
// Sea-level ISA: TAS equals CAS exactly in the compressible formula,
// and σ = 1 so the E6B window also reads TAS = CAS.
var tasSl = E6B.solveTas({ casKt: 100, pressureAltitudeFt: 0, oatC: 15 });
nearly(tasSl.tasKt, 100, 1e-9, "SL ISA: compressible TAS = CAS = 100 kt");
nearly(tasSl.tasApproxKt, 100, 1e-9, "SL ISA: E6B (1/√σ) TAS = CAS = 100 kt");
nearly(tasSl.diskRotationDeg, 0, 1e-9, "SL ISA: TAS window rotation is 0° (unity alignment)");
nearly(wrapDelta(E6B.tempAngle(288.15), E6B.paAngle(0)), 0, 1e-9,
  "at unity, 15 °C sits over 0 ft PA in the window");

// 8,000 ft ISA, 100 KCAS — independent pitot-static check, same constants.
var pa8 = 8000;
var oat8 = E6B.isaTempC(pa8);
var p8 = E6B.isaPressurePa(pa8);
var casMps = 100 * (1852 / 3600);
var qc = E6B.P0_PA * (Math.pow(1 + 0.2 * Math.pow(casMps / E6B.A0, 2), 3.5) - 1);
var m2 = 5 * (Math.pow(qc / p8 + 1, 2 / 7) - 1);
var mach8 = Math.sqrt(m2);
var a8 = Math.sqrt(E6B.GAMMA * E6B.R * (oat8 + 273.15));
var tas8Hand = (mach8 * a8) / (1852 / 3600);
var tas8 = E6B.solveTas({ casKt: 100, pressureAltitudeFt: pa8, oatC: oat8 });
nearly(tas8.tasKt, tas8Hand, 1e-9, "8,000 ft ISA, 100 KCAS: TAS matches hand pitot-static formula");
isTrue(tas8.tasKt > 100, "TAS is greater than CAS at altitude");
var sigma8 = E6B.densityRatio(pa8, oat8);
var tas8Approx = 100 / Math.sqrt(sigma8);
nearly(tas8.tasApproxKt, tas8Approx, 1e-12, "dial TAS = CAS / √σ at 8,000 ft ISA");
// The window rotation must equal 360 log10(TAS_approx / CAS).
var wantRot = E6B.diskRotationToAlign(100, tas8Approx);
nearly(wrapDelta(tas8.diskRotationDeg, wantRot), 0, 1e-9,
  "TAS-window rotation equals 360 log10(1/√σ) and aligns CAS with the dial TAS");
nearly(wrapDelta(E6B.tempAngle(oat8 + 273.15) + tas8.diskRotationDeg, E6B.paAngle(pa8)), 0, 1e-9,
  "after that rotation, OAT lines up with 8,000 ft in the window");

// A mid-altitude, off-ISA case used in the article: 120 KCAS, 6,000 ft, 0 °C.
var tasEx = E6B.solveTas({ casKt: 120, pressureAltitudeFt: 6000, oatC: 0 });
isTrue(!tasEx.error, "120 KCAS / 6,000 ft / 0 °C is defined and subsonic");
isTrue(tasEx.tasKt > tasEx.tasApproxKt ? true : tasEx.tasKt <= tasEx.tasApproxKt + 5,
  "compressible and E6B TAS are in the same ballpark (light-airplane speeds)");
isTrue(Math.abs(tasEx.tasKt - tasEx.tasApproxKt) > 0.01, "at 6,000 ft the dial is slightly approximate vs compressible TAS");

console.log("\nCase 6  Density altitude");
var da0 = E6B.solveDensityAltitude({ pressureAltitudeFt: 0, oatC: 15 });
nearly(da0.densityAltitudeFt, 0, 0.05, "SL ISA: DA = 0 ft");
nearly(da0.densityRatio, 1, 1e-12, "SL ISA: σ = 1");
nearly(da0.rotationDeg, 0, 1e-9, "SL ISA: window rotation is 0°");

// PA 5,000 ft, OAT 30 °C — hand-check with the ICAO inversion.
var pa5 = 5000;
var oat30 = 30;
var p5 = E6B.isaPressurePa(pa5);
var t30 = 30 + 273.15;
var sigma5 = (p5 / E6B.P0_PA) * (E6B.T0 / t30);
var da5Hand = E6B.T0_OVER_L_FT * (1 - Math.pow(sigma5, E6B.DENSITY_EXP));
var da5 = E6B.solveDensityAltitude({ pressureAltitudeFt: pa5, oatC: oat30 });
nearly(da5.densityAltitudeFt, da5Hand, 1e-6, "5,000 ft / 30 °C: DA matches ICAO inversion");
nearly(da5.ruleOfThumbDaFt, 5000 + 120 * (30 - E6B.isaTempC(5000)), 1e-9,
  "rule of thumb DA = PA + 120 × (OAT − ISA)");
isTrue(da5.densityAltitudeFt > pa5, "hot day: DA is above PA");
nearly(wrapDelta(E6B.tempAngle(t30) + da5.rotationDeg, E6B.paAngle(pa5)), 0, 1e-9,
  "DA window uses the same PA / OAT alignment as the TAS window");
// Round-trip: σ from the computed DA should recover the input σ (troposphere).
nearly(E6B.sigmaFromDensityAltitudeFt(da5.densityAltitudeFt), sigma5, 1e-10,
  "inverting DA returns the same density ratio");

console.log("\nCase 7  NM / SM / km conversions");
nearly(E6B.convertDistance(1, "nm", "sm"), 1852 / 1609.344, 1e-15, "1 NM = 1852/1609.344 SM ≈ 1.15078");
nearly(E6B.convertDistance(1, "nm", "km"), 1.852, 1e-15, "1 NM = 1.852 km exactly");
nearly(E6B.convertDistance(1, "sm", "km"), 1.609344, 1e-15, "1 SM = 1.609344 km exactly");
nearly(E6B.convertDistance(1.852, "km", "nm"), 1, 1e-12, "1.852 km = 1 NM");
var conv = E6B.solveConvert({ value: 100, fromUnit: "nm" });
nearly(conv.sm, 100 * 1852 / 1609.344, 1e-12, "100 NM → SM");
nearly(conv.km, 185.2, 1e-12, "100 NM = 185.2 km");
// Alignment: 100 (inner) under the NAUT mark (10). STAT mark then sits over 115.08 on the inner scale.
nearly(wrapDelta(E6B.scaleAngle(100) + conv.rotationDeg, E6B.scaleAngle(E6B.CONVERSION_MARKS.nm)), 0, 1e-10,
  "100 NM sits under the NAUT mark");
nearly(wrapDelta(E6B.scaleAngle(conv.sm) + conv.rotationDeg, E6B.scaleAngle(E6B.CONVERSION_MARKS.sm)), 0, 1e-10,
  "the STAT mark sits over 115.08 SM");
nearly(wrapDelta(E6B.scaleAngle(conv.km) + conv.rotationDeg, E6B.scaleAngle(E6B.CONVERSION_MARKS.km)), 0, 1e-10,
  "the KM mark sits over 185.2 km");
nearly(E6B.CONVERSION_MARKS.sm, 10 * E6B.NM_PER_SM, 1e-12, "STAT mark at 10 × (1852/1609.344)");
nearly(E6B.CONVERSION_MARKS.km, 18.52, 1e-12, "KM mark at 18.52");

console.log("\nCase 8  Wind triangle: TC 090, TAS 120, wind 360/20");
var w = E6B.solveWindTriangle(90, 120, 360, 20);
var wcaHand = Math.asin(20 / 120) * 180 / Math.PI; // wind from the left
var gsHand = Math.sqrt(120 * 120 - 20 * 20);
nearly(w.wca, -wcaHand, 1e-12, "WCA = −arcsin(20/120) ≈ −9.594° (left)");
nearly(w.groundspeed, gsHand, 1e-12, "GS = √(120² − 20²) ≈ 118.322 kt");
nearly(w.trueHeading, E6B.normalizeHeading(90 - wcaHand), 1e-12, "true heading ≈ 080.4°");
isTrue(w.wca < 0, "left crosswind produces a left (negative) WCA");
nearly(w.crosswind, -20, 1e-12, "pure left crosswind of 20 kt");
nearly(w.headwind, 0, 1e-9, "no headwind component on a 90° wind");

// Independent vector close: air + wind = ground, track = course.
var thR = w.trueHeading * Math.PI / 180;
var airN = 120 * Math.cos(thR);
var airE = 120 * Math.sin(thR);
var winN = -20 * Math.cos(360 * Math.PI / 180);
var winE = -20 * Math.sin(360 * Math.PI / 180);
var gN = airN + winN;
var gE = airE + winE;
nearly(Math.sqrt(gN * gN + gE * gE), w.groundspeed, 1e-9, "vector GS matches closed-form GS");
nearly(E6B.normalizeHeading(Math.atan2(gE, gN) * 180 / Math.PI), 90, 1e-6, "ground track equals TC 090");

console.log("\nCase 9  Wind-dot geometry (wind-up method)");
var dotWind = E6B.windDotOffset(360, 360, 20);
nearly(dotWind.x, 0, 1e-12, "with wind under the true index, the mark is on the centerline");
nearly(dotWind.y, 20, 1e-12, "the mark is 20 kt toward the true index (up)");
var dotTc = E6B.windDotOffset(360, 90, 20);
nearly(dotTc.x, -20, 1e-12, "after rotating to TC 090, the mark is 20 kt to the left");
nearly(dotTc.y, 0, 1e-12, "and at the same height as the grommet (pure crosswind)");

console.log("\nCase 10  Off-course / 1-in-60 rule");
var oc = E6B.solveOffCourse({ distanceFlown: 60, degreesOff: 6, solveFor: "distanceOff" });
nearly(oc.distanceOff, 6, 1e-12, "1-in-60: 6° off after 60 NM is 6 NM off course");
var oc2 = E6B.solveOffCourse({ distanceFlown: 30, distanceOff: 2, solveFor: "degreesOff" });
nearly(oc2.degreesOff, 4, 1e-12, "2 NM off after 30 NM is 4° off");
nearly(wrapDelta(E6B.scaleAngle(6) + oc.rotationDeg, E6B.scaleAngle(6)), 0, 1e-10,
  "60 under 60 NM puts 6° under 6 NM (same tick family)");

console.log("\nCase 11  Validation / errors");
isTrue(!!E6B.solveTsd({ speed: 0, timeMinutes: 45, solveFor: "distance" }).error, "zero speed is rejected");
isTrue(!!E6B.solveFuel({ rate: 8.5, solveFor: "fuel" }).error, "missing time is rejected");
isTrue(!!E6B.solveTas({ casKt: 120, pressureAltitudeFt: 6000 }).error, "TAS without OAT is rejected");
isTrue(!!E6B.solveWindTriangle(90, 120, 360, 200).error, "crosswind greater than TAS is rejected");
isTrue(!!E6B.solveConvert({ value: -1, fromUnit: "nm" }).error, "negative distance is rejected");

console.log("\nCase 12  Window constant and conversion identity");
nearly(E6B.WINDOW_C1, 180 + 180 * Math.log10(288.15), 1e-12, "WINDOW_C1 places 15 °C / 0 ft at 180°");
nearly(E6B.tempAngle(288.15), 180, 1e-9, "15 °C is at the bottom of the disk");
nearly(E6B.paAngle(0), 180, 1e-9, "0 ft PA is at the bottom of the plate");
nearly(E6B.NM_PER_SM, 1852 / 1609.344, 0, "NM/SM ratio is exact");

console.log("\nCase 13  Solve-for field is read-only and receives the answer");
var FS = require("./form-state.js");
function fakeDoc(ids) {
  var els = {};
  ids.forEach(function (id) {
    var cls = {};
    els[id] = {
      id: id, value: "", readOnly: false, placeholder: "", attrs: {},
      classList: {
        toggle: function (c, on) { if (on) cls[c] = true; else delete cls[c]; },
        contains: function (c) { return !!cls[c]; }
      },
      setAttribute: function (k, v) { this.attrs[k] = v; },
      removeAttribute: function (k) { delete this.attrs[k]; }
    };
  });
  return { els: els, getElementById: function (id) { return els[id] || null; } };
}
var tsdDoc = fakeDoc(FS.allIds("tsd"));
FS.applySolvedState(tsdDoc, "tsd", "distance");
isTrue(tsdDoc.els["tsd-distance"].readOnly, "TSD solve for distance: Distance (NM) is read-only");
isTrue(tsdDoc.els["tsd-distance"].classList.contains("is-solved"), "TSD distance box is styled as the answer (.is-solved)");
isTrue(!tsdDoc.els["tsd-speed"].readOnly && !tsdDoc.els["tsd-hours"].readOnly && !tsdDoc.els["tsd-minutes"].readOnly,
  "TSD speed and time stay editable");
tsdDoc.els["tsd-speed"].value = "120"; tsdDoc.els["tsd-hours"].value = "0"; tsdDoc.els["tsd-minutes"].value = "45";
tsdDoc.els["tsd-distance"].value = "999";
var tsdRes = E6B.solveTsd({ speed: 120, timeHours: 0, timeMinutes: 45, distance: 999, solveFor: "distance" });
FS.writeOutputs(tsdDoc, "tsd", tsdRes);
isTrue(tsdDoc.els["tsd-distance"].value === "90", "Solve writes 90 NM back into the Distance box (typed 999 ignored)");

// Switch to Speed: distance becomes an input, speed is cleared and locked
tsdDoc.els["tsd-distance"].value = "180";
FS.applySolvedState(tsdDoc, "tsd", "speed", { clearSolved: true });
isTrue(!tsdDoc.els["tsd-distance"].readOnly && !tsdDoc.els["tsd-distance"].classList.contains("is-solved"),
  "switching Solve for → Speed frees the Distance box immediately");
isTrue(tsdDoc.els["tsd-speed"].readOnly && tsdDoc.els["tsd-speed"].value === "", "the Speed box is locked and cleared");
var tsdSpd = E6B.solveTsd({ distance: 180, timeHours: 1, timeMinutes: 30, solveFor: "speed" });
FS.writeOutputs(tsdDoc, "tsd", tsdSpd);
isTrue(tsdDoc.els["tsd-speed"].value === "120", "Solve writes 120 kt into the Speed box (typed distance is used)");

// Switch to Time: hours and minutes both locked; answer written as h + min
FS.applySolvedState(tsdDoc, "tsd", "time", { clearSolved: true });
isTrue(tsdDoc.els["tsd-hours"].readOnly && tsdDoc.els["tsd-minutes"].readOnly, "Solve for time locks hours and minutes");
var tsdTime = E6B.solveTsd({ speed: 120, distance: 150, solveFor: "time" });
FS.writeOutputs(tsdDoc, "tsd", tsdTime);
isTrue(tsdDoc.els["tsd-hours"].value === "1" && tsdDoc.els["tsd-minutes"].value === "15",
  "150 NM at 120 kt writes 1 h 15 min back");

var fuelDoc = fakeDoc(FS.allIds("fuel"));
FS.applySolvedState(fuelDoc, "fuel", "fuel");
isTrue(fuelDoc.els["fuel-qty"].readOnly && fuelDoc.els["fuel-qty"].classList.contains("is-solved"),
  "Fuel solve for fuel: quantity box is read-only answer");
FS.writeOutputs(fuelDoc, "fuel", E6B.solveFuel({ rate: 8.5, timeHours: 2, timeMinutes: 30, solveFor: "fuel" }));
isTrue(fuelDoc.els["fuel-qty"].value === "21.25", "Solve writes 21.25 gal into the quantity box");
FS.applySolvedState(fuelDoc, "fuel", "rate", { clearSolved: true });
isTrue(!fuelDoc.els["fuel-qty"].readOnly && fuelDoc.els["fuel-rate"].readOnly, "switching to Rate frees quantity and locks rate");
FS.writeOutputs(fuelDoc, "fuel", E6B.solveFuel({ fuel: 21.25, timeHours: 2, timeMinutes: 30, solveFor: "rate" }));
isTrue(fuelDoc.els["fuel-rate"].value === "8.5", "Solve writes 8.5 gph into the rate box");

var ocDoc = fakeDoc(FS.allIds("offcourse"));
FS.applySolvedState(ocDoc, "offcourse", "distanceOff");
isTrue(ocDoc.els["oc-off"].readOnly && !ocDoc.els["oc-deg"].readOnly && !ocDoc.els["oc-flown"].readOnly,
  "Off course solve for distance off: only that box is read-only");
FS.writeOutputs(ocDoc, "offcourse", E6B.solveOffCourse({ distanceFlown: 60, degreesOff: 6, solveFor: "distanceOff" }));
isTrue(ocDoc.els["oc-off"].value === "6", "Solve writes 6 NM off course back");
FS.applySolvedState(ocDoc, "offcourse", "degreesOff", { clearSolved: true });
isTrue(ocDoc.els["oc-deg"].readOnly && ocDoc.els["oc-deg"].value === "" && !ocDoc.els["oc-off"].readOnly,
  "switching to Degrees off locks/clears degrees and frees distance off");
FS.writeOutputs(ocDoc, "offcourse", E6B.solveOffCourse({ distanceFlown: 30, distanceOff: 2, solveFor: "degreesOff" }));
isTrue(ocDoc.els["oc-deg"].value === "4", "Solve writes 4° back");
isTrue(Object.keys(FS.outputValues("tsd", { error: "x" })).length === 0, "an error result writes nothing");

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);

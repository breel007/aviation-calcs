#!/usr/bin/env node
/**
 * Verification for density-altitude math in calc.js.
 *
 * Run:  node test.js
 *
 * Reference formula (ICAO Doc 7488 / ISO 2533 troposphere):
 *   p_s  = QNH * (1 - L*h/T0)^(g/(R L))
 *   PA   = (T0/L) * (1 - (p_s/p0)^(R L/g))
 *   sigma = (p_s/p0) * (T0/T)
 *   DA   = (T0/L) * (1 - sigma^(1/(g/(R L)-1)))
 * with T0=288.15 K, L=0.0065 K/m, p0=1013.25 hPa, g=9.80665,
 * R=287.05287 J/(kg K).
 *
 * The often-quoted check "5,000 ft, 29.92 inHg, 30°C → about 8,000 ft"
 * is the FAA/AOPA rule DA = PA + 120*(OAT-ISA) ≈ 7,990 ft. The ICAO
 * density formula gives ≈ 7,802 ft (commonly rounded to 7,800 ft).
 */
"use strict";

var AC = require("./calc.js");
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

console.log("Density altitude calculator — formula verification\n");
console.log("Formula: ICAO Standard Atmosphere (Doc 7488) tropospheric model");
console.log("Constants: T0=288.15 K, L=0.0065 K/m, p0=1013.25 hPa,");
console.log("           g=9.80665 m/s², R=287.05287 J/(kg·K)\n");

// --- Case 1: exact ISA sea level (QNH = 1013.25 hPa = 29.92126 inHg, 15°C)
console.log("Case 1  Sea-level ISA (elev 0, QNH 1013.25 hPa, 15°C)");
var sl = AC.compute({
  elevationFt: 0,
  altimeterInHg: AC.hpaToInHg(1013.25),
  oatC: 15
});
nearly(sl.pressureAltitudeFt, 0, 0.05, "pressure altitude ≈ 0 ft");
nearly(sl.densityAltitudeFt, 0, 0.05, "density altitude ≈ 0 ft");
nearly(sl.isaDeviationC, 0, 0.001, "ISA deviation ≈ 0°C");
nearly(sl.densityDry, 1.225, 0.0001, "density ≈ 1.225 kg/m³");
nearly(sl.stationPressureHpa, 1013.25, 0.001, "station pressure ≈ 1013.25 hPa");

// --- Case 2: requested reference 5000 ft, 29.92 inHg, 30°C
console.log("\nCase 2  Reference: 5,000 ft, 29.92 inHg, 30°C (dry)");
var ref = AC.compute({
  elevationFt: 5000,
  altimeterInHg: 29.92,
  oatC: 30
});
console.log("        PA        = " + ref.pressureAltitudeFt.toFixed(1) + " ft");
console.log("        ISA temp  = " + ref.isaTempC.toFixed(2) + " °C");
console.log("        ISA dev   = " + (ref.isaDeviationC >= 0 ? "+" : "") + ref.isaDeviationC.toFixed(2) + " °C");
console.log("        DA ICAO   = " + ref.densityAltitudeFt.toFixed(1) + " ft");
console.log("        DA 120-rule = " + ref.densityAltitudeRuleOfThumbFt.toFixed(1) + " ft");
console.log("        density   = " + ref.densityDry.toFixed(4) + " kg/m³ (" + (ref.densityRatioDry * 100).toFixed(1) + "% of SL)");
console.log("        station p = " + ref.stationPressureHpa.toFixed(2) + " hPa");

// Locked expected values from the ICAO constants above (computed independently)
nearly(ref.pressureAltitudeFt, 5001.13, 1.0, "PA ≈ 5,001 ft (29.92 is 0.001 inHg below 29.92126)");
nearly(ref.isaTempC, 5.09, 0.05, "ISA temperature ≈ 5.1°C");
nearly(ref.isaDeviationC, 24.91, 0.05, "ISA deviation ≈ +24.9°C");
nearly(ref.densityAltitudeFt, 7802.1, 2.0, "ICAO DA ≈ 7,802 ft (rounds to ~7,800 ft)");
nearly(ref.densityAltitudeRuleOfThumbFt, 7990.1, 2.0, "FAA 120 ft/°C rule ≈ 7,990 ft (~8,000 ft)");
isTrue(ref.densityAltitudeFt > 7700 && ref.densityAltitudeFt < 7900,
  "ICAO DA is in the 7,700–7,900 ft band (about 8,000 ft)");
isTrue(ref.densityAltitudeRuleOfThumbFt > 7950 && ref.densityAltitudeRuleOfThumbFt < 8050,
  "120-rule DA is in the 7,950–8,050 ft band");

// --- Case 3: humidity raises DA
console.log("\nCase 3  Same as Case 2, dewpoint 20°C (humidity correction)");
var wet = AC.compute({
  elevationFt: 5000,
  altimeterInHg: 29.92,
  oatC: 30,
  dewpointC: 20
});
console.log("        Tv        = " + wet.humid.virtualTempC.toFixed(2) + " °C");
console.log("        DA humid  = " + wet.humid.densityAltitudeFt.toFixed(1) + " ft");
console.log("        humidity Δ = +" + wet.humid.humidityIncrementFt.toFixed(1) + " ft");
isTrue(wet.humid.densityAltitudeFt > wet.densityAltitudeFt,
  "humidity-corrected DA is higher than dry DA (moist air is less dense)");
nearly(wet.humid.densityAltitudeFt, 8143, 15, "humid DA ≈ 8,143 ft at Td=20°C");
isTrue(wet.humid.virtualTempC > 30, "virtual temperature exceeds OAT");

// --- Case 4: unit conversions
console.log("\nCase 4  Unit conversions");
nearly(AC.cToF(30), 86, 1e-9, "30°C = 86°F");
nearly(AC.fToC(86), 30, 1e-9, "86°F = 30°C");
nearly(AC.inHgToHpa(29.92), 29.92 * AC.CONST.HPA_PER_INHG, 1e-9, "inHg → hPa consistent");
nearly(AC.hpaToInHg(1013.25), AC.CONST.P0_INHG, 1e-9, "1013.25 hPa = 29.92126 inHg");
nearly(AC.ftToM(5000), 1524, 0.01, "5,000 ft = 1,524 m");
nearly(AC.mToFt(1524), 5000, 0.05, "1,524 m = 5,000 ft");

// --- Case 5: QNH / elevation entered in metric equivalents must match
console.log("\nCase 5  Same atmosphere via hPa / metres path");
var viaHpa = AC.compute({
  elevationFt: AC.mToFt(1524),
  altimeterInHg: AC.hpaToInHg(AC.inHgToHpa(29.92)),
  oatC: AC.fToC(86)
});
nearly(viaHpa.densityAltitudeFt, ref.densityAltitudeFt, 0.6, "metric-equivalent inputs give the same DA");

// --- Case 6: cold day, DA below field elevation
console.log("\nCase 6  Cold day: 5,000 ft, 29.92 inHg, −5°C");
var cold = AC.compute({
  elevationFt: 5000,
  altimeterInHg: 29.92,
  oatC: -5
});
console.log("        DA ICAO   = " + cold.densityAltitudeFt.toFixed(1) + " ft");
isTrue(cold.densityAltitudeFt < 5000, "DA is below field elevation when colder than ISA");
isTrue(cold.isaDeviationC < 0, "ISA deviation is negative");

// --- Case 7: performance rule of thumb signs
console.log("\nCase 7  Performance rule of thumb at the Case 2 DA");
var perf = ref.performance;
console.log("        takeoff factor = " + perf.takeoffFactor.toFixed(3) +
  "  (" + (perf.takeoffPctVsSl >= 0 ? "+" : "") + perf.takeoffPctVsSl.toFixed(1) + "%)");
console.log("        climb factor   = " + perf.climbFactor.toFixed(3) +
  "  (" + (perf.climbPctVsSl >= 0 ? "+" : "") + perf.climbPctVsSl.toFixed(1) + "%)");
isTrue(perf.takeoffFactor > 1, "high DA lengthens the takeoff-roll estimate");
isTrue(perf.climbFactor < 1, "high DA reduces the climb-rate estimate");
nearly(perf.takeoffPctVsSl, 10 * (ref.densityAltitudeFt / 1000), 0.05, "+10% takeoff roll per 1,000 ft DA");
nearly(perf.climbPctVsSl, -8 * (ref.densityAltitudeFt / 1000), 0.05, "−8% climb rate per 1,000 ft DA");

// --- Case 8: invalid input
console.log("\nCase 8  Invalid input returns null");
isTrue(AC.compute({ elevationFt: NaN, altimeterInHg: 29.92, oatC: 15 }) === null, "NaN elevation → null");
isTrue(AC.compute({ elevationFt: 0, altimeterInHg: 29.92, oatC: 15, dewpointC: undefined }).humid === null,
  "missing dewpoint → no humidity block");

// --- Case 9: two-way ISA deviation (OAT ↔ ISA +/−)
console.log("\nCase 9  Two-way ISA deviation (last-edited field wins)");
nearly(AC.isaDevCToF(10), 18, 1e-12, "ISA +10°C = ISA +18°F (difference, no +32)");
nearly(AC.isaDevFToC(18), 10, 1e-12, "ISA +18°F = ISA +10°C");
nearly(AC.isaDevCToF(-5), -9, 1e-12, "ISA −5°C = ISA −9°F");

var p0 = AC.CONST.P0_INHG;
var fromOat = AC.resolveOatAndIsaDev({
  elevationFt: 5000,
  altimeterInHg: p0,
  oatC: 30,
  source: "oat"
});
var expectedDev = 30 - fromOat.isaTempC;
nearly(fromOat.isaDeviationC, expectedDev, 1e-12, "source=oat: ISA dev = OAT − ISA temp at PA");
nearly(fromOat.oatC, 30, 1e-12, "source=oat: OAT is unchanged");
nearly(fromOat.pressureAltitudeFt, 5000, 0.05, "standard 29.92/p0 at 5,000 ft → PA = 5,000 ft");

var back = AC.resolveOatAndIsaDev({
  elevationFt: 5000,
  altimeterInHg: p0,
  isaDeviationC: fromOat.isaDeviationC,
  source: "isa"
});
nearly(back.oatC, 30, 1e-9, "round trip: ISA dev derived from 30°C OAT yields 30°C again");
nearly(back.isaDeviationC, fromOat.isaDeviationC, 1e-12, "source=isa: ISA dev is unchanged");

var isaPlus10At5k = AC.resolveOatAndIsaDev({
  elevationFt: 5000,
  altimeterInHg: p0,
  isaDeviationC: 10,
  source: "isa"
});
nearly(isaPlus10At5k.oatC, isaPlus10At5k.isaTempC + 10, 1e-12, "source=isa: OAT = ISA temp + deviation");

var isaPlus10AtSL = AC.resolveOatAndIsaDev({
  elevationFt: 0,
  altimeterInHg: p0,
  isaDeviationC: 10,
  source: "isa"
});
nearly(isaPlus10AtSL.oatC, 25, 1e-9, "hold ISA +10°C, move to sea level → OAT becomes 25°C");
nearly(isaPlus10AtSL.isaDeviationC, 10, 1e-12, "last-edited ISA dev is preserved when PA changes");
isTrue(Math.abs(isaPlus10At5k.oatC - isaPlus10AtSL.oatC) > 1,
  "holding ISA +10°C, OAT changes when elevation (ISA temp) changes");

var holdOatSL = AC.resolveOatAndIsaDev({
  elevationFt: 0,
  altimeterInHg: p0,
  oatC: 25,
  source: "oat"
});
nearly(holdOatSL.isaDeviationC, 10, 1e-9, "source=oat at SL: 25°C → ISA +10°C");
var holdOat5k = AC.resolveOatAndIsaDev({
  elevationFt: 5000,
  altimeterInHg: p0,
  oatC: 25,
  source: "oat"
});
nearly(holdOat5k.oatC, 25, 1e-12, "last-edited OAT is preserved when PA changes");
isTrue(holdOat5k.isaDeviationC > holdOatSL.isaDeviationC + 5,
  "holding OAT 25°C, ISA dev increases at 5,000 ft (colder ISA temp)");

isTrue(AC.resolveOatAndIsaDev({ elevationFt: 0, altimeterInHg: p0, source: "oat" }) === null,
  "source=oat with no OAT → null");
isTrue(AC.resolveOatAndIsaDev({ elevationFt: 0, altimeterInHg: p0, source: "isa" }) === null,
  "source=isa with no deviation → null");

// --- Case 10: conventional 29.92 display treated as 1013.25 hPa
console.log("\nCase 10  Conventional 29.92 inHg display → exact standard pressure");
isTrue(AC.isConventionalStandardInHg(29.92), "29.92 inHg is the conventional standard display");
isTrue(!AC.isConventionalStandardInHg(29.91), "29.91 inHg is not canonicalized");
isTrue(AC.isConventionalStandardHpa(1013.25), "1013.25 hPa is exact standard pressure");
isTrue(!AC.isConventionalStandardHpa(1013.2), "1013.2 hPa is not treated as 1013.25");
nearly(AC.canonicalAltimeterInHg(29.92), AC.CONST.P0_INHG, 1e-12, "canonical 29.92 inHg = 29.92126… (p0)");
nearly(AC.canonicalAltimeterInHg(29.91), 29.91, 1e-12, "non-standard 29.91 is left unchanged");
nearly(AC.canonicalAltimeterHpa(1013.25), 1013.25, 1e-12, "canonical 1013.25 hPa = p0");

var reset = AC.compute({
  elevationFt: 0,
  altimeterInHg: AC.canonicalAltimeterInHg(29.92),
  oatC: 15
});
nearly(reset.pressureAltitudeFt, 0, 0.05, "sea-level ISA reset: PA = 0 ft (not 1 ft)");
nearly(reset.densityAltitudeFt, 0, 0.05, "sea-level ISA reset: DA = 0 ft (not 1 ft)");
nearly(reset.isaDeviationC, 0, 0.001, "sea-level ISA reset: ISA deviation = 0°C");
nearly(Math.round(reset.pressureAltitudeFt), 0, 0, "rounded displayed PA is 0 ft");
nearly(Math.round(reset.densityAltitudeFt), 0, 0, "rounded displayed DA is 0 ft");

var raw292 = AC.compute({ elevationFt: 0, altimeterInHg: 29.92, oatC: 15 });
isTrue(Math.round(raw292.pressureAltitudeFt) === 1,
  "raw (non-canonical) 29.92 inHg at SL still computes ~1 ft — UI must canonicalize");

var fromDevReset = AC.resolveOatAndIsaDev({
  elevationFt: 0,
  altimeterInHg: AC.canonicalAltimeterInHg(29.92),
  isaDeviationC: 0,
  source: "isa"
});
nearly(fromDevReset.oatC, 15, 1e-9, "ISA +0 at sea-level standard pressure → OAT 15°C");

var daCanon5k = AC.compute({
  elevationFt: 5000,
  altimeterInHg: AC.canonicalAltimeterInHg(29.92),
  oatC: 30
});
nearly(daCanon5k.pressureAltitudeFt, 5000, 0.05, "example 5,000 ft / 29.92 / 30°C (canonical): PA = 5,000 ft");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

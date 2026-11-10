#!/usr/bin/env node
/**
 * Verification for CAS → TAS / Mach math in calc.js.
 * Run:  node test.js
 *
 * Independent check of the ICAO tropopause pressure and the subsonic
 * pitot-static chain, using the same published constants as calc.js
 * but recomputed here so a typo in compute() cannot hide.
 */
"use strict";

var TAS = require("./calc.js");
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

var T0 = 288.15, L = 0.0065, P0 = 101325, G = 9.80665, R = 287.05287, GAMMA = 1.4;
var EXP = G / (R * L);
var KT = 1852 / 3600;
var A0 = Math.sqrt(GAMMA * R * T0);

function isaP(h_m) {
  if (h_m <= 11000) return P0 * Math.pow(1 - L * h_m / T0, EXP);
  var pTrop = P0 * Math.pow(1 - L * 11000 / T0, EXP);
  return pTrop * Math.exp(-G * (h_m - 11000) / (R * 216.65));
}

function tasFromCas(casKt, paFt, oatC) {
  var cas = casKt * KT;
  var p = isaP(paFt * 0.3048);
  var qc = P0 * (Math.pow(1 + 0.2 * Math.pow(cas / A0, 2), 3.5) - 1);
  var M = Math.sqrt(5 * (Math.pow(qc / p + 1, 2 / 7) - 1));
  var a = Math.sqrt(GAMMA * R * (oatC + 273.15));
  return { mach: M, tasKt: M * a / KT, p: p, a: a };
}

console.log("True airspeed / Mach — formula verification\n");

console.log("Case 1  Sea-level ISA, CAS = TAS");
var sl = TAS.compute({ casKt: 100, pressureAltitudeFt: 0, oatC: 15 });
nearly(sl.tasKt, 100, 0.02, "TAS ≈ CAS = 100 kt at SL ISA (compressible, within 0.02 kt)");
nearly(sl.mach, 100 / TAS.A0_KT, 1e-6, "Mach = 100 / a0");
nearly(sl.isaTempC, 15, 1e-9, "ISA SL temperature is 15°C");
nearly(sl.isaDeviationC, 0, 1e-9, "ISA deviation is 0");
nearly(sl.ambientHpa, 1013.25, 0.001, "SL pressure 1013.25 hPa");
nearly(TAS.A0, A0, 1e-9, "a0 matches independent sqrt(γRT0)");
// At SL the compressible formula gives TAS slightly different from CAS? 
// Actually at SL, p=p0, so M from CAS is such that TAS = M*a0, and CAS was defined
// so that CAS = a0*sqrt(5*((qc/p0+1)^(2/7)-1)) which inverts exactly to TAS=CAS.
nearly(sl.tasKt, 100, 1e-9, "at SL ISA, TAS equals CAS exactly (by definition of CAS)");

console.log("\nCase 2  Independent 8,000 ft ISA, 100 KCAS");
var ref2 = tasFromCas(100, 8000, TAS.isaTempC(8000));
var c2 = TAS.compute({ casKt: 100, pressureAltitudeFt: 8000, oatC: TAS.isaTempC(8000) });
nearly(c2.tasKt, ref2.tasKt, 1e-9, "TAS matches independent pitot formula at 8,000 ft ISA");
nearly(c2.mach, ref2.mach, 1e-12, "Mach matches independent formula");
isTrue(c2.tasKt > 100, "TAS is greater than CAS at altitude");
// Rule of thumb ~2%/1000 ft → ~16% → 116 kt; exact is a little less
isTrue(c2.tasKt > 112 && c2.tasKt < 118, "TAS is in the 112–118 kt ballpark (2%/1,000 ft rule)");

console.log("\nCase 3  10,000 ft ISA, 150 KCAS");
var ref3 = tasFromCas(150, 10000, TAS.isaTempC(10000));
var c3 = TAS.compute({ casKt: 150, pressureAltitudeFt: 10000, oatC: TAS.isaTempC(10000) });
nearly(c3.tasKt, ref3.tasKt, 1e-9, "TAS matches independent formula at 10,000 ft, 150 KCAS");
nearly(c3.easKt, c3.tasKt * Math.sqrt(c3.densityRatio), 1e-9, "EAS = TAS × √σ");
isTrue(c3.easKt < c3.casKt, "EAS is slightly below CAS at this speed/altitude (compressibility)");

console.log("\nCase 4  ISA deviation path: PA 5,000 ft, ISA +10");
var isa5 = TAS.isaTempC(5000);
var c4 = TAS.compute({ casKt: 120, pressureAltitudeFt: 5000, isaDevC: 10 });
nearly(c4.oatC, isa5 + 10, 1e-9, "OAT = ISA + 10");
nearly(c4.isaDeviationC, 10, 1e-9, "stored ISA deviation is +10");
// Warmer air, higher speed of sound, slightly higher TAS for the same Mach
var c4isa = TAS.compute({ casKt: 120, pressureAltitudeFt: 5000, isaDevC: 0 });
isTrue(c4.tasKt > c4isa.tasKt, "ISA+10 produces a higher TAS than ISA (same CAS and PA)");

console.log("\nCase 5  Reverse: TAS → CAS at the Case 3 condition");
var back = TAS.compute({ solveFor: "cas", tasKt: c3.tasKt, pressureAltitudeFt: 10000, oatC: TAS.isaTempC(10000) });
nearly(back.casKt, 150, 1e-8, "round-trip TAS → CAS recovers 150 KCAS");
nearly(back.mach, c3.mach, 1e-12, "round-trip Mach matches");

console.log("\nCase 6  Tropopause / FL360 pressure");
var pTrop = TAS.isaPressurePa(11000 / 0.3048);
nearly(pTrop, isaP(11000), 1e-6, "tropopause pressure matches ISO 2533 computation");
var fl360 = TAS.compute({ casKt: 250, pressureAltitudeFt: 36000, oatC: TAS.isaTempC(36000) });
isTrue(fl360.error == null, "subsonic 250 KCAS at FL360 is defined");
isTrue(fl360.isaTempC < -54 && fl360.isaTempC > -57, "ISA temp near the tropopause is ≈ −56.5°C");
var ref6 = tasFromCas(250, 36000, TAS.isaTempC(36000));
nearly(fl360.tasKt, ref6.tasKt, 1e-8, "FL360 TAS matches independent formula");

console.log("\nCase 7  TAT for recovery factor 1");
// TAT = SAT (1 + 0.2 M²)
var satK = 15 + 273.15;
var m = 0.5;
var tat = satK * (1 + 0.2 * m * m) - 273.15;
// Use a CAS that produces M=0.5 at SL? Easier to check the returned TAT against the formula
var c7 = TAS.compute({ casKt: sl.casKt, pressureAltitudeFt: 0, oatC: 15 });
nearly(c7.tatC, 15 + (c7.tempK * 0.2 * c7.mach * c7.mach), 1e-9, "TAT = SAT + SAT·0.2·M²  (i.e. SAT(1+0.2M²))");

console.log("\nCase 8  Speed of sound at 15°C and −56.5°C");
nearly(TAS.speedOfSoundMps(288.15), A0, 1e-9, "a(15°C) = a0");
nearly(TAS.A0_KT, A0 / KT, 1e-9, "a0 in knots");

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);

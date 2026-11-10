#!/usr/bin/env node
/**
 * Verification for aviation unit conversions in calc.js.
 * Run:  node test.js
 *
 * Legal / ICAO constants are listed at the top of calc.js.
 */
"use strict";

var U = require("./calc.js");
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

console.log("Aviation unit converter — formula verification\n");

console.log("Case 1  Speed: 1 kt identities");
nearly(U.convert("speed", 1, "kt", "kmh"), 1.852, 0, "1 kt = 1.852 km/h exactly");
nearly(U.convert("speed", 1, "kt", "mph"), 1852 / 1609.344, 1e-12, "1 kt = 1852/1609.344 mph");
nearly(U.convert("speed", 1, "kt", "mps"), 1852 / 3600, 1e-15, "1 kt = 1852/3600 m/s");
nearly(U.convert("speed", 100, "kt", "kt"), 100, 0, "identity 100 kt");
nearly(U.convert("speed", 1.852, "kmh", "kt"), 1, 1e-12, "1.852 km/h = 1 kt");
nearly(U.convert("speed", 115.0779448, "mph", "kt"), 100, 1e-6, "≈115.078 mph = 100 kt");

console.log("\nCase 2  Distance and altitude");
nearly(U.convert("distance", 1, "nm", "m"), 1852, 0, "1 nm = 1852 m exactly");
nearly(U.convert("distance", 1, "sm", "m"), 1609.344, 1e-12, "1 sm = 1609.344 m exactly");
nearly(U.convert("distance", 1, "nm", "sm"), 1852 / 1609.344, 1e-12, "1 nm = 1852/1609.344 sm");
nearly(U.convert("altitude", 1, "ft", "m"), 0.3048, 0, "1 ft = 0.3048 m exactly");
nearly(U.convert("altitude", 100, "m", "ft"), 100 / 0.3048, 1e-10, "100 m in feet");
nearly(U.convert("altitude", 350, "fl", "ft"), 35000, 0, "FL350 = 35,000 ft");
nearly(U.convert("altitude", 36089.24, "ft", "m"), 36089.24 * 0.3048, 1e-6, "≈11 km tropopause height");

console.log("\nCase 3  Pressure");
nearly(U.convert("pressure", 1, "inhg", "hpa"), 33.863886666666667, 1e-12, "1 inHg = 33.863886666666667 hPa");
nearly(U.convert("pressure", 1, "hpa", "mb"), 1, 0, "1 hPa = 1 mb");
nearly(U.convert("pressure", 1013.25 / U.HPA_PER_INHG, "inhg", "hpa"), 1013.25, 1e-9, "ICAO standard p0 (1013.25 hPa / inHg constant) round-trips");
nearly(U.convert("pressure", 1013.25, "hpa", "inhg"), 1013.25 / 33.863886666666667, 1e-12, "1013.25 hPa back to inHg");
// 1 psi = 6894.757293168 Pa = 68.94757293168 hPa
nearly(U.convert("pressure", 1, "psi", "hpa"), 68.94757293168, 1e-8, "1 psi ≈ 68.94757 hPa");

console.log("\nCase 4  Mass and volume");
nearly(U.convert("mass", 1, "lb", "kg"), 0.45359237, 0, "1 lb = 0.45359237 kg exactly");
nearly(U.convert("mass", 16, "oz", "lb"), 1, 1e-12, "16 oz = 1 lb");
nearly(U.convert("volume", 1, "gal", "l"), 3.785411784, 1e-12, "1 US gal = 3.785411784 L exactly");
nearly(U.convert("volume", 4, "qt", "gal"), 1, 1e-12, "4 US qt = 1 US gal");
nearly(U.convert("volume", 1, "impgal", "l"), 4.54609, 1e-12, "1 imperial gal = 4.54609 L");

console.log("\nCase 5  Temperature");
nearly(U.convert("temperature", 0, "c", "f"), 32, 1e-12, "0°C = 32°F");
nearly(U.convert("temperature", 100, "c", "f"), 212, 1e-12, "100°C = 212°F");
nearly(U.convert("temperature", -40, "c", "f"), -40, 1e-12, "−40°C = −40°F");
nearly(U.convert("temperature", 15, "c", "k"), 288.15, 1e-12, "15°C = 288.15 K (ISA SL)");
nearly(U.convert("temperature", 59, "f", "c"), 15, 1e-12, "59°F = 15°C");
nearly(U.convert("temperature", 491.67, "r", "c"), 0, 1e-9, "491.67 °R ≈ 0°C");

console.log("\nCase 6  Vertical speed");
nearly(U.convert("verticalSpeed", 1, "fpm", "mps"), 0.00508, 0, "1 fpm = 0.00508 m/s exactly");
nearly(U.convert("verticalSpeed", 500, "fpm", "mps"), 2.54, 1e-12, "500 fpm = 2.54 m/s");
nearly(U.convert("verticalSpeed", 1, "kt", "fpm"), (1852 / 0.3048) / 60, 1e-10, "1 kt vertical = 101.2686 fpm");

console.log("\nCase 7  convertAll consistency");
var all = U.convertAll("speed", 250, "kt");
nearly(all.kmh, 250 * 1.852, 1e-12, "convertAll kt→km/h");
isTrue(Math.abs(U.convert("speed", all.mph, "mph", "kt") - 250) < 1e-9, "round-trip mph → kt");

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);

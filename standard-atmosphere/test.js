#!/usr/bin/env node
"use strict";

var C = require("./calc.js");
var failed = 0, passed = 0;
function nearly(a, b, tol, label) {
  if (isFinite(a) && isFinite(b) && Math.abs(a - b) <= tol) {
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

console.log("Standard atmosphere — U.S. Standard Atmosphere 1976\n");

console.log("Case 1  Sea-level defined values (H = 0)");
var sl = C.propertiesAtGeopotential(0);
nearly(sl.temperatureK, 288.15, 1e-12, "T0 = 288.15 K");
nearly(sl.pressurePa, 101325, 1e-8, "P0 = 101325 Pa");
nearly(sl.densityKgM3, 1.225, 5e-5, "ρ0 = 1.225 kg/m³");
nearly(sl.speedOfSoundMps, 340.294, 0.005, "a0 = 340.294 m/s (USSA 1976)");
nearly(sl.dynamicViscosity, 1.7894e-5, 2e-9, "μ0 ≈ 1.7894e-5 kg/(m·s), Sutherland");
nearly(sl.kinematicViscosity, 1.4607e-5, 2e-9, "ν0 = μ0/ρ0 ≈ 1.4607e-5 m²/s");
nearly(sl.geometricM, 0, 1e-12, "Z = H = 0 at sea level");
nearly(sl.pressureRatio, 1, 1e-12, "δ = 1");
nearly(sl.temperatureRatio, 1, 1e-12, "θ = 1");
nearly(sl.densityRatio, 1, 5e-5, "σ = 1");

console.log("\nCase 2  Tropopause at 11 km geopotential (USSA 1976 / ICAO)");
var trop = C.propertiesAtGeopotential(11000);
nearly(trop.temperatureK, 216.65, 1e-12, "T = 216.65 K at H = 11 km");
nearly(trop.pressurePa, 22632.1, 0.2, "P = 22632.1 Pa (published table)");
nearly(trop.densityKgM3, 0.363918, 2e-6, "ρ = 0.363918 kg/m³");
nearly(trop.speedOfSoundMps, 295.070, 0.01, "a = 295.070 m/s");
nearly(trop.dynamicViscosity, 1.42161e-5, 2e-9, "μ = 1.42161e-5 kg/(m·s)");

console.log("\nCase 3  Layer bases, published USSA 1976 geopotential table");
// Jim Hawley / USSA 1976 state variables at layer bases (geopotential).
var bases = [
  { H: 20000, T: 216.65, P: 5474.88,  rho: 8.80348e-2, a: 295.070, mu: 1.42161e-5 },
  { H: 32000, T: 228.65, P: 868.018,  rho: 1.32250e-2, a: 303.131, mu: 1.48679e-5 },
  { H: 47000, T: 270.65, P: 110.906,  rho: 1.42753e-3, a: 329.799, mu: 1.70368e-5 },
  { H: 51000, T: 270.65, P: 66.9388,  rho: 8.61604e-4, a: 329.799, mu: 1.70368e-5 },
  { H: 71000, T: 214.65, P: 3.95641,  rho: 6.42108e-5, a: 293.704, mu: 1.41060e-5 }
];
bases.forEach(function (b) {
  var p = C.propertiesAtGeopotential(b.H);
  nearly(p.temperatureK, b.T, 1e-12, "H=" + (b.H / 1000) + " km  T=" + b.T + " K");
  nearly(p.pressurePa, b.P, b.P * 2e-4 + 0.02, "H=" + (b.H / 1000) + " km  P=" + b.P + " Pa");
  nearly(p.densityKgM3, b.rho, b.rho * 3e-4 + 1e-8, "H=" + (b.H / 1000) + " km  ρ=" + b.rho);
  nearly(p.speedOfSoundMps, b.a, 0.02, "H=" + (b.H / 1000) + " km  a=" + b.a);
  nearly(p.dynamicViscosity, b.mu, b.mu * 3e-4 + 1e-10, "H=" + (b.H / 1000) + " km  μ");
});

console.log("\nCase 4  Geometric vs geopotential at 11 km geometric");
// Z = 11 km is not the tropopause: H = r0 Z / (r0+Z) ≈ 10,980.96 m,
// so T is a little above 216.65 K (still in the troposphere).
var z11 = C.propertiesFromGeometric(11000);
var H11 = C.geopotentialFromGeometric(11000);
nearly(H11, 6356766 * 11000 / (6356766 + 11000), 1e-6, "H = r0 Z / (r0+Z) at 11 km geometric");
isTrue(z11.temperatureK > 216.65 && z11.temperatureK < 216.65 + 0.15, "11 km geometric is still troposphere, T > 216.65 K");
nearly(z11.geopotentialM, H11, 1e-6, "returned H matches conversion");
var backZ = C.geometricFromGeopotential(H11);
nearly(backZ, 11000, 1e-6, "Z ↔ H inversion");

console.log("\nCase 5  Model top: 86 km geometric = 84.852 km geopotential");
var topH = C.geopotentialFromGeometric(86000);
nearly(topH, 84852, 2, "86 km geometric ≈ 84.852 km geopotential");
var top = C.propertiesFromGeometric(86000);
isTrue(top != null && top.temperatureK > 180 && top.temperatureK < 190, "T at 86 km geometric ≈ 186.95 K");
isTrue(C.propertiesFromGeometric(90000) === null, "above 86 km geometric → null");
isTrue(C.propertiesAtGeopotential(-1) === null, "negative H → null");

console.log("\nCase 6  Inverse: pressure → pressure altitude, density → density altitude");
[0, 5000, 11000, 20000, 32000, 47000, 51000, 71000, 84852].forEach(function (H) {
  var p = C.propertiesAtGeopotential(H);
  var fromP = C.fromPressure(p.pressurePa);
  var fromR = C.fromDensity(p.densityKgM3);
  nearly(fromP.geopotentialM, H, 0.05, "P inverse at H=" + H + " m");
  nearly(fromR.geopotentialM, H, 0.05, "ρ inverse at H=" + H + " m");
});
isTrue(C.fromPressure(200000) === null, "pressure above sea level → null");
isTrue(C.fromDensity(1e-12) === null, "density below model top → null");

console.log("\nCase 7  compute() unit path: 36,089.24 ft geopotential is 11 km");
var fl = C.compute({ mode: "altitude", altitude: 11000 * C.FT_PER_M, altitudeUnit: "ft", altitudeKind: "geopotential" });
nearly(fl.temperatureK, 216.65, 1e-9, "36,089 ft geopotential → 216.65 K");
nearly(fl.pressureHpa, 226.321, 0.005, "pressure in hPa");
var fromInHg = C.compute({ mode: "pressure", pressure: sl.pressurePa * (1 / 3386.389), pressureUnit: "inhg" });
nearly(fromInHg.geopotentialM, 0, 0.05, "29.92126 inHg → ~0 ft PA");

console.log("\nCase 8  Equation of state and Sutherland inversion check");
nearly(sl.pressurePa, sl.densityKgM3 * C.RS * sl.temperatureK, 0.2, "P ≈ ρ R T at sea level");
nearly(C.dynamicViscosity(288.15), C.BETA * Math.pow(288.15, 1.5) / (288.15 + C.SUTH_S), 1e-20, "Sutherland formula used as written");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

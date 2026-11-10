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

console.log("Isentropic flow — NACA Report 1135, γ = 1.4\n");

console.log("Case 1  M = 1 (sonic, exact)");
var s = C.ratiosFromMach(1, 1.4);
nearly(s.T_T0, 1 / 1.2, 1e-12, "T/T0 = 0.833333");
nearly(s.P_P0, Math.pow(1.2, -3.5), 1e-12, "P/P0 = 0.528282");
nearly(s.P_P0, 0.52828, 5e-6, "P/P0 ≈ 0.52828 (NACA 1135)");
nearly(s.rho_rho0, Math.pow(1.2, -2.5), 1e-12, "ρ/ρ0 = 0.633938");
nearly(s.A_Astar, 1, 1e-12, "A/A* = 1 at M = 1");
nearly(s.Mstar, 1, 1e-12, "M* = 1 at M = 1");

console.log("\nCase 2  M = 2 (NACA 1135 / exact γ = 1.4)");
var m2 = C.compute({ mode: "mach", value: 2, gamma: 1.4 });
nearly(m2.T_T0, 1 / 1.8, 1e-12, "T/T0 = 0.555556");
nearly(m2.P_P0, Math.pow(1.8, -3.5), 1e-12, "P/P0 = (1.8)^{-3.5}");
nearly(m2.P_P0, 0.12780, 5e-6, "P/P0 ≈ 0.12780 (NACA 1135)");
nearly(m2.rho_rho0, Math.pow(1.8, -2.5), 1e-12, "ρ/ρ0 = (1.8)^{-2.5}");
nearly(m2.rho_rho0, 0.23005, 5e-6, "ρ/ρ0 ≈ 0.23005 (NACA 1135)");
nearly(m2.A_Astar, 1.6875, 1e-10, "A/A* = 1.6875 exactly at M = 2, γ = 1.4");
nearly(m2.Mstar, Math.sqrt((2.4 / 2 * 4) / 1.8), 1e-12, "M* at M = 2");

console.log("\nCase 3  M = 0.5 and inverses");
var m05 = C.ratiosFromMach(0.5, 1.4);
var backT = C.compute({ mode: "T_T0", value: m05.T_T0 });
nearly(backT.mach, 0.5, 1e-10, "T/T0 inverts to M");
var backP = C.compute({ mode: "P_P0", value: m05.P_P0 });
nearly(backP.mach, 0.5, 1e-10, "P/P0 inverts to M");
var backR = C.compute({ mode: "rho_rho0", value: m05.rho_rho0 });
nearly(backR.mach, 0.5, 1e-10, "ρ/ρ0 inverts to M");

console.log("\nCase 4  A/A* = 1.6875 has subsonic and supersonic roots");
var sub = C.compute({ mode: "A_Astar", value: 1.6875, branch: "subsonic" });
var sup = C.compute({ mode: "A_Astar", value: 1.6875, branch: "supersonic" });
nearly(sup.mach, 2, 1e-8, "supersonic branch M = 2");
isTrue(sub.mach < 1, "subsonic branch M < 1");
nearly(sub.A_Astar, 1.6875, 1e-8, "subsonic A/A* recovered");
nearly(sub.otherMach, 2, 1e-6, "other root is M = 2");

console.log("\nCase 5  Stagnation temperature (hold T0 from static + M)");
var stag = C.compute({ mode: "mach", value: 2, staticTempK: 216.65 });
nearly(stag.stagnationTempK, 216.65 * 1.8, 1e-9, "T0 = T (1 + 0.2 M²) = 389.97 K");

console.log("\nCase 6  Invalid");
isTrue(C.compute({ mode: "T_T0", value: 1.2 }) === null, "T/T0 > 1 is impossible");
isTrue(C.compute({ mode: "A_Astar", value: 0.5 }) === null, "A/A* < 1 is impossible");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

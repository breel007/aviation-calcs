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

console.log("Hohmann transfer\n");

console.log("Case 1  300 km LEO (WGS-84 equatorial) → GEO, the ~3.9 km/s textbook case");
var r = C.compute({
  earthRadius: "equatorial",
  r1: 300, r1Unit: "altitude-km",
  r2: 0, r2Unit: "geo"
});
var mu = C.MU_EARTH;
var r1 = C.R_EARTH_EQ + 300000;
var r2 = C.geoRadius(mu);
var a = 0.5 * (r1 + r2);
var v1 = Math.sqrt(mu / r1);
var v2 = Math.sqrt(mu / r2);
var vp = Math.sqrt(mu * (2 / r1 - 1 / a));
var va = Math.sqrt(mu * (2 / r2 - 1 / a));
nearly(r.deltaV1, vp - v1, 1e-6, "Δv1 = vp − v_LEO");
nearly(r.deltaV2, v2 - va, 1e-6, "Δv2 = v_GEO − va");
nearly(r.deltaV, (vp - v1) + (v2 - va), 1e-6, "total Δv sums");
nearly(r.timeOfFlight, Math.PI * Math.sqrt(a * a * a / mu), 1e-4, "TOF = π √(a³/μ)");
// Published ballpark: ~3.9 km/s. Independent hand check of the closed form:
// Δv is between 3.8 and 4.0 km/s for 200–400 km LEO → GEO.
nearly(r.deltaV, 3900, 150, "total Δv ≈ 3.9 km/s (LEO→GEO)");
isTrue(r.deltaV > 3800 && r.deltaV < 4000, "3.8–4.0 km/s band");

console.log("\nCase 2  Equal radii → zero Δv");
var z = C.compute({ r1: 6678000, r1Unit: "m", r2: 6678000, r2Unit: "m" });
nearly(z.deltaV, 0, 0, "no transfer needed");

console.log("\nCase 3  Inward transfer (GEO down to 300 km) has the same total Δv");
var down = C.compute({
  earthRadius: "equatorial",
  r1: 0, r1Unit: "geo",
  r2: 300, r2Unit: "altitude-km"
});
nearly(down.deltaV, r.deltaV, 1e-4, "inward Hohmann has the same |Δv| total");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

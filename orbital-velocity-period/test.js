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

console.log("Orbital velocity and period\n");

console.log("Case 1  Circular LEO, 400 km above mean Earth radius (hand-checked)");
var r = C.compute({ body: "earth", earthRadius: "mean", altitudeM: 400000 });
var mu = C.MU_EARTH, R = C.R_EARTH_MEAN + 400000;
nearly(r.velocity, Math.sqrt(mu / R), 1e-8, "v = √(μ/r)");
nearly(r.period, 2 * Math.PI * Math.sqrt(R * R * R / mu), 1e-8, "T = 2π √(r³/μ)");
nearly(r.escapeVelocity, r.velocity * Math.sqrt(2), 1e-8, "v_esc = √2 v_circ");
// r = 6,771,000 m; v ≈ 7,669 m/s; T ≈ 92.6 min
nearly(r.velocity, 7669, 5, "v ≈ 7.669 km/s at 400 km (mean radius)");
nearly(r.period / 60, 92.6, 0.2, "period ≈ 92.6 min");

console.log("\nCase 2  GEO radius from the sidereal day");
var geoR = C.geoRadius(mu);
var geo = C.compute({ body: "earth", radiusM: geoR });
nearly(geo.period, C.SIDEREAL_DAY_S, 0.05, "GEO period = sidereal day");
nearly(geoR / 1000, 42164, 3, "GEO radius ≈ 42,164 km");
nearly(geo.velocity, 3075, 3, "GEO speed ≈ 3.075 km/s");

console.log("\nCase 3  Vis-viva on a 400 × 800 km ellipse (mean radius)");
var e = C.compute({
  body: "earth",
  periapsisM: 400000,
  apoapsisM: 800000,
  apsidesAreAltitudes: true
});
var rp = C.R_EARTH_MEAN + 400000, ra = C.R_EARTH_MEAN + 800000, a = 0.5 * (rp + ra);
nearly(e.periapsisVelocity, Math.sqrt(mu * (2 / rp - 1 / a)), 1e-6, "vis-viva at periapsis");
nearly(e.apoapsisVelocity, Math.sqrt(mu * (2 / ra - 1 / a)), 1e-6, "vis-viva at apoapsis");
isTrue(e.periapsisVelocity > e.apoapsisVelocity, "faster at periapsis");
nearly(e.eccentricity, (ra - rp) / (ra + rp), 1e-12, "e = (ra−rp)/(ra+rp)");

console.log("\nCase 4  Invalid");
isTrue(C.compute({ altitudeM: -100 }) === null, "negative altitude → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

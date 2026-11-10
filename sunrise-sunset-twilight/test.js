#!/usr/bin/env node
"use strict";

var S = require("./calc.js");
var A = require("./airports.js");
var failed = 0, passed = 0;
function nearly(a, b, tol, label) {
  if (Math.abs(a - b) <= tol) { passed += 1; console.log("  PASS  " + label); }
  else { failed += 1; console.log("  FAIL  " + label + "\n        got " + a + "  expected " + b + "  ±" + tol); }
}
function isTrue(cond, label) {
  if (cond) { passed += 1; console.log("  PASS  " + label); }
  else { failed += 1; console.log("  FAIL  " + label); }
}

console.log("Sunrise, sunset & FAA night — formula verification\n");

console.log("Case 1  Julian day (J2000.0 is 2451545.0 at 2000-01-01 12:00 UTC)");
nearly(S.julianDay(2000, 1, 1), 2451544.5, 1e-9, "2000-01-01 00:00 UTC = JD 2451544.5");
nearly(S.julianDay(2000, 1, 1) + 0.5, 2451545.0, 1e-9, "noon on that date is J2000.0");

console.log("\nCase 2  Equator, lon 0, 20 March 2024 (near the equinox), UTC");
var eq = S.compute({ lat: 0, lon: 0, year: 2024, month: 3, day: 20, timeZone: "UTC", offsetHours: 0 });
isTrue(eq.sunrise != null && eq.sunset != null, "sunrise and sunset exist");
// Solar noon should be very close to 12:00 UTC at lon 0
nearly(eq.solarNoonUTC.minutes, 12 * 60, 8, "solar noon within 8 minutes of 12:00 UTC (equation of time)");
// Sunrise / sunset should be close to 06:00 / 18:00
nearly(eq.sunriseUTC.minutes, 6 * 60, 12, "sunrise within 12 minutes of 06:00 UTC");
nearly(eq.sunsetUTC.minutes, 18 * 60, 12, "sunset within 12 minutes of 18:00 UTC");
isTrue(eq.civilDawnUTC.minutes < eq.sunriseUTC.minutes, "morning civil twilight is before sunrise");
isTrue(eq.civilDuskUTC.minutes > eq.sunsetUTC.minutes, "evening civil twilight is after sunset");
// Civil twilight is typically ~20–25 minutes at the equator
var tw = eq.sunriseUTC.minutes - eq.civilDawnUTC.minutes;
isTrue(tw > 18 && tw < 30, "equatorial civil twilight is about 20–25 minutes (got " + tw.toFixed(1) + ")");

console.log("\nCase 3  New York City, 1 July 2024, Eastern Daylight Time");
// NOAA / USNO: sunrise 05:27 EDT, sunset 20:31 EDT (rounded to the minute)
// 40.7128 N, 74.0060 W. EDT = UTC−4.
var nyc = S.compute({
  lat: 40.7128, lon: -74.0060,
  year: 2024, month: 7, day: 1,
  timeZone: "America/New_York"
});
nearly(nyc.offsetMinutes, -240, 0, "1 July in New York is UTC−4 (EDT)");
// Allow ±2 minutes against published almanac figures (rounding + refraction).
function hm(clock) { return clock.hour * 60 + clock.minute + clock.second / 60; }
nearly(hm(nyc.sunrise), 5 * 60 + 27, 2, "NYC sunrise ≈ 05:27 EDT (got " + nyc.sunrise.hhmmss + ")");
nearly(hm(nyc.sunset), 20 * 60 + 31, 2, "NYC sunset ≈ 20:31 EDT (got " + nyc.sunset.hhmmss + ")");
nearly(hm(nyc.civilDawn), 4 * 60 + 54, 3, "NYC morning civil twilight ≈ 04:54 EDT");
nearly(hm(nyc.civilDusk), 21 * 60 + 4, 3, "NYC evening civil twilight ≈ 21:04 EDT");

console.log("\nCase 4  FAA night definitions are derived from sunrise/sunset/twilight");
nearly(nyc.nightLogging.start.minutes, nyc.civilDusk.minutes, 1e-9, "night logging starts at the end of evening civil twilight");
nearly(nyc.nightLogging.end.minutes, nyc.civilDawn.minutes, 1e-9, "night logging ends at the beginning of morning civil twilight");
nearly(nyc.nightCurrency.start.minutes, (nyc.sunset.minutes + 60) % 1440, 1e-9, "61.57(b) starts 1 hour after sunset");
nearly(nyc.nightCurrency.end.minutes, (nyc.sunrise.minutes - 60 + 1440) % 1440, 1e-9, "61.57(b) ends 1 hour before sunrise");
nearly(nyc.positionLights.start.minutes, nyc.sunset.minutes, 1e-9, "91.209 starts at sunset");
nearly(nyc.positionLights.end.minutes, nyc.sunrise.minutes, 1e-9, "91.209 ends at sunrise");
isTrue(nyc.sunriseUTC.zulu.charAt(4) === "Z", "UTC times are formatted as Zulu");

console.log("\nCase 5  Los Angeles on a January morning (PST, UTC−8)");
var lax = S.compute({
  lat: 33.9425, lon: -118.4081,
  year: 2024, month: 1, day: 15,
  timeZone: "America/Los_Angeles"
});
nearly(lax.offsetMinutes, -8 * 60, 0, "15 January in Los Angeles is UTC−8 (PST)");
isTrue(lax.sunrise.hour >= 6 && lax.sunrise.hour <= 7, "mid-January LAX sunrise is around 07:00 PST (got " + lax.sunrise.hhmm + ")");

console.log("\nCase 6  Polar day at Utqiagvik (Barrow), 21 June 2024");
var brw = S.compute({
  lat: 71.2854, lon: -156.7660,
  year: 2024, month: 6, day: 21,
  timeZone: "America/Anchorage"
});
isTrue(brw.continuousDay === true || brw.polar.noSunset === true, "Utqiagvik has no sunset (or continuous day) on the June solstice");

console.log("\nCase 7  Airport lookup list");
isTrue(A.AIRPORTS.length >= 200, "at least 200 airports are embedded (got " + A.AIRPORTS.length + ")");
isTrue(A.find("KLAX").iata === "LAX", "find('KLAX') returns Los Angeles");
isTrue(A.find("lax").icao === "KLAX", "find is case-insensitive and accepts IATA");
isTrue(A.find("JFK").name.indexOf("Kennedy") !== -1, "find('JFK') returns JFK");
isTrue(A.search("Dallas").length >= 2, "search('Dallas') finds more than one airport");
var ksea = A.find("SEA");
isTrue(ksea && ksea.tz === "America/Los_Angeles", "Seattle has the Pacific time zone");

console.log("\nCase 8  Invalid inputs");
isTrue(S.compute({ lat: 95, lon: 0, year: 2024, month: 1, day: 1 }) === null, "latitude 95 → null");
isTrue(S.compute({ lat: 0, lon: 0, year: 2024, month: 13, day: 1 }) === null, "month 13 → null");
isTrue(S.parseDate("07/01/2024") === null, "slash date is rejected (use ISO)");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

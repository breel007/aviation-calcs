#!/usr/bin/env node
"use strict";

var Z = require("./calc.js");
var failed = 0, passed = 0;
function nearly(a, b, tol, label) {
  if (Math.abs(a - b) <= tol) { passed += 1; console.log("  PASS  " + label); }
  else { failed += 1; console.log("  FAIL  " + label + "\n        got " + a + "  expected " + b); }
}
function isTrue(cond, label) {
  if (cond) { passed += 1; console.log("  PASS  " + label); }
  else { failed += 1; console.log("  FAIL  " + label); }
}

console.log("Zulu time converter — formula verification\n");

console.log("Case 1  Time parsing");
nearly(Z.parseTime("1430").hour, 14, 0, "1430 → 14 hours");
nearly(Z.parseTime("1430").minute, 30, 0, "1430 → 30 minutes");
nearly(Z.parseTime("14:30:15").second, 15, 0, "14:30:15 keeps seconds");
nearly(Z.parseTime("2:30 PM").hour, 14, 0, "2:30 PM → 14:30");
nearly(Z.parseTime("12:00 am").hour, 0, 0, "12:00 am → 00:00");
nearly(Z.parseTime("12:00 pm").hour, 12, 0, "12:00 pm → 12:00");
nearly(Z.parseTime("1430Z").minute, 30, 0, "trailing Z is accepted");
isTrue(Z.parseTime("2560") === null, "invalid minute → null");
isTrue(Z.parseTime("25:00") === null, "hour 25 → null");

console.log("\nCase 2  ETE parsing");
nearly(Z.parseEte("1:30"), 1.5 * 3600000, 0, "1:30 = 1.5 hours");
nearly(Z.parseEte("1+30"), 1.5 * 3600000, 0, "1+30 = 1.5 hours");
nearly(Z.parseEte("2.25"), 2.25 * 3600000, 0, "2.25 hours");
nearly(Z.parseEte("90m"), 90 * 60000, 0, "90m");
nearly(Z.parseEte(2), 2 * 3600000, 0, "numeric 2 hours");

console.log("\nCase 3  Eastern Time offsets (DST-aware via Intl)");
// 2024-07-01 12:00 America/New_York is EDT, UTC−4 → 16:00Z
var summer = Z.convert({
  date: "2024-07-01", time: "12:00",
  fromZone: "America/New_York", toZone: "UTC"
});
nearly(summer.utc.parts.hour, 16, 0, "1 July 12:00 EDT = 16:00Z");
nearly(summer.from.offsetMinutes, -4 * 60, 0, "EDT offset is UTC−4");
isTrue(summer.from.abbrev === "EDT" || /EDT|GMT-4|UTC-4/.test(String(summer.from.abbrev)), "abbrev is EDT (got " + summer.from.abbrev + ")");
// 2024-01-15 12:00 America/New_York is EST, UTC−5 → 17:00Z
var winter = Z.convert({
  date: "2024-01-15", time: "12:00",
  fromZone: "America/New_York", toZone: "UTC"
});
nearly(winter.utc.parts.hour, 17, 0, "15 Jan 12:00 EST = 17:00Z");
nearly(winter.from.offsetMinutes, -5 * 60, 0, "EST offset is UTC−5");

console.log("\nCase 4  Arizona has no DST; California does");
var az = Z.convert({ date: "2024-07-01", time: "12:00", fromZone: "America/Phoenix", toZone: "UTC" });
var ca = Z.convert({ date: "2024-07-01", time: "12:00", fromZone: "America/Los_Angeles", toZone: "UTC" });
nearly(az.utc.parts.hour, 19, 0, "Phoenix 12:00 MST (no DST) = 19:00Z");
nearly(ca.utc.parts.hour, 19, 0, "Los Angeles 12:00 PDT = 19:00Z (same clock, both UTC−7 in July)");
var azW = Z.convert({ date: "2024-01-15", time: "12:00", fromZone: "America/Phoenix", toZone: "UTC" });
var caW = Z.convert({ date: "2024-01-15", time: "12:00", fromZone: "America/Los_Angeles", toZone: "UTC" });
nearly(azW.utc.parts.hour, 19, 0, "Phoenix stays on UTC−7 in January");
nearly(caW.utc.parts.hour, 20, 0, "Los Angeles 12:00 PST = 20:00Z in January");

console.log("\nCase 5  Local 23:30 converting past midnight Zulu, and the inverse");
var late = Z.convert({ date: "2024-07-01", time: "23:30", fromZone: "America/Los_Angeles", toZone: "UTC" });
nearly(late.utc.parts.hour, 6, 0, "23:30 PDT = 06:30Z the next day");
nearly(late.utc.parts.day, 2, 0, "UTC date rolls to 2 July");
isTrue(late.to.dateChanged === true, "dateChanged is flagged");
// Inverse: 06:30Z on 2 July → 23:30 PDT on 1 July
var inv = Z.convert({ date: "2024-07-02", time: "0630", fromZone: "UTC", toZone: "America/Los_Angeles" });
nearly(inv.to.parts.hour, 23, 0, "06:30Z → 23:30 PDT");
nearly(inv.to.parts.day, 1, 0, "local date is still 1 July");

console.log("\nCase 6  Flight-plan ETA");
var eta = Z.eta({
  date: "2024-07-01", time: "1430", departIsZulu: true,
  departZone: "America/New_York", arriveZone: "America/Los_Angeles",
  ete: "5:15"
});
// Depart 1430Z, +5h15m = 1945Z = 12:45 PDT
isTrue(eta.arriveZulu === "1945Z", "1430Z + 5+15 = 1945Z (got " + eta.arriveZulu + ")");
nearly(eta.arriveLocal.hour, 12, 0, "1945Z is 12:45 PDT");
nearly(eta.arriveLocal.minute, 45, 0, "minutes are 45");
nearly(eta.eteHours, 5.25, 1e-12, "ETE is 5.25 hours");

console.log("\nCase 7  Zulu format helper and offset label");
isTrue(Z.formatZulu(9, 5) === "0905Z", "formatZulu pads to 0905Z");
isTrue(Z.offsetLabel(-7 * 60) === "UTC−07:00", "UTC−07:00 label uses a minus sign");
isTrue(Z.offsetLabel(5.5 * 60) === "UTC+05:30", "UTC+05:30 (India)");

console.log("\nCase 8  Invalid");
isTrue(Z.convert({ date: "2024-13-01", time: "12:00", fromZone: "UTC", toZone: "UTC" }) === null, "bad date → null");
isTrue(Z.parseTime("") === null, "empty time → null");
isTrue(Z.eta({ date: "2024-07-01", time: "12:00", ete: "nope" }) === null, "bad ETE → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

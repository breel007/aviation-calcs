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
console.log("Logbook time totals\n");

console.log("Case 1  Duration parsing and tenths");
nearly(C.durationHours({ hhmm: "1:30" }), 1.5, 1e-12, "1:30 = 1.5 h");
nearly(C.durationHours({ hours: 1, minutes: 15 }), 1.25, 1e-12, "1 h 15 min = 1.25 h");
nearly(C.durationHours({ decimalHours: 2.4 }), 2.4, 1e-12, "decimal 2.4 h");
nearly(C.tenthsHours(1.5), 1.5, 1e-12, "1:30 is 1.5 tenths");
nearly(C.tenthsHours(C.durationHours({ hhmm: "1:03" })), 1.1, 1e-12, "1:03 → 1.1 tenths");
nearly(C.tenthsHours(C.durationHours({ hhmm: "1:02" })), 1.0, 1e-12, "1:02 → 1.0 tenths");
nearly(C.tenthsHours(C.durationHours({ hhmm: "1:57" })), 2.0, 1e-12, "1:57 → 2.0 tenths");
isTrue(C.formatHm(4 + 5 / 60) === "4:05", "format 4:05");

console.log("\nCase 2  Two flights: 1:20 PIC XC + 2:45 night PIC");
var a = C.compute({
  asOf: "2026-11-10",
  entries: [
    { hhmm: "1:20", date: "2026-11-01", pic: true, xc: true, dayLandings: 2 },
    { hhmm: "2:45", date: "2026-11-08", pic: true, night: true, nightLandings: 3 }
  ]
});
nearly(a.all.timeHours, 4 + 5 / 60, 1e-12, "total 4:05");
isTrue(a.all.timeHm === "4:05", "H:MM total 4:05");
nearly(a.all.picHours, 4 + 5 / 60, 1e-12, "both legs are PIC");
nearly(a.all.xcHours, 1 + 20 / 60, 1e-12, "only the first is XC");
nearly(a.all.nightHours, 2.75, 1e-12, "only the second is night");
nearly(a.all.landingsDay, 2, 0, "2 day landings");
nearly(a.all.landingsNight, 3, 0, "3 night landings");
nearly(a.all.landings, 5, 0, "5 landings total");

console.log("\nCase 3  Period windows as of 2026-11-10");
var b = C.compute({
  asOf: "2026-11-10",
  entries: [
    { decimalHours: 1, date: "2026-11-01" },
    { decimalHours: 1, date: "2026-07-01" },
    { decimalHours: 1, date: "2025-12-01" },
    { decimalHours: 1, date: "2025-10-01" }
  ]
});
nearly(b.days90.timeHours, 1, 1e-12, "90 days includes 1 Nov, not 1 Jul");
nearly(b.months6.timeHours, 2, 1e-12, "6 months back from 10 Nov is 10 May: Nov + Jul");
nearly(b.months12.timeHours, 3, 1e-12, "12 months includes Dec 2025, not Oct 2025");
nearly(b.yearToDate.timeHours, 2, 1e-12, "YTD 2026: Nov + Jul");
isTrue(b.windows.months6Start === "2026-05-10", "6-month window starts 10 May 2026");
nearly(b.all.timeHours, 4, 1e-12, "all four entries in the all-time total");

console.log("\nCase 4  Invalid");
isTrue(C.compute({ entries: [{ hhmm: "1:75" }] }) === null, "1:75 is not a valid H:MM");
isTrue(C.compute({ entries: [{ hhmm: "1:00", date: "2026-13-01" }] }) === null, "bad date → null");
isTrue(C.durationHours({ hhmm: "abc" }) === null, "junk duration → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

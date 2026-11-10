#!/usr/bin/env node
/**
 * Verification for FAA currency date math in calc.js.
 * Run:  node test.js
 *
 * Calendar-month end dates follow the standard FAA reading of 61.56,
 * 61.57, and 61.23: an event on day N of month M is good through the last
 * day of the month that is the stated number of calendar months later.
 */
"use strict";

var PC = require("./calc.js");
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

function eq(a, b, label) {
  isTrue(a === b, label + " (got " + JSON.stringify(a) + ")");
}

console.log("Pilot currency — date-math verification\n");

console.log("Case 1  Flight review: 24 calendar months");
// Review on 15 January 2024 is valid through 31 January 2026 (61.56)
var fr = PC.calendarMonthCurrency(PC.parseISODate("2024-01-15"), 24, PC.parseISODate("2026-01-31"));
eq(PC.ymd(fr.expiresOn), "2026-01-31", "15 Jan 2024 + 24 calendar months → 31 Jan 2026");
eq(fr.status, "current", "still current on 31 Jan 2026");
var fr2 = PC.calendarMonthCurrency(PC.parseISODate("2024-01-15"), 24, PC.parseISODate("2026-02-01"));
eq(fr2.status, "expired", "expired on 1 Feb 2026");

console.log("\nCase 2  90-day passenger currency");
// Landing on 12 August → current through 10 November (12 Aug + 90 days)
var day = PC.landingCurrency(PC.parseISODate("2025-08-12"), PC.parseISODate("2025-11-10"));
eq(PC.ymd(day.expiresOn), "2025-11-10", "12 Aug + 90 days = 10 Nov");
eq(day.status, "current", "current on the 90th day");
var day2 = PC.landingCurrency(PC.parseISODate("2025-08-12"), PC.parseISODate("2025-11-11"));
eq(day2.status, "expired", "expired the day after the 90th day");

console.log("\nCase 3  IFR 6 calendar months + 6-month grace / IPC");
// Last 6-HITS on 15 January 2025 → current through 31 July 2025
// grace through 31 January 2026, IPC after that
var r = PC.compute({
  asOf: "2025-07-31",
  instrumentDate: "2025-01-15"
});
eq(r.instrument.status, "current", "current on 31 July 2025");
eq(PC.ymd(r.instrument.currentThrough), "2025-07-31", "current through 31 July 2025");
eq(PC.ymd(r.instrument.graceThrough), "2026-01-31", "grace through 31 January 2026");

var r2 = PC.compute({ asOf: "2025-08-01", instrumentDate: "2025-01-15" });
eq(r2.instrument.status, "grace", "1 Aug 2025 is in the grace period");
var r3 = PC.compute({ asOf: "2026-01-31", instrumentDate: "2025-01-15" });
eq(r3.instrument.status, "grace", "still in grace on 31 Jan 2026");
var r4 = PC.compute({ asOf: "2026-02-01", instrumentDate: "2025-01-15" });
eq(r4.instrument.status, "ipc-required", "IPC required on 1 Feb 2026");

console.log("\nCase 4  Medical 61.23(d) — first class, under 40");
// Exam 10 March 2025, age 35: 1st class through 31 Mar 2026;
// 2nd class through 31 Mar 2026 (12 mo); 3rd class through 31 Mar 2030 (60 mo)
var m1 = PC.medicalDurations("first", PC.parseISODate("2025-03-10"), 35);
eq(PC.ymd(m1.firstClassExpires), "2026-03-31", "1st class under 40: 12 calendar months");
eq(PC.ymd(m1.secondClassExpires), "2026-03-31", "2nd class: 12 calendar months");
eq(PC.ymd(m1.thirdClassExpires), "2030-03-31", "3rd class under 40: 60 calendar months");

console.log("\nCase 5  Medical 61.23(d) — first class, age 40");
// Exam 10 March 2025, age 40: 1st class through 30 Sep 2025 (6 mo);
// 2nd class through 31 Mar 2026; 3rd class through 31 Mar 2027 (24 mo)
var m2 = PC.medicalDurations("first", PC.parseISODate("2025-03-10"), 40);
eq(PC.ymd(m2.firstClassExpires), "2025-09-30", "1st class 40+: 6 calendar months");
eq(PC.ymd(m2.secondClassExpires), "2026-03-31", "2nd class: 12 calendar months");
eq(PC.ymd(m2.thirdClassExpires), "2027-03-31", "3rd class 40+: 24 calendar months");

var st = PC.compute({
  asOf: "2025-10-01",
  examDate: "2025-03-10",
  ageAtExam: 40,
  medicalClass: "first",
  desiredPrivileges: "first"
});
eq(st.medical.status, "expired", "first-class privileges expired on 1 Oct 2025");
isTrue(/second-class/.test(st.medical.note || "") || /third-class/.test(st.medical.note || ""), "note mentions remaining lower-class privileges");

var st2 = PC.compute({
  asOf: "2025-10-01",
  examDate: "2025-03-10",
  ageAtExam: 40,
  medicalClass: "first",
  desiredPrivileges: "second"
});
eq(st2.medical.status, "current", "second-class privileges still current on 1 Oct 2025");

console.log("\nCase 6  Age on the 40th birthday (exam-date rule)");
eq(PC.ageOn(PC.parseISODate("1985-04-10"), PC.parseISODate("2025-04-09")), 39, "day before the 40th birthday is 39");
eq(PC.ageOn(PC.parseISODate("1985-04-10"), PC.parseISODate("2025-04-10")), 40, "on the 40th birthday the person has reached 40");
eq(PC.ageOn(PC.parseISODate("1985-04-10"), PC.parseISODate("2025-04-11")), 40, "day after is 40");

console.log("\nCase 7  Second- and third-class certificates");
var second = PC.medicalDurations("second", PC.parseISODate("2025-06-01"), 30);
eq(second.firstClassExpires, null, "a second-class certificate has no first-class privileges");
eq(PC.ymd(second.secondClassExpires), "2026-06-30", "second-class: 12 months");
eq(PC.ymd(second.thirdClassExpires), "2030-06-30", "then 60 months of third-class (under 40)");
var third = PC.medicalDurations("third", PC.parseISODate("2024-02-29"), 50);
eq(PC.ymd(third.thirdClassExpires), "2026-02-28", "24 months after 29 Feb 2024 is 28 Feb 2026");

console.log("\nCase 8  Combined compute() and BasicMed");
var all = PC.compute({
  asOf: "2026-01-01",
  dayLandingDate: "2025-11-01",
  nightLandingDate: "2025-09-01",
  instrumentDate: "2025-09-15",
  flightReviewDate: "2024-06-20",
  examDate: "2024-07-15",
  dateOfBirth: "1990-01-01",
  medicalClass: "third",
  basicMedCmeDate: "2023-01-10",
  basicMedCourseDate: "2024-06-01"
});
eq(all.dayPassenger.status, "current", "day passenger current (1 Nov + 90 days = 30 Jan 2026)");
eq(all.nightPassenger.status, "expired", "night passenger expired (1 Sep + 90 = 30 Nov 2025)");
eq(all.instrument.status, "current", "IFR current (Sep 2025 + 6 mo → 31 Mar 2026)");
eq(all.flightReview.status, "current", "flight review current through 30 Jun 2026");
eq(all.medical.status, "current", "third-class under 40 current through 31 Jul 2029");
eq(all.basicMed.status, "current", "BasicMed CME + course both current");
eq(PC.ymd(all.basicMed.cme.expiresOn), "2027-01-31", "CME + 48 calendar months");
eq(PC.ymd(all.basicMed.course.expiresOn), "2026-06-30", "course + 24 calendar months");

console.log("\nCase 9  February end-of-month arithmetic");
eq(PC.ymd(PC.endOfCalendarMonths(PC.parseISODate("2025-08-31"), 6)), "2026-02-28", "31 Aug + 6 calendar months → 28 Feb 2026");
eq(PC.ymd(PC.addDays(PC.parseISODate("2024-02-29"), 90)), "2024-05-29", "29 Feb 2024 + 90 days = 29 May 2024");

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);

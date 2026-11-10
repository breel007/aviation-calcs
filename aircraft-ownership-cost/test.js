#!/usr/bin/env node
"use strict";

var O = require("./calc.js");
var failed = 0;
var passed = 0;

function nearly(a, b, tol, label) {
  var ok = Math.abs(a - b) <= tol;
  if (ok) { passed += 1; console.log("  PASS  " + label); }
  else { failed += 1; console.log("  FAIL  " + label + "\n        got " + a + "  expected " + b + "  ±" + tol); }
}
function isTrue(cond, label) {
  if (cond) { passed += 1; console.log("  PASS  " + label); }
  else { failed += 1; console.log("  FAIL  " + label); }
}

console.log("Aircraft ownership cost — formula verification\n");

console.log("Case 1  Loan payment agrees with the standard formula");
// $160,000 financed at 7% for 20 years
var M = O.loanPayment(160000, 7, 240);
var expectM = 160000 * (0.07/12) / (1 - Math.pow(1 + 0.07/12, -240));
nearly(M, expectM, 0.01, "monthly loan payment matches amortization formula");

console.log("\nCase 2  Worked example: cash-bought 172, 100 hours/year");
var ex = O.compute({
  purchasePrice: 200000,
  downPercent: 100,
  loanRate: 0,
  loanTermYears: 0,
  opportunityRate: 5,
  insurance: 2400,
  hangarMonthly: 450,
  annualInspection: 2800,
  subscriptions: 1200,
  otherFixed: 0,
  fuelBurnGph: 8.5,
  fuelPrice: 6.50,
  oilPerHour: 1.00,
  engineOverhaulCost: 30000,
  engineTbo: 2000,
  propOverhaulCost: 8000,
  propTbo: 2000,
  maintenancePerHour: 20,
  hoursPerYear: 100,
  rentalRateWet: 180,
  partners: 1
});
isTrue(ex != null, "compute returns a result");
nearly(ex.fixed.opportunity, 10000, 0.01, "opportunity cost = 5% × $200,000 = $10,000");
nearly(ex.fixed.hangar, 5400, 0.01, "hangar = 12 × $450 = $5,400");
nearly(ex.fixed.loan, 0, 1e-9, "no loan payment on a cash purchase");
nearly(ex.variable.fuel, 8.5 * 6.5, 1e-9, "fuel = 8.5 gph × $6.50 = $55.25/hr");
nearly(ex.variable.engineReserve, 15, 1e-9, "engine reserve = $30,000 / 2,000 = $15/hr");
nearly(ex.variable.propReserve, 4, 1e-9, "prop reserve = $8,000 / 2,000 = $4/hr");
var varHr = 55.25 + 1 + 15 + 4 + 20; // 95.25
nearly(ex.variablePerHour, varHr, 0.01, "variable = $95.25/hr");
var fixed = 10000 + 2400 + 5400 + 2800 + 1200; // 21800
nearly(ex.fixedTotal, fixed, 0.01, "fixed annual = $21,800");
nearly(ex.totalAnnual, fixed + varHr * 100, 0.05, "total annual = fixed + variable × hours");
nearly(ex.costPerHour, (fixed + varHr * 100) / 100, 0.05, "all-in $/hr");
nearly(ex.breakevenHours, fixed / (180 - varHr), 0.05, "breakeven hours = fixed / (rental − variable)");
isTrue(ex.savingsVsRent < 0, "at 100 hours, owning costs more than renting at $180 (with opportunity cost in)");

console.log("\nCase 3  Partnership of 4 splits fixed costs, not the hourly variable rate");
var p = O.compute({
  purchasePrice: 200000,
  downPercent: 100,
  loanRate: 0,
  loanTermYears: 0,
  opportunityRate: 0,
  insurance: 2400,
  hangarMonthly: 500,
  annualInspection: 2000,
  subscriptions: 800,
  otherFixed: 0,
  fuelBurnGph: 10,
  fuelPrice: 6,
  oilPerHour: 0,
  engineOverhaulCost: 0,
  engineTbo: 0,
  propOverhaulCost: 0,
  propTbo: 0,
  maintenancePerHour: 0,
  hoursPerYear: 200,
  rentalRateWet: 0,
  partners: 4
});
var fixed3 = 2400 + 6000 + 2000 + 800; // 11200
nearly(p.partnership.fixedEach, fixed3 / 4, 0.01, "each partner pays 1/4 of fixed costs");
nearly(p.partnership.hoursEach, 50, 1e-9, "equal share of 200 hours is 50 each");
nearly(p.partnership.variableEach, 60 * 50, 0.01, "each pays variable for their own 50 hours");
nearly(p.variablePerHour, 60, 1e-9, "variable rate is still $60/hr, not divided");

console.log("\nCase 4  Breakeven is infinite when rental ≤ variable");
var never = O.compute({
  purchasePrice: 1, downPercent: 100, loanRate: 0, loanTermYears: 0,
  opportunityRate: 0, insurance: 1000, hangarMonthly: 0, annualInspection: 0,
  subscriptions: 0, otherFixed: 0, fuelBurnGph: 10, fuelPrice: 10,
  oilPerHour: 0, engineOverhaulCost: 0, engineTbo: 0, propOverhaulCost: 0,
  propTbo: 0, maintenancePerHour: 0, hoursPerYear: 50, rentalRateWet: 80, partners: 1
});
isTrue(never.breakevenHours === Infinity, "breakeven is infinite when rental ($80) ≤ variable ($100)");

console.log("\nCase 5  Invalid inputs");
isTrue(O.compute({ hoursPerYear: 0, purchasePrice: 100 }) === null, "zero hours → null");
isTrue(O.compute(null) === null, "null input → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

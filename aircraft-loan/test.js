#!/usr/bin/env node
/**
 * Verification for aircraft-loan/calc.js.
 * Run:  node test.js
 */
"use strict";

var L = require("./calc.js");
var failed = 0;
var passed = 0;

function nearly(a, b, tol, label) {
  var ok = Math.abs(a - b) <= tol;
  if (ok) {
    passed += 1;
    console.log("  PASS  " + label);
  } else {
    failed += 1;
    console.log("  FAIL  " + label);
    console.log("        got " + a + "  expected " + b + "  ±" + tol);
  }
}

function isTrue(cond, label) {
  if (cond) { passed += 1; console.log("  PASS  " + label); }
  else { failed += 1; console.log("  FAIL  " + label); }
}

console.log("Aircraft loan calculator — formula verification\n");

console.log("Case 1  Classic $100,000 at 6% for 5 years, no balloon");
// M = 100000 * 0.005 * (1.005)^60 / ((1.005)^60 − 1) = 1933.280042...
var M1 = L.payment(100000, 6, 60, 0);
nearly(M1, 1933.280042, 0.005, "monthly payment ≈ $1,933.28");
var s1 = L.schedule(100000, 6, 60, 0);
nearly(s1.rows[s1.rows.length - 1].balance, 0, 0.02, "final balance is $0");
nearly(s1.totalInterest + 100000, s1.totalPaid, 0.05, "total paid = principal + interest");
isTrue(s1.rows.length === 60, "60 monthly rows");
// First month interest = 100000 * 0.005 = 500; principal = M − 500
nearly(s1.rows[0].interest, 500, 0.01, "month 1 interest = $500.00");
nearly(s1.rows[0].principal, M1 - 500, 0.01, "month 1 principal = payment − interest");

console.log("\nCase 2  Zero interest: $12,000 over 12 months");
nearly(L.payment(12000, 0, 12, 0), 1000, 1e-12, "payment = $1,000");
var s0 = L.schedule(12000, 0, 12, 0);
nearly(s0.totalInterest, 0, 1e-9, "zero interest");
nearly(s0.rows[11].balance, 0, 1e-9, "paid off");

console.log("\nCase 3  Balloon: $200,000, 7%, 20 years, $50,000 balloon");
var M3 = L.payment(200000, 7, 240, 50000);
isTrue(M3 != null && M3 > 0, "balloon loan has a positive payment");
var s3 = L.schedule(200000, 7, 240, 50000);
nearly(s3.rows[s3.rows.length - 1].balance, 50000, 0.05, "final balance equals the $50,000 balloon");
// Payment should be less than the no-balloon payment
var M3flat = L.payment(200000, 7, 240, 0);
isTrue(M3 < M3flat, "balloon payment is smaller than a fully amortizing payment");

console.log("\nCase 4  Affordability is the inverse of payment");
var pv = L.principalFromPayment(M1, 6, 60, 0);
nearly(pv, 100000, 0.05, "principalFromPayment inverts payment()");
var aff = L.affordability({
  monthlyPayment: 2000,
  apr: 6.5,
  termYears: 15,
  downPayment: 20,
  downType: "percent"
});
isTrue(aff != null, "affordability returns a result");
var back = L.payment(aff.principal, 6.5, 15 * 12, 0);
nearly(back, 2000, 0.05, "payment on the affordable principal is the budgeted $2,000");
nearly(aff.downPayment / aff.price, 0.20, 1e-9, "20% down is honored");

console.log("\nCase 5  Compute from price and dollars down");
var c = L.compute({
  price: 250000,
  downPayment: 50000,
  downType: "dollars",
  apr: 7.25,
  termYears: 20
});
isTrue(c != null, "compute returns a result");
nearly(c.principal, 200000, 1e-9, "principal = $200,000");
nearly(c.downPercent, 20, 1e-9, "down payment is 20%");
nearly(c.monthlyPayment, L.payment(200000, 7.25, 240, 0), 0.01, "monthly payment matches payment()");
isTrue(c.yearly.length === 20, "20 yearly summary rows");
nearly(c.yearly[19].balance, 0, 0.05, "year-20 balance is $0");

console.log("\nCase 6  Invalid inputs");
isTrue(L.payment(-1, 6, 60, 0) === null, "negative principal → null");
isTrue(L.payment(100000, 6, 0, 0) === null, "zero term → null");
isTrue(L.payment(100000, 6, 60, 150000) === null, "balloon larger than principal → null");
isTrue(L.compute({ price: 0, downPayment: 0, apr: 6, termYears: 10 }) === null, "zero price → null");
isTrue(L.compute({ price: 100000, downPayment: 100000, downType: "dollars", apr: 6, termYears: 10 }) === null, "100% down → null");

console.log("\n----------------------------------------");
console.log("Passed: " + passed + "   Failed: " + failed);
process.exit(failed ? 1 : 0);

/**
 * Aircraft loan payment, amortization, balloon, and affordability.
 *
 * Standard fixed-rate amortization. Monthly rate r = APR/12/100.
 * For a loan amount PV, n months, optional balloon B due with the
 * final payment (remaining principal at month n):
 *
 *   PV = M × (1 − (1+r)^(−n)) / r  +  B × (1+r)^(−n)
 *   M  = (PV − B × (1+r)^(−n)) × r / (1 − (1+r)^(−n))
 *
 * When r = 0, M = (PV − B) / n.
 * Total interest = M×n + B − PV.
 */
(function (root) {
  "use strict";

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function monthlyRate(aprPercent) {
    return aprPercent / 12 / 100;
  }

  function pow1p(r, n) {
    return Math.pow(1 + r, n);
  }

  /**
   * Periodic payment for a loan with an optional balloon.
   * Returns null if inputs are invalid or the balloon cannot be financed.
   */
  function payment(principal, aprPercent, termMonths, balloon) {
    if (!isFiniteNumber(principal) || principal < 0) return null;
    if (!isFiniteNumber(aprPercent) || aprPercent < 0 || aprPercent > 40) return null;
    if (!isFiniteNumber(termMonths) || termMonths < 1 || termMonths > 600) return null;
    var B = balloon == null || balloon === "" ? 0 : Number(balloon);
    if (!isFiniteNumber(B) || B < 0) return null;
    if (B > principal) return null;
    var n = Math.round(termMonths);
    if (n < 1) return null;
    var r = monthlyRate(aprPercent);
    if (r === 0) return (principal - B) / n;
    var discount = pow1p(r, -n);
    var denom = 1 - discount;
    if (denom <= 0) return null;
    var pvAnnuity = (principal - B * discount);
    if (pvAnnuity < -1e-9) return null;
    return pvAnnuity * r / denom;
  }

  /**
   * Principal that a given payment will support (affordability).
   */
  function principalFromPayment(monthlyPayment, aprPercent, termMonths, balloon) {
    if (!isFiniteNumber(monthlyPayment) || monthlyPayment < 0) return null;
    if (!isFiniteNumber(aprPercent) || aprPercent < 0 || aprPercent > 40) return null;
    if (!isFiniteNumber(termMonths) || termMonths < 1 || termMonths > 600) return null;
    var B = balloon == null || balloon === "" ? 0 : Number(balloon);
    if (!isFiniteNumber(B) || B < 0) return null;
    var n = Math.round(termMonths);
    var r = monthlyRate(aprPercent);
    if (r === 0) return monthlyPayment * n + B;
    var discount = pow1p(r, -n);
    return monthlyPayment * (1 - discount) / r + B * discount;
  }

  /**
   * One row of an amortization schedule after `month` payments, or the
   * full schedule. Balance is never forced negative; the last payment
   * absorbs rounding so the balance lands on the balloon (or 0).
   */
  function schedule(principal, aprPercent, termMonths, balloon) {
    var M = payment(principal, aprPercent, termMonths, balloon);
    if (M == null) return null;
    var n = Math.round(termMonths);
    var B = balloon == null || balloon === "" ? 0 : Number(balloon);
    var r = monthlyRate(aprPercent);
    var rows = [];
    var balance = principal;
    var totalInterest = 0;
    var totalPrincipal = 0;
    for (var m = 1; m <= n; m++) {
      var interest = balance * r;
      var principalPaid;
      var paymentAmt = M;
      if (m === n) {
        principalPaid = balance - B;
        paymentAmt = principalPaid + interest;
        balance = B;
      } else {
        principalPaid = M - interest;
        if (principalPaid > balance - B) principalPaid = balance - B;
        if (principalPaid < 0) principalPaid = 0;
        balance = balance - principalPaid;
      }
      totalInterest += interest;
      totalPrincipal += principalPaid;
      rows.push({
        month: m,
        payment: paymentAmt,
        interest: interest,
        principal: principalPaid,
        balance: balance < 1e-8 && B === 0 ? 0 : balance
      });
    }
    return {
      payment: M,
      lastPayment: rows[n - 1].payment,
      termMonths: n,
      principal: principal,
      balloon: B,
      totalInterest: totalInterest,
      totalPaid: totalInterest + totalPrincipal + B,
      totalPrincipal: totalPrincipal,
      rows: rows
    };
  }

  function yearlySummary(sched) {
    if (!sched) return null;
    var years = [];
    var acc = { year: 1, payment: 0, interest: 0, principal: 0, balance: 0 };
    for (var i = 0; i < sched.rows.length; i++) {
      var row = sched.rows[i];
      acc.payment += row.payment;
      acc.interest += row.interest;
      acc.principal += row.principal;
      acc.balance = row.balance;
      if (row.month % 12 === 0 || i === sched.rows.length - 1) {
        acc.year = Math.ceil(row.month / 12);
        years.push({
          year: acc.year,
          payment: acc.payment,
          interest: acc.interest,
          principal: acc.principal,
          balance: acc.balance
        });
        acc = { year: acc.year + 1, payment: 0, interest: 0, principal: 0, balance: 0 };
      }
    }
    return years;
  }

  /**
   * Full compute from a price / down payment (dollars or percent) form.
   */
  function compute(input) {
    if (!input) return null;
    var price = Number(input.price);
    if (!isFiniteNumber(price) || price <= 0) return null;
    var down = 0;
    if (input.downType === "percent") {
      var pct = Number(input.downPayment);
      if (!isFiniteNumber(pct) || pct < 0 || pct >= 100) return null;
      down = price * (pct / 100);
    } else {
      down = Number(input.downPayment);
      if (!isFiniteNumber(down) || down < 0) return null;
      if (down >= price) return null;
    }
    var principal = price - down;
    var termYears = Number(input.termYears);
    if (!isFiniteNumber(termYears) || termYears <= 0) return null;
    var termMonths = input.termUnit === "months"
      ? Math.round(Number(input.termYears))
      : Math.round(termYears * 12);
    var apr = Number(input.apr);
    var balloon = input.balloon == null || input.balloon === "" ? 0 : Number(input.balloon);
    var sched = schedule(principal, apr, termMonths, balloon);
    if (!sched) return null;
    return {
      price: price,
      downPayment: down,
      downPercent: (down / price) * 100,
      principal: principal,
      apr: apr,
      termMonths: termMonths,
      termYears: termMonths / 12,
      balloon: balloon,
      monthlyPayment: sched.payment,
      lastPayment: sched.lastPayment,
      annualPayment: sched.payment * Math.min(12, termMonths),
      totalInterest: sched.totalInterest,
      totalPaid: sched.totalPaid,
      totalCost: down + sched.totalPaid,
      interestShare: sched.totalPaid > 0 ? sched.totalInterest / (sched.totalInterest + sched.totalPrincipal) : 0,
      schedule: sched,
      yearly: yearlySummary(sched)
    };
  }

  /**
   * Affordability: given a monthly payment budget, down payment, rate,
   * term, and optional balloon, the maximum aircraft price.
   */
  function affordability(input) {
    if (!input) return null;
    var monthly = Number(input.monthlyPayment);
    var apr = Number(input.apr);
    var termYears = Number(input.termYears);
    if (!isFiniteNumber(monthly) || monthly <= 0) return null;
    if (!isFiniteNumber(termYears) || termYears <= 0) return null;
    var termMonths = input.termUnit === "months"
      ? Math.round(Number(input.termYears))
      : Math.round(termYears * 12);
    var balloon = input.balloon == null || input.balloon === "" ? 0 : Number(input.balloon);
    var pv = principalFromPayment(monthly, apr, termMonths, balloon);
    if (pv == null) return null;
    var down = 0;
    var price;
    if (input.downType === "percent") {
      var pct = Number(input.downPayment);
      if (!isFiniteNumber(pct) || pct < 0 || pct >= 100) return null;
      price = pv / (1 - pct / 100);
      down = price - pv;
    } else {
      down = Number(input.downPayment);
      if (!isFiniteNumber(down) || down < 0) return null;
      price = pv + down;
    }
    return {
      price: price,
      downPayment: down,
      principal: pv,
      monthlyPayment: monthly,
      termMonths: termMonths,
      balloon: balloon,
      apr: apr
    };
  }

  var api = {
    payment: payment,
    principalFromPayment: principalFromPayment,
    schedule: schedule,
    yearlySummary: yearlySummary,
    compute: compute,
    affordability: affordability,
    monthlyRate: monthlyRate
  };

  root.AircraftLoanCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

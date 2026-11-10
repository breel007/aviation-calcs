/**
 * Aircraft ownership cost model: fixed vs variable costs, cost per
 * flight hour, breakeven hours vs renting, and partnership split.
 *
 * Fixed (annual, independent of hours flown):
 *   loan payments (or opportunity cost on cash), insurance, hangar or
 *   tie-down, annual inspection, database / subscriptions, other fixed.
 *
 * Variable (per Hobbs/tach hour):
 *   fuel (burn × price), oil (per hour), engine reserve
 *   ((overhaul cost) / TBO), prop reserve ((overhaul cost) / TBO),
 *   maintenance reserve per hour.
 *
 * Total annual = fixed + variable/hr × hours.
 * Cost per hour = total annual / hours.
 * Breakeven vs renting at R $/hr wet:  fixed / (R − variable/hr)
 * (only if R > variable/hr; otherwise renting always costs less).
 */
(function (root) {
  "use strict";

  function num(v, def) {
    if (v === "" || v == null) return def == null ? 0 : def;
    var n = Number(v);
    return isFinite(n) ? n : NaN;
  }

  function loanPayment(principal, aprPercent, termMonths) {
    if (!(principal > 0) || !(termMonths >= 1)) return 0;
    var r = aprPercent / 12 / 100;
    if (r === 0) return principal / termMonths;
    return principal * r / (1 - Math.pow(1 + r, -termMonths));
  }

  /**
   * Build the cost model from raw inputs. Any blank optional input = 0.
   * Returns null if a required value is missing or negative.
   */
  function compute(input) {
    if (!input) return null;
    var hours = num(input.hoursPerYear);
    if (!(hours > 0)) return null;

    var price = num(input.purchasePrice);
    var downPct = num(input.downPercent, 100);
    var apr = num(input.loanRate);
    var termYears = num(input.loanTermYears);
    var oppRate = num(input.opportunityRate);
    var fields = [price, downPct, apr, termYears, oppRate];
    for (var i = 0; i < fields.length; i++) {
      if (!isFinite(fields[i]) || fields[i] < 0) return null;
    }
    if (downPct > 100) return null;

    var financed = price * (1 - downPct / 100);
    var downCash = price - financed;
    var termMonths = Math.round(termYears * 12);
    var monthlyLoan = financed > 0 && termMonths > 0 ? loanPayment(financed, apr, termMonths) : 0;
    var annualLoan = monthlyLoan * 12;
    var loanInterestYr1 = 0;
    if (financed > 0 && termMonths > 0) {
      var bal = financed;
      var r = apr / 12 / 100;
      for (var m = 0; m < Math.min(12, termMonths); m++) {
        var int = bal * r;
        loanInterestYr1 += int;
        bal -= (monthlyLoan - int);
      }
    }
    var opportunityCost = downCash * (oppRate / 100);

    var fixed = {
      loan: annualLoan,
      opportunity: opportunityCost,
      insurance: num(input.insurance),
      hangar: num(input.hangarMonthly) * 12,
      annual: num(input.annualInspection),
      subscriptions: num(input.subscriptions),
      otherFixed: num(input.otherFixed)
    };

    var fuelBurn = num(input.fuelBurnGph);
    var fuelPrice = num(input.fuelPrice);
    var oilPerHour = num(input.oilPerHour);
    var engineOverhaul = num(input.engineOverhaulCost);
    var tbo = num(input.engineTbo);
    var propOverhaul = num(input.propOverhaulCost);
    var propTbo = num(input.propTbo);
    var maintPerHour = num(input.maintenancePerHour);

    var variable = {
      fuel: fuelBurn * fuelPrice,
      oil: oilPerHour,
      engineReserve: tbo > 0 ? engineOverhaul / tbo : 0,
      propReserve: propTbo > 0 ? propOverhaul / propTbo : 0,
      maintenance: maintPerHour
    };

    var all = [];
    var k;
    for (k in fixed) all.push(fixed[k]);
    for (k in variable) all.push(variable[k]);
    for (i = 0; i < all.length; i++) {
      if (!isFinite(all[i]) || all[i] < 0) return null;
    }

    var fixedTotal = 0;
    for (k in fixed) fixedTotal += fixed[k];
    var variablePerHour = 0;
    for (k in variable) variablePerHour += variable[k];

    var variableAnnual = variablePerHour * hours;
    var totalAnnual = fixedTotal + variableAnnual;
    var costPerHour = totalAnnual / hours;
    var fixedPerHour = fixedTotal / hours;

    // "Cash" view excludes opportunity cost; also show loan principal vs interest.
    var cashAnnual = totalAnnual - fixed.opportunity;

    var rentRate = num(input.rentalRateWet);
    var breakeven = null;
    var rentAnnual = null;
    var savingsVsRent = null;
    if (rentRate > 0) {
      rentAnnual = rentRate * hours;
      savingsVsRent = rentAnnual - totalAnnual;
      breakeven = rentRate > variablePerHour ? fixedTotal / (rentRate - variablePerHour) : Infinity;
    }

    var partners = Math.max(1, Math.round(num(input.partners, 1)) || 1);
    var share = partnershipSplit({
      fixedAnnual: fixedTotal,
      variablePerHour: variablePerHour,
      totalHours: hours,
      partners: partners
    });

    return {
      hours: hours,
      financed: financed,
      downCash: downCash,
      monthlyLoan: monthlyLoan,
      loanInterestYear1: loanInterestYr1,
      fixed: fixed,
      variable: variable,
      fixedTotal: fixedTotal,
      fixedMonthly: fixedTotal / 12,
      fixedPerHour: fixedPerHour,
      variablePerHour: variablePerHour,
      variableAnnual: variableAnnual,
      totalAnnual: totalAnnual,
      totalMonthly: totalAnnual / 12,
      cashAnnual: cashAnnual,
      costPerHour: costPerHour,
      rentRate: rentRate > 0 ? rentRate : null,
      rentAnnual: rentAnnual,
      savingsVsRent: savingsVsRent,
      breakevenHours: breakeven,
      partnership: share
    };
  }

  /**
   * Partnership split: fixed costs shared equally, variable costs paid
   * by each partner for their own hours (the common "dry rate + fixed
   * share" arrangement). Hours split equally by default.
   */
  function partnershipSplit(opts) {
    var p = Math.max(1, Math.round(opts.partners || 1));
    var hoursEach = opts.totalHours / p;
    var fixedEach = opts.fixedAnnual / p;
    var variableEach = opts.variablePerHour * hoursEach;
    var annualEach = fixedEach + variableEach;
    return {
      partners: p,
      hoursEach: hoursEach,
      fixedEach: fixedEach,
      fixedEachMonthly: fixedEach / 12,
      variableEach: variableEach,
      annualEach: annualEach,
      monthlyEach: annualEach / 12,
      costPerHourEach: hoursEach > 0 ? annualEach / hoursEach : null
    };
  }

  /** Cost per hour across a range of annual hours (for the chart). */
  function costCurve(result, hoursList) {
    if (!result) return [];
    return hoursList.map(function (h) {
      return {
        hours: h,
        perHour: h > 0 ? (result.fixedTotal + result.variablePerHour * h) / h : null
      };
    });
  }

  var api = {
    compute: compute,
    loanPayment: loanPayment,
    partnershipSplit: partnershipSplit,
    costCurve: costCurve
  };

  root.OwnershipCostCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

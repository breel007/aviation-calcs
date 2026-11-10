/**
 * UI for the aircraft ownership cost calculator.
 * Math lives in calc.js (OwnershipCostCalcs).
 */
(function () {
  "use strict";
  var O = window.OwnershipCostCalcs;
  if (!O) return;

  var $ = function (id) { return document.getElementById(id); };
  var form = $("calc-form");
  var warnings = $("warnings");

  function val(id) { return $(id).value; }
  function money(n) {
    if (!isFinite(n)) return "—";
    return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  }
  function money2(n) {
    if (!isFinite(n)) return "—";
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  }
  function hours(n) {
    if (!isFinite(n)) return "—";
    if (n === Infinity) return "never (variable ≥ rental)";
    return n.toLocaleString("en-US", { maximumFractionDigits: 0 }) + " hr/year";
  }

  function inputs() {
    return {
      purchasePrice: val("price"),
      downPercent: val("down-pct"),
      loanRate: val("loan-rate"),
      loanTermYears: val("loan-term"),
      opportunityRate: val("opp-rate"),
      insurance: val("insurance"),
      hangarMonthly: val("hangar"),
      annualInspection: val("annual"),
      subscriptions: val("subs"),
      otherFixed: val("other-fixed"),
      fuelBurnGph: val("burn"),
      fuelPrice: val("fuel-price"),
      oilPerHour: val("oil"),
      engineOverhaulCost: val("eng-oh"),
      engineTbo: val("eng-tbo"),
      propOverhaulCost: val("prop-oh"),
      propTbo: val("prop-tbo"),
      maintenancePerHour: val("mx"),
      hoursPerYear: val("hours"),
      rentalRateWet: val("rental"),
      partners: val("partners")
    };
  }

  function setExample(financed) {
    $("price").value = "200000";
    $("down-pct").value = financed ? "20" : "100";
    $("loan-rate").value = financed ? "7.25" : "0";
    $("loan-term").value = financed ? "20" : "0";
    $("opp-rate").value = financed ? "0" : "5";
    $("insurance").value = "2400";
    $("hangar").value = "450";
    $("annual").value = "2800";
    $("subs").value = "1200";
    $("other-fixed").value = "0";
    $("burn").value = "8.5";
    $("fuel-price").value = "6.50";
    $("oil").value = "1.00";
    $("eng-oh").value = "30000";
    $("eng-tbo").value = "2000";
    $("prop-oh").value = "8000";
    $("prop-tbo").value = "2000";
    $("mx").value = "20";
    $("hours").value = "100";
    $("rental").value = "180";
    $("partners").value = "1";
    render();
  }

  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value +
      '</p>' + (sub ? '<p class="stat-sub">' + sub + "</p>" : "") + "</div>";
  }

  function bar(label, amount, max, color) {
    var pct = max > 0 ? Math.min(100, (amount / max) * 100) : 0;
    return '<div class="bar-row"><div class="bar-label"><span>' + label + "</span><span>" + money(amount) +
      '</span></div><div class="bar-track"><i style="width:' + pct.toFixed(1) + "%;background:" + color + '"></i></div></div>';
  }

  function render() {
    var r = O.compute(inputs());
    if (!r) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>Enter a purchase price and at least one hour flown per year. All costs should be zero or positive.</p>";
      $("out-per-hour").innerHTML = '<span class="num">—</span> <span class="unit">/hr</span>';
      $("out-annual").textContent = "";
      $("stat-grid").innerHTML = "";
      $("breakdown").innerHTML = "";
      $("compare").innerHTML = "";
      $("partnership").innerHTML = "";
      return;
    }
    warnings.hidden = true;
    warnings.innerHTML = "";

    $("out-per-hour").innerHTML = '<span class="num">' + money2(r.costPerHour) + '</span> <span class="unit">/hr</span>';
    $("out-annual").textContent = money(r.totalAnnual) + " a year at " + r.hours + " hours" +
      (r.fixed.opportunity ? " (includes " + money(r.fixed.opportunity) + " opportunity cost)" : "");

    var msgs = [];
    if (r.financed > 0) {
      msgs.push("Loan payment " + money2(r.monthlyLoan) + "/mo on " + money(r.financed) + " financed.");
    }
    $("stat-grid").innerHTML =
      stat("Fixed costs", money(r.fixedTotal) + "/yr", money2(r.fixedPerHour) + " per hour at this utilization") +
      stat("Variable costs", money2(r.variablePerHour) + "/hr", money(r.variableAnnual) + " a year") +
      stat("Cash outlay", money(r.cashAnnual) + "/yr", r.fixed.opportunity ? "excludes opportunity cost" : "same as all-in (no opportunity cost)") +
      stat("Monthly all-in", money(r.totalMonthly), "average, not a calendar bill");

    var rows = [
      ["Loan payments", r.fixed.loan],
      ["Opportunity cost", r.fixed.opportunity],
      ["Insurance", r.fixed.insurance],
      ["Hangar / tie-down", r.fixed.hangar],
      ["Annual inspection", r.fixed.annual],
      ["Subscriptions", r.fixed.subscriptions],
      ["Other fixed", r.fixed.otherFixed],
      ["Fuel", r.variable.fuel * r.hours],
      ["Oil", r.variable.oil * r.hours],
      ["Engine reserve", r.variable.engineReserve * r.hours],
      ["Propeller reserve", r.variable.propReserve * r.hours],
      ["Maintenance reserve", r.variable.maintenance * r.hours]
    ];
    var max = 0;
    rows.forEach(function (row) { if (row[1] > max) max = row[1]; });
    var html = '<div class="card-block"><h3>Annual breakdown</h3>';
    rows.forEach(function (row) {
      if (row[1] === 0) return;
      var color = row[0].indexOf("reserve") !== -1 || row[0] === "Fuel" || row[0] === "Oil" || row[0] === "Maintenance reserve" ? "#6fe3d0" : "#e8b84a";
      html += bar(row[0], row[1], max, color);
    });
    html += '<p class="hint" style="margin-top:0.7rem">Gold bars are fixed; teal bars are variable (hours × a rate). Engine reserve is ' +
      money2(r.variable.engineReserve) + "/hr; propeller " + money2(r.variable.propReserve) + "/hr; fuel " + money2(r.variable.fuel) + "/hr.</p></div>";
    $("breakdown").innerHTML = html;

    var cmp = "";
    if (r.rentRate) {
      var cheaper = r.savingsVsRent >= 0;
      cmp = '<div class="card-block"><h3>Versus renting at ' + money2(r.rentRate) + "/hr wet</h3>" +
        "<p>Renting " + r.hours + " hours would cost " + money(r.rentAnnual) + ". Owning is " +
        money(Math.abs(r.savingsVsRent)) + " " + (cheaper ? "cheaper" : "more expensive") + " at this utilization.</p>" +
        "<p>Breakeven utilization: <strong>" + hours(r.breakevenHours) + "</strong>.</p></div>";
    }
    $("compare").innerHTML = cmp;

    var p = r.partnership;
    if (p.partners > 1) {
      $("partnership").innerHTML = '<div class="card-block"><h3>Partnership of ' + p.partners + "</h3>" +
        "<p>Each partner’s share of the fixed costs is " + money(p.fixedEach) + " a year (" + money2(p.fixedEachMonthly) +
        "/mo). At an equal split of the hours (" + p.hoursEach.toFixed(0) + " hr each), variable costs are " +
        money(p.variableEach) + ", for an all-in " + money(p.annualEach) + " a year, or <strong>" +
        money2(p.costPerHourEach) + "/hr</strong>.</p></div>";
    } else {
      $("partnership").innerHTML = "";
    }
  }

  form.addEventListener("input", render);
  form.addEventListener("change", render);
  $("btn-example").addEventListener("click", function () { setExample(false); });
  $("btn-financed").addEventListener("click", function () { setExample(true); });
  render();
})();

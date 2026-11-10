/**
 * UI for the aircraft loan calculator.
 * Math lives in calc.js (AircraftLoanCalcs).
 */
(function () {
  "use strict";
  var L = window.AircraftLoanCalcs;
  if (!L) return;
  var $ = function (id) { return document.getElementById(id); };
  var mode = "payment";
  var downType = "percent";
  var downAffType = "percent";

  function money(n) {
    if (!isFinite(n)) return "—";
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  }
  function money0(n) {
    if (!isFinite(n)) return "—";
    return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  }

  function bindSeg(group, onChange) {
    document.querySelectorAll('[data-unit-group="' + group + '"]').forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll('[data-unit-group="' + group + '"]').forEach(function (b) {
          b.classList.toggle("is-active", b === btn);
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        onChange(btn.getAttribute("data-unit"));
      });
    });
  }

  bindSeg("mode", function (u) {
    mode = u;
    $("payment-fields").hidden = mode !== "payment";
    $("afford-fields").hidden = mode !== "afford";
    render();
  });
  bindSeg("down", function (u) { downType = u; render(); });
  bindSeg("downaff", function (u) { downAffType = u; render(); });

  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value +
      "</p>" + (sub ? '<p class="stat-sub">' + sub + "</p>" : "") + "</div>";
  }

  function table(headers, rows, cls) {
    var h = '<div class="table-wrap"><table class="data-table ' + (cls || "") + '"><thead><tr>';
    headers.forEach(function (x) { h += "<th>" + x + "</th>"; });
    h += "</tr></thead><tbody>";
    rows.forEach(function (r) {
      h += "<tr>";
      r.forEach(function (c) { h += "<td>" + c + "</td>"; });
      h += "</tr>";
    });
    return h + "</tbody></table></div>";
  }

  function render() {
    var warnings = $("warnings");
    var balloon = $("balloon").value;
    if (mode === "afford") {
      var aff = L.affordability({
        monthlyPayment: $("budget").value,
        apr: $("apr").value,
        termYears: $("term").value,
        downPayment: $("down-aff").value,
        downType: downAffType,
        balloon: balloon
      });
      if (!aff) {
        warnings.hidden = false;
        warnings.innerHTML = "<p>Enter a monthly budget, a down payment, a rate, and a term.</p>";
        $("out-hero").innerHTML = "<span class='num'>—</span>";
        $("stat-grid").innerHTML = "";
        $("tables").innerHTML = "";
        return;
      }
      warnings.hidden = true;
      $("hero-label").textContent = "Maximum purchase price";
      $("out-hero").innerHTML = "<span class='num'>" + money0(aff.price) + "</span>";
      $("out-hero-sub").textContent = money(aff.monthlyPayment) + " per month on " + money0(aff.principal) + " financed, with " + money0(aff.downPayment) + " down";
      $("stat-grid").innerHTML =
        stat("Amount financed", money0(aff.principal), aff.termMonths + " months") +
        stat("Down payment", money0(aff.downPayment), downAffType === "percent" ? $("down-aff").value + "%" : "dollars") +
        stat("Balloon", aff.balloon ? money0(aff.balloon) : "None", "") +
        stat("APR", Number($("apr").value).toFixed(2) + "%", "");
      $("tables").innerHTML = "<p class='hint'>Switch to Payment mode and paste this price to see the amortization table.</p>";
      return;
    }

    var c = L.compute({
      price: $("price").value,
      downPayment: $("down").value,
      downType: downType,
      apr: $("apr").value,
      termYears: $("term").value,
      balloon: balloon
    });
    if (!c) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>Enter a price greater than the down payment, a rate, and a term of at least one month. A balloon cannot exceed the amount financed.</p>";
      $("out-hero").innerHTML = "<span class='num'>—</span>";
      $("stat-grid").innerHTML = "";
      $("tables").innerHTML = "";
      return;
    }
    warnings.hidden = true;
    $("hero-label").textContent = "Monthly payment";
    $("out-hero").innerHTML = "<span class='num'>" + money(c.monthlyPayment) + "</span>";
    $("out-hero-sub").textContent = c.termYears.toFixed(c.termMonths % 12 === 0 ? 0 : 1) + " years, " +
      (c.balloon ? "balloon " + money0(c.balloon) + " at the end" : "fully amortizing");
    $("stat-grid").innerHTML =
      stat("Amount financed", money0(c.principal), money0(c.downPayment) + " down (" + c.downPercent.toFixed(1) + "%)") +
      stat("Total interest", money0(c.totalInterest), (c.interestShare * 100).toFixed(0) + "% of what you pay the lender") +
      stat("Total paid to the lender", money0(c.totalPaid), "payments + balloon") +
      stat("All-in with down payment", money0(c.totalCost), "");

    var yearRows = c.yearly.map(function (y) {
      return [y.year, money0(y.payment), money0(y.interest), money0(y.principal), money0(y.balance)];
    });
    var monthRows = c.schedule.rows.slice(0, 12).map(function (r) {
      return [r.month, money(r.payment), money(r.interest), money(r.principal), money(r.balance)];
    });
    $("tables").innerHTML = "<h3 class='stat-label' style='margin-top:1rem'>Year-by-year</h3>" +
      table(["Year", "Paid", "Interest", "Principal", "Balance"], yearRows) +
      "<h3 class='stat-label'>First 12 months</h3>" +
      table(["Month", "Payment", "Interest", "Principal", "Balance"], monthRows) +
      "<details class='card-block'><summary>Full monthly amortization (" + c.schedule.rows.length + " months)</summary>" +
      table(["Month", "Payment", "Interest", "Principal", "Balance"], c.schedule.rows.map(function (r) {
        return [r.month, money(r.payment), money(r.interest), money(r.principal), money(r.balance)];
      })) + "</details>";
  }

  $("btn-example").addEventListener("click", function () {
    $("price").value = "250000";
    $("down").value = "20";
    $("apr").value = "7.25";
    $("term").value = "20";
    $("balloon").value = "";
    $("budget").value = "1500";
    $("down-aff").value = "20";
    render();
  });
  $("btn-balloon").addEventListener("click", function () {
    $("price").value = "250000";
    $("down").value = "20";
    $("apr").value = "7.25";
    $("term").value = "10";
    $("balloon").value = "80000";
    render();
  });
  $("calc-form").addEventListener("input", render);
  $("calc-form").addEventListener("change", render);
  render();
})();

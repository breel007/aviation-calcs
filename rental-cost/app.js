(function () {
  "use strict";
  var R = window.RentalCostCalcs;
  if (!R) return;
  var $ = function (id) { return document.getElementById(id); };
  var timeMode = "hours";
  var rateType = "wet";

  function money(n) {
    if (!isFinite(n)) return "—";
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
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

  bindSeg("time", function (u) {
    timeMode = u;
    $("hours-row").hidden = timeMode !== "hours";
    $("meter-row").hidden = timeMode !== "meter";
    render();
  });
  bindSeg("rate", function (u) { rateType = u; render(); });

  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value +
      "</p>" + (sub ? '<p class="stat-sub">' + sub + "</p>" : "") + "</div>";
  }

  function render() {
    var r = R.compute({
      timeMode: timeMode,
      hours: $("hours").value,
      meterStart: $("meter-start").value,
      meterEnd: $("meter-end").value,
      rate: $("rate").value,
      rateType: rateType,
      fuelGallons: $("fuel-gal").value,
      fuelPrice: $("fuel-price").value,
      fuelCredit: $("fuel-credit").checked,
      gph: $("gph").value,
      instructorRate: $("inst-rate").value,
      instructorHours: $("inst-hrs").value,
      landingFees: $("landing").value,
      otherFees: $("other-fees").value,
      passengers: $("pax").value
    });
    var warnings = $("warnings");
    if (!r) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>Enter a positive billed time and a non-negative hourly rate. If you use meter start/end, the end must be at or after the start.</p>";
      $("out-total").innerHTML = "<span class='num'>—</span>";
      $("stat-grid").innerHTML = "";
      $("share-card").innerHTML = "";
      return;
    }
    warnings.hidden = true;
    $("out-total").innerHTML = "<span class='num'>" + money(r.total) + "</span>";
    $("out-sub").textContent = r.hours.toFixed(1) + " hr · " + money(r.perHour) + " effective all-in rate";
    $("stat-grid").innerHTML =
      stat("Aircraft", money(r.aircraft), $("rate").value + "/hr × " + r.hours.toFixed(1) + " hr") +
      stat("Fuel", money(r.fuel), rateType === "dry" ? "added to a dry rate" : (r.fuel < 0 ? "credited against a wet rate" : "included in the wet rate")) +
      stat("Instruction", money(r.instructor), r.instructor ? "listed separately from the 61.113 share" : "none") +
      stat("Airport fees", money(r.fees), "");

    var share = '<div class="card-block"><h3>Pro-rata share (14 CFR 61.113(c))</h3>';
    share += "<p>Operating expenses (aircraft, fuel, and fees) are " + money(r.operatingCost) +
      " among " + r.people + " people on board. An equal share is <strong>" + money(r.equalShare) +
      "</strong>. That is the minimum a private pilot should pay. ";
    if (r.people > 1) {
      share += "Passengers together can pay up to " + money(r.passengersPayMax) +
        " (" + money(r.perPassengerMax) + " each).</p>";
    } else {
      share += "Add passengers to see a split.</p>";
    }
    share += "<p class='hint'>The rule covers fuel, oil, airport expenditures, and rental fees. Instruction is shown on its own line and is not included in this share.</p></div>";
    if (r.wetEquivalent != null) {
      share += "<p class='hint'>At the burn you entered, this dry rate is equivalent to about " + money(r.wetEquivalent) + "/hr wet.</p>";
    } else if (r.dryEquivalent != null) {
      share += "<p class='hint'>At the burn you entered, this wet rate is equivalent to about " + money(r.dryEquivalent) + "/hr dry.</p>";
    }
    $("share-card").innerHTML = share;
  }

  $("btn-example").addEventListener("click", function () {
    $("hours").value = "1.6";
    $("rate").value = "180";
    $("fuel-gal").value = "0";
    $("fuel-price").value = "6.50";
    $("fuel-credit").checked = false;
    $("landing").value = "15";
    $("other-fees").value = "0";
    $("inst-rate").value = "0";
    $("inst-hrs").value = "";
    $("pax").value = "2";
    render();
  });
  $("btn-dry").addEventListener("click", function () {
    $("hours").value = "2.0";
    $("rate").value = "140";
    $("fuel-gal").value = "16";
    $("fuel-price").value = "6.50";
    $("fuel-credit").checked = false;
    $("gph").value = "8";
    $("landing").value = "0";
    $("pax").value = "1";
    // visually select dry
    document.querySelectorAll('[data-unit-group="rate"]').forEach(function (b) {
      var on = b.getAttribute("data-unit") === "dry";
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    rateType = "dry";
    render();
  });
  $("calc-form").addEventListener("input", render);
  $("calc-form").addEventListener("change", render);
  render();
})();

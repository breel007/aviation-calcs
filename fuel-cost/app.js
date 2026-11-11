(function () {
  "use strict";
  var C = window.FuelCostCalcs;
  if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
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
  function setSeg(group, unit) {
    document.querySelectorAll('[data-unit-group="' + group + '"]').forEach(function (b) {
      var on = b.getAttribute("data-unit") === unit;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  function fmt(n, d) {
    if (!isFinite(n)) return "—";
    return n.toLocaleString("en-US", { maximumFractionDigits: d == null ? 1 : d });
  }
  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value +
      "</p>" + (sub ? '<p class="stat-sub">' + sub + "</p>" : "") + "</div>";
  }
  function setHero(num, unit, sub) {
    $("out-hero").innerHTML = '<span class="num">' + num + '</span> <span class="unit">' + (unit || "") + "</span>";
    $("out-sub").textContent = sub || "";
  }
  function clearOut(msg) {
    $("warnings").hidden = !msg;
    if (msg) $("warnings").innerHTML = "<p>" + msg + "</p>";
    else $("warnings").innerHTML = "";
    setHero("—", "", "");
    $("stat-grid").innerHTML = "";
    var extra = $("extra-results");
    if (extra) extra.innerHTML = "";
  }
  var ft = "100ll", fu = "gph", tu = "h";
  bindSeg("ft", function (u) { ft = u; render(); });
  bindSeg("fu", function (u) { fu = u; render(); });
  bindSeg("tu", function (u) { tu = u; render(); });
  function money(n) { return !isFinite(n) ? "—" : "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function render() {
    var r = C.compute({ price: $("price").value, fuelType: ft, flow: $("flow").value, flowUnit: fu, time: $("time").value, timeUnit: tu, gallons: $("gallons").value, oilQtPerHour: $("oilflow").value, oilPrice: $("oilprice").value });
    if (!r) { clearOut("Enter a non-negative price and a fuel flow or a fuel quantity."); return; }
    $("warnings").hidden = true; $("warnings").innerHTML = "";
    if (r.totalPerHour != null) setHero(money(r.totalPerHour), "/ h", r.totalTrip != null ? "trip " + money(r.totalTrip) : "");
    else setHero(money(r.totalTrip), "trip", "");
    var bits = "";
    if (r.costPerHour != null) bits += stat("Fuel per hour", money(r.costPerHour), fmt(r.gph, 2) + " gal/h · " + fmt(r.poundsPerHour, 1) + " lb/h");
    if (r.tripFuelCost != null) bits += stat("Trip fuel", money(r.tripFuelCost), fmt(r.gallons, 2) + " gal" + (r.hours != null ? " · " + fmt(r.hours, 2) + " h" : ""));
    if (r.oilPerHour > 0) bits += stat("Oil", money(r.oilPerHour) + " / h", r.oilTrip != null ? "trip " + money(r.oilTrip) : "");
    bits += stat("Density used", fmt(r.densityLbGal, 2) + " lb/gal", "planning figure, not a lab SG");
    $("stat-grid").innerHTML = bits;
  }
  $("btn-ga").addEventListener("click", function () {
    $("price").value = "6.50"; $("flow").value = "8.5"; $("time").value = "2"; $("gallons").value = "";
    ft = "100ll"; fu = "gph"; tu = "h"; setSeg("ft", ft); setSeg("fu", fu); setSeg("tu", tu); render();
  });
  $("btn-jet").addEventListener("click", function () {
    $("price").value = "5.00"; $("flow").value = "600"; $("time").value = "90"; $("gallons").value = "";
    ft = "jeta"; fu = "pph"; tu = "min"; setSeg("ft", ft); setSeg("fu", fu); setSeg("tu", tu); render();
  });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

(function () {
  "use strict";
  var C = window.FuelWeightCalcs;
  if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var dir = "volume-to-mass", vUnit = "us-gal", mUnit = "lb";
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
  function fmt(n, d) {
    if (!isFinite(n)) return "—";
    return n.toLocaleString("en-US", { maximumFractionDigits: d == null ? 1 : d });
  }
  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value +
      "</p>" + (sub ? '<p class="stat-sub">' + sub + "</p>" : "") + "</div>";
  }
  function show() {
    $("block-vol").hidden = dir !== "volume-to-mass";
    $("block-mass").hidden = dir !== "mass-to-volume";
    $("temp-row").hidden = !$("use-temp").checked;
  }
  bindSeg("dir", function (u) { dir = u; show(); render(); });
  bindSeg("vu", function (u) { vUnit = u; render(); });
  bindSeg("mu", function (u) { mUnit = u; render(); });
  $("use-temp").addEventListener("change", function () { show(); render(); });
  function render() {
    var r = C.compute({
      fuelType: $("fuel").value, customLbGal: $("custom").value, direction: dir,
      volume: $("volume").value, volumeUnit: vUnit, mass: $("mass").value, massUnit: mUnit,
      useTemperature: $("use-temp").checked, tempC: $("temp").value
    });
    var warnings = $("warnings");
    if (!r) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>Enter a non-negative volume or mass, and a positive density if you chose custom.</p>";
      $("out-hero").innerHTML = '<span class="num">—</span> <span class="unit"></span>';
      $("out-sub").textContent = ""; $("stat-grid").innerHTML = "";
      return;
    }
    warnings.hidden = true;
    $("out-hero").innerHTML = '<span class="num">' + fmt(r.pounds, 1) + '</span> <span class="unit">lb</span>';
    $("out-sub").textContent = fmt(r.kilograms, 2) + " kg · " + r.fuelName + " at " + fmt(r.usedLbPerUsGal, 3) + " lb/US gal";
    $("stat-grid").innerHTML =
      stat("Pounds", fmt(r.pounds, 1) + " lb", fmt(r.kilograms, 2) + " kg") +
      stat("US gallons", fmt(r.usGallons, 2), fmt(r.liters, 2) + " L · " + fmt(r.impGallons, 2) + " imp. gal") +
      stat("Density used", fmt(r.usedLbPerUsGal, 3) + " lb/US gal", fmt(r.usedKgPerL, 3) + " kg/L") +
      stat("Planning figure", fmt(r.planLbPerUsGal, 2) + " lb/US gal", r.temperatureApplied ? "temperature-corrected from SG " + fmt(r.sg15, 3) + " at 15 °C" : "planning density (no temperature correction)");
  }
  $("btn-ex").addEventListener("click", function () {
    $("fuel").value = "100LL"; $("volume").value = "50"; dir = "volume-to-mass"; vUnit = "us-gal";
    $("use-temp").checked = false; show(); render();
  });
  $("calc-form").addEventListener("input", render);
  $("calc-form").addEventListener("change", render);
  show(); render();
})();

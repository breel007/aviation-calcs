(function () {
  "use strict";
  var C = window.PointOfNoReturnCalcs;
  if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var mode = "pnr", sMode = "tas-wind", eUnit = "h";
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
    $("block-pnr").hidden = mode !== "pnr";
    $("block-etp").hidden = mode !== "etp";
    $("block-gs").hidden = sMode !== "gs";
    $("block-tw").hidden = sMode !== "tas-wind";
  }
  bindSeg("mode", function (u) { mode = u; show(); render(); });
  bindSeg("smode", function (u) { sMode = u; show(); render(); });
  bindSeg("eu", function (u) { eUnit = u; render(); });
  function render() {
    var input = { mode: mode, speedMode: sMode === "tas-wind" ? "tas-wind" : "gs" };
    if (sMode === "tas-wind") { input.tas = $("tas").value; input.windComponent = $("wind").value; }
    else { input.outboundGs = $("outGs").value; input.homeboundGs = $("homeGs").value; }
    if (mode === "pnr") {
      if (eUnit === "min") input.enduranceMin = $("endurance").value;
      else input.enduranceHours = $("endurance").value;
    } else {
      input.totalDistance = $("total").value;
    }
    var r = C.compute(input);
    var warnings = $("warnings");
    if (!r) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>Enter positive outbound and homebound groundspeeds (a wind cannot exceed the TAS) and, for a PNR, a positive endurance, or, for an ETP, a positive total distance.</p>";
      $("out-hero").innerHTML = '<span class="num">—</span> <span class="unit"></span>';
      $("out-sub").textContent = ""; $("stat-grid").innerHTML = "";
      return;
    }
    warnings.hidden = true;
    if (r.mode === "etp") {
      $("out-hero").innerHTML = '<span class="num">' + fmt(r.distanceFromA, 1) + '</span> <span class="unit">from A</span>';
      $("out-sub").textContent = "time either way " + fmt(r.timeToAHours, 2) + " h (" + fmt(r.timeToAMin, 0) + " min)";
      $("stat-grid").innerHTML =
        stat("Distance from A", fmt(r.distanceFromA, 1), fmt(r.distanceFromB, 1) + " from B") +
        stat("Time to A or B", fmt(r.timeToAMin, 0) + " min", "equal by definition") +
        stat("Groundspeeds", "out " + fmt(r.outboundGs, 1) + " / home " + fmt(r.homeboundGs, 1), "still-air midpoint " + fmt(r.stillAirMidpoint, 1));
    } else {
      $("out-hero").innerHTML = '<span class="num">' + fmt(r.distance, 1) + '</span> <span class="unit"></span>';
      $("out-sub").textContent = "time out " + fmt(r.timeOutHours, 2) + " h (" + fmt(r.timeOutMin, 0) + " min) · back " + fmt(r.timeBackHours, 2) + " h";
      $("stat-grid").innerHTML =
        stat("PNR distance", fmt(r.distance, 1), "from departure, return-to-departure") +
        stat("Time outbound", fmt(r.timeOutMin, 0) + " min", "return " + fmt(r.timeBackMin, 0) + " min · endurance " + fmt(r.enduranceHours, 2) + " h") +
        stat("Groundspeeds", "out " + fmt(r.outboundGs, 1) + " / home " + fmt(r.homeboundGs, 1), "still-air halfway in time is " + fmt(r.stillAirTimeHours, 2) + " h");
    }
  }
  $("btn-ex").addEventListener("click", function () {
    mode = "pnr"; sMode = "tas-wind"; $("tas").value = "150"; $("wind").value = "-30"; $("endurance").value = "5"; eUnit = "h";
    document.querySelectorAll('[data-unit-group="mode"]').forEach(function (b) {
      var on = b.getAttribute("data-unit") === "pnr";
      b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    document.querySelectorAll('[data-unit-group="smode"]').forEach(function (b) {
      var on = b.getAttribute("data-unit") === "tas-wind";
      b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    show(); render();
  });
  $("calc-form").addEventListener("input", render);
  $("calc-form").addEventListener("change", render);
  show(); render();
})();

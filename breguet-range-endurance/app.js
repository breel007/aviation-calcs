(function () {
  "use strict";
  var C = window.BreguetRangeEnduranceCalcs;
  if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var kind = "jet", vUnit = "kt", tsUnit = "per-h", sfcUnit = "lb/hp-h";
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
    $("block-jet").hidden = kind !== "jet";
    $("block-prop").hidden = kind !== "prop";
  }
  bindSeg("kind", function (u) { kind = u; show(); render(); });
  bindSeg("vu", function (u) { vUnit = u; render(); });
  bindSeg("tsu", function (u) { tsUnit = u; render(); });
  bindSeg("sfcu", function (u) { sfcUnit = u; render(); });
  function render() {
    var r = C.compute({
      kind: kind, Wi: $("Wi").value, Wf: $("Wf").value, liftToDrag: $("LD").value,
      velocity: $("velocity").value, velocityUnit: vUnit,
      tsfc: $("tsfc").value, tsfcUnit: tsUnit,
      eta: $("eta").value, sfc: $("sfc").value, sfcUnit: sfcUnit
    });
    var warnings = $("warnings");
    if (!r) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>Enter positive weights with Wi ≥ Wf, a positive L/D, a speed, and a fuel-consumption figure (and, for a propeller, an efficiency between 0 and 1).</p>";
      $("out-hero").innerHTML = '<span class="num">—</span> <span class="unit"></span>';
      $("out-sub").textContent = ""; $("stat-grid").innerHTML = "";
      return;
    }
    warnings.hidden = true;
    $("out-hero").innerHTML = '<span class="num">' + fmt(r.rangeNm, 0) + '</span> <span class="unit">NM</span>';
    $("out-sub").textContent = fmt(r.rangeKm, 0) + " km" + (r.enduranceH != null ? " · endurance " + fmt(r.enduranceH, 2) + " h" : "");
    $("stat-grid").innerHTML =
      stat("Range", fmt(r.rangeNm, 1) + " NM", fmt(r.rangeKm, 1) + " km") +
      stat("Endurance", r.enduranceH != null ? fmt(r.enduranceH, 2) + " h" : "—", r.enduranceH != null ? fmt(r.enduranceH * 60, 0) + " min" : "needs a speed, for a propeller") +
      stat("Weight ratio Wi/Wf", fmt(r.weightRatio, 4), "fuel fraction " + fmt(r.fuelFraction * 100, 2) + "%") +
      stat("ln(Wi/Wf)", fmt(r.ln, 5), "L/D = " + fmt(r.liftToDrag, 2));
  }
  $("btn-ex").addEventListener("click", function () {
    kind = "jet"; $("Wi").value = "120000"; $("Wf").value = "100000"; $("LD").value = "16"; $("velocity").value = "450"; $("tsfc").value = "0.5";
    document.querySelectorAll('[data-unit-group="kind"]').forEach(function (b) {
      var on = b.getAttribute("data-unit") === "jet";
      b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    show(); render();
  });
  $("calc-form").addEventListener("input", render);
  $("calc-form").addEventListener("change", render);
  show(); render();
})();

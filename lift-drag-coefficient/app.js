(function () {
  "use strict";
  var C = window.LiftDragCoefficientCalcs;
  if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var aUnit = "m2", vUnit = "m/s", wUnit = "kg";
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
  bindSeg("au", function (u) { aUnit = u; render(); });
  bindSeg("vu", function (u) { vUnit = u; render(); });
  bindSeg("wu", function (u) { wUnit = u; render(); });
  function render() {
    var r = C.compute({
      area: $("area").value, areaUnit: aUnit,
      velocity: $("velocity").value, velocityUnit: vUnit,
      rho: $("rho").value,
      dynamicPressurePa: $("qpa").value,
      weight: $("weight").value, weightUnit: wUnit,
      loadFactor: $("n").value,
      lift: $("lift").value, liftUnit: "N",
      drag: $("drag").value, dragUnit: "N",
      CL: $("CL").value, CD: $("CD").value
    });
    var warnings = $("warnings");
    if (!r) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>Enter a reference area and a dynamic pressure (or a speed and density), plus a weight, a lift, or a coefficient.</p>";
      $("out-hero").innerHTML = '<span class="num">—</span> <span class="unit"></span>';
      $("out-sub").textContent = ""; $("stat-grid").innerHTML = "";
      return;
    }
    warnings.hidden = true;
    $("out-hero").innerHTML = '<span class="num">' + (r.CL != null ? fmt(r.CL, 3) : "—") + '</span> <span class="unit"></span>';
    $("out-sub").textContent = r.liftToDrag != null ? "L/D = " + fmt(r.liftToDrag, 2) : (r.CD != null ? "CD = " + fmt(r.CD, 4) : "");
    $("stat-grid").innerHTML =
      stat("CL", r.CL != null ? fmt(r.CL, 3) : "—", r.liftN != null ? fmt(r.liftN, 0) + " N of lift" : "") +
      stat("CD", r.CD != null ? fmt(r.CD, 4) : "—", r.dragN != null ? fmt(r.dragN, 0) + " N of drag" : "") +
      stat("L/D", r.liftToDrag != null ? fmt(r.liftToDrag, 2) : "—", "") +
      stat("Dynamic pressure", fmt(r.dynamicPressurePa, 1) + " Pa", fmt(r.dynamicPressurePsf, 2) + " psf") +
      stat("Area S", fmt(r.areaM2, 3) + " m²", "") +
      stat("Wing loading L/S", r.wingLoadingPa != null ? fmt(r.wingLoadingPa, 1) + " Pa" : "—", r.weightN != null ? "W = " + fmt(r.weightN, 0) + " N, n = " + fmt(r.loadFactor, 2) : "");
  }
  $("btn-ex").addEventListener("click", function () {
    $("area").value = "10"; $("velocity").value = "50"; $("rho").value = "1.225"; $("weight").value = "1000"; $("n").value = "1";
    $("qpa").value = ""; $("lift").value = ""; $("drag").value = ""; $("CL").value = ""; $("CD").value = "";
    render();
  });
  $("calc-form").addEventListener("input", render);
  $("calc-form").addEventListener("change", render);
  render();
})();

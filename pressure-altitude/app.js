(function () {
  "use strict";
  var C = window.PressureAltitudeCalcs;
  if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var mode = "qnh-elevation", altU = "inhg", elU = "ft", stU = "hpa";
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
    $("block-qnh").hidden = mode !== "qnh-elevation";
    $("block-stn").hidden = mode !== "station-pressure";
  }
  bindSeg("mode", function (u) { mode = u; show(); render(); });
  bindSeg("alu", function (u) { altU = u; render(); });
  bindSeg("elu", function (u) { elU = u; render(); });
  bindSeg("stu", function (u) { stU = u; render(); });
  function render() {
    var r = C.compute({
      mode: mode, altimeter: $("altimeter").value, altimeterUnit: altU,
      elevation: $("elevation").value, elevationUnit: elU,
      stationPressure: $("station").value, stationUnit: stU
    });
    var warnings = $("warnings");
    if (!r) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>Enter a positive altimeter setting and an elevation, or a positive station pressure.</p>";
      $("out-hero").innerHTML = '<span class="num">—</span> <span class="unit"></span>';
      $("out-sub").textContent = ""; $("stat-grid").innerHTML = "";
      return;
    }
    warnings.hidden = true;
    $("out-hero").innerHTML = '<span class="num">' + fmt(r.pressureAltitudeFt, 0) + '</span> <span class="unit">ft</span>';
    $("out-sub").textContent = fmt(r.pressureAltitudeM, 1) + " m" +
      (r.ruleOfThumbFt != null ? " · rule of thumb " + fmt(r.ruleOfThumbFt, 0) + " ft" : "");
    $("stat-grid").innerHTML =
      stat("Station pressure", fmt(r.stationPressureHpa, 2) + " hPa", fmt(r.stationPressureInHg, 3) + " inHg") +
      (r.qnhInHg != null ? stat("QNH", fmt(r.qnhInHg, 3) + " inHg", fmt(r.qnhHpa, 2) + " hPa") : "") +
      stat("QFE", fmt(r.qfeInHg, 3) + " inHg", fmt(r.qfeHpa, 2) + " hPa · reads zero at the field") +
      stat("QNE", fmt(r.qneInHg, 5) + " inHg", fmt(r.qneHpa, 2) + " hPa · standard setting") +
      (r.ruleOfThumbFt != null ? stat("Rule of thumb", fmt(r.ruleOfThumbFt, 0) + " ft", "difference " + fmt(r.ruleOfThumbDeltaFt, 0) + " ft (exact − thumb)") : "");
  }
  $("btn-std").addEventListener("click", function () {
    mode = "qnh-elevation"; $("altimeter").value = "29.92"; $("elevation").value = "5000"; altU = "inhg"; elU = "ft"; show(); render();
  });
  $("btn-low").addEventListener("click", function () {
    mode = "qnh-elevation"; $("altimeter").value = "28.92"; $("elevation").value = "0"; altU = "inhg"; elU = "ft"; show(); render();
  });
  $("calc-form").addEventListener("input", render);
  $("calc-form").addEventListener("change", render);
  show(); render();
})();

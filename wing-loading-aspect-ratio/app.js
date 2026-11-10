(function () {
  "use strict";
  var C = window.WingLoadingAspectRatioCalcs;
  if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var wUnit = "lb", aUnit = "ft2", sUnit = "ft";
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
  bindSeg("wu", function (u) { wUnit = u; render(); });
  bindSeg("au", function (u) { aUnit = u; render(); });
  bindSeg("su", function (u) { sUnit = u; render(); });
  function render() {
    var r = C.compute({
      weight: $("weight").value, weightUnit: wUnit,
      area: $("area").value, areaUnit: aUnit,
      span: $("span").value, spanUnit: sUnit,
      aspectRatio: $("ar").value,
      taper: $("taper").value,
      CLmax: $("clmax").value,
      rho: $("rho").value
    });
    var warnings = $("warnings");
    if (!r || (r.areaM2 == null && r.weightN == null)) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>Enter a weight and at least two of area, span, and aspect ratio.</p>";
      $("out-hero").innerHTML = '<span class="num">—</span> <span class="unit"></span>';
      $("out-sub").textContent = ""; $("stat-grid").innerHTML = "";
      return;
    }
    warnings.hidden = true;
    var hero = r.wingLoadingPsf != null ? fmt(r.wingLoadingPsf, 2) : "—";
    $("out-hero").innerHTML = '<span class="num">' + hero + '</span> <span class="unit">psf</span>';
    $("out-sub").textContent = r.wingLoadingPa != null ? fmt(r.wingLoadingPa, 1) + " Pa · " + fmt(r.wingLoadingKgM2, 2) + " kg/m²" : "";
    var html = "";
    if (r.aspectRatio != null) html += stat("Aspect ratio", fmt(r.aspectRatio, 2), "AR = b²/S");
    if (r.areaM2 != null) html += stat("Area S", fmt(r.areaM2, 3) + " m²", fmt(r.areaM2 / (0.3048*0.3048), 1) + " ft²");
    if (r.spanM != null) html += stat("Span b", fmt(r.spanM, 3) + " m", fmt(r.spanM / 0.3048, 2) + " ft");
    if (r.meanChordM != null) html += stat("S/b mean chord", fmt(r.meanChordM, 3) + " m", fmt(r.meanChordM / 0.3048, 2) + " ft");
    if (r.macM != null) html += stat("MAC", fmt(r.macM, 3) + " m", "root " + fmt(r.rootChordM, 3) + " m · tip " + fmt(r.tipChordM, 3) + " m");
    if (r.stallSpeedKt != null) html += stat("Stall speed (est.)", fmt(r.stallSpeedKt, 1) + " kt", fmt(r.stallSpeedMps, 2) + " m/s at CLmax " + fmt(r.CLmax, 2));
    $("stat-grid").innerHTML = html;
  }
  $("btn-ex").addEventListener("click", function () {
    $("weight").value = "2550"; $("area").value = "174"; $("span").value = "36.1"; $("ar").value = ""; $("taper").value = ""; $("clmax").value = "1.6"; $("rho").value = "1.225";
    render();
  });
  $("calc-form").addEventListener("input", render);
  $("calc-form").addEventListener("change", render);
  render();
})();

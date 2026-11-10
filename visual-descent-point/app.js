(function () {
  "use strict";
  var C = window.VisualDescentPointCalcs;
  if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  function fmt(n, d) {
    if (!isFinite(n)) return "—";
    return n.toLocaleString("en-US", { maximumFractionDigits: d == null ? 2 : d });
  }
  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value +
      "</p>" + (sub ? '<p class="stat-sub">' + sub + "</p>" : "") + "</div>";
  }
  function render() {
    var r = C.compute({
      hatFt: $("hat").value, angleDeg: $("angle").value, groundspeedKt: $("gs").value,
      thresholdDme: $("dme").value, mdaFt: $("mda").value, tdzeFt: $("tdze").value
    });
    var warnings = $("warnings");
    if (!r) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>Enter a non-negative HAT, or an MDA and a TDZE, and a descent angle between 0° and 45°.</p>";
      $("out-hero").innerHTML = '<span class="num">—</span> <span class="unit"></span>';
      $("out-sub").textContent = ""; $("stat-grid").innerHTML = "";
      return;
    }
    warnings.hidden = true;
    $("out-hero").innerHTML = '<span class="num">' + fmt(r.vdpNm, 2) + '</span> <span class="unit">NM</span>';
    $("out-sub").textContent = "HAT " + fmt(r.hatFt, 0) + " ft on a " + fmt(r.angleDeg, 2) + "° path (" + fmt(r.ftPerNm, 1) + " ft/NM)";
    $("stat-grid").innerHTML =
      stat("Exact VDP", fmt(r.vdpNm, 2) + " NM", "from the threshold") +
      stat("HAT / 300 rule", fmt(r.rule300Nm, 2) + " NM", "HAT/320 = " + fmt(r.rule320Nm, 2) + " NM") +
      stat("Descent rate", r.descentRateFpm != null ? fmt(r.descentRateFpm, 0) + " fpm" : "—", r.timesFiveFpm != null ? "times-five ≈ " + fmt(r.timesFiveFpm, 0) + " fpm" : "add a groundspeed") +
      stat("Time from VDP", r.timeMin != null ? fmt(r.timeMin, 1) + " min" : "—", r.groundspeedKt != null ? "at " + fmt(r.groundspeedKt, 0) + " kt" : "") +
      (r.vdpDme != null ? stat("VDP DME", fmt(r.vdpDme, 2) + " NM", "threshold DME " + fmt(r.thresholdDme, 2)) : "");
  }
  $("btn-ex").addEventListener("click", function () {
    $("hat").value = "500"; $("angle").value = "3"; $("gs").value = "90"; $("mda").value = ""; $("tdze").value = ""; $("dme").value = "";
    render();
  });
  $("calc-form").addEventListener("input", render);
  $("calc-form").addEventListener("change", render);
  render();
})();

(function () {
  "use strict";
  var C = window.VorDmeCalcs;
  if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var mode = "offset";
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
    return n.toLocaleString("en-US", { maximumFractionDigits: d == null ? 2 : d });
  }
  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value +
      "</p>" + (sub ? '<p class="stat-sub">' + sub + "</p>" : "") + "</div>";
  }
  function show() {
    $("block-offset").hidden = mode !== "offset";
    $("block-tts").hidden = mode !== "time-to-station";
    $("block-slant").hidden = mode !== "slant";
    $("block-lead").hidden = mode !== "lead";
  }
  bindSeg("mode", function (u) { mode = u; show(); render(); });
  function render() {
    var input = { mode: mode };
    if (mode === "offset") { input.distanceNm = $("dist").value; input.degrees = $("deg").value; }
    if (mode === "time-to-station") { input.elapsedMin = $("elapsed").value; input.degreesChanged = $("ddeg").value; input.groundspeedKt = $("gs").value; }
    if (mode === "slant") { input.dmeNm = $("dme").value; input.heightFt = $("height").value; }
    if (mode === "lead") { input.distanceNm = $("ldist").value; input.tasKt = $("tas").value; input.bankDeg = $("bank").value; input.standardRate = $("bank").value === ""; }
    var r = C.compute(input);
    var warnings = $("warnings");
    if (!r || r.error) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>" + (r && r.error ? r.error : "Enter the fields for the selected problem.") + "</p>";
      $("out-hero").innerHTML = '<span class="num">—</span> <span class="unit"></span>';
      $("out-sub").textContent = ""; $("stat-grid").innerHTML = "";
      return;
    }
    warnings.hidden = true;
    if (mode === "offset") {
      $("out-hero").innerHTML = '<span class="num">' + fmt(r.offsetNm, 2) + '</span> <span class="unit">NM off</span>';
      $("out-sub").textContent = "1-in-60 rule: " + fmt(r.offsetRuleNm, 2) + " NM (" + fmt(r.offsetRuleFt, 0) + " ft)";
      $("stat-grid").innerHTML =
        stat("Exact offset", fmt(r.offsetNm, 2) + " NM", fmt(r.offsetFt, 0) + " ft") +
        stat("1-in-60 rule", fmt(r.offsetRuleNm, 2) + " NM", fmt(r.offsetRuleFt, 0) + " ft") +
        stat("Suggested intercept", fmt(r.interceptSuggestion, 0) + "°", "a common 2×-error intercept, capped at 90°");
    } else if (mode === "time-to-station") {
      $("out-hero").innerHTML = '<span class="num">' + fmt(r.timeToStationMin, 1) + '</span> <span class="unit">min</span>';
      $("out-sub").textContent = r.distanceNm != null ? fmt(r.distanceNm, 1) + " NM at " + fmt(r.groundspeedKt, 0) + " kt" : "add a groundspeed for distance";
      $("stat-grid").innerHTML =
        stat("Time to station", fmt(r.timeToStationMin, 1) + " min", "60 × Δt / Δ°") +
        stat("Distance", r.distanceNm != null ? fmt(r.distanceNm, 1) + " NM" : "—", "");
    } else if (mode === "slant") {
      $("out-hero").innerHTML = '<span class="num">' + fmt(r.horizontalNm, 2) + '</span> <span class="unit">NM horiz.</span>';
      $("out-sub").textContent = "slant error " + fmt(r.slantErrorNm, 2) + " NM (" + fmt(r.slantErrorFt, 0) + " ft)";
      $("stat-grid").innerHTML =
        stat("Horizontal distance", fmt(r.horizontalNm, 2) + " NM", "") +
        stat("Slant minus horizontal", fmt(r.slantErrorNm, 2) + " NM", fmt(r.slantErrorFt, 0) + " ft") +
        stat("Height", fmt(r.heightNm, 3) + " NM", fmt(r.heightFt, 0) + " ft");
    } else {
      $("out-hero").innerHTML = '<span class="num">' + fmt(r.leadDeg, 1) + '</span> <span class="unit">°</span>';
      $("out-sub").textContent = "lead distance ≈ " + fmt(r.leadDistanceNm, 2) + " NM · radius " + fmt(r.turnRadiusNm, 2) + " NM";
      $("stat-grid").innerHTML =
        stat("Lead angle", fmt(r.leadDeg, 1) + "°", "atan(radius / distance)") +
        stat("Turn radius", fmt(r.turnRadiusNm, 2) + " NM", "bank " + fmt(r.bankDeg, 1) + "°" + (r.standardRate ? " (standard rate)" : "")) +
        stat("Lead distance", fmt(r.leadDistanceNm, 2) + " NM", "start the turn this far before the course");
    }
  }
  $("btn-ex").addEventListener("click", function () {
    mode = "offset"; $("dist").value = "30"; $("deg").value = "5";
    document.querySelectorAll('[data-unit-group="mode"]').forEach(function (b) {
      var on = b.getAttribute("data-unit") === "offset";
      b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    show(); render();
  });
  $("calc-form").addEventListener("input", render);
  $("calc-form").addEventListener("change", render);
  show(); render();
})();

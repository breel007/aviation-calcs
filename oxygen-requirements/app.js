(function () {
  "use strict";
  var C = window.OxygenRequirementsCalcs;
  if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var cUnit = "ft", fUnit = "fl";
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
  function toFt(value, unit) {
    var n = Number(value);
    return unit === "fl" ? n * 100 : n;
  }
  function show() { $("flight-row").hidden = !$("pressurized").checked; }
  bindSeg("cau", function (u) { cUnit = u; render(); });
  bindSeg("fau", function (u) { fUnit = u; render(); });
  $("pressurized").addEventListener("change", function () { show(); render(); });
  function notes(list) {
    if (!list || !list.length) return "";
    return "<ul class=\"status-list\">" + list.map(function (n) { return "<li class=\"plain\">" + n + "</li>"; }).join("") + "</ul>";
  }
  function render() {
    var r = C.compute({
      cabinAltitudeFt: toFt($("cabin").value, cUnit),
      durationMin: $("duration").value,
      pressurized: $("pressurized").checked,
      flightAltitudeFt: $("pressurized").checked ? toFt($("flight").value, fUnit) : null
    });
    var warnings = $("warnings");
    if (!r) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>Enter a non-negative cabin pressure altitude and a duration.</p>";
      $("out-hero").innerHTML = '<span class="num">—</span> <span class="unit"></span>';
      $("out-sub").textContent = ""; $("stat-grid").innerHTML = ""; $("extra-results").innerHTML = "";
      return;
    }
    warnings.hidden = true;
    $("out-hero").innerHTML = '<span class="num" style="font-size:clamp(1.4rem,4vw,2.1rem)">' + r.tuc.label + '</span> <span class="unit"></span>';
    $("hero-tag").textContent = r.tuc.nearestAlt ? "FAA TUC near " + r.tuc.nearestAlt.toLocaleString("en-US") + " ft" : "below the published TUC table";
    $("out-sub").textContent = r.tuc.between || (r.tuc.belowTable ? r.tuc.label : "Published FAA / CAMI range for a sudden exposure. Not a precise prediction.");
    function pill(on, label) {
      return '<span class="status-pill ' + (on ? "status-expired" : "status-current") + '">' + label + "</span>";
    }
    $("stat-grid").innerHTML = "";
    $("extra-results").innerHTML =
      '<div class="card-block"><h3>14 CFR 91.211 ' +
      (r.part91.crewMustUse ? pill(true, "crew oxygen required") : r.part91.crewAfter30 ? pill(false, "after 30 min") : pill(false, "not required at this time")) +
      "</h3>" + notes(r.part91.notes) + notes(r.part91.pressurizedNotes) + "</div>" +
      '<div class="card-block"><h3>14 CFR 135.89 ' +
      (r.part135.crewMustUse ? pill(true, "pilot must use") : r.part135.crewAfter30 ? pill(false, "after 30 min") : pill(false, "not required at this time")) +
      "</h3>" + notes(r.part135.notes) + "</div>" +
      '<div class="card-block"><h3>14 CFR 121.329 / 121.333</h3>' + notes(r.part121.notes) + "</div>";
  }
  $("btn-ex").addEventListener("click", function () {
    $("cabin").value = "13000"; cUnit = "ft"; $("duration").value = "45"; $("pressurized").checked = false; show(); render();
  });
  $("btn-25").addEventListener("click", function () {
    $("cabin").value = "25000"; cUnit = "ft"; $("duration").value = "5"; show(); render();
  });
  $("calc-form").addEventListener("input", render);
  $("calc-form").addEventListener("change", render);
  show(); render();
})();

(function () {
  "use strict";
  var C = window.TrueAltitudeCalcs;
  if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var tsrc = "oat", tUnit = "C";
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
    return n.toLocaleString("en-US", { maximumFractionDigits: d == null ? 0 : d });
  }
  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value +
      "</p>" + (sub ? '<p class="stat-sub">' + sub + "</p>" : "") + "</div>";
  }
  function show() {
    $("block-oat").hidden = tsrc !== "oat";
    $("block-dev").hidden = tsrc !== "isa-dev";
  }
  bindSeg("tsrc", function (u) { tsrc = u; show(); render(); });
  bindSeg("tu", function (u) { tUnit = u; render(); });
  function render() {
    var r = C.compute({
      pressureAltitudeFt: $("pa").value,
      oat: $("oat").value, tempUnit: tUnit, tempSource: tsrc,
      isaDeviationC: $("dev").value
    });
    var warnings = $("warnings");
    if (!r) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>Enter a pressure altitude and an OAT or an ISA deviation.</p>";
      $("out-hero").innerHTML = '<span class="num">—</span> <span class="unit"></span>';
      $("out-sub").textContent = ""; $("stat-grid").innerHTML = "";
      return;
    }
    warnings.hidden = true;
    $("hero").setAttribute("data-severity", r.colderThanIsa && r.correctionFt < -200 ? "caution" : "");
    $("out-hero").innerHTML = '<span class="num">' + fmt(r.trueAltitudeFt, 0) + '</span> <span class="unit">ft</span>';
    $("out-sub").textContent = (r.correctionFt >= 0 ? "+" : "") + fmt(r.correctionFt, 0) + " ft relative to PA" +
      (r.colderThanIsa ? " — look out below" : "");
    $("stat-grid").innerHTML =
      stat("True altitude", fmt(r.trueAltitudeFt, 0) + " ft", "correction " + (r.correctionFt >= 0 ? "+" : "") + fmt(r.correctionFt, 0) + " ft") +
      stat("ISA temperature", fmt(r.isaTempC, 1) + " °C", "OAT " + fmt(r.oatC, 1) + " °C (" + fmt(r.oatF, 1) + " °F)") +
      stat("ISA deviation", (r.isaDeviationC >= 0 ? "+" : "") + fmt(r.isaDeviationC, 1) + " °C", "") +
      stat("4 ft / °C / 1,000 ft rule", fmt(r.ruleOfThumbTrueFt, 0) + " ft", "correction " + (r.ruleOfThumbCorrectionFt >= 0 ? "+" : "") + fmt(r.ruleOfThumbCorrectionFt, 0) + " ft");
  }
  $("btn-ex").addEventListener("click", function () {
    tsrc = "oat"; $("pa").value = "10000"; $("oat").value = "-25"; tUnit = "C";
    document.querySelectorAll('[data-unit-group="tsrc"]').forEach(function (b) {
      var on = b.getAttribute("data-unit") === "oat";
      b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    show(); render();
  });
  $("btn-isa").addEventListener("click", function () {
    tsrc = "isa-dev"; $("dev").value = "0";
    document.querySelectorAll('[data-unit-group="tsrc"]').forEach(function (b) {
      var on = b.getAttribute("data-unit") === "isa-dev";
      b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    show(); render();
  });
  $("calc-form").addEventListener("input", render);
  $("calc-form").addEventListener("change", render);
  show(); render();
})();

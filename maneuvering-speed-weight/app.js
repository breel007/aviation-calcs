(function () {
  "use strict";
  var C = window.ManeuveringSpeedWeightCalcs;
  if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  function fmt(n, d) {
    if (!isFinite(n)) return "—";
    return n.toLocaleString("en-US", { maximumFractionDigits: d == null ? 1 : d });
  }
  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value +
      "</p>" + (sub ? '<p class="stat-sub">' + sub + "</p>" : "") + "</div>";
  }
  function render() {
    var r = C.compute({
      vaRef: $("vaRef").value, weightRef: $("wRef").value, weight: $("weight").value,
      vs: $("vs").value, nLim: $("nlim").value, vsAtCurrent: $("vs-current").checked
    });
    var warnings = $("warnings");
    if (!r) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>Enter a published Va and two positive weights, or a stall speed and a limit load factor.</p>";
      $("out-hero").innerHTML = '<span class="num">—</span> <span class="unit"></span>';
      $("out-sub").textContent = ""; $("stat-grid").innerHTML = "";
      return;
    }
    warnings.hidden = true;
    $("hero").setAttribute("data-severity", r.heavierThanRef ? "caution" : "");
    $("out-hero").innerHTML = '<span class="num">' + fmt(r.va, 1) + '</span> <span class="unit"></span>';
    $("out-sub").textContent = "from " + fmt(r.vaRef, 1) + " at Wref · √(W/Wref) = " + fmt(Math.sqrt(r.weightRatio), 4) +
      (r.heavierThanRef ? ". Weight is above the reference — do not exceed the POH Va." : "");
    $("stat-grid").innerHTML =
      stat("Va at this weight", fmt(r.va, 1), "published " + fmt(r.vaRef, 1) + " at " + fmt(r.weightRef, 0)) +
      stat("Weight ratio", fmt(r.weightRatio, 3), fmt(r.weight, 0) + " / " + fmt(r.weightRef, 0)) +
      stat("Vs (implied or entered)", r.vsAtWeight != null ? fmt(r.vsAtWeight, 1) : "—", r.vsAtRef != null ? fmt(r.vsAtRef, 1) + " at Wref · n_lim = " + fmt(r.nLim, 2) : "n_lim = " + fmt(r.nLim, 2));
  }
  $("btn-ex").addEventListener("click", function () {
    $("vaRef").value = "105"; $("wRef").value = "2550"; $("weight").value = "2200"; $("vs").value = ""; $("nlim").value = "3.8"; $("vs-current").checked = false;
    render();
  });
  $("calc-form").addEventListener("input", render);
  $("calc-form").addEventListener("change", render);
  render();
})();

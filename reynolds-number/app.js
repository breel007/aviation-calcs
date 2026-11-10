(function () {
  "use strict";
  var C = window.ReynoldsNumberCalcs;
  if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var source = "isa", altUnit = "m", vUnit = "m/s", lUnit = "m";
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
  function sci(n) {
    if (!isFinite(n)) return "—";
    if (n !== 0 && (Math.abs(n) < 1e-3 || Math.abs(n) >= 1e6)) return n.toExponential(3);
    return fmt(n, 5);
  }
  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value +
      "</p>" + (sub ? '<p class="stat-sub">' + sub + "</p>" : "") + "</div>";
  }
  function altM() {
    var n = Number($("altitude").value);
    if (altUnit === "ft") return n * 0.3048;
    if (altUnit === "km") return n * 1000;
    return n;
  }
  function show() {
    $("block-isa").hidden = source !== "isa";
    $("block-pt").hidden = source !== "pressure-temp";
    $("block-rhomu").hidden = source !== "rho-mu";
    $("block-nu").hidden = source !== "nu";
  }
  bindSeg("source", function (u) { source = u; show(); render(); });
  bindSeg("altu", function (u) { altUnit = u; render(); });
  bindSeg("vu", function (u) { vUnit = u; render(); });
  bindSeg("lu", function (u) { lUnit = u; render(); });

  function render() {
    var input = { source: source, velocity: $("velocity").value, velocityUnit: vUnit, length: $("length").value, lengthUnit: lUnit };
    if (source === "isa") {
      input.altitudeM = altM();
      if ($("temp-isa").value !== "") input.tempK = $("temp-isa").value;
    } else if (source === "pressure-temp") {
      input.pressurePa = $("pressure").value;
      input.tempK = $("temp").value;
    } else if (source === "rho-mu") {
      input.rho = $("rho").value;
      input.mu = $("mu").value;
    } else {
      input.nu = $("nu").value;
    }
    var r = C.compute(input);
    var warnings = $("warnings");
    if (!r || r.error) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>" + (r && r.error ? r.error : "Enter a non-negative speed, a positive length, and a valid set of air properties.") + "</p>";
      $("out-hero").innerHTML = '<span class="num">—</span> <span class="unit"></span>';
      $("out-sub").textContent = "";
      $("stat-grid").innerHTML = "";
      return;
    }
    warnings.hidden = true;
    $("out-hero").innerHTML = '<span class="num">' + r.reynolds.toExponential(3) + '</span> <span class="unit"></span>';
    $("out-sub").textContent = "Re = " + fmt(r.reynolds, 0);
    $("stat-grid").innerHTML =
      stat("Velocity", fmt(r.velocityMps, 2) + " m/s", "") +
      stat("Length", fmt(r.lengthM, 3) + " m", "") +
      stat("Density ρ", r.densityKgM3 != null ? sci(r.densityKgM3) + " kg/m³" : "—", "") +
      stat("Dynamic viscosity μ", r.dynamicViscosity != null ? sci(r.dynamicViscosity) + " Pa·s" : "—", "") +
      stat("Kinematic viscosity ν", sci(r.kinematicViscosity) + " m²/s", "");
  }
  $("btn-ex").addEventListener("click", function () {
    $("velocity").value = "50"; $("length").value = "1"; $("altitude").value = "0";
    vUnit = "m/s"; lUnit = "m"; source = "isa"; altUnit = "m";
    ["source","altu","vu","lu"].forEach(function (g) {
      var want = g === "source" ? "isa" : g === "altu" ? "m" : g === "vu" ? "m/s" : "m";
      document.querySelectorAll('[data-unit-group="'+g+'"]').forEach(function (b) {
        var on = b.getAttribute("data-unit") === want;
        b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    });
    show(); render();
  });
  $("calc-form").addEventListener("input", render);
  $("calc-form").addEventListener("change", render);
  show(); render();
})();

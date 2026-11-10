(function () {
  "use strict";
  var C = window.MachDynamicPressureCalcs;
  if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var speedMode = "velocity", vUnit = "kt", atm = "isa", altUnit = "ft";
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
  function altM() {
    var n = Number($("altitude").value);
    if (altUnit === "ft") return n * 0.3048;
    if (altUnit === "km") return n * 1000;
    return n;
  }
  function show() {
    $("block-vel").hidden = speedMode !== "velocity";
    $("block-mach").hidden = speedMode !== "mach";
    $("block-isa").hidden = atm !== "isa";
    $("block-man").hidden = atm !== "manual";
  }
  bindSeg("speed", function (u) { speedMode = u; show(); render(); });
  bindSeg("vu", function (u) { vUnit = u; render(); });
  bindSeg("atm", function (u) { atm = u; show(); render(); });
  bindSeg("altu", function (u) { altUnit = u; render(); });

  function render() {
    var input = { speedMode: speedMode, atmosphere: atm, velocity: $("velocity").value, velocityUnit: vUnit, mach: $("mach").value };
    if (atm === "isa") {
      input.altitudeM = altM();
      if ($("temp-isa").value !== "") input.tempK = $("temp-isa").value;
    } else {
      input.tempK = $("temp").value;
      input.pressurePa = $("pressure").value;
      if ($("rho").value !== "") input.rho = $("rho").value;
    }
    var r = C.compute(input);
    var warnings = $("warnings");
    if (!r || r.error) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>" + (r && r.error ? r.error : "Enter a non-negative speed or Mach number and a valid atmosphere.") + "</p>";
      $("out-hero").innerHTML = '<span class="num">—</span> <span class="unit"></span>';
      $("out-sub").textContent = "";
      $("stat-grid").innerHTML = "";
      return;
    }
    warnings.hidden = true;
    $("hero").setAttribute("data-severity", r.isSupersonic ? "caution" : "");
    $("out-hero").innerHTML = '<span class="num">' + fmt(r.dynamicPressurePa, 1) + '</span> <span class="unit">Pa</span>';
    $("out-sub").textContent = fmt(r.dynamicPressurePsf, 2) + " psf · " + fmt(r.dynamicPressurePsi, 3) + " psi";
    $("stat-grid").innerHTML =
      stat("Mach number", fmt(r.mach, 4), r.isSupersonic ? "supersonic — pitot impact uses a shock" : "subsonic") +
      stat("True airspeed", fmt(r.velocityMps, 2) + " m/s", fmt(r.velocityMps / (1852/3600), 1) + " kt") +
      stat("Speed of sound", fmt(r.speedOfSoundMps, 2) + " m/s", fmt(r.speedOfSoundMps / (1852/3600), 1) + " kt") +
      stat("Equivalent airspeed", fmt(r.easKt, 1) + " kt", fmt(r.easMps, 2) + " m/s") +
      stat("Impact pressure qc", fmt(r.impactPressurePa, 1) + " Pa", "isentropic (subsonic formula)") +
      stat("Ambient", fmt(r.temperatureK, 2) + " K", fmt(r.pressurePa, 1) + " Pa · " + fmt(r.densityKgM3, 5) + " kg/m³");
  }
  $("btn-ex").addEventListener("click", function () {
    $("velocity").value = "100"; $("altitude").value = "0";
    speedMode = "velocity"; vUnit = "kt"; atm = "isa"; altUnit = "ft";
    show(); render();
  });
  $("calc-form").addEventListener("input", render);
  $("calc-form").addEventListener("change", render);
  show(); render();
})();

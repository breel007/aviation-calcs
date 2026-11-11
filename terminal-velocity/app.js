(function () {
  "use strict";
  var C = window.TerminalVelocityCalcs;
  if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
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
  function setSeg(group, unit) {
    document.querySelectorAll('[data-unit-group="' + group + '"]').forEach(function (b) {
      var on = b.getAttribute("data-unit") === unit;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
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
  function setHero(num, unit, sub) {
    $("out-hero").innerHTML = '<span class="num">' + num + '</span> <span class="unit">' + (unit || "") + "</span>";
    $("out-sub").textContent = sub || "";
  }
  function clearOut(msg) {
    $("warnings").hidden = !msg;
    if (msg) $("warnings").innerHTML = "<p>" + msg + "</p>";
    else $("warnings").innerHTML = "";
    setHero("—", "", "");
    $("stat-grid").innerHTML = "";
    var extra = $("extra-results");
    if (extra) extra.innerHTML = "";
  }
  var mu = "kg", au = "m2", dm = "alt", hu = "m", vu = "km/s";
  bindSeg("mu", function (u) { mu = u; render(); });
  bindSeg("au", function (u) { au = u; render(); });
  bindSeg("dm", function (u) { dm = u; show(); render(); });
  bindSeg("hu", function (u) { hu = u; render(); });
  bindSeg("vu", function (u) { vu = u; render(); });
  function show() { $("block-alt").hidden = dm !== "alt"; $("block-rho").hidden = dm !== "rho"; }
  $("btn-ex1").addEventListener("click", function () {
    $("mass").value = 80; $("cd").value = 1; $("area").value = 0.5; $("altitude").value = 0; $("entrySpeed").value = ""; dm = "alt"; hu = "m";
    document.querySelectorAll('[data-unit-group="dm"]').forEach(function (b) { var on = b.getAttribute("data-unit") === "alt"; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    show(); render();
  });
  $("btn-ex2").addEventListener("click", function () {
    $("mass").value = 80; $("cd").value = 1; $("area").value = 0.5; $("altitude").value = 0; $("entrySpeed").value = 7.8; $("gamma").value = 5; dm = "alt"; vu = "km/s";
    document.querySelectorAll('[data-unit-group="dm"]').forEach(function (b) { var on = b.getAttribute("data-unit") === "alt"; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    document.querySelectorAll('[data-unit-group="vu"]').forEach(function (b) { var on = b.getAttribute("data-unit") === "km/s"; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    show(); render();
  });
  function render() {
    var input = { mass: $("mass").value, massUnit: mu, cd: $("cd").value, area: $("area").value, areaUnit: au, entrySpeed: $("entrySpeed").value, entrySpeedUnit: vu, gamma: $("gamma").value };
    if (dm === "rho") input.density = $("density").value;
    else input.altitude = $("altitude").value, input.altUnit = hu;
    var r = C.compute(input);
    if (!r) { clearOut("Enter a positive mass, drag coefficient, and reference area. Altitude or density, if used, must be valid; a re-entry flight-path angle must be between 0 and 90 degrees, exclusive."); return; }
    var warn = r.entry && r.entry.belowSurface ? "The Allen–Eggers peak density is above sea-level density, so the formal peak would lie below the surface. The model is not applicable for this combination of β and γ." : "";
    $("warnings").hidden = !warn; $("warnings").innerHTML = warn ? "<p>" + warn + "</p>" : "";
    setHero(fmt(r.terminalMps, 1), "m/s", fmt(r.terminalKt, 1) + " kt · " + fmt(r.terminalMph, 1) + " mph");
    var html = stat("Ballistic coefficient β", fmt(r.ballisticCoefficient, 2) + " kg/m²", "m / (Cd A)") +
      stat("Density", fmt(r.density, 4) + " kg/m³", r.densitySource) +
      stat("Terminal velocity", fmt(r.terminalMps, 2) + " m/s", fmt(r.terminalFtS, 1) + " ft/s · " + fmt(r.terminalMph, 1) + " mph");
    if (r.entry) {
      html += stat("Peak deceleration", fmt(r.entry.aMaxG, 2) + " g", fmt(r.entry.aMaxMps2, 1) + " m/s² · a_max = V_E² sinγ / (2 e H)") +
        stat("Speed at peak", fmt(r.entry.speedAtPeakMps / 1000, 3) + " km/s", "V_E / √e · entry " + fmt(r.entry.entrySpeedMps / 1000, 3) + " km/s at " + fmt(r.entry.gammaDeg, 2) + "°") +
        stat("Altitude of peak", r.entry.belowSurface ? "below surface" : fmt(r.entry.altitudePeakM / 1000, 1) + " km", r.entry.belowSurface ? "ρ_peak > ρ0; model not applicable" : "exponential atmosphere, H = 7,162 m");
    }
    $("stat-grid").innerHTML = html;
  }
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

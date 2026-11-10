(function () {
  "use strict";
  var C = window.HohmannTransferCalcs;
  if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var earthR = "equatorial", r1u = "altitude-km", r2u = "geo";
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
    return n.toLocaleString("en-US", { maximumFractionDigits: d == null ? 3 : d });
  }
  function hms(sec) {
    if (!isFinite(sec)) return "—";
    var s = Math.round(sec);
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); s -= m * 60;
    if (h) return h + " h " + m + " min";
    return m + " min " + s + " s";
  }
  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value +
      "</p>" + (sub ? '<p class="stat-sub">' + sub + "</p>" : "") + "</div>";
  }
  bindSeg("er", function (u) { earthR = u; render(); });
  bindSeg("r1u", function (u) { r1u = u; render(); });
  bindSeg("r2u", function (u) { r2u = u; render(); });
  function render() {
    var r = C.compute({ earthRadius: earthR, r1: $("r1").value, r1Unit: r1u, r2: $("r2").value, r2Unit: r2u });
    var warnings = $("warnings");
    if (!r) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>Enter two positive altitudes or radii (GEO is allowed as a unit and ignores the number).</p>";
      $("out-hero").innerHTML = '<span class="num">—</span> <span class="unit"></span>';
      $("out-sub").textContent = ""; $("stat-grid").innerHTML = "";
      return;
    }
    warnings.hidden = true;
    $("out-hero").innerHTML = '<span class="num">' + fmt(r.deltaV / 1000, 3) + '</span> <span class="unit">km/s</span>';
    $("out-sub").textContent = "Δv1 " + fmt(r.deltaV1 / 1000, 3) + " + Δv2 " + fmt(r.deltaV2 / 1000, 3) + " km/s · TOF " + hms(r.timeOfFlight);
    $("stat-grid").innerHTML =
      stat("First burn Δv1", fmt(r.deltaV1, 1) + " m/s", fmt(r.deltaV1 / 1000, 3) + " km/s") +
      stat("Second burn Δv2", fmt(r.deltaV2, 1) + " m/s", fmt(r.deltaV2 / 1000, 3) + " km/s") +
      stat("Time of flight", hms(r.timeOfFlight), fmt(r.timeOfFlight / 3600, 2) + " hours") +
      stat("r1 / r2", fmt(r.r1 / 1000, 1) + " / " + fmt(r.r2 / 1000, 1) + " km", "altitudes " + fmt(r.altitude1 / 1000, 1) + " and " + fmt(r.altitude2 / 1000, 1) + " km") +
      stat("Transfer ellipse", "a = " + fmt(r.transferSemiMajorAxis / 1000, 1) + " km", "e = " + fmt(r.eccentricity, 5)) +
      stat("Speeds on the ellipse", fmt(r.velocityOnEllipseAtR1 / 1000, 3) + " / " + fmt(r.velocityOnEllipseAtR2 / 1000, 3) + " km/s", "circular " + fmt(r.circularVelocity1 / 1000, 3) + " and " + fmt(r.circularVelocity2 / 1000, 3) + " km/s");
  }
  $("btn-leo-geo").addEventListener("click", function () {
    $("r1").value = "300"; r1u = "altitude-km"; r2u = "geo";
    document.querySelectorAll('[data-unit-group="r1u"]').forEach(function (b) {
      var on = b.getAttribute("data-unit") === "altitude-km";
      b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    document.querySelectorAll('[data-unit-group="r2u"]').forEach(function (b) {
      var on = b.getAttribute("data-unit") === "geo";
      b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    render();
  });
  $("btn-leo-gto").addEventListener("click", function () {
    $("r1").value = "200"; $("r2").value = "35786"; r1u = "altitude-km"; r2u = "altitude-km";
    document.querySelectorAll('[data-unit-group="r1u"], [data-unit-group="r2u"]').forEach(function (b) {
      var on = b.getAttribute("data-unit") === "altitude-km";
      b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    render();
  });
  $("calc-form").addEventListener("input", render);
  $("calc-form").addEventListener("change", render);
  render();
})();

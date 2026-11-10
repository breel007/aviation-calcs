(function () {
  "use strict";
  var C = window.OrbitalVelocityPeriodCalcs;
  if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var earthR = "mean", omode = "circular", altUnit = "km", aps = "altitude";
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
    if (h) return h + " h " + m + " min " + s + " s";
    return m + " min " + s + " s";
  }
  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value +
      "</p>" + (sub ? '<p class="stat-sub">' + sub + "</p>" : "") + "</div>";
  }
  function altToM(value, unit) {
    var n = Number(value);
    if (unit === "m") return n;
    if (unit === "nm") return n * 1852;
    return n * 1000;
  }
  function show() {
    $("block-circ").hidden = omode !== "circular";
    $("block-ell").hidden = omode !== "elliptical";
    $("earth-r-row").style.display = $("body").value === "earth" ? "" : "none";
  }
  bindSeg("er", function (u) { earthR = u; render(); });
  bindSeg("omode", function (u) { omode = u; show(); render(); });
  bindSeg("au", function (u) { altUnit = u; render(); });
  bindSeg("aps", function (u) { aps = u; render(); });
  $("body").addEventListener("change", function () { show(); render(); });

  function render() {
    var input = { body: $("body").value, earthRadius: earthR };
    if (omode === "elliptical") {
      input.periapsisM = Number($("peri").value) * (aps === "altitude" || true ? 1000 : 1000);
      input.apoapsisM = Number($("apo").value) * 1000;
      input.apsidesAreAltitudes = aps === "altitude";
    } else {
      if ($("radius").value !== "") input.radiusM = Number($("radius").value) * 1000;
      else input.altitudeM = altToM($("altitude").value, altUnit);
    }
    var r = C.compute(input);
    var warnings = $("warnings");
    if (!r) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>Enter a non-negative altitude or a positive radius (and, for an ellipse, both apsides).</p>";
      $("out-hero").innerHTML = '<span class="num">—</span> <span class="unit"></span>';
      $("out-sub").textContent = ""; $("stat-grid").innerHTML = "";
      return;
    }
    warnings.hidden = true;
    if (r.mode === "elliptical") {
      $("out-hero").innerHTML = '<span class="num">' + fmt(r.periapsisVelocity / 1000, 3) + '</span> <span class="unit">km/s at periapsis</span>';
      $("out-sub").textContent = "apoapsis " + fmt(r.apoapsisVelocity / 1000, 3) + " km/s · period " + hms(r.period);
      $("stat-grid").innerHTML =
        stat("Period", hms(r.period), fmt(r.period / 60, 2) + " min") +
        stat("Semi-major axis", fmt(r.semiMajorAxis / 1000, 1) + " km", "e = " + fmt(r.eccentricity, 5)) +
        stat("Periapsis", fmt(r.periapsis / 1000, 1) + " km", "altitude " + fmt(r.periapsisAltitude / 1000, 1) + " km") +
        stat("Apoapsis", fmt(r.apoapsis / 1000, 1) + " km", "altitude " + fmt(r.apoapsisAltitude / 1000, 1) + " km") +
        stat("Escape at periapsis", fmt(r.escapeAtPeriapsis / 1000, 3) + " km/s", "");
    } else {
      $("out-hero").innerHTML = '<span class="num">' + fmt(r.velocity / 1000, 3) + '</span> <span class="unit">km/s</span>';
      $("out-sub").textContent = fmt(r.velocity, 1) + " m/s · period " + hms(r.period);
      $("stat-grid").innerHTML =
        stat("Period", hms(r.period), fmt(r.period / 60, 2) + " min") +
        stat("Radius", fmt(r.radius / 1000, 1) + " km", "altitude " + fmt(r.altitude / 1000, 1) + " km") +
        stat("Escape speed", fmt(r.escapeVelocity / 1000, 3) + " km/s", "") +
        (r.geoRadius != null ? stat("GEO radius", fmt(r.geoRadius / 1000, 1) + " km", "altitude " + fmt(r.geoAltitude / 1000, 1) + " km") : "") +
        stat("Body", r.body, "μ = " + r.mu.toExponential(6) + " m³/s²");
    }
  }
  $("btn-iss").addEventListener("click", function () {
    omode = "circular"; $("body").value = "earth"; $("altitude").value = "400"; $("radius").value = "";
    altUnit = "km";
    show(); render();
  });
  $("btn-geo").addEventListener("click", function () {
    omode = "circular"; $("body").value = "earth"; $("radius").value = String((C.geoRadius(C.MU_EARTH) / 1000).toFixed(1));
    $("altitude").value = "";
    show(); render();
  });
  $("calc-form").addEventListener("input", render);
  $("calc-form").addEventListener("change", render);
  show(); render();
})();

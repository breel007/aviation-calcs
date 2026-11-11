(function () {
  "use strict";
  var C = window.TakeoffLandingDistanceCalcs;
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
  var kind = "takeoff", du = "ft";
  bindSeg("kind", function (u) { kind = u; render(); });
  bindSeg("du", function (u) { du = u; render(); });
  function render() {
    var r = C.compute({ kind: kind, distance: $("distance").value, distanceUnit: du, weight: $("weight").value, weightRef: $("weightRef").value, speed: $("speed").value, headwind: $("headwind").value, densityAltitude: $("da").value, densityAltitudeRef: $("daRef").value, slope: $("slope").value, surface: $("surface").value });
    if (!r) { clearOut("Enter a positive baseline distance. If you use weight or wind, both sides of that pair have to be valid."); return; }
    if (r.error) { clearOut(r.message); return; }
    $("warnings").hidden = true; $("warnings").innerHTML = "";
    setHero(fmt(r.correctedFt, 0), "ft", fmt(r.correctedM, 0) + " m · " + (r.deltaPct >= 0 ? "+" : "") + fmt(r.deltaPct, 0) + "% from baseline " + fmt(r.baselineFt, 0) + " ft");
    var bits =
      stat("Wind factor", fmt(r.fWind, 3), r.windNote) +
      stat("Weight factor", fmt(r.fWeight, 3), r.weightNote) +
      stat("Slope factor", fmt(r.fSlope, 3), fmt(r.slopePercent, 1) + "% " + (kind === "landing" ? "(landing shortens uphill)" : "(takeoff lengthens uphill)")) +
      stat("Surface factor", fmt(r.fSurface, 2), r.surfaceLabel);
    if (r.densityAltitudeFt != null) {
      bits += stat("Density 1/σ", fmt(r.fDaSigma, 3), "σ = " + fmt(r.sigma, 3) + " at " + fmt(r.densityAltitudeFt, 0) + " ft DA") +
        stat("10% / 1,000 ft rule", fmt(r.correctedThumbFt, 0) + " ft", "factor " + fmt(r.fDaThumb, 3) + " · usually more conservative");
    }
    $("stat-grid").innerHTML = bits;
  }
  $("btn-wind").addEventListener("click", function () {
    kind = "takeoff"; du = "ft"; $("distance").value = "1000"; $("weight").value = ""; $("weightRef").value = "";
    $("speed").value = "60"; $("headwind").value = "6"; $("da").value = ""; $("daRef").value = "0"; $("slope").value = "0"; $("surface").value = "paved-dry";
    setSeg("kind", kind); setSeg("du", du); render();
  });
  $("btn-da").addEventListener("click", function () {
    kind = "takeoff"; du = "ft"; $("distance").value = "1500"; $("weight").value = ""; $("weightRef").value = "";
    $("speed").value = "60"; $("headwind").value = "0"; $("da").value = "3000"; $("daRef").value = "0"; $("slope").value = "0"; $("surface").value = "grass-dry";
    setSeg("kind", kind); setSeg("du", du); render();
  });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

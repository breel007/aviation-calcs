(function () {
  "use strict";
  var C = window.CloudBaseCalcs;
  if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var lastTemp = "C";
  var lastDew = "C";
  var elevUnit = "ft";
  var syncing = false;

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
  bindSeg("elev", function (u) {
    var v = Number($("elev").value);
    if (isFinite(v)) {
      $("elev").value = u === "m" ? (v / 3.280839895).toFixed(1) : (v * 3.280839895).toFixed(0);
    }
    elevUnit = u;
    render();
  });

  $("temp-c").addEventListener("input", function () {
    lastTemp = "C";
    var v = Number($("temp-c").value);
    if (isFinite(v) && !syncing) { syncing = true; $("temp-f").value = C.cToF(v).toFixed(1); syncing = false; }
    render();
  });
  $("temp-f").addEventListener("input", function () {
    lastTemp = "F";
    var v = Number($("temp-f").value);
    if (isFinite(v) && !syncing) { syncing = true; $("temp-c").value = C.fToC(v).toFixed(1); syncing = false; }
    render();
  });
  $("td-c").addEventListener("input", function () {
    lastDew = "C";
    var v = Number($("td-c").value);
    if (isFinite(v) && !syncing) { syncing = true; $("td-f").value = C.cToF(v).toFixed(1); syncing = false; }
    render();
  });
  $("td-f").addEventListener("input", function () {
    lastDew = "F";
    var v = Number($("td-f").value);
    if (isFinite(v) && !syncing) { syncing = true; $("td-c").value = C.fToC(v).toFixed(1); syncing = false; }
    render();
  });
  $("lapse").addEventListener("change", function () {
    $("lapse-custom").hidden = $("lapse").value !== "custom";
    render();
  });

  function fmt(n, d) {
    if (!isFinite(n)) return "—";
    return n.toLocaleString("en-US", { maximumFractionDigits: d == null ? 0 : d });
  }
  function ft(n) { return fmt(n, 0) + " ft"; }
  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value +
      "</p>" + (sub ? '<p class="stat-sub">' + sub + "</p>" : "") + "</div>";
  }

  function render() {
    var unit = (lastTemp === "F" || lastDew === "F") && lastTemp === lastDew ? "F" : "C";
    // If the user last edited mixed units, prefer C (the two boxes stay in sync anyway).
    if (lastTemp !== lastDew) unit = lastTemp;
    var lapse = $("lapse").value === "custom" ? $("lapse-custom").value : $("lapse").value;
    var r = C.compute({
      temp: unit === "F" ? $("temp-f").value : $("temp-c").value,
      dewpoint: unit === "F" ? $("td-f").value : $("td-c").value,
      unit: unit,
      elevation: $("elev").value,
      elevationUnit: elevUnit,
      lapse: lapse
    });
    var warnings = $("warnings");
    if (!r) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>Enter a temperature and a dewpoint.</p>";
      $("out-agl").innerHTML = '<span class="num">—</span> <span class="unit">ft AGL</span>';
      $("stat-grid").innerHTML = "";
      return;
    }
    if (r.error) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>Dewpoint cannot be above the temperature. Check the two readings (a typo, or a wet-bulb/dry-bulb mix-up, is the usual cause).</p>";
      $("out-agl").innerHTML = '<span class="num">—</span> <span class="unit">ft AGL</span>';
      $("out-msl").textContent = "";
      $("stat-grid").innerHTML = "";
      return;
    }
    warnings.hidden = true;
    $("hero-tag").textContent = unit === "F" ? "spread / 4.4 × 1,000 ft" : "spread / 2.5 × 1,000 ft";
    $("out-agl").innerHTML = '<span class="num">' + fmt(r.cloudBaseAglFt, 0) + '</span> <span class="unit">ft AGL</span>';
    $("out-msl").textContent = ft(r.cloudBaseMslFt) + " MSL · spread " + r.spreadC.toFixed(1) + " °C (" + r.spreadF.toFixed(1) + " °F)";
    var html = "";
    html += stat("Relative humidity", r.rh != null ? r.rh.toFixed(0) + "%" : "—", "Bolton / Magnus from T and Td");
    html += stat("Freezing level", r.freezingLevelAglFt != null ? ft(r.freezingLevelAglFt) + " AGL" : "—",
      r.freezingLevelMslFt != null ? ft(r.freezingLevelMslFt) + " MSL at " + r.lapseCPerThousand + " °C/1,000 ft" : "");
    html += stat("2.5 °C convention", ft(r.cloudBaseAglFtC) + " AGL", "× 400 ft/°C rule: " + ft(r.cloudBaseAglThumb));
    html += stat("4.4 °F convention", ft(r.cloudBaseAglFtF) + " AGL", "the two conventions differ slightly");
    $("stat-grid").innerHTML = html;
    if (r.baseAtOrBelowFreezing && r.cloudBaseAglFt > 0) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>The estimated cloud base is at or above the freezing-level estimate, so the base would be in sub-freezing air. Treat that as a flag to look at a sounding or icing forecast — not as a forecast itself.</p>";
    }
  }

  $("btn-example").addEventListener("click", function () {
    syncing = true;
    $("temp-c").value = "20";
    $("temp-f").value = C.cToF(20).toFixed(1);
    $("td-c").value = "12";
    $("td-f").value = C.cToF(12).toFixed(1);
    syncing = false;
    lastTemp = "C"; lastDew = "C";
    render();
  });
  $("elev").addEventListener("input", render);
  $("lapse-custom").addEventListener("input", render);
  render();
})();

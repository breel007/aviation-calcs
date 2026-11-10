(function () {
  "use strict";
  var C = window.ClimbGradientCalcs;
  if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var mode = "ftnm";
  var gsUnit = "kt";
  var labels = { ftnm: "Climb gradient (ft/NM)", fpm: "Climb rate (fpm)", percent: "Gradient (percent)", degrees: "Gradient (degrees)" };

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
  bindSeg("mode", function (u) {
    mode = u;
    $("value-label").textContent = labels[u];
    render();
  });
  bindSeg("gsu", function (u) {
    var v = Number($("gs").value);
    if (isFinite(v) && v > 0) {
      $("gs").value = u === "mph" ? (v * 1.150779448).toFixed(1) : (v / 1.150779448).toFixed(1);
    }
    gsUnit = u;
    render();
  });

  function fmt(n, d) {
    if (!isFinite(n)) return "—";
    return n.toLocaleString("en-US", { maximumFractionDigits: d == null ? 1 : d });
  }
  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value +
      "</p>" + (sub ? '<p class="stat-sub">' + sub + "</p>" : "") + "</div>";
  }

  function render() {
    var gs = Number($("gs").value);
    if (gsUnit === "mph" && isFinite(gs)) gs = gs / 1.150779448;
    var r = C.compute({
      mode: mode,
      value: $("value").value,
      groundspeed: gs,
      requiredFtNm: $("required").value
    });
    var warnings = $("warnings");
    if (!r) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>Enter a non-negative gradient. Feet per minute also needs a groundspeed greater than zero.</p>";
      $("out-fpm").innerHTML = '<span class="num">—</span> <span class="unit">fpm</span>';
      $("stat-grid").innerHTML = "";
      return;
    }
    warnings.hidden = true;
    var hero = r.requiredFpm != null ? r.requiredFpm : r.fpm;
    $("out-fpm").innerHTML = '<span class="num">' + fmt(hero, 0) + '</span> <span class="unit">fpm</span>';
    if (r.requiredFpm != null) {
      $("hero-tag").textContent = "to meet " + fmt(r.requiredFtNm, 0) + " ft/NM";
      $("out-sub").textContent = r.meetsRequired
        ? "Your entered climb (" + fmt(r.fpm, 0) + " fpm, " + fmt(r.ftPerNm, 1) + " ft/NM) meets the requirement, with " + fmt(r.marginFpm, 0) + " fpm to spare."
        : "Short of the requirement by " + fmt(-r.marginFpm, 0) + " fpm (" + fmt(-r.marginFtNm, 1) + " ft/NM).";
      $("hero").setAttribute("data-severity", r.meetsRequired ? "" : "high");
    } else {
      $("hero-tag").textContent = "your climb rate";
      $("out-sub").textContent = "Add a groundspeed to see feet per minute and to check a required gradient.";
      $("hero").removeAttribute("data-severity");
    }
    $("stat-grid").innerHTML =
      stat("ft/NM", fmt(r.ftPerNm, 1), "feet of climb per nautical mile") +
      stat("Percent", fmt(r.percent, 2) + "%", fmt(r.requiredPercent, 2) + "% required") +
      stat("Angle", fmt(r.degrees, 2) + "°", fmt(r.requiredDegrees, 2) + "° required") +
      stat("Your climb rate", r.fpm != null ? fmt(r.fpm, 0) + " fpm" : "—", r.groundspeed != null ? "at " + fmt(r.groundspeed, 0) + " kt GS" : "needs groundspeed");
  }

  $("btn-example").addEventListener("click", function () {
    $("gs").value = gsUnit === "mph" ? "104" : "90";
    $("value").value = "200";
    $("required").value = "200";
    mode = "ftnm";
    document.querySelectorAll('[data-unit-group="mode"]').forEach(function (b) {
      var on = b.getAttribute("data-unit") === "ftnm";
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    $("value-label").textContent = labels.ftnm;
    render();
  });
  $("btn-sid").addEventListener("click", function () {
    $("gs").value = gsUnit === "mph" ? "161" : "140";
    $("value").value = "400";
    $("required").value = "400";
    mode = "ftnm";
    document.querySelectorAll('[data-unit-group="mode"]').forEach(function (b) {
      var on = b.getAttribute("data-unit") === "ftnm";
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    $("value-label").textContent = labels.ftnm;
    render();
  });
  $("calc-form").addEventListener("input", render);
  $("calc-form").addEventListener("change", render);
  render();
})();

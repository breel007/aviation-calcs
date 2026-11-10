/**
 * UI for the time–speed–distance calculator.
 * Math lives in calc.js (TimeSpeedDistance).
 */
(function () {
  "use strict";

  var TSD = window.TimeSpeedDistance;
  if (!TSD) return;

  var elHours = document.getElementById("hours");
  var elMinutes = document.getElementById("minutes");
  var elSpeed = document.getElementById("speed");
  var elDist = document.getElementById("distance");
  var elDepart = document.getElementById("depart");
  var timeBlock = document.getElementById("time-block");
  var warnings = document.getElementById("warnings");
  var heroLabel = document.getElementById("hero-label");
  var heroValue = document.getElementById("hero-value");
  var heroSub = document.getElementById("hero-sub");
  var statGrid = document.getElementById("stat-grid");

  var solveFor = "time";
  var spdUnit = "kt";
  var distUnit = "nm";

  function parseNumber(input) {
    if (!input) return NaN;
    var raw = String(input.value).trim().replace(",", ".");
    if (raw === "") return NaN;
    return Number(raw);
  }
  function setSeg(group, value) {
    document.querySelectorAll('[data-unit-group="' + group + '"]').forEach(function (btn) {
      var active = btn.getAttribute("data-unit") === value;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }
  function showWarnings(notes) {
    if (!notes || !notes.length) { warnings.hidden = true; warnings.innerHTML = ""; return; }
    warnings.hidden = false;
    warnings.innerHTML = notes.map(function (n) { return "<p>" + n + "</p>"; }).join("");
  }
  function fmt(n, d) {
    if (!isFinite(n)) return "—";
    var s = n.toFixed(d == null ? 1 : d);
    return s.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  }
  function spdLabel() { return spdUnit === "mph" ? "mph" : spdUnit === "kmh" ? "km/h" : "kt"; }
  function distLabel() { return distUnit === "sm" ? "sm" : distUnit === "km" ? "km" : "nm"; }

  function fmtDuration(parts) {
    if (!parts || !isFinite(parts.hours)) return "—";
    var h = parts.hours, m = parts.minutes, s = parts.seconds;
    if (h === 0) return m + " min" + (s ? " " + s + " s" : "");
    return h + " h " + String(m).padStart(2, "0") + " min";
  }

  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value + '</p>' +
      (sub ? '<p class="stat-sub">' + sub + '</p>' : '') + '</div>';
  }

  function setSolvedState() {
    elHours.readOnly = solveFor === "time";
    elMinutes.readOnly = solveFor === "time";
    elSpeed.readOnly = solveFor === "speed";
    elDist.readOnly = solveFor === "distance";
    timeBlock.classList.toggle("is-solved", solveFor === "time");
  }

  function render() {
    setSolvedState();
    var input = { solveFor: solveFor };
    if (solveFor !== "time") {
      input.time = { hours: parseNumber(elHours), minutes: parseNumber(elMinutes) };
    }
    if (solveFor !== "speed") input.speedKt = TSD.speedToKt(parseNumber(elSpeed), spdUnit);
    if (solveFor !== "distance") input.distanceNm = TSD.distanceToNm(parseNumber(elDist), distUnit);
    if (elDepart.value) input.departure = elDepart.value;

    var result = TSD.compute(input);
    if (result.error) {
      showWarnings([result.error]);
      heroValue.innerHTML = '<span class="num">—</span>';
      heroSub.textContent = "";
      statGrid.innerHTML = "";
      return;
    }
    showWarnings([]);

    // Reflect the solved value back into the corresponding field
    if (solveFor === "time") {
      elHours.value = String(result.duration.hours);
      elMinutes.value = String(result.duration.minutes);
    } else if (solveFor === "speed") {
      elSpeed.value = fmt(TSD.ktToSpeed(result.speedKt, spdUnit), 1);
    } else if (solveFor === "distance") {
      elDist.value = fmt(TSD.nmToDistance(result.distanceNm, distUnit), 1);
    }

    var etaText = "";
    if (result.eta && !result.eta.error) {
      etaText = "ETA " + result.eta.arrival + (result.eta.plusDays ? "  (+" + result.eta.plusDays + " day" + (result.eta.plusDays > 1 ? "s" : "") + ")" : "");
    }

    if (solveFor === "time") {
      heroLabel.textContent = "Enroute time";
      heroValue.innerHTML = '<span class="num">' + fmtDuration(result.duration) + "</span>";
      heroSub.textContent = etaText || (fmt(result.duration.totalMinutes, 1) + " minutes");
    } else if (solveFor === "speed") {
      heroLabel.textContent = "Speed";
      heroValue.innerHTML = '<span class="num">' + fmt(TSD.ktToSpeed(result.speedKt, spdUnit), 1) + '</span> <span class="unit">' + spdLabel() + "</span>";
      heroSub.textContent = etaText;
    } else {
      heroLabel.textContent = "Distance";
      heroValue.innerHTML = '<span class="num">' + fmt(TSD.nmToDistance(result.distanceNm, distUnit), 1) + '</span> <span class="unit">' + distLabel() + "</span>";
      heroSub.textContent = etaText;
    }

    statGrid.innerHTML =
      stat("Time (ETE)", fmtDuration(result.duration), fmt(result.timeHours, 3) + " hours") +
      stat("Speed", fmt(TSD.ktToSpeed(result.speedKt, spdUnit), 1) + " " + spdLabel(), fmt(result.speedKt, 1) + " kt") +
      stat("Distance", fmt(TSD.nmToDistance(result.distanceNm, distUnit), 1) + " " + distLabel(), fmt(result.distanceNm, 1) + " nm") +
      (result.eta && !result.eta.error ? stat("ETA", result.eta.arrival, result.eta.plusDays ? "+" + result.eta.plusDays + " day" + (result.eta.plusDays > 1 ? "s" : "") + " after departure " + result.eta.departure : "after departure " + result.eta.departure) : "");
  }

  document.querySelectorAll("[data-unit-group]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var group = btn.getAttribute("data-unit-group");
      var value = btn.getAttribute("data-unit");
      if (group === "solve") solveFor = value;
      if (group === "spd") spdUnit = value;
      if (group === "dist") distUnit = value;
      setSeg(group, value);
      render();
    });
  });

  ["hours", "minutes", "speed", "distance", "depart"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", render);
  });

  document.getElementById("btn-example").addEventListener("click", function () {
    solveFor = "time"; spdUnit = "kt"; distUnit = "nm";
    setSeg("solve", "time"); setSeg("spd", "kt"); setSeg("dist", "nm");
    elSpeed.value = "120"; elDist.value = "180"; elDepart.value = "09:00";
    elHours.value = ""; elMinutes.value = "";
    render();
  });
  document.getElementById("btn-reset").addEventListener("click", function (e) {
    e.preventDefault();
    document.getElementById("btn-example").click();
  });

  render();
})();

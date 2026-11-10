/**
 * UI for the E6B wind-triangle calculator.
 * Math lives in calc.js (E6BWind).
 */
(function () {
  "use strict";

  var E6B = window.E6BWind;
  if (!E6B) return;

  var elCourse = document.getElementById("course");
  var elTas = document.getElementById("tas");
  var elDir = document.getElementById("wind-dir");
  var elSpd = document.getElementById("wind-spd");
  var elHdg = document.getElementById("heading");
  var elGsIn = document.getElementById("gs-in");
  var fwd = document.getElementById("fwd-fields");
  var rev = document.getElementById("rev-fields");
  var warnings = document.getElementById("warnings");
  var hero = document.getElementById("hero");
  var heroLabel = document.getElementById("hero-label");
  var heroValue = document.getElementById("hero-value");
  var heroSub = document.getElementById("hero-sub");
  var statGrid = document.getElementById("stat-grid");

  var mode = "heading";
  var spdUnit = "kt";

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
    if (!notes || !notes.length) {
      warnings.hidden = true;
      warnings.innerHTML = "";
      return;
    }
    warnings.hidden = false;
    warnings.innerHTML = notes.map(function (n) { return "<p>" + n + "</p>"; }).join("");
  }

  function toKt(v) {
    return spdUnit === "mph" ? v / E6B.KT_TO_MPH : v;
  }
  function fromKt(v) {
    return spdUnit === "mph" ? v * E6B.KT_TO_MPH : v;
  }
  function unit() { return spdUnit === "mph" ? "mph" : "kt"; }

  function fmt(n, d) {
    if (!isFinite(n)) return "—";
    var x = Math.abs(n) < Math.pow(10, -(d == null ? 1 : d) - 1) ? 0 : n;
    var s = x.toFixed(d == null ? 1 : d);
    return s.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  }

  function fmtHdg(deg) {
    if (!isFinite(deg)) return "—";
    var r = Math.round(deg);
    if (r === 0) r = 360;
    if (r === 360) return "360°";
    return String(r).padStart(3, "0") + "°";
  }

  function wcaText(wca) {
    if (!isFinite(wca)) return "—";
    if (Math.abs(wca) < 0.05) return "0° (no correction)";
    return fmt(Math.abs(wca), 1) + "° " + (wca > 0 ? "right" : "left");
  }

  function hwText(hw) {
    if (!isFinite(hw)) return "—";
    if (Math.abs(hw) < 0.05) return "0 " + unit();
    return fmt(fromKt(Math.abs(hw)), 1) + " " + unit() + (hw >= 0 ? " headwind" : " tailwind");
  }

  function xwText(xw) {
    if (!isFinite(xw)) return "—";
    if (Math.abs(xw) < 0.05) return "0 " + unit();
    return fmt(fromKt(Math.abs(xw)), 1) + " " + unit() + (xw >= 0 ? " from the right" : " from the left");
  }

  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value + '</p>' +
      (sub ? '<p class="stat-sub">' + sub + '</p>' : '') + '</div>';
  }

  function render() {
    var tas = toKt(parseNumber(elTas));
    var tc = parseNumber(elCourse);
    var result, notes = [];

    if (mode === "wind") {
      result = E6B.compute({
        mode: "wind",
        trueHeading: parseNumber(elHdg),
        tas: tas,
        trueCourse: tc,
        groundspeed: toKt(parseNumber(elGsIn))
      });
    } else {
      result = E6B.compute({
        mode: "heading",
        trueCourse: tc,
        tas: tas,
        windFrom: parseNumber(elDir),
        windSpeed: toKt(parseNumber(elSpd))
      });
    }

    if (result.error) {
      showWarnings([result.error]);
      if (result.impossible || !isFinite(result.groundspeed)) {
        heroValue.innerHTML = '<span class="num">—</span>';
        heroSub.textContent = "";
        statGrid.innerHTML = "";
        return;
      }
    } else {
      showWarnings([]);
    }

    if (mode === "wind") {
      heroLabel.textContent = "Wind";
      heroValue.innerHTML = '<span class="num">' + fmtHdg(result.windFrom).replace("°", "") + "°</span> <span class=\"unit\">at " + fmt(fromKt(result.windSpeed), 1) + " " + unit() + "</span>";
      heroSub.textContent = result.calm ? "Calm." : "Direction the wind is coming from.";
      statGrid.innerHTML =
        stat("Wind correction angle", wcaText(result.wca), "Heading relative to course") +
        stat("Crosswind", xwText(result.crosswind), "") +
        stat("Headwind / tailwind", hwText(result.headwind), "") +
        stat("Groundspeed (entered)", fmt(fromKt(result.groundspeed), 1) + " " + unit(), "TAS " + fmt(fromKt(result.tas), 1) + " " + unit());
    } else {
      heroLabel.textContent = "Groundspeed";
      heroValue.innerHTML = '<span class="num">' + fmt(fromKt(result.groundspeed), 1) + '</span> <span class="unit">' + unit() + "</span>";
      heroSub.textContent = "True heading " + fmtHdg(result.trueHeading) + "  ·  WCA " + wcaText(result.wca);
      statGrid.innerHTML =
        stat("True heading", fmtHdg(result.trueHeading), "Course " + fmtHdg(result.trueCourse) + " + WCA") +
        stat("Wind correction angle", wcaText(result.wca), "") +
        stat("Crosswind", xwText(result.crosswind), "Relative to the course") +
        stat("Headwind / tailwind", hwText(result.headwind), "");
    }
  }

  function onMode(next) {
    mode = next;
    setSeg("mode", mode);
    fwd.hidden = mode !== "heading";
    rev.hidden = mode !== "wind";
    render();
  }

  document.querySelectorAll("[data-unit-group]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var group = btn.getAttribute("data-unit-group");
      var value = btn.getAttribute("data-unit");
      if (group === "mode") onMode(value);
      if (group === "spd") {
        var tasNow = parseNumber(elTas);
        var spdNow = parseNumber(elSpd);
        var gsNow = parseNumber(elGsIn);
        var from = spdUnit;
        spdUnit = value;
        setSeg("spd", spdUnit);
        function conv(v) {
          if (!isFinite(v)) return v;
          var kt = from === "mph" ? v / E6B.KT_TO_MPH : v;
          return spdUnit === "mph" ? kt * E6B.KT_TO_MPH : kt;
        }
        if (isFinite(tasNow)) elTas.value = String(Math.round(conv(tasNow) * 10) / 10);
        if (isFinite(spdNow)) elSpd.value = String(Math.round(conv(spdNow) * 10) / 10);
        if (isFinite(gsNow)) elGsIn.value = String(Math.round(conv(gsNow) * 10) / 10);
        render();
      }
    });
  });

  ["course", "tas", "wind-dir", "wind-spd", "heading", "gs-in"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", render);
  });

  document.getElementById("btn-example").addEventListener("click", function () {
    onMode("heading");
    spdUnit = "kt";
    setSeg("spd", "kt");
    elCourse.value = "90";
    elTas.value = "120";
    elDir.value = "225";
    elSpd.value = "20";
    render();
  });

  document.getElementById("btn-reset").addEventListener("click", function (e) {
    e.preventDefault();
    onMode("heading");
    spdUnit = "kt";
    setSeg("spd", "kt");
    elCourse.value = "90";
    elTas.value = "120";
    elDir.value = "225";
    elSpd.value = "20";
    elHdg.value = "97";
    elGsIn.value = "133";
    render();
  });

  render();
})();

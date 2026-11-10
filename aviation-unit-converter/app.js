/**
 * UI for the aviation unit converter.
 * Math lives in calc.js (AviationUnits).
 */
(function () {
  "use strict";

  var U = window.AviationUnits;
  if (!U) return;

  var syncing = false;

  function parseNumber(input) {
    var raw = String(input.value).trim().replace(",", ".");
    if (raw === "") return NaN;
    return Number(raw);
  }

  function precisionFor(category, unit, value) {
    if (!isFinite(value)) return 1;
    var abs = Math.abs(value);
    if (category === "temperature") return 2;
    if (category === "pressure" && (unit === "inhg" || unit === "psi")) return 4;
    if (category === "pressure") return 2;
    if (unit === "m" && category === "distance" && abs > 100) return 1;
    if (unit === "ft" && category === "distance") return 1;
    if (abs >= 1000) return 1;
    if (abs >= 100) return 2;
    if (abs >= 10) return 3;
    return 4;
  }

  function format(category, unit, value) {
    if (!isFinite(value)) return "";
    var d = precisionFor(category, unit, value);
    var n = Number(value.toFixed(d));
    // strip trailing zeros but keep a meaningful decimal
    var s = String(n);
    return s;
  }

  function fillGroup(group, source) {
    var category = group.getAttribute("data-category");
    var fromInput = source || group.querySelector(".input");
    var fromUnit = fromInput.getAttribute("data-unit");
    var value = parseNumber(fromInput);
    if (!isFinite(value)) {
      group.querySelectorAll(".input").forEach(function (el) {
        if (el !== fromInput) el.value = "";
      });
      return;
    }
    var all = U.convertAll(category, value, fromUnit);
    if (!all) return;
    group.querySelectorAll(".input").forEach(function (el) {
      if (el === fromInput) return;
      var u = el.getAttribute("data-unit");
      el.value = format(category, u, all[u]);
    });
  }

  document.querySelectorAll(".unit-grid").forEach(function (group) {
    group.querySelectorAll(".input").forEach(function (input) {
      input.addEventListener("input", function () {
        if (syncing) return;
        syncing = true;
        fillGroup(group, input);
        syncing = false;
      });
    });
    // Initial fill from the first field that has a default value
    var starter = null;
    group.querySelectorAll(".input").forEach(function (el) {
      if (starter == null && String(el.value).trim() !== "") starter = el;
    });
    if (starter) fillGroup(group, starter);
  });

  document.getElementById("btn-example").addEventListener("click", function () {
    var defaults = {
      "spd-kt": 100, "dis-nm": 1, "alt-ft": 5000, "p-inhg": 29.92,
      "m-lb": 1, "v-gal": 1, "t-c": 15, "vs-fpm": 500
    };
    Object.keys(defaults).forEach(function (id) {
      var el = document.getElementById(id);
      el.value = String(defaults[id]);
      var group = el.closest(".unit-grid");
      fillGroup(group, el);
    });
  });
})();

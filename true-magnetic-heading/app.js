(function () {
  "use strict";
  var C = window.TrueMagneticHeadingCalcs;
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
  var from = "true", varDir = "E", devDir = "E";
  bindSeg("from", function (u) { from = u; render(); });
  bindSeg("var", function (u) { varDir = u; render(); });
  bindSeg("dev", function (u) { devDir = u; render(); });
  function hdg(d) {
    var x = ((d % 360) + 360) % 360;
    if (Math.abs(x) < 1e-9 || Math.abs(x - 360) < 1e-9) return "000";
    if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x)).padStart(3, "0");
    return x.toFixed(1).padStart(5, "0");
  }
  $("btn-ex1").addEventListener("click", function () {
    $("heading").value = 360; $("variation").value = 15; $("deviation").value = ""; from = "true"; varDir = "E";
    document.querySelectorAll('[data-unit-group="from"]').forEach(function (b) { b.classList.toggle("is-active", b.getAttribute("data-unit") === "true"); b.setAttribute("aria-pressed", b.getAttribute("data-unit") === "true" ? "true" : "false"); });
    document.querySelectorAll('[data-unit-group="var"]').forEach(function (b) { b.classList.toggle("is-active", b.getAttribute("data-unit") === "E"); b.setAttribute("aria-pressed", b.getAttribute("data-unit") === "E" ? "true" : "false"); });
    render();
  });
  $("btn-ex2").addEventListener("click", function () {
    $("heading").value = 90; $("variation").value = 10; $("deviation").value = ""; from = "true"; varDir = "W";
    document.querySelectorAll('[data-unit-group="from"]').forEach(function (b) { b.classList.toggle("is-active", b.getAttribute("data-unit") === "true"); b.setAttribute("aria-pressed", b.getAttribute("data-unit") === "true" ? "true" : "false"); });
    document.querySelectorAll('[data-unit-group="var"]').forEach(function (b) { b.classList.toggle("is-active", b.getAttribute("data-unit") === "W"); b.setAttribute("aria-pressed", b.getAttribute("data-unit") === "W" ? "true" : "false"); });
    render();
  });
  function render() {
    var r = C.compute({ from: from, heading: $("heading").value, variation: $("variation").value, variationDir: varDir, deviation: $("deviation").value, deviationDir: devDir });
    if (!r) { clearOut("Enter a heading or course between 0 and 360 degrees, and a variation (and optional deviation) as a positive number with a direction."); return; }
    $("warnings").hidden = true; $("warnings").innerHTML = "";
    setHero(hdg(r.magneticHeading) + "°", "magnetic", "from " + from + " " + hdg((from === "true" ? r.trueHeading : from === "magnetic" ? r.magneticHeading : r.compassHeading)) + "°");
    var html = stat("True", hdg(r.trueHeading) + "°", r.variationEast >= 0 ? fmt(r.variationEast, 1) + "°E variation" : fmt(-r.variationEast, 1) + "°W variation") +
      stat("Magnetic", hdg(r.magneticHeading) + "°", "east is least, west is best") +
      stat("Compass", hdg(r.compassHeading) + "°", r.hasDeviation ? (r.deviationEast >= 0 ? fmt(r.deviationEast, 1) + "°E deviation" : fmt(-r.deviationEast, 1) + "°W deviation") : "no deviation entered");
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

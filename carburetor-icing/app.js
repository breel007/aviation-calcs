(function () {
  "use strict";
  var C = window.CarburetorIcingCalcs;
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
  var tu = "C", mode = "dewpoint";
  bindSeg("tu", function (u) { tu = u; render(); });
  bindSeg("mode", function (u) { mode = u; show(); render(); });
  function show() { $("block-td").hidden = mode !== "dewpoint"; $("block-rh").hidden = mode !== "rh"; }
  function tlab(c, f) { return tu === "F" ? fmt(f, 1) + " °F" : fmt(c, 1) + " °C"; }
  $("btn-ex1").addEventListener("click", function () {
    tu = "C"; mode = "dewpoint"; $("temperature").value = 18; $("dewpoint").value = 15;
    document.querySelectorAll('[data-unit-group="tu"]').forEach(function (b) { var on = b.getAttribute("data-unit") === "C"; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    document.querySelectorAll('[data-unit-group="mode"]').forEach(function (b) { var on = b.getAttribute("data-unit") === "dewpoint"; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    show(); render();
  });
  $("btn-ex2").addEventListener("click", function () {
    tu = "F"; mode = "rh"; $("temperature").value = 80; $("rh").value = 60;
    document.querySelectorAll('[data-unit-group="tu"]').forEach(function (b) { var on = b.getAttribute("data-unit") === "F"; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    document.querySelectorAll('[data-unit-group="mode"]').forEach(function (b) { var on = b.getAttribute("data-unit") === "rh"; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    show(); render();
  });
  function render() {
    var r = C.compute({ temperature: $("temperature").value, dewpoint: $("dewpoint").value, rh: $("rh").value, tempUnit: tu, mode: mode });
    if (!r) { clearOut("Enter a temperature and either a dewpoint at or below that temperature, or a relative humidity between 0 and 100 percent."); return; }
    var warn = r.phakZone === "outside" ? "Outside the PHAK Figure 7-12 shaded zones does not rule out carburetor icing. The figure’s caption states that icing is possible under conditions not depicted." : "The PHAK chart is a training aid. Apply carburetor heat or alternate air according to the POH whenever icing is suspected, including outside the shaded zones.";
    $("warnings").hidden = false; $("warnings").innerHTML = "<p>" + warn + "</p>";
    var tag = $("hero-tag"); if (tag) tag.textContent = r.phakZone === "high" ? "high potential" : r.phakZone === "possible" ? "possible" : "outside chart zones";
    setHero(r.phakZone === "high" ? "High potential" : r.phakZone === "possible" ? "Icing possible" : "Outside shaded zones", "", r.zoneLabel);
    $("stat-grid").innerHTML =
      stat("Relative humidity", fmt(r.relativeHumidity, 1) + "%", "Magnus / Bolton, same as the cloud-base calculator") +
      stat("Dewpoint", tlab(r.dewpointC, r.dewpointF), "spread " + (tu === "F" ? fmt(r.spreadF, 1) + " °F" : fmt(r.spreadC, 1) + " °C")) +
      stat("Frost point", tlab(r.frostPointC, r.frostPointF), r.dewpointC < 0 ? "slightly warmer than dewpoint below 0 °C" : "equals dewpoint at or above 0 °C when both are on the ice/water meeting point") +
      stat("AC 20-113 screen", r.ac20_113Spread ? "spread ≤ 20 °F" : "spread > 20 °F", "a spread of 20 °F or less is roughly RH of 50% or more");
  }
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

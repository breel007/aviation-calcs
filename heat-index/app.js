(function () {
  "use strict";
  var C = window.HeatIndexCalcs;
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
  var tu = "F";
  bindSeg("tu", function (u) { tu = u; render(); });
  $("btn-ex1").addEventListener("click", function () {
    tu = "F"; $("temperature").value = 90; $("rh").value = 60;
    document.querySelectorAll('[data-unit-group="tu"]').forEach(function (b) { var on = b.getAttribute("data-unit") === "F"; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    render();
  });
  $("btn-ex2").addEventListener("click", function () {
    tu = "F"; $("temperature").value = 80; $("rh").value = 40;
    document.querySelectorAll('[data-unit-group="tu"]').forEach(function (b) { var on = b.getAttribute("data-unit") === "F"; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    render();
  });
  function render() {
    var r = C.compute({ temperature: $("temperature").value, rh: $("rh").value, tempUnit: tu });
    if (!r) { clearOut("Enter an air temperature (about −20 to 140 °F) and a relative humidity between 0 and 100 percent."); return; }
    var warn = "The NWS heat index is for shade and a light wind, not direct sun, a cockpit, or a heat-stress clothing model.";
    $("warnings").hidden = false; $("warnings").innerHTML = "<p>" + warn + "</p>";
    var tag = $("hero-tag"); if (tag) tag.textContent = r.categoryLabel;
    var hero = tu === "C" ? fmt(r.heatIndexC, 1) : fmt(r.heatIndexF, 1);
    var unit = tu === "C" ? "°C" : "°F";
    setHero(hero, unit, r.categoryLabel + (r.usedRothfusz ? ", Rothfusz regression" : ", Steadman formula (below ~80 °F)"));
    $("stat-grid").innerHTML =
      stat("Heat index", fmt(r.heatIndexF, 1) + " °F", fmt(r.heatIndexC, 1) + " °C") +
      stat("Air temperature", fmt(r.temperatureF, 1) + " °F", fmt(r.temperatureC, 1) + " °C at " + fmt(r.rh, 0) + "% RH") +
      stat("Formula", r.usedRothfusz ? "Rothfusz 1990" : "Steadman fallback", r.usedRothfusz ? "with the published NWS humidity adjustments when they apply" : "used when the NWS screen is under 80 °F") +
      stat("NWS category", r.categoryLabel, "Caution 80–90, Extreme Caution 90–103, Danger 103–125, Extreme Danger 125+");
  }
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

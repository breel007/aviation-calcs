(function () {
  "use strict";
  var C = window.ColdTemperatureCalcs;
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
  var tu = "C", eu = "ft", im = "published";
  bindSeg("tu", function (u) { tu = u; render(); });
  bindSeg("eu", function (u) { eu = u; render(); });
  bindSeg("im", function (u) { im = u; show(); render(); });
  function show() { $("block-pub").hidden = im !== "published"; $("block-h").hidden = im !== "height"; }
  function render() {
    var input = { temperature: $("temperature").value, tempUnit: tu, elevation: $("elevation").value, elevationUnit: eu };
    if (im === "height") { input.height = $("height").value; input.heightUnit = eu; }
    else { input.publishedAltitude = $("published").value; input.publishedUnit = eu; }
    var r = C.compute(input);
    if (!r) { clearOut("Enter a temperature, the airport elevation, and a published altitude at or above the field (or a height above the field)."); return; }
    var warn = r.warmerThanIsa ? "The reported temperature is warmer than ISA at this elevation, so the signed formula is a deduction, not an add. Obstacle-clearance corrections are for colder-than-standard air." : "";
    $("warnings").hidden = !warn; $("warnings").innerHTML = warn ? "<p>" + warn + "</p>" : "";
    setHero(fmt(r.indicatedToFlyFt, 0), "ft indicated", "add " + fmt(r.addFt, 0) + " ft to published " + fmt(r.publishedFt, 0) + " ft");
    var bits =
      stat("ICAO formula", fmt(r.formulaFt, 0) + " ft", "height above source " + fmt(r.heightFt, 0) + " ft · ISA " + fmt(r.isaAtSourceC, 1) + " °C") +
      stat("4% rule of thumb", fmt(r.rule4pctFt, 0) + " ft", "4% of height per 10 °C below ISA") +
      stat("Round up 10 ft", fmt(r.indicatedToFlyRound10, 0) + " ft", "round up 100 ft: " + fmt(r.indicatedToFlyRound100, 0) + " ft") +
      stat("Uncorrected true", fmt(r.trueIfUncorrectedFt, 0) + " ft", "if you flew the published indication");
    if (r.tableFt != null) bits += stat("AIM Table 7-3-1", fmt(r.tableFt, 0) + " ft", "interpolated; sea-level-airport table, slightly conservative at altitude");
    else bits += stat("AIM Table 7-3-1", "—", "height or temperature is outside the published 200–5,000 ft, +10 to −50 °C table");
    $("stat-grid").innerHTML = bits;
  }
  $("btn-ex").addEventListener("click", function () {
    tu = "C"; eu = "ft"; im = "published"; $("temperature").value = "-25"; $("elevation").value = "1000"; $("published").value = "3000";
    setSeg("tu", tu); setSeg("eu", eu); setSeg("im", im); show(); render();
  });
  $("btn-sl").addEventListener("click", function () {
    tu = "C"; eu = "ft"; im = "height"; $("temperature").value = "0"; $("elevation").value = "0"; $("height").value = "1000";
    setSeg("tu", tu); setSeg("eu", eu); setSeg("im", im); show(); render();
  });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

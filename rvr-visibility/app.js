(function () {
  "use strict";
  var C = window.RvrVisibilityCalcs;
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
  var mode = "rvr", ru = "ft";
  bindSeg("mode", function (u) { mode = u; show(); render(); });
  bindSeg("ru", function (u) { ru = u; render(); });
  function show() { $("block-rvr").hidden = mode !== "rvr"; $("block-sm").hidden = mode !== "sm"; }
  function render() {
    var r = C.compute({ mode: mode, rvr: $("rvr").value, rvrUnit: ru, visibility: $("sm").value });
    if (!r) { clearOut("Enter a positive RVR or a positive visibility."); return; }
    if (mode === "sm") {
      if (!r.exact) { clearOut("That visibility is not one of the seven 91.175(h)(2) rows (1/4, 1/2, 5/8, 3/4, 7/8, 1, or 1 1/4 SM). The rule does not interpolate."); return; }
      $("warnings").hidden = true; $("warnings").innerHTML = "";
      setHero(fmt(r.exact.rvrFt, 0), "ft RVR", r.exact.smLabel + " SM comparable value");
      $("stat-grid").innerHTML = stat("14 CFR 91.175(h)(2)", r.exact.smLabel + " SM ↔ " + fmt(r.exact.rvrFt, 0) + " ft", "an exact table row, not a unit conversion");
      tableOut(r);
      return;
    }
    var warn = "";
    if (r.aboveTable) warn = "This RVR is above the 6,000 ft row in 91.175(h)(2). The regulation table does not give a comparable visibility above 1 1/4 SM.";
    else if (r.belowTable) warn = "This RVR is below the 1,600 ft row. The next listed value is 1,600 ft (1/4 SM). 91.175(h) does not interpolate, and this conversion does not apply to Category II or III minimums.";
    else if (r.betweenRows) warn = "This RVR is not an exact 91.175(h)(2) row. The regulation does not interpolate. The TPP legend practice is to use the next higher listed RVR, shown below.";
    $("warnings").hidden = !warn; $("warnings").innerHTML = warn ? "<p>" + warn + "</p>" : "";
    if (r.exact) {
      setHero(r.exact.smLabel, "SM", "comparable visibility for " + fmt(r.exact.rvrFt, 0) + " ft RVR (91.175(h)(2))");
      $("stat-grid").innerHTML = stat("Exact table row", fmt(r.exact.rvrFt, 0) + " ft ↔ " + r.exact.smLabel + " SM", fmt(r.rvrM, 0) + " m · not a physical unit conversion");
    } else if (r.nextHigher) {
      setHero(r.nextHigher.smLabel, "SM", "next higher listed RVR " + fmt(r.nextHigher.rvrFt, 0) + " ft (TPP legend practice)");
      $("stat-grid").innerHTML = stat("Entered RVR", fmt(r.rvrFt, 0) + " ft", fmt(r.rvrM, 0) + " m · not an exact 91.175 row") +
        stat("Next higher row", fmt(r.nextHigher.rvrFt, 0) + " ft ↔ " + r.nextHigher.smLabel + " SM", "do not interpolate");
    } else {
      setHero("—", "", "outside the 91.175 table");
      $("stat-grid").innerHTML = stat("Entered RVR", fmt(r.rvrFt, 0) + " ft", fmt(r.rvrM, 0) + " m");
    }
    tableOut(r);
  }
  function tableOut(r) {
    var rows = r.table.map(function (row) {
      var mark = (r.exact && row.rvrFt === r.exact.rvrFt) || (r.betweenRows && r.nextHigher && row.rvrFt === r.nextHigher.rvrFt);
      return "<tr" + (mark ? ' class="is-active"' : "") + "><td>" + row.rvrFt.toLocaleString("en-US") + " ft</td><td>" + row.smLabel + " SM</td></tr>";
    }).join("");
    $("extra-results").innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr><th>RVR</th><th>Comparable visibility</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
  }
  $("btn-24").addEventListener("click", function () { mode = "rvr"; ru = "ft"; $("rvr").value = "2400"; setSeg("mode", mode); setSeg("ru", ru); show(); render(); });
  $("btn-48").addEventListener("click", function () { mode = "rvr"; ru = "ft"; $("rvr").value = "4800"; setSeg("mode", mode); setSeg("ru", ru); show(); render(); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

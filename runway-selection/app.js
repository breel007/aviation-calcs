(function () {
  "use strict";
  var C = window.RunwaySelectionCalcs;
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
  var wr = "magnetic", vd = "E";
  bindSeg("wr", function (u) { wr = u; render(); });
  bindSeg("vd", function (u) { vd = u; render(); });
  function rwyLabel(n) { return (n < 10 ? "0" : "") + n; }
  function render() {
    var r = C.compute({ windDir: $("windDir").value, windSpeed: $("windSpeed").value, gust: $("gust").value, windRef: wr, variation: $("variation").value, variationDir: vd, runways: $("runways").value, includeReciprocal: $("recip").checked, crosswindLimit: $("limit").value });
    if (!r) { clearOut("Enter a wind direction and speed, and at least one runway number from 01 to 36."); return; }
    var warn = "";
    if (!r.anyWithinLimit) warn = "Every runway exceeds the " + fmt(r.crosswindLimit, 0) + " kt crosswind limit. The heading below is the least-bad into-wind end, not a recommendation to use it.";
    $("warnings").hidden = !warn; $("warnings").innerHTML = warn ? "<p>" + warn + "</p>" : "";
    var rec = r.recommended;
    setHero(rec ? "RWY " + rwyLabel(rec.runway) : "—", "", rec ? fmt(rec.headwind, 1) + " kt headwind · " + fmt(rec.crosswindAbs, 1) + " kt crosswind" : "");
    $("stat-grid").innerHTML =
      stat("Magnetic wind", fmt(r.windDirMagnetic, 0) + "° / " + fmt(r.windSpeed, 0) + " kt", r.gust != null ? "gust " + fmt(r.gust, 0) + " kt" : (wr === "true" ? "from true with variation" : "as entered")) +
      stat("Crosswind limit", fmt(r.crosswindLimit, 0) + " kt", r.anyWithinLimit ? "at least one runway is within limits" : "none within limits");
    var rows = r.runways.map(function (row) {
      var mark = rec && row.runway === rec.runway ? " <strong>(preferred)</strong>" : "";
      var hw = row.headwind >= 0 ? fmt(row.headwind, 1) + " kt HW" : fmt(row.tailwind, 1) + " kt TW";
      var xg = row.gustCrosswindAbs != null ? " · gust XW " + fmt(row.gustCrosswindAbs, 1) : "";
      var ok = row.withinLimit ? "within limit" : "over limit";
      return "<tr><th>RWY " + rwyLabel(row.runway) + mark + "</th><td>" + fmt(row.heading, 0) + "°</td><td>" + hw + "</td><td>" + fmt(row.crosswindAbs, 1) + " kt" + xg + "</td><td>" + ok + "</td></tr>";
    }).join("");
    $("extra-results").innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr><th>Runway</th><th>Heading</th><th>Head / tail</th><th>Crosswind</th><th>Limit</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
  }
  $("btn-ex").addEventListener("click", function () {
    $("windDir").value = "270"; $("windSpeed").value = "20"; $("gust").value = ""; $("variation").value = "0";
    $("runways").value = "09/27, 13/31"; $("limit").value = "15"; $("recip").checked = true;
    wr = "magnetic"; vd = "E"; setSeg("wr", wr); setSeg("vd", vd); render();
  });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

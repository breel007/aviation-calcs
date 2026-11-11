(function () {
  "use strict";
  var C = window.TimeToTurnCalcs;
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
  var mode = "delta", rateKind = "standard", su = "kt";
  bindSeg("mode", function (u) { mode = u; show(); render(); });
  bindSeg("rate", function (u) { rateKind = u; show(); render(); });
  bindSeg("su", function (u) { su = u; render(); });
  function show() {
    $("block-delta").hidden = mode !== "delta";
    $("block-hdg").hidden = mode !== "headings";
    $("block-custom").hidden = rateKind !== "custom";
  }
  function fmtTime(sec) {
    if (!isFinite(sec)) return "—";
    if (sec < 60) return fmt(sec, 1) + " s";
    var m = Math.floor(sec / 60), s = sec - m * 60;
    return m + ":" + (s < 10 ? "0" : "") + fmt(s, sec % 1 ? 1 : 0) + " min";
  }
  $("btn-ex1").addEventListener("click", function () {
    mode = "delta"; rateKind = "standard"; $("change").value = 90; $("tas").value = ""; $("bank").value = "";
    document.querySelectorAll('[data-unit-group="mode"]').forEach(function (b) { var on = b.getAttribute("data-unit") === "delta"; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    document.querySelectorAll('[data-unit-group="rate"]').forEach(function (b) { var on = b.getAttribute("data-unit") === "standard"; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    show(); render();
  });
  $("btn-ex2").addEventListener("click", function () {
    mode = "headings"; rateKind = "standard"; $("fromH").value = 90; $("toH").value = 360;
    document.querySelectorAll('[data-unit-group="mode"]').forEach(function (b) { var on = b.getAttribute("data-unit") === "headings"; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    document.querySelectorAll('[data-unit-group="rate"]').forEach(function (b) { var on = b.getAttribute("data-unit") === "standard"; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    show(); render();
  });
  function render() {
    var r = C.compute({ mode: mode, change: $("change").value, fromHeading: $("fromH").value, toHeading: $("toH").value, rateKind: rateKind, rate: $("rate").value, tas: $("tas").value, bank: $("bank").value, speedUnit: su });
    if (!r) { clearOut("Enter a non-zero heading change, or two headings from 0 to 360, and a non-zero turn rate."); return; }
    $("warnings").hidden = true; $("warnings").innerHTML = "";
    var dir = r.changeDeg < 0 ? "left" : "right";
    setHero(fmtTime(r.timeSec), "", fmt(r.changeAbsDeg, 1) + "° " + (mode === "headings" ? dir + ", " : "") + "at " + fmt(Math.abs(r.rateDps), 2) + " °/s");
    var html = stat("Primary time", fmtTime(r.timeSec), fmt(r.timeMin, 2) + " min · " + fmt(r.changeAbsDeg, 1) + "° / " + fmt(Math.abs(r.rateDps), 2) + " °/s") +
      stat("Rate used", fmt(Math.abs(r.rateDps), 2) + " °/s", r.rateKind === "half" ? "half standard (4-minute turn)" : r.rateKind === "custom" ? "custom rate" : "standard rate (2-minute turn)");
    if (r.longWaySec != null) html += stat("Long way", fmtTime(r.longWaySec), fmt(r.longWayDeg, 1) + "° the other way");
    if (r.bankRateDps != null) html += stat("Banked rate", fmt(Math.abs(r.bankRateDps), 2) + " °/s", fmt(r.bankDeg, 1) + "° bank at " + fmt(r.tasKt, 1) + " kt TAS · time " + fmtTime(r.bankTimeSec));
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

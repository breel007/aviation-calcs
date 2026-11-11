(function () {
  "use strict";
  var C = window.PullUpLoadFactorCalcs;
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
  var mode = "vr", su = "kt", ru = "ft";
  bindSeg("mode", function (u) { mode = u; show(); render(); });
  bindSeg("su", function (u) { su = u; render(); });
  bindSeg("ru", function (u) { ru = u; render(); });
  function show() {
    $("block-speed").hidden = mode === "nr";
    $("block-radius").hidden = mode === "vn";
    $("block-n").hidden = mode === "vr";
  }
  function spdLab(kt) {
    if (su === "mph") return fmt(kt * 1.1507794480235425, 1) + " mph";
    if (su === "mps") return fmt(kt * (1852 / 3600), 1) + " m/s";
    return fmt(kt, 1) + " kt";
  }
  function radLab(ft) {
    if (ru === "m") return fmt(ft * 0.3048, 0) + " m";
    if (ru === "nm") return fmt(ft / (1852 / 0.3048), 3) + " NM";
    return fmt(ft, 0) + " ft";
  }
  $("btn-ex1").addEventListener("click", function () {
    mode = "vr"; $("speed").value = 100; $("radius").value = 1000; $("vs").value = "";
    document.querySelectorAll('[data-unit-group="mode"]').forEach(function (b) { var on = b.getAttribute("data-unit") === "vr"; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    show(); render();
  });
  $("btn-ex2").addEventListener("click", function () {
    mode = "vn"; $("speed").value = 120; $("n").value = 3; $("vs").value = 60;
    document.querySelectorAll('[data-unit-group="mode"]').forEach(function (b) { var on = b.getAttribute("data-unit") === "vn"; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    show(); render();
  });
  function render() {
    var r = C.compute({ mode: mode, speed: $("speed").value, radius: $("radius").value, n: $("n").value, vs: $("vs").value, speedUnit: su, radiusUnit: ru });
    if (!r) { clearOut("Enter a positive speed and radius, or a bottom load factor greater than 1 with one of those two. Optional stall speed must be zero or positive."); return; }
    var warn = "";
    if (!r.topPossible) warn = "V²/(gR) is less than 1, so n at the top of a loop would be negative — this speed and radius cannot sustain an inverted top.";
    if (r.nBottom > 3.8) warn = (warn ? warn + " " : "") + "The computed bottom load factor is above the +3.8 g normal-category limit typical of many light airplanes. Do not exceed the limit in the POH/AFM.";
    $("warnings").hidden = !warn; $("warnings").innerHTML = warn ? "<p>" + warn + "</p>" : "";
    setHero(fmt(r.nBottom, 2), "g", "at the bottom · V²/(gR) = " + fmt(r.centripetalG, 2) + " g");
    var html = stat("n at the bottom", fmt(r.nBottom, 2) + " g", "1 + V²/(gR)") +
      stat("n at the top", r.topPossible ? fmt(r.nTop, 2) + " g" : "not possible", r.topPossible ? "V²/(gR) − 1" : "needs V²/(gR) > 1") +
      stat("Push-over n", fmt(r.nPushover, 2) + " g", "1 − V²/(gR) from level flight") +
      stat("Speed / radius", spdLab(r.speedKt) + " · " + radLab(r.radiusFt), fmt(r.speedFtS, 1) + " ft/s");
    if (r.vsAccelerated != null) html += stat("Accelerated stall", fmt(r.vsAccelerated, 1) + (su === "mps" ? " m/s" : su === "mph" ? " mph" : " kt"), "Vs × √n at the bottom");
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

(function () {
  "use strict";
  var C = window.DescentRateCalcs;
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
  var mode = "angle";
  bindSeg("mode", function (u) { mode = u; show(); render(); });
  function show() {
    $("block-angle").hidden = mode !== "angle";
    $("block-rate").hidden = mode !== "rate";
    $("block-ftnm").hidden = mode !== "ft-per-nm";
  }
  function render() {
    var r = C.compute({ mode: mode, groundspeed: $("groundspeed").value, angle: $("angle").value, fpm: $("fpm").value, ftPerNm: $("ftnm").value });
    if (!r) { clearOut("Enter a groundspeed and a positive path angle, rate, or gradient."); return; }
    $("warnings").hidden = true; $("warnings").innerHTML = "";
    setHero(fmt(r.fpm, 0), "fpm", fmt(r.angleDeg, 2) + "° path · " + fmt(r.ftPerNm, 1) + " ft/NM");
    var bits =
      stat("Gradient", fmt(r.ftPerNm, 1) + " ft/NM", fmt(r.gradientPercent, 2) + "% · " + fmt(r.nmPerThousandFt, 2) + " NM / 1,000 ft") +
      stat("Path angle", fmt(r.angleDeg, 2) + "°", "time for 1,000 ft: " + fmt(r.timePerThousandMin, 2) + " min");
    if (r.isNearlyThreeDeg) {
      bits += stat("GS × 5 rule", fmt(r.ruleTimes5Fpm, 0) + " fpm", "exact is " + fmt(r.ruleTimes5DeltaFpm, 0) + " fpm steeper") +
        stat("300 ft/NM check", fmt(r.rule300Fpm, 0) + " fpm", "a shallower 2.83° path");
    }
    $("stat-grid").innerHTML = bits;
  }
  $("btn-120").addEventListener("click", function () { mode = "angle"; $("groundspeed").value = "120"; $("angle").value = "3"; setSeg("mode", "angle"); show(); render(); });
  $("btn-90").addEventListener("click", function () { mode = "angle"; $("groundspeed").value = "90"; $("angle").value = "3.25"; setSeg("mode", "angle"); show(); render(); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

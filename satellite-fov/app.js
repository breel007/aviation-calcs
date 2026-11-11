(function () {
  "use strict";
  var C = window.SatelliteFovCalcs;
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
  var au = "km";
  bindSeg("au", function (u) { au = u; render(); });
  function km(m) { return m / 1000; }
  $("btn-ex1").addEventListener("click", function () {
    au = "km"; $("altitude").value = 400; $("nadir").value = 15; $("radius").value = "";
    document.querySelectorAll('[data-unit-group="au"]').forEach(function (b) { var on = b.getAttribute("data-unit") === "km"; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    render();
  });
  $("btn-ex2").addEventListener("click", function () {
    au = "km"; $("altitude").value = 400; $("nadir").value = ""; $("radius").value = "";
    document.querySelectorAll('[data-unit-group="au"]').forEach(function (b) { var on = b.getAttribute("data-unit") === "km"; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    render();
  });
  function render() {
    var r = C.compute({ altitude: $("altitude").value, altUnit: au, nadirAngle: $("nadir").value, radius: $("radius").value, radiusUnit: "km" });
    if (!r) { clearOut("Enter a non-negative orbital altitude and, if you use a custom radius, a positive Earth radius in kilometres."); return; }
    var warn = "";
    if (r.belowHorizon === false) warn = "That look angle is at or past the geometric horizon, so there is no intersection with the spherical Earth. The horizon figures below still apply.";
    $("warnings").hidden = !warn; $("warnings").innerHTML = warn ? "<p>" + warn + "</p>" : "";
    if (r.groundRangeM != null) {
      setHero(fmt(km(r.swathM), 1), "km swath", "ground range " + fmt(km(r.groundRangeM), 1) + " km · λ = " + fmt(r.lambdaDeg, 3) + "°");
    } else {
      setHero(fmt(km(r.horizonRadiusM), 0), "km", "geometric horizon radius · η = " + fmt(r.etaHorizonDeg, 2) + "°");
    }
    var html = stat("Horizon radius", fmt(km(r.horizonRadiusM), 0) + " km", "λ = " + fmt(r.lambdaHorizonDeg, 2) + "° · η = " + fmt(r.etaHorizonDeg, 2) + "°") +
      stat("Horizon swath", fmt(km(r.horizonSwathM), 0) + " km", "limb to limb on the sphere") +
      stat("Period", fmt(r.periodMin, 2) + " min", fmt(r.periodSec, 0) + " s circular · V = " + fmt(r.orbitalSpeedMps / 1000, 3) + " km/s") +
      stat("Subsatellite speed", fmt(r.subsatelliteSpeedMps / 1000, 3) + " km/s", "non-rotating Earth, V × R/(R+h)");
    if (r.groundRangeM != null) html = stat("Ground range", fmt(km(r.groundRangeM), 1) + " km", "λ = " + fmt(r.lambdaDeg, 3) + "° at η = " + $("nadir").value + "°") + stat("Swath width", fmt(km(r.swathM), 1) + " km", "symmetric nadir FOV, 2 R λ") + html;
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

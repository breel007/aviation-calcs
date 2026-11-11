(function () {
  "use strict";
  var C = window.ApproachSpeedCalcs;
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
  var su = "kt";
  bindSeg("su", function (u) { su = u; render(); });
  function fromKt(kt) {
    if (su === "mph") return kt * 1.1507794480235425;
    if (su === "kph") return kt * 1.852;
    return kt;
  }
  function unitLabel() { return su === "kph" ? "km/h" : su; }
  function spd(kt, d) { return fmt(fromKt(kt), d == null ? 1 : d); }
  $("btn-ex1").addEventListener("click", function () {
    $("vso").value = 40; $("factor").value = 1.3; $("weight").value = ""; $("weightRef").value = "";
    $("wind").value = 15; $("gust").value = 25; $("headwind").value = ""; $("cap").value = 20; render();
  });
  $("btn-ex2").addEventListener("click", function () {
    $("vso").value = 40; $("factor").value = 1.3; $("weight").value = 2000; $("weightRef").value = 2400;
    $("wind").value = ""; $("gust").value = ""; $("headwind").value = ""; render();
  });
  function render() {
    var r = C.compute({ vso: $("vso").value, factor: $("factor").value, speedUnit: su,
      weight: $("weight").value, weightRef: $("weightRef").value,
      wind: $("wind").value, gust: $("gust").value, headwind: $("headwind").value, transportCap: $("cap").value });
    if (!r) { clearOut("Enter a positive Vso and a Vref factor greater than 1. If you enter weight, both actual and reference weights must be positive."); return; }
    var warn = "";
    if (r.transportVappKt != null) warn = "The FAA / Airplane Flying Handbook result is Vref plus half the gust increment. The transport-category additive (½ headwind + full gust, capped) is shown separately and is not the AFH method.";
    $("warnings").hidden = !warn; $("warnings").innerHTML = warn ? "<p>" + warn + "</p>" : "";
    setHero(spd(r.vappKt), unitLabel(), "Vapp = Vref" + (r.faaAdditiveKt ? " + " + spd(r.faaAdditiveKt) + " " + unitLabel() + " gust additive" : " (no gust additive)"));
    var html = stat("Vref", spd(r.vrefKt) + " " + unitLabel(), r.factor + " × " + spd(r.vsoCorrectedKt) + " " + unitLabel() + " corrected Vso") +
      stat("FAA gust additive", spd(r.faaAdditiveKt) + " " + unitLabel(), r.gustKt == null ? "no gust entered" : "½ × (" + spd(r.gustKt) + " − " + spd(r.windKt) + ")");
    if (r.weightFactor !== 1) html += stat("Weight factor", fmt(r.weightFactor, 3), "√(W/Wref) applied to Vso");
    if (r.transportVappKt != null) html += stat("Transport Vapp", spd(r.transportVappKt) + " " + unitLabel(), "additive " + spd(r.transportAdditiveKt) + " " + unitLabel() + ", cap " + spd(r.transportCapKt) + " (not the AFH method)");
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

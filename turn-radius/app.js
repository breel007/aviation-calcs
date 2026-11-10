/**
 * UI for the turn-radius calculator.
 * Math lives in calc.js (TurnRadius).
 */
(function () {
  "use strict";

  var TR = window.TurnRadius;
  if (!TR) return;

  var elTas = document.getElementById("tas");
  var elBank = document.getElementById("bank");
  var elRate = document.getElementById("rate");
  var elVs = document.getElementById("vs");
  var bankWrap = document.getElementById("bank-wrap");
  var rateWrap = document.getElementById("rate-wrap");
  var warnings = document.getElementById("warnings");
  var heroValue = document.getElementById("hero-value");
  var heroSub = document.getElementById("hero-sub");
  var statGrid = document.getElementById("stat-grid");

  var spdUnit = "kt";
  var mode = "standard";

  function parseNumber(input) {
    if (!input) return NaN;
    var raw = String(input.value).trim().replace(",", ".");
    if (raw === "") return NaN;
    return Number(raw);
  }
  function setSeg(group, value) {
    document.querySelectorAll('[data-unit-group="' + group + '"]').forEach(function (btn) {
      var active = btn.getAttribute("data-unit") === value;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }
  function showWarnings(notes) {
    if (!notes || !notes.length) { warnings.hidden = true; warnings.innerHTML = ""; return; }
    warnings.hidden = false;
    warnings.innerHTML = notes.map(function (n) { return "<p>" + n + "</p>"; }).join("");
  }
  function fmt(n, d) {
    if (!isFinite(n)) return "—";
    var s = n.toFixed(d == null ? 1 : d);
    return s.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  }
  function toKt(v) { return spdUnit === "mph" ? v / (1852 / 1609.344) : v; }
  function fromKt(v) { return spdUnit === "mph" ? v * (1852 / 1609.344) : v; }
  function unit() { return spdUnit === "mph" ? "mph" : "kt"; }

  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value + '</p>' +
      (sub ? '<p class="stat-sub">' + sub + '</p>' : '') + '</div>';
  }

  function render() {
    bankWrap.hidden = mode !== "bank";
    rateWrap.hidden = mode !== "rate";

    var result = TR.compute({
      tasKt: toKt(parseNumber(elTas)),
      mode: mode,
      bankDeg: parseNumber(elBank),
      rateDps: parseNumber(elRate),
      stallSpeedKt: toKt(parseNumber(elVs))
    });

    if (result.error) {
      showWarnings([result.error]);
      heroValue.innerHTML = '<span class="num">—</span> <span class="unit">ft</span>';
      heroSub.textContent = "";
      statGrid.innerHTML = "";
      return;
    }
    showWarnings([]);

    heroValue.innerHTML = '<span class="num">' + Math.round(result.radiusFt).toLocaleString("en-US") + '</span> <span class="unit">ft</span>';
    heroSub.textContent = fmt(result.radiusNm, 2) + " nm  ·  diameter " + Math.round(result.diameterFt).toLocaleString("en-US") + " ft";

    var min360 = result.time360Sec / 60;
    var timeTxt = min360 >= 1.05 ? fmt(min360, 2) + " min for 360°" : Math.round(result.time360Sec) + " s for 360°";

    var html = "";
    html += stat("Bank angle", fmt(result.bankDeg, 1) + "°", "Standard-rate exact " + fmt(result.standardRateBankExact, 1) + "°  ·  TAS/10+7 rule " + fmt(result.standardRateBankRule, 1) + "°");
    html += stat("Rate of turn", fmt(result.rateDps, 2) + "°/s", timeTxt);
    html += stat("Load factor", fmt(result.loadFactor, 2) + " g", "Stall speed +" + fmt(result.stallIncreasePct, 1) + "%");
    if (isFinite(result.stallSpeedBank)) {
      html += stat("Stall speed in the bank", fmt(fromKt(result.stallSpeedBank), 1) + " " + unit(), "from " + fmt(fromKt(result.stallSpeedLevel), 1) + " " + unit() + " wings-level");
    }
    statGrid.innerHTML = html;
  }

  document.querySelectorAll("[data-unit-group]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var group = btn.getAttribute("data-unit-group");
      var value = btn.getAttribute("data-unit");
      if (group === "spd") {
        var tas = parseNumber(elTas), vs = parseNumber(elVs);
        var from = spdUnit;
        spdUnit = value;
        setSeg("spd", spdUnit);
        function conv(v) {
          if (!isFinite(v)) return v;
          var kt = from === "mph" ? v / (1852 / 1609.344) : v;
          return spdUnit === "mph" ? kt * (1852 / 1609.344) : kt;
        }
        if (isFinite(tas)) elTas.value = fmt(conv(tas), 1);
        if (isFinite(vs)) elVs.value = fmt(conv(vs), 1);
      }
      if (group === "mode") mode = value;
      setSeg(group, value);
      render();
    });
  });

  ["tas", "bank", "rate", "vs"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", render);
  });

  document.getElementById("btn-example").addEventListener("click", function () {
    spdUnit = "kt"; mode = "standard";
    setSeg("spd", "kt"); setSeg("mode", "standard");
    elTas.value = "120"; elVs.value = "55";
    render();
  });
  document.getElementById("btn-reset").addEventListener("click", function (e) {
    e.preventDefault();
    spdUnit = "kt"; mode = "standard";
    setSeg("spd", "kt"); setSeg("mode", "standard");
    elTas.value = "120"; elBank.value = "30"; elRate.value = "3"; elVs.value = "";
    render();
  });

  render();
})();

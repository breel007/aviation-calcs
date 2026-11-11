(function () {
  "use strict";
  var C = window.ThrustPowerRequiredCalcs;
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
  var wu = "lbf", au = "ft2", su = "kt", km = "eAR";
  bindSeg("wu", function (u) { wu = u; render(); });
  bindSeg("au", function (u) { au = u; render(); });
  bindSeg("su", function (u) { su = u; render(); });
  bindSeg("km", function (u) { km = u; show(); render(); });
  function show() { $("block-ear").hidden = km !== "eAR"; $("block-k").hidden = km !== "k"; }
  function render() {
    var input = { weight: $("weight").value, weightUnit: wu, area: $("area").value, areaUnit: au, speed: $("speed").value, speedUnit: su, densityAltitude: $("da").value, CD0: $("CD0").value, eta: $("eta").value };
    if (km === "k") input.k = $("k").value;
    else { input.e = $("e").value; input.AR = $("AR").value; }
    var r = C.compute(input);
    if (!r) { clearOut("Enter a positive weight, wing area, true airspeed, and a valid polar (CD0 and e/AR or k)."); return; }
    var warn = r.stallWarning ? "The computed CL is above 2.0, which is high for a clean wing — you may be slower than a realistic stall speed at this weight and density. Treat the result with caution." : "";
    $("warnings").hidden = !warn; $("warnings").innerHTML = warn ? "<p>" + warn + "</p>" : "";
    setHero(fmt(r.thrustRequiredLbf, 0), "lbf", fmt(r.thrustRequiredN, 0) + " N · L/D " + fmt(r.LD, 2));
    var bits =
      stat("Power required", fmt(r.powerRequiredHp, 1) + " hp", fmt(r.powerRequiredKw, 1) + " kW · " + fmt(r.powerRequiredW, 0) + " W") +
      stat("CL / CD", fmt(r.CL, 3) + " / " + fmt(r.CD, 4), "q " + fmt(r.qPa, 0) + " Pa · σ " + fmt(r.densityRatio, 3)) +
      stat("(L/D)max speed", fmt(r.speedLDmaxKt, 0) + " kt", "(L/D)max " + fmt(r.LDmax, 2) + " · min thrust required") +
      stat("Min-power speed", fmt(r.speedMinPowerKt, 0) + " kt", "propeller endurance condition");
    if (r.shaftPowerHp != null) bits += stat("Shaft power", fmt(r.shaftPowerHp, 1) + " hp", "η = " + fmt(r.eta, 2) + " · " + fmt(r.shaftPowerW / 1000, 1) + " kW");
    $("stat-grid").innerHTML = bits;
  }
  $("btn-ex").addEventListener("click", function () {
    wu = "lbf"; au = "ft2"; su = "kt"; km = "eAR";
    $("weight").value = "2400"; $("area").value = "174"; $("speed").value = "100"; $("da").value = "0";
    $("CD0").value = "0.02"; $("e").value = "0.8"; $("AR").value = "8"; $("eta").value = "";
    setSeg("wu", wu); setSeg("au", au); setSeg("su", su); setSeg("km", km); show(); render();
  });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

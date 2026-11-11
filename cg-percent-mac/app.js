(function () {
  "use strict";
  var C = window.CgPercentMacCalcs;
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
  var mode = "from-cg";
  bindSeg("mode", function (u) { mode = u; show(); render(); });
  function show() {
    $("block-cg").hidden = mode !== "from-cg";
    $("block-pct").hidden = mode !== "from-percent";
  }
  function render() {
    var r = C.compute({ mode: mode, lemac: $("lemac").value, mac: $("mac").value, cg: $("cg").value, percentMac: $("pct").value, fwdLimit: $("fwd").value, aftLimit: $("aft").value, rootChord: $("root").value, tipChord: $("tip").value, span: $("span").value });
    if (!r) { clearOut("Enter a positive MAC, a LEMAC, and either a CG station or a percent MAC."); return; }
    var warn = "";
    if (r.withinLimits === false) warn = "This CG is outside the forward/aft percent-MAC limits you entered. Use the published envelope for the airplane you fly.";
    $("warnings").hidden = !warn; $("warnings").innerHTML = warn ? "<p>" + warn + "</p>" : "";
    setHero(fmt(r.percentMac, 1), "% MAC", "CG station " + fmt(r.cg, 2) + " · TEMAC " + fmt(r.temac, 2));
    var bits =
      stat("CG station", fmt(r.cg, 2), "LEMAC " + fmt(r.lemac, 2) + " · MAC " + fmt(r.mac, 2)) +
      stat("TEMAC", fmt(r.temac, 2), "LEMAC + MAC");
    if (r.fwdLimit != null && r.aftLimit != null) {
      bits += stat("Envelope", r.withinLimits ? "Within limits" : "Outside limits", fmt(r.fwdLimit, 1) + "% to " + fmt(r.aftLimit, 1) + "% MAC");
    }
    if (r.geometry) {
      bits += stat("Tapered-wing MAC", fmt(r.geometry.mac, 2), "taper " + fmt(r.geometry.taper, 3) + (r.geometry.yMac != null ? " · y<sub>MAC</sub> " + fmt(r.geometry.yMac, 2) : ""));
    }
    $("stat-grid").innerHTML = bits;
  }
  $("btn-ex").addEventListener("click", function () { mode = "from-cg"; $("lemac").value = "70"; $("mac").value = "60"; $("cg").value = "85"; $("fwd").value = "16"; $("aft").value = "31"; setSeg("mode", "from-cg"); show(); render(); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

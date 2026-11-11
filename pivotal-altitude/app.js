(function () {
  "use strict";
  var C = window.PivotalAltitudeCalcs;
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
  function render() {
    var r = C.compute({ groundspeed: $("groundspeed").value, speedUnit: su });
    if (!r) { clearOut("Enter a groundspeed of zero or more."); return; }
    $("warnings").hidden = true; $("warnings").innerHTML = "";
    setHero(fmt(r.afhFt, 0), "ft AGL", "handbook " + (su === "mph" ? "GS² / 15" : "GS² / 11.3") + " · " + fmt(r.groundspeedKt, 1) + " kt / " + fmt(r.groundspeedMph, 1) + " mph");
    $("stat-grid").innerHTML =
      stat("Exact V²/g", fmt(r.exactFt, 0) + " ft", fmt(r.exactM, 1) + " m · divisor " + fmt(r.exactDivKt, 3) + " (kt)") +
      stat("AFH from knots", fmt(r.afhFt, 0) + " ft", "GS(kt)² / 11.3") +
      stat("AFH from mph", fmt(r.afhFromMphFt, 0) + " ft", "GS(mph)² / 15") +
      stat("Exact minus AFH", fmt(r.deltaAfhFt, 1) + " ft", "11.3 is a slightly low rounding");
  }
  $("btn-90").addEventListener("click", function () { $("groundspeed").value = "90"; su = "kt"; setSeg("su", "kt"); render(); });
  $("btn-100").addEventListener("click", function () { $("groundspeed").value = "100"; su = "mph"; setSeg("su", "mph"); render(); });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

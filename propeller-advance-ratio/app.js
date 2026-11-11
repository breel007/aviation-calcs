(function () {
  "use strict";
  var C = window.PropellerAdvanceRatioCalcs;
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
  var vu = "kt", ru = "rpm", du = "ft", au = "ft", ou = "C";
  bindSeg("vu", function (u) { vu = u; render(); });
  bindSeg("ru", function (u) { ru = u; render(); });
  bindSeg("du", function (u) { du = u; render(); });
  bindSeg("au", function (u) { au = u; render(); });
  bindSeg("ou", function (u) { ou = u; render(); });
  function render() {
    var r = C.compute({ tas: $("tas").value, tasUnit: vu, rpm: $("rpm").value, rpmUnit: ru, diameter: $("diameter").value, diameterUnit: du, altitude: $("altitude").value, altitudeUnit: au, oat: $("oat").value, oatUnit: ou });
    if (!r) { clearOut("Enter a true airspeed of zero or more, and a positive RPM and diameter."); return; }
    $("warnings").hidden = true; $("warnings").innerHTML = "";
    setHero(fmt(r.J, 3), "J", "helical tip Mach " + fmt(r.tipMachHel, 3));
    $("stat-grid").innerHTML =
      stat("Rotational tip speed", fmt(r.tipSpeedRotKt, 1) + " kt", fmt(r.tipSpeedRotMps, 1) + " m/s · Mach " + fmt(r.tipMachRot, 3)) +
      stat("Helical tip speed", fmt(r.tipSpeedHelKt, 1) + " kt", fmt(r.tipSpeedHelMps, 1) + " m/s · Mach " + fmt(r.tipMachHel, 3)) +
      stat("Speed of sound", fmt(r.speedOfSoundKt, 1) + " kt", fmt(r.speedOfSoundMps, 1) + " m/s") +
      stat("RPM / diameter", fmt(r.rpm, 0) + " rpm", fmt(r.diameterFt, 2) + " ft · " + fmt(r.diameterM, 3) + " m");
  }
  $("btn-ex").addEventListener("click", function () {
    vu = "kt"; ru = "rpm"; du = "ft"; au = "ft"; $("tas").value = "100"; $("rpm").value = "2400"; $("diameter").value = "6.5"; $("altitude").value = "0"; $("oat").value = "";
    setSeg("vu", vu); setSeg("ru", ru); setSeg("du", du); setSeg("au", au); render();
  });
  $("btn-static").addEventListener("click", function () {
    vu = "kt"; ru = "rpm"; du = "in"; au = "ft"; $("tas").value = "0"; $("rpm").value = "2700"; $("diameter").value = "72"; $("altitude").value = "0"; $("oat").value = "";
    setSeg("vu", vu); setSeg("ru", ru); setSeg("du", du); setSeg("au", au); render();
  });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

(function () {
  "use strict";
  var C = window.DragPolarCalcs;
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
  var km = "eAR";
  bindSeg("km", function (u) { km = u; show(); render(); });
  function show() { $("block-ear").hidden = km !== "eAR"; $("block-k").hidden = km !== "k"; }
  function render() {
    var input = { CD0: $("CD0").value, CL: $("CL").value };
    if (km === "k") input.k = $("k").value;
    else { input.e = $("e").value; input.AR = $("AR").value; }
    var r = C.compute(input);
    if (!r) { clearOut("Enter a positive CD0 and either e and aspect ratio, or a positive k."); return; }
    $("warnings").hidden = true; $("warnings").innerHTML = "";
    setHero(fmt(r.LDmax, 2), "L/D", "at CL " + fmt(r.CL_LDmax, 3) + " · CD " + fmt(r.CD_LDmax, 4));
    var bits =
      stat("Induced-drag k", fmt(r.k, 5), r.e != null ? "e = " + fmt(r.e, 3) + " · AR = " + fmt(r.AR, 2) : "entered directly") +
      stat("Prop endurance CL", fmt(r.CL_propEndurance, 3), "L/D " + fmt(r.LD_propEndurance, 2) + " · max CL^{3/2}/CD") +
      stat("Jet range CL", fmt(r.CL_jetRange, 3), "L/D " + fmt(r.LD_jetRange, 2) + " · max CL^{1/2}/CD");
    if (r.point) bits += stat("At CL " + fmt(r.point.CL, 3), "CD " + fmt(r.point.CD, 4), "L/D " + fmt(r.point.LD, 2) + " · induced CD " + fmt(r.point.induced, 4));
    $("stat-grid").innerHTML = bits;
  }
  $("btn-ex").addEventListener("click", function () {
    km = "eAR"; $("CD0").value = "0.02"; $("e").value = "0.8"; $("AR").value = "8"; $("CL").value = "";
    setSeg("km", km); show(); render();
  });
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

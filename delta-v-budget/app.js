(function () {
  "use strict";
  var C = window.DeltaVBudgetCalcs;
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
  var psu = "km/s";
  bindSeg("psu", function (u) { psu = u; render(); });
  var seq = 0, started = false;
  var UNITS = ["m/s", "km/s", "ft/s"];
  function itemHtml(id, p) {
    p = p || {};
    var opts = UNITS.map(function (u) {
      return '<option value="' + u + '"' + ((p.unit || "m/s") === u ? " selected" : "") + ">" + u + "</option>";
    }).join("");
    return '<div class="card-block entry" data-row="' + id + '">' +
      '<div class="pair">' +
      '<div class="field-block" style="margin:0"><div class="field-label-row"><label for="' + id + '-name">Item</label></div>' +
      '<input id="' + id + '-name" class="input" type="text" value="' + (p.name || "") + '" placeholder="e.g. Gravity losses" autocomplete="off"></div>' +
      '<div class="field-block" style="margin:0"><div class="field-label-row"><label for="' + id + '-tag">Tag</label><span class="sublabel">optional subtotal</span></div>' +
      '<input id="' + id + '-tag" class="input" type="text" value="' + (p.tag || "") + '" placeholder="e.g. losses" autocomplete="off"></div></div>' +
      '<div class="pair" style="margin-top:0.7rem">' +
      '<div class="field-block" style="margin:0"><div class="field-label-row"><label for="' + id + '-val">Δv</label></div>' +
      '<input id="' + id + '-val" class="input" type="number" inputmode="decimal" min="0" step="any" value="' + (p.value != null ? p.value : "") + '" autocomplete="off"></div>' +
      '<div class="field-block" style="margin:0"><div class="field-label-row"><label for="' + id + '-unit">Unit</label></div>' +
      '<select id="' + id + '-unit" class="input select">' + opts + "</select></div></div>" +
      '<p style="margin:0.6rem 0 0"><button type="button" class="btn btn-ghost btn-remove">Remove item</button></p></div>';
  }
  function addItem(preset) {
    seq += 1;
    var id = "i" + seq;
    var holder = document.createElement("div");
    holder.innerHTML = itemHtml(id, preset);
    var block = holder.firstChild;
    $("items").appendChild(block);
    block.querySelector(".btn-remove").addEventListener("click", function () { block.remove(); render(); });
    block.querySelectorAll("input,select").forEach(function (el) { el.addEventListener("input", render); el.addEventListener("change", render); });
  }
  function readItems() {
    var out = [];
    $("items").querySelectorAll(".entry").forEach(function (block) {
      out.push({
        name: block.querySelector('input[id$="-name"]').value,
        tag: block.querySelector('input[id$="-tag"]').value,
        value: block.querySelector('input[id$="-val"]').value,
        unit: block.querySelector('select[id$="-unit"]').value
      });
    });
    return out;
  }
  function template() {
    $("items").innerHTML = "";
    addItem({ name: "Gravity losses", tag: "losses", value: 1500, unit: "m/s" });
    addItem({ name: "Drag losses", tag: "losses", value: 150, unit: "m/s" });
    addItem({ name: "Steering / residuals", tag: "losses", value: 100, unit: "m/s" });
    addItem({ name: "Orbital insertion", tag: "orbit", value: 7800, unit: "m/s" });
    addItem({ name: "Plane change", tag: "orbit", value: "", unit: "km/s" });
    addItem({ name: "Reserve", tag: "reserve", value: 200, unit: "m/s" });
  }
  function show() {
    if (started) return;
    started = true;
    template();
  }
  $("btn-add").addEventListener("click", function () { addItem({}); render(); });
  $("btn-clear").addEventListener("click", function () { $("items").innerHTML = ""; addItem({}); render(); });
  $("btn-template").addEventListener("click", function () { template(); render(); });
  $("btn-add-pc").addEventListener("click", function () {
    var r = C.compute({ items: [{ name: "placeholder", value: 1, unit: "m/s" }], planeChange: { speed: $("pcSpeed").value, speedUnit: psu, angle: $("pcAngle").value } });
    if (!r || !r.planeChange) return;
    addItem({ name: "Plane change (" + $("pcAngle").value + "° at " + $("pcSpeed").value + " " + psu + ")", tag: "orbit", value: +(r.planeChange.mps / 1000).toPrecision(6), unit: "km/s" });
    render();
  });
  function render() {
    var r = C.compute({ items: readItems(), isp: $("isp").value, planeChange: { speed: $("pcSpeed").value, speedUnit: psu, angle: $("pcAngle").value } });
    if (!r) { clearOut("Enter at least one non-negative Δv item. Specific impulse, if used, must be positive."); return; }
    $("warnings").hidden = true; $("warnings").innerHTML = "";
    setHero(fmt(r.deltaVKmS, 3), "km/s", fmt(r.deltaVMps, 1) + " m/s · " + r.count + " item" + (r.count === 1 ? "" : "s"));
    var html = stat("Total Δv", fmt(r.deltaVKmS, 4) + " km/s", fmt(r.deltaVMps, 1) + " m/s · " + fmt(r.deltaVFtS, 0) + " ft/s");
    Object.keys(r.byTag).forEach(function (t) {
      if (t === "untagged" && Object.keys(r.byTag).length === 1) return;
      html += stat((t === "untagged" ? "Untagged" : t) + " subtotal", fmt(r.byTag[t] / 1000, 3) + " km/s", fmt(r.byTag[t], 1) + " m/s");
    });
    if (r.massRatio != null) html += stat("Ideal mass ratio m0/mf", fmt(r.massRatio, 3), "propellant fraction " + fmt(r.propellantFraction, 4) + " · ve " + fmt(r.exhaustVelocity, 1) + " m/s");
    if (r.planeChange) html += stat("Plane-change helper", fmt(r.planeChange.mps / 1000, 3) + " km/s", "2 V sin(θ/2) at " + fmt(r.planeChange.speedMps / 1000, 3) + " km/s, θ = " + fmt(r.planeChange.angleDeg, 2) + "°");
    $("stat-grid").innerHTML = html;
    var rows = r.items.map(function (it) {
      return "<tr><th>" + it.name.replace(/</g, "&lt;") + "</th><td>" + fmt(it.mps, 1) + " m/s</td><td>" + (it.tag ? it.tag.replace(/</g, "&lt;") : "—") + "</td></tr>";
    }).join("");
    $("extra-results").innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr><th>Item</th><th>Δv</th><th>Tag</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
  }
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

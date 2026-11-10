(function () {
  "use strict";
  var C = window.RocketEquationCalcs;
  if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var mode = "delta-v", veUnit = "m/s", dvUnit = "m/s";
  var stages = [
    { Isp: 280, m0: 100000, mf: 20000 },
    { Isp: 450, m0: 18000, mf: 6000 }
  ];
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
  function fmt(n, d) {
    if (!isFinite(n)) return "—";
    return n.toLocaleString("en-US", { maximumFractionDigits: d == null ? 1 : d });
  }
  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value +
      "</p>" + (sub ? '<p class="stat-sub">' + sub + "</p>" : "") + "</div>";
  }
  function show() {
    $("block-single").hidden = mode === "stages";
    $("block-stages").hidden = mode !== "stages";
    $("dv-row").hidden = mode !== "mass-ratio";
    $("mass-row").hidden = mode === "mass-ratio" && false; // keep m0 available for invert
  }
  function renderStages() {
    $("stage-fields").innerHTML = stages.map(function (s, i) {
      return '<div class="card-block"><h3>Stage ' + (i + 1) + '</h3><div class="triple">' +
        '<div><label>Isp (s)</label><input class="input st-isp" data-i="'+i+'" type="number" value="'+s.Isp+'"></div>' +
        '<div><label>m0</label><input class="input st-m0" data-i="'+i+'" type="number" value="'+s.m0+'"></div>' +
        '<div><label>mf</label><input class="input st-mf" data-i="'+i+'" type="number" value="'+s.mf+'"></div>' +
        '</div></div>';
    }).join("");
  }
  bindSeg("mode", function (u) { mode = u; show(); render(); });
  bindSeg("veu", function (u) { veUnit = u; render(); });
  bindSeg("dvu", function (u) { dvUnit = u; render(); });

  function render() {
    var r;
    if (mode === "stages") {
      r = C.compute({ stages: stages });
    } else if (mode === "mass-ratio") {
      r = C.compute({ mode: "mass-ratio", Isp: $("Isp").value, ve: $("ve").value, veUnit: veUnit, deltaV: $("deltaV").value, deltaVUnit: dvUnit, m0: $("m0").value });
    } else {
      r = C.compute({ mode: "delta-v", Isp: $("Isp").value, ve: $("ve").value, veUnit: veUnit, m0: $("m0").value, mf: $("mf").value });
    }
    var warnings = $("warnings");
    if (!r) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>Enter a positive Isp or exhaust velocity, and masses with m0 &gt; mf &gt; 0 (or a required Δv to invert).</p>";
      $("out-hero").innerHTML = '<span class="num">—</span> <span class="unit"></span>';
      $("out-sub").textContent = ""; $("stat-grid").innerHTML = ""; $("extra-results").innerHTML = "";
      return;
    }
    warnings.hidden = true;
    $("out-hero").innerHTML = '<span class="num">' + fmt(r.deltaV, 0) + '</span> <span class="unit">m/s</span>';
    $("out-sub").textContent = fmt(r.deltaV / 1000, 3) + " km/s";
    if (r.stages) {
      $("stat-grid").innerHTML = r.stages.map(function (s) {
        return stat("Stage " + s.index, fmt(s.deltaV, 0) + " m/s", "MR " + fmt(s.massRatio, 3) + " · Isp " + fmt(s.Isp, 1) + " s");
      }).join("");
      $("extra-results").innerHTML = "";
    } else {
      $("stat-grid").innerHTML =
        stat("Mass ratio", fmt(r.massRatio, 4), "m0/mf") +
        stat("Isp", fmt(r.Isp, 1) + " s", "ve = " + fmt(r.ve, 1) + " m/s") +
        stat("Propellant fraction", fmt(r.propellantFraction * 100, 2) + "%", r.propellantMass != null ? fmt(r.propellantMass, 1) + " mass units" : "") +
        stat("Final mass", r.mf != null ? fmt(r.mf, 2) : "—", r.m0 != null ? "from m0 = " + fmt(r.m0, 2) : "");
      $("extra-results").innerHTML = "";
    }
  }
  $("btn-add-stage").addEventListener("click", function () {
    stages.push({ Isp: 300, m0: 10000, mf: 4000 });
    renderStages(); render();
  });
  $("stage-fields").addEventListener("input", function (ev) {
    var i = Number(ev.target.getAttribute("data-i"));
    if (!isFinite(i) || !stages[i]) return;
    if (ev.target.classList.contains("st-isp")) stages[i].Isp = ev.target.value;
    if (ev.target.classList.contains("st-m0")) stages[i].m0 = ev.target.value;
    if (ev.target.classList.contains("st-mf")) stages[i].mf = ev.target.value;
    render();
  });
  $("btn-ex").addEventListener("click", function () {
    mode = "delta-v"; $("Isp").value = "300"; $("ve").value = ""; $("m0").value = "5000"; $("mf").value = "1000";
    document.querySelectorAll('[data-unit-group="mode"]').forEach(function (b) {
      var on = b.getAttribute("data-unit") === "delta-v";
      b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    show(); render();
  });
  $("calc-form").addEventListener("input", render);
  $("calc-form").addEventListener("change", render);
  renderStages(); show(); render();
})();

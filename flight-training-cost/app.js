(function () {
  "use strict";
  var T = window.TrainingCostCalcs;
  if (!T) return;
  var $ = function (id) { return document.getElementById(id); };
  var cert = "private";
  var basis = "average";
  var applying = false;

  function money(n) {
    if (!isFinite(n)) return "—";
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  }
  function money0(n) {
    if (!isFinite(n)) return "—";
    return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  }

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

  function applyPreset() {
    var p = T.preset(cert, basis);
    if (!p) return;
    applying = true;
    $("dual").value = p.dualHours;
    $("solo").value = p.soloHours;
    $("ground").value = p.groundHours;
    $("written").value = p.knowledgeTest;
    $("dpe").value = p.checkrideFee;
    $("chk-hrs").value = p.checkrideHours;
    $("medical").value = p.medical;
    $("materials").value = p.materials;
    $("gs").value = p.groundSchool;
    applying = false;
    var info = T.CERTS[cert];
    $("cert-note").textContent = (info ? info.faaRef + " " : "") + "Changing the certificate or the hour basis reloads these starting hours and fees; your airplane and instructor rates are left alone.";
  }

  bindSeg("cert", function (u) { cert = u; applyPreset(); render(); });
  bindSeg("basis", function (u) { basis = u; applyPreset(); render(); });

  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value +
      "</p>" + (sub ? '<p class="stat-sub">' + sub + "</p>" : "") + "</div>";
  }

  function render() {
    var r = T.compute({
      dualHours: $("dual").value,
      soloHours: $("solo").value,
      groundHours: $("ground").value,
      aircraftRate: $("wet").value,
      instructorRate: $("cfi").value,
      groundSchool: $("gs").value,
      knowledgeTest: $("written").value,
      checkrideFee: $("dpe").value,
      checkrideHours: $("chk-hrs").value,
      materials: $("materials").value,
      medical: $("medical").value,
      other: $("other").value,
      contingencyPercent: $("contingency").value,
      lessonsPerWeek: $("lessons").value,
      hoursPerLesson: 1.3
    });
    var warnings = $("warnings");
    if (!r) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>Enter at least some dual or aircraft-only hours, and non-negative rates and fees.</p>";
      $("out-total").innerHTML = "<span class='num'>—</span>";
      $("stat-grid").innerHTML = "";
      $("breakdown").innerHTML = "";
      return;
    }
    warnings.hidden = true;
    var name = T.CERTS[cert] ? T.CERTS[cert].label : cert;
    $("out-total").innerHTML = "<span class='num'>" + money0(r.total) + "</span>";
    $("out-sub").textContent = name + " · " + r.flightHours.toFixed(1) + " flight hours" +
      (r.weeks ? " · about " + r.weeks.toFixed(1) + " weeks at the pace you entered" : "");
    $("stat-grid").innerHTML =
      stat("Flying (aircraft)", money0(r.groups.flying), "dual, solo/aircraft-only, and the checkride airplane") +
      stat("Instruction", money0(r.groups.instruction), "in-airplane and ground") +
      stat("Tests", money0(r.groups.testing), "knowledge test(s) and DPE fee") +
      stat("Other + contingency", money0(r.groups.other + r.contingency), money(r.contingency) + " of that is contingency");

    var lines = [
      ["Dual aircraft", r.lines.dualAircraft],
      ["Dual instructor", r.lines.dualInstructor],
      ["Aircraft-only / solo", r.lines.soloAircraft],
      ["Ground instruction", r.lines.groundInstruction],
      ["Ground school", r.lines.groundSchool],
      ["Knowledge test(s)", r.lines.knowledgeTest],
      ["Checkride / DPE", r.lines.checkrideFee],
      ["Checkride aircraft", r.lines.checkrideAircraft],
      ["Headset and materials", r.lines.materials],
      ["Medical", r.lines.medical],
      ["Other", r.lines.other],
      ["Contingency", r.contingency]
    ];
    var max = 0;
    lines.forEach(function (row) { if (row[1] > max) max = row[1]; });
    var html = '<div class="card-block"><h3>Line-item breakdown</h3>';
    lines.forEach(function (row) {
      if (row[1] === 0) return;
      var pct = max > 0 ? Math.min(100, row[1] / max * 100) : 0;
      html += '<div class="bar-row"><div class="bar-label"><span>' + row[0] + "</span><span>" + money(row[1]) +
        '</span></div><div class="bar-track"><i style="width:' + pct.toFixed(1) + '%"></i></div></div>';
    });
    if (r.monthlyBudget) {
      html += "<p class='hint' style='margin-top:0.7rem'>At this pace, budget about " + money0(r.monthlyBudget) + " a month. All-in cost per flight hour is " + money(r.costPerFlightHour) + ".</p>";
    } else {
      html += "<p class='hint' style='margin-top:0.7rem'>All-in cost per flight hour is " + money(r.costPerFlightHour) + ".</p>";
    }
    html += "</div>";
    $("breakdown").innerHTML = html;
  }

  $("calc-form").addEventListener("input", function () { if (!applying) render(); });
  $("calc-form").addEventListener("change", function () { if (!applying) render(); });
  applyPreset();
  render();
})();

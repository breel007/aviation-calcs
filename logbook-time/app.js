(function () {
  "use strict";
  var C = window.LogbookTimeCalcs;
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
  var started = false;
  function todayYmd() {
    var n = new Date();
    var m = n.getMonth() + 1, d = n.getDate();
    return n.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (d < 10 ? "0" : "") + d;
  }
  function rowHtml(id, p) {
    p = p || {};
    function chk(name, label) {
      var on = p[name] ? " checked" : "";
      return '<label class="check-row"><input type="checkbox" data-flag="' + name + '"' + on + '> ' + label + "</label>";
    }
    return '<div class="card-block entry" data-row="' + id + '">' +
      '<div class="pair">' +
      '<div class="field-block" style="margin:0"><div class="field-label-row"><label for="' + id + '-date">Date</label><span class="sublabel">optional</span></div>' +
      '<input id="' + id + '-date" class="input" type="date" value="' + (p.date || "") + '"></div>' +
      '<div class="field-block" style="margin:0"><div class="field-label-row"><label for="' + id + '-dur">Duration</label><span class="sublabel">H:MM or decimal hours</span></div>' +
      '<input id="' + id + '-dur" class="input" type="text" inputmode="decimal" placeholder="1:30 or 1.5" value="' + (p.dur || "") + '" autocomplete="off"></div></div>' +
      '<div class="flag-grid">' +
      chk("pic", "PIC") + chk("sic", "SIC") + chk("solo", "Solo") + chk("dual", "Dual received") +
      chk("night", "Night") + chk("xc", "Cross-country") + chk("actualInst", "Actual instrument") + chk("simInst", "Simulated instrument") +
      "</div>" +
      '<div class="pair" style="margin-top:0.7rem">' +
      '<div class="field-block" style="margin:0"><div class="field-label-row"><label for="' + id + '-dayL">Day landings</label></div>' +
      '<input id="' + id + '-dayL" class="input" type="number" inputmode="numeric" min="0" step="1" value="' + (p.dayLandings != null ? p.dayLandings : "") + '"></div>' +
      '<div class="field-block" style="margin:0"><div class="field-label-row"><label for="' + id + '-nightL">Night landings</label></div>' +
      '<input id="' + id + '-nightL" class="input" type="number" inputmode="numeric" min="0" step="1" value="' + (p.nightLandings != null ? p.nightLandings : "") + '"></div></div>' +
      '<p style="margin:0.6rem 0 0"><button type="button" class="btn btn-ghost btn-remove">Remove flight</button></p></div>';
  }
  var seq = 0;
  function addRow(preset) {
    seq += 1;
    var id = "r" + seq;
    var holder = document.createElement("div");
    holder.innerHTML = rowHtml(id, preset);
    var block = holder.firstChild;
    $("entries").appendChild(block);
    block.querySelector(".btn-remove").addEventListener("click", function () { block.remove(); render(); });
    block.querySelectorAll("input").forEach(function (el) { el.addEventListener("input", render); el.addEventListener("change", render); });
  }
  function parseDur(s) {
    s = String(s || "").trim();
    if (!s) return null;
    if (s.indexOf(":") >= 0) return { hhmm: s };
    return { decimalHours: s };
  }
  function readEntries() {
    var out = [];
    $("entries").querySelectorAll(".entry").forEach(function (block) {
      var durEl = block.querySelector('input[id$="-dur"]');
      var dateEl = block.querySelector('input[id$="-date"]');
      var parsed = parseDur(durEl.value);
      var e = { date: dateEl.value };
      if (parsed) { if (parsed.hhmm) e.hhmm = parsed.hhmm; if (parsed.decimalHours) e.decimalHours = parsed.decimalHours; }
      block.querySelectorAll("input[data-flag]").forEach(function (cb) { e[cb.getAttribute("data-flag")] = cb.checked; });
      e.dayLandings = block.querySelector('input[id$="-dayL"]').value;
      e.nightLandings = block.querySelector('input[id$="-nightL"]').value;
      out.push(e);
    });
    return out;
  }
  function catLine(label, hours, hm, tenths) {
    if (!hours) return "";
    return stat(label, hm, fmt(hours, 3) + " h exact · " + fmt(tenths, 1) + " in tenths");
  }
  function show() {
    if (started) return;
    started = true;
    if (!$("asOf").value) $("asOf").value = todayYmd();
    addRow({});
    addRow({});
  }
  $("btn-add").addEventListener("click", function () { addRow({}); render(); });
  $("btn-clear").addEventListener("click", function () { $("entries").innerHTML = ""; addRow({}); render(); });
  $("btn-ex").addEventListener("click", function () {
    $("entries").innerHTML = "";
    $("asOf").value = "2026-11-10";
    addRow({ date: "2026-11-01", dur: "1:20", pic: true, xc: true, dayLandings: 2 });
    addRow({ date: "2026-11-08", dur: "2:45", pic: true, night: true, nightLandings: 3 });
    render();
  });
  function render() {
    var r = C.compute({ asOf: $("asOf").value, entries: readEntries() });
    if (!r) { clearOut("Add at least one flight with a duration as H:MM (for example 1:30) or decimal hours (1.5). Dates, if used, must be valid calendar dates."); return; }
    var warn = "";
    if (r.undatedCount) warn = r.undatedCount + " flight" + (r.undatedCount > 1 ? "s have" : " has") + " no date and " + (r.undatedCount > 1 ? "are" : "is") + " included in the all-time total only, not in the period windows.";
    $("warnings").hidden = !warn; $("warnings").innerHTML = warn ? "<p>" + warn + "</p>" : "";
    var a = r.all;
    setHero(a.timeHm, "hours", fmt(a.timeHours, 3) + " h exact · " + fmt(a.timeTenths, 1) + " in tenths · " + a.count + " flight" + (a.count === 1 ? "" : "s"));
    var html = catLine("PIC", a.picHours, a.picHm, a.picTenths) +
      catLine("SIC", a.sicHours, a.sicHm, a.sicTenths) +
      catLine("Solo", a.soloHours, a.soloHm, a.soloTenths) +
      catLine("Dual received", a.dualHours, a.dualHm, a.dualTenths) +
      catLine("Night", a.nightHours, a.nightHm, a.nightTenths) +
      catLine("Cross-country", a.xcHours, a.xcHm, a.xcTenths) +
      catLine("Actual instrument", a.actualInstHours, a.actualInstHm, a.actualInstTenths) +
      catLine("Simulated instrument", a.simInstHours, a.simInstHm, a.simInstTenths) +
      stat("Landings", String(a.landings), a.landingsDay + " day · " + a.landingsNight + " night");
    $("stat-grid").innerHTML = html;
    function winRow(label, w, start) {
      return "<tr><th>" + label + "</th><td>" + (w.count ? w.timeHm + " (" + fmt(w.timeTenths, 1) + " tenths)" : "—") + "</td><td>" + start + " to " + r.asOf + "</td></tr>";
    }
    $("extra-results").innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr><th>Window</th><th>Total time</th><th>Dates included</th></tr></thead><tbody>' +
      winRow("Preceding 90 days", r.days90, r.windows.days90Start) +
      winRow("Rolling 6 months", r.months6, r.windows.months6Start) +
      winRow("Rolling 12 months", r.months12, r.windows.months12Start) +
      winRow("Calendar year to date", r.yearToDate, r.windows.yearToDateStart) +
      "</tbody></table></div><p class=\"hint\">These windows are bookkeeping, not a 61.57 currency determination.</p>";
  }
  var form = $("calc-form");
  if (form) {
    form.addEventListener("input", render);
    form.addEventListener("change", render);
  }
  if (typeof show === "function") show();
  render();
})();

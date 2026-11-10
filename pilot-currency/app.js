/**
 * UI for the FAA pilot currency checker.
 * Date math lives in calc.js (PilotCurrency).
 */
(function () {
  "use strict";

  var PC = window.PilotCurrency;
  if (!PC) return;

  var elAsOf = document.getElementById("as-of");
  var elDay = document.getElementById("day-ldg");
  var elNight = document.getElementById("night-ldg");
  var elIfr = document.getElementById("ifr-date");
  var elReview = document.getElementById("review");
  var elExam = document.getElementById("exam");
  var elDob = document.getElementById("dob");
  var elCme = document.getElementById("cme");
  var elCourse = document.getElementById("course");
  var warnings = document.getElementById("warnings");
  var cards = document.getElementById("cards");

  var medClass = "third";
  var priv = "third";

  function todayISO() {
    var d = new Date();
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
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
  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function statusLabel(s) {
    if (s === "current") return "Current";
    if (s === "expired") return "Expired";
    if (s === "grace") return "Grace period";
    if (s === "ipc-required") return "IPC required";
    if (s === "not-applicable") return "Not applicable";
    return "Not entered";
  }

  function card(title, block, extraNote) {
    var status = (block && block.status) || "unknown";
    var pill = '<span class="status-pill status-' + status + '">' + esc(statusLabel(status)) + "</span>";
    var expires = block && block.expiresOn ? PC.formatLong(block.expiresOn) :
      (block && block.currentThrough ? PC.formatLong(block.currentThrough) : "");
    var body = "";
    if (status === "unknown" && block && block.note) body = "<p>" + esc(block.note) + "</p>";
    else {
      if (status === "current" && expires) body += "<p>Current through <strong>" + esc(expires) + "</strong>.</p>";
      if (status === "expired" && expires) body += "<p>Expired after <strong>" + esc(expires) + "</strong>.</p>";
      if (status === "grace") {
        body += "<p>Instrument currency lapsed after <strong>" + esc(PC.formatLong(block.currentThrough)) + "</strong>. Grace period runs through <strong>" + esc(PC.formatLong(block.graceThrough)) + "</strong>.</p>";
      }
      if (status === "ipc-required") {
        body += "<p>Grace period ended <strong>" + esc(PC.formatLong(block.graceThrough)) + "</strong>. An instrument proficiency check is required.</p>";
      }
      if (block && block.daysRemaining != null && (status === "current" || status === "grace")) {
        var n = block.daysRemaining;
        body += "<p>" + (n === 0 ? "Expires today." : n === 1 ? "1 day remaining." : n + " days remaining.") + "</p>";
      }
      if (block && block.note) body += "<p>" + esc(block.note) + "</p>";
      if (extraNote) body += "<p>" + extraNote + "</p>";
    }
    var cite = block && block.citation ? '<p class="cite">' + esc(block.citation) + "</p>" : "";
    return '<article class="status-card" data-status="' + status + '"><h3>' + esc(title) + pill + "</h3>" + body + cite + "</article>";
  }

  function render() {
    if (!elAsOf.value) elAsOf.value = todayISO();
    var result = PC.compute({
      asOf: elAsOf.value,
      dayLandingDate: elDay.value || undefined,
      nightLandingDate: elNight.value || undefined,
      instrumentDate: elIfr.value || undefined,
      flightReviewDate: elReview.value || undefined,
      examDate: elExam.value || undefined,
      dateOfBirth: elDob.value || undefined,
      medicalClass: medClass,
      desiredPrivileges: priv,
      basicMedCmeDate: elCme.value || undefined,
      basicMedCourseDate: elCourse.value || undefined
    });
    if (result.error) {
      showWarnings([result.error]);
      cards.innerHTML = "";
      return;
    }
    showWarnings([]);

    var html = "";
    html += card("Day passenger currency", result.dayPassenger);
    html += card("Night passenger currency", result.nightPassenger);
    html += card("Instrument / IFR currency", result.instrument);
    html += card("Flight review", result.flightReview);

    var medExtra = "";
    if (result.medical && result.medical.durations) {
      var d = result.medical.durations;
      var bits = [];
      if (d.firstClassExpires) bits.push("1st class through " + PC.formatLong(d.firstClassExpires));
      if (d.secondClassExpires) bits.push("2nd class through " + PC.formatLong(d.secondClassExpires));
      if (d.thirdClassExpires) bits.push("3rd class through " + PC.formatLong(d.thirdClassExpires));
      bits.push("age " + d.ageAtExam + " at exam");
      medExtra = esc(bits.join(" · "));
    }
    html += card("Medical certificate", result.medical, medExtra);

    if (result.basicMed) {
      var bm = result.basicMed;
      var bmBlock = {
        status: bm.status,
        citation: bm.citation,
        expiresOn: null,
        note: (bm.cme.expiresOn ? "CME current through " + PC.formatLong(bm.cme.expiresOn) + ". " : "No CME date. ") +
          (bm.course.expiresOn ? "Course current through " + PC.formatLong(bm.course.expiresOn) + "." : "No course date.")
      };
      if (bm.status === "current") {
        var a = bm.cme.expiresOn, b = bm.course.expiresOn;
        bmBlock.expiresOn = (!a ? b : !b ? a : (a.getTime() < b.getTime() ? a : b));
        bmBlock.daysRemaining = bmBlock.expiresOn ? Math.round((bmBlock.expiresOn.getTime() - result.asOf.getTime()) / 86400000) : null;
      }
      html += card("BasicMed", bmBlock);
    }
    cards.innerHTML = html;
  }

  document.querySelectorAll("[data-unit-group]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var group = btn.getAttribute("data-unit-group");
      var value = btn.getAttribute("data-unit");
      if (group === "medclass") medClass = value;
      if (group === "priv") priv = value;
      setSeg(group, value);
      render();
    });
  });

  ["as-of", "day-ldg", "night-ldg", "ifr-date", "review", "exam", "dob", "cme", "course"].forEach(function (id) {
    document.getElementById(id).addEventListener("change", render);
    document.getElementById(id).addEventListener("input", render);
  });

  document.getElementById("btn-example").addEventListener("click", function () {
    elAsOf.value = "2026-01-01";
    elDay.value = "2025-11-01";
    elNight.value = "2025-09-01";
    elIfr.value = "2025-09-15";
    elReview.value = "2024-06-20";
    elExam.value = "2024-07-15";
    elDob.value = "1990-01-01";
    elCme.value = "2023-01-10";
    elCourse.value = "2024-06-01";
    medClass = "third"; priv = "third";
    setSeg("medclass", "third"); setSeg("priv", "third");
    render();
  });
  document.getElementById("btn-reset").addEventListener("click", function (e) {
    e.preventDefault();
    elAsOf.value = todayISO();
    ["day-ldg", "night-ldg", "ifr-date", "review", "exam", "dob", "cme", "course"].forEach(function (id) {
      document.getElementById(id).value = "";
    });
    render();
  });

  if (!elAsOf.value) elAsOf.value = todayISO();
  render();
})();

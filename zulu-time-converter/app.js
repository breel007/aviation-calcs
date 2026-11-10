(function () {
  "use strict";
  var Z = window.ZuluTimeCalcs;
  if (!Z) return;
  var $ = function (id) { return document.getElementById(id); };
  var depIsZulu = true;

  function fillZones(sel, preferred) {
    sel.innerHTML = "";
    Z.ZONES.forEach(function (z) {
      var o = document.createElement("option");
      o.value = z.id;
      o.textContent = z.label;
      sel.appendChild(o);
    });
    if (preferred) sel.value = preferred;
  }

  function guessZone() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York"; }
    catch (e) { return "America/New_York"; }
  }

  var localGuess = guessZone();
  var known = Z.ZONES.some(function (z) { return z.id === localGuess; });
  if (!known) {
    Z.ZONES.splice(1, 0, { id: localGuess, label: "This device (" + localGuess + ")" });
  }
  fillZones($("from-zone"), localGuess);
  fillZones($("to-zone"), "UTC");
  fillZones($("dep-zone"), localGuess);
  fillZones($("arr-zone"), "America/Los_Angeles");

  document.querySelectorAll('[data-unit-group="dep"]').forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll('[data-unit-group="dep"]').forEach(function (b) {
        b.classList.toggle("is-active", b === btn);
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });
      depIsZulu = btn.getAttribute("data-unit") === "zulu";
      render();
    });
  });

  function todayISO() {
    var n = new Date();
    var p = Z.partsInZone(n.getTime(), localGuess);
    function pad(x) { return x < 10 ? "0" + x : String(x); }
    return p.year + "-" + pad(p.month) + "-" + pad(p.day);
  }
  if (!$("date").value) $("date").value = todayISO();

  function clock(p, withSec) {
    function pad(x) { return x < 10 ? "0" + x : String(x); }
    return pad(p.hour) + ":" + pad(p.minute) + (withSec ? ":" + pad(p.second) : "");
  }
  function longDate(p) {
    return p.weekday + " " + p.year + "-" + (p.month < 10 ? "0" : "") + p.month + "-" + (p.day < 10 ? "0" : "") + p.day;
  }
  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value +
      "</p>" + (sub ? '<p class="stat-sub">' + sub + "</p>" : "") + "</div>";
  }

  function tick() {
    var now = Date.now();
    var u = Z.partsInZone(now, "UTC");
    $("live-zulu").innerHTML = '<span class="num">' + Z.formatZulu(u.hour, u.minute, u.second) + "</span>";
    $("live-zulu-sub").textContent = longDate(u) + " · " + clock(u, true) + " UTC · from this device’s clock";
  }

  function render() {
    var warnings = $("warnings");
    var conv = Z.convert({
      date: $("date").value,
      time: $("time").value,
      fromZone: $("from-zone").value,
      toZone: $("to-zone").value
    });
    var msgs = [];
    if (!conv) {
      msgs.push("Enter a date and a time (1430, 14:30, or 2:30 PM).");
    } else {
      if (conv.gap) msgs.push("That civil time does not exist in the source zone (a spring-forward gap). The nearest valid instant is shown.");
      if (conv.ambiguous) msgs.push("That civil time happens twice in the source zone (a fall-back overlap). The first occurrence is used.");
      $("stat-grid").innerHTML =
        stat("In the source zone", clock(conv.from.parts, true), (conv.from.abbrev || "") + " · " + conv.from.offsetLabel + " · " + longDate(conv.from.parts)) +
        stat("Zulu", conv.utc.zulu, clock(conv.utc.parts, true) + " UTC · " + longDate(conv.utc.parts)) +
        stat("In the destination zone", clock(conv.to.parts, true), (conv.to.abbrev || "") + " · " + conv.to.offsetLabel + " · " + longDate(conv.to.parts)) +
        stat("Date change", conv.to.dateChanged ? "Yes" : "No", conv.to.dateChanged ? "The destination calendar date is different." : "Same civil date.");
    }

    var eta = Z.eta({
      date: $("date").value,
      time: $("eta-time").value,
      ete: $("ete").value,
      departIsZulu: depIsZulu,
      departZone: $("dep-zone").value,
      arriveZone: $("arr-zone").value
    });
    if (eta) {
      if (eta.gap) msgs.push("The departure civil time falls in a spring-forward gap.");
      if (eta.ambiguous) msgs.push("The departure civil time is ambiguous at a fall-back.");
      $("eta-card").innerHTML = '<div class="card-block"><h3>Flight-plan ETA</h3><p>Depart <strong>' +
        eta.departZulu + "</strong> (" + clock(eta.departLocal) + " local at departure). After " +
        eta.eteHours.toFixed(2) + " hours, arrive <strong>" + eta.arriveZulu + "</strong> — " +
        clock(eta.arriveLocal) + " " + longDate(eta.arriveLocal) + " at the destination" +
        (eta.arriveDateChanged ? " (the destination date has rolled)" : "") + ".</p></div>";
    } else {
      $("eta-card").innerHTML = "";
    }

    if (msgs.length) {
      warnings.hidden = false;
      warnings.innerHTML = msgs.map(function (m) { return "<p>" + m + "</p>"; }).join("");
    } else {
      warnings.hidden = true;
      warnings.innerHTML = "";
    }
    if (!conv) $("stat-grid").innerHTML = "";
  }

  setInterval(tick, 1000);
  tick();
  $("calc-form").addEventListener("input", render);
  $("calc-form").addEventListener("change", render);
  render();
})();

(function () {
  "use strict";
  var H = window.HoldingEntryCalcs;
  if (!H) return;
  var $ = function (id) { return document.getElementById(id); };
  var turn = "right";

  document.querySelectorAll('[data-unit-group="turn"]').forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll('[data-unit-group="turn"]').forEach(function (b) {
        b.classList.toggle("is-active", b === btn);
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });
      turn = btn.getAttribute("data-unit");
      render();
    });
  });

  function fmtHdg(d) {
    var n = Math.round(((d % 360) + 360) % 360);
    if (n === 0) n = 360;
    var s = String(n);
    while (s.length < 3) s = "0" + s;
    return s + "°";
  }
  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value +
      "</p>" + (sub ? '<p class="stat-sub">' + sub + "</p>" : "") + "</div>";
  }

  function polar(cx, cy, r, deg) {
    // 0° is up (north / inbound drawn upward after we rotate the scene).
    var rad = (deg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function draw(r) {
    var cx = 160, cy = 160, R = 120;
    // Rotate so the inbound course points up the page (toward the top).
    var rot = r.inbound; // heading that should point up
    function rel(hdg) { return ((hdg - rot) + 360) % 360; }
    function pt(hdg, rad) { return polar(cx, cy, rad == null ? R : rad, rel(hdg)); }

    function sectorPath(fromHdg, toHdg, color, extra) {
      // Sweep clockwise in heading (which is clockwise on the screen after our polar).
      var a0 = rel(fromHdg);
      var a1 = rel(toHdg);
      var sweep = (a1 - a0 + 360) % 360;
      if (sweep === 0) sweep = 360;
      var large = sweep > 180 ? 1 : 0;
      var p0 = polar(cx, cy, R, a0);
      var p1 = polar(cx, cy, R, a1);
      return '<path d="M ' + cx + " " + cy + " L " + p0.x.toFixed(1) + " " + p0.y.toFixed(1) +
        " A " + R + " " + R + " 0 " + large + " 1 " + p1.x.toFixed(1) + " " + p1.y.toFixed(1) +
        ' Z" fill="' + color + '" fill-opacity="0.28"' + (extra || "") + "/>";
    }

    var svg = '<svg viewBox="0 0 320 320" role="img" aria-label="Holding pattern entry sectors">';
    svg += '<rect width="320" height="320" fill="#0c121f"/>';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="rgba(231,238,248,0.15)"/>';

    // Sectors in absolute heading. For right turns:
    // Direct: from inbound+250 to inbound+70 (crossing inbound)
    // Parallel: inbound+70 to inbound+180
    // Teardrop: inbound+180 to inbound+250
    if (r.standard) {
      svg += sectorPath(r.inbound + 250, r.inbound + 70, "#6fe3d0");
      svg += sectorPath(r.inbound + 70, r.inbound + 180, "#f0a35a");
      svg += sectorPath(r.inbound + 180, r.inbound + 250, "#e8b84a");
    } else {
      svg += sectorPath(r.inbound + 290, r.inbound + 110, "#6fe3d0");
      svg += sectorPath(r.inbound + 110, r.inbound + 180, "#e8b84a");
      svg += sectorPath(r.inbound + 180, r.inbound + 290, "#f0a35a");
    }

    // Racetrack: inbound comes from the bottom toward the fix (center).
    // Holding side is to the right for standard, left for nonstandard.
    var side = r.standard ? 1 : -1;
    var inboundTail = polar(cx, cy, 70, 180); // bottom, since inbound points up
    var inboundHead = { x: cx, y: cy };
    var outStart = { x: cx + side * 48, y: cy };
    var outEnd = { x: cx + side * 48, y: cy + 70 };
    svg += '<path d="M ' + inboundTail.x + " " + inboundTail.y + " L " + cx + " " + cy +
      " A 24 24 0 0 " + (r.standard ? 1 : 0) + " " + outStart.x + " " + outStart.y +
      " L " + outEnd.x + " " + outEnd.y +
      " A 24 24 0 0 " + (r.standard ? 1 : 0) + " " + inboundTail.x + " " + inboundTail.y +
      '" fill="none" stroke="#e7eef8" stroke-width="2.2"/>';
    // Inbound arrow
    svg += '<polygon points="' + cx + "," + (cy - 8) + " " + (cx - 5) + "," + (cy + 4) + " " + (cx + 5) + "," + (cy + 4) + '" fill="#e7eef8"/>';
    svg += '<text x="' + cx + '" y="' + (cy + 92) + '" fill="#8b97ad" font-size="11" text-anchor="middle" font-family="IBM Plex Sans,sans-serif">Inbound ' + fmtHdg(r.inbound) + "</text>";

    // Aircraft heading tick
    var hp = polar(cx, cy, R + 14, rel(r.heading));
    var hp2 = polar(cx, cy, R - 8, rel(r.heading));
    svg += '<line x1="' + hp2.x.toFixed(1) + '" y1="' + hp2.y.toFixed(1) + '" x2="' + hp.x.toFixed(1) + '" y2="' + hp.y.toFixed(1) + '" stroke="#e7eef8" stroke-width="3" stroke-linecap="round"/>';
    svg += '<circle cx="' + hp.x.toFixed(1) + '" cy="' + hp.y.toFixed(1) + '" r="4" fill="#e7eef8"/>';
    var lab = polar(cx, cy, R + 28, rel(r.heading));
    svg += '<text x="' + lab.x.toFixed(1) + '" y="' + (lab.y + 4).toFixed(1) + '" fill="#e7eef8" font-size="11" text-anchor="middle" font-family="IBM Plex Sans,sans-serif">HDG ' + fmtHdg(r.heading) + "</text>";
    svg += "</svg>";
    $("diagram").innerHTML = svg;
  }

  function render() {
    var r = H.compute({
      inbound: $("inbound").value,
      heading: $("heading").value,
      turn: turn,
      altitude: $("altitude").value,
      tas: $("tas").value
    });
    var warnings = $("warnings");
    if (!r) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>Enter an inbound course and a heading, and choose right or left turns.</p>";
      $("out-entry").innerHTML = '<span class="num">—</span>';
      $("stat-grid").innerHTML = "";
      $("procedure").textContent = "";
      $("diagram").innerHTML = "";
      return;
    }
    warnings.hidden = true;
    if (r.nearBoundary || r.alternate) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>Your heading is on or within 5° of a sector boundary. AIM 5-3-8 allows either adjacent entry; this page highlights " +
        r.entry + (r.alternate ? " (or " + r.alternate + ")" : "") + ".</p>";
    }
    var label = r.entry.charAt(0).toUpperCase() + r.entry.slice(1);
    $("out-entry").innerHTML = '<span class="num">' + label + "</span>";
    $("out-sub").textContent = "Inbound " + fmtHdg(r.inbound) + " · outbound " + fmtHdg(r.outbound) +
      " · " + (r.standard ? "right (standard) turns" : "left turns") +
      (r.alternate ? " · " + r.alternate + " also acceptable" : "");
    $("procedure").textContent = r.procedure;
    var html = "";
    html += stat("Relative heading", Math.round(r.relative) + "°", "heading minus inbound, 0–360");
    html += stat("Teardrop heading", fmtHdg(r.teardropHeading), "outbound ± 30° toward the holding side");
    if (r.speeds) html += stat("Max holding speed", r.speeds.maxKias + " KIAS", r.speeds.band + (r.speeds.exception210 ? " (some patterns 210)" : ""));
    if (r.timing) html += stat("Inbound leg", r.timing.inboundMin + " min", r.timing.note + (r.legNm ? " · about " + r.legNm.toFixed(1) + " NM at the TAS you entered" : ""));
    $("stat-grid").innerHTML = html;
    draw(r);
  }

  $("btn-example").addEventListener("click", function () {
    $("inbound").value = "360";
    $("heading").value = "90";
    $("altitude").value = "4000";
    $("tas").value = "100";
    render();
  });
  $("calc-form").addEventListener("input", render);
  $("calc-form").addEventListener("change", render);
  render();
})();

/**
 * UI for the crosswind component calculator.
 * Math lives in calc.js (CrosswindCalcs).
 */
(function () {
  "use strict";

  var CW = window.CrosswindCalcs;
  if (!CW) return;

  var form = document.getElementById("calc-form");
  var elRunway = document.getElementById("runway");
  var elDir = document.getElementById("wind-dir");
  var elSpd = document.getElementById("wind-spd");
  var elGust = document.getElementById("wind-gust");
  var elVar = document.getElementById("variation");
  var elMax = document.getElementById("max-xw");
  var elVarRow = document.getElementById("var-row");
  var warnings = document.getElementById("warnings");
  var endsGrid = document.getElementById("ends-grid");
  var diagram = document.getElementById("diagram");
  var caption = document.getElementById("diagram-caption");

  var rwyMode = "runway";
  var spdUnit = "kt";
  var windRef = "magnetic";
  var varEW = "E";
  var syncing = false;

  function parseNumber(input) {
    if (!input) return NaN;
    var raw = String(input.value).trim().replace(",", ".");
    if (raw === "") return NaN;
    return Number(raw);
  }

  function hasValue(input) {
    return input && String(input.value).trim() !== "";
  }

  function unitLabel() {
    return spdUnit === "mph" ? "mph" : "kt";
  }

  function fmt(n, digits) {
    if (!isFinite(n)) return "—";
    var d = digits == null ? 1 : digits;
    var v = Math.abs(n) < 0.05 ? 0 : n;
    return (Math.abs(v) < 10 ? v.toFixed(d) : v.toFixed(d)).replace(/\.0$/, v % 1 === 0 ? function () { return ""; } : function (s) { return s; });
  }

  function fmtSpd(n) {
    if (!isFinite(n)) return "—";
    var rounded = Math.abs(n) < 0.05 ? 0 : Math.round(n * 10) / 10;
    var text = (rounded === Math.floor(rounded) ? String(rounded) : rounded.toFixed(1));
    return text + " " + unitLabel();
  }

  function setSeg(group, value) {
    document.querySelectorAll('[data-unit-group="' + group + '"]').forEach(function (btn) {
      var active = btn.getAttribute("data-unit") === value;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function showWarnings(notes) {
    if (!notes.length) {
      warnings.hidden = true;
      warnings.innerHTML = "";
      return;
    }
    warnings.hidden = false;
    warnings.innerHTML = notes.map(function (n) { return "<p>" + n + "</p>"; }).join("");
  }

  function flowLabel(comp, gustComp) {
    var main;
    if (comp.flow === "headwind") main = fmtSpd(comp.headwindAbs) + " headwind";
    else if (comp.flow === "tailwind") main = fmtSpd(comp.headwindAbs) + " tailwind";
    else main = "no along-runway component";
    if (gustComp) {
      var gFlow = gustComp.flow === "tailwind" ? "tailwind" : gustComp.flow === "headwind" ? "headwind" : "along-runway";
      main += "  ·  gust " + fmtSpd(gustComp.headwindAbs) + " " + gFlow;
    }
    return main;
  }

  function crossLabel(comp, gustComp) {
    var side = comp.crossFrom === "right" ? "from the right" : comp.crossFrom === "left" ? "from the left" : "none";
    var main = comp.crossFrom === "none" ? "no crosswind" : fmtSpd(comp.crosswindAbs) + " " + side;
    if (gustComp && gustComp.crossFrom !== "none") {
      var gSide = gustComp.crossFrom === "right" ? "from the right" : "from the left";
      main += "  ·  gust " + fmtSpd(gustComp.crosswindAbs) + " " + gSide;
    }
    return main;
  }

  function compareNote(cmp) {
    if (!cmp) return "";
    var bits = [];
    if (cmp.sustainedExceeds) bits.push("Sustained crosswind exceeds the " + fmtSpd(cmp.maxDemonstrated) + " demonstrated figure.");
    else bits.push("Sustained crosswind is within the " + fmtSpd(cmp.maxDemonstrated) + " demonstrated figure (margin " + fmtSpd(cmp.sustainedMargin) + ").");
    if (cmp.gustMargin != null) {
      if (cmp.gustExceeds) bits.push("Gust crosswind exceeds the demonstrated figure.");
      else bits.push("Gust crosswind is within the demonstrated figure.");
    }
    bits.push("Demonstrated crosswind is usually not a POH limitation.");
    return bits.join(" ");
  }

  function renderEnd(title, kicker, rwy, comp, gust, cmp, preferred) {
    var status = "";
    if (cmp && (cmp.gustExceeds || cmp.sustainedExceeds)) {
      status = '<p class="stat-sub status-out">' + compareNote(cmp) + "</p>";
    } else if (cmp) {
      status = '<p class="stat-sub status-in">' + compareNote(cmp) + "</p>";
    }
    return (
      '<article class="end-card' + (preferred ? " is-preferred" : "") + '">' +
        '<p class="end-kicker">' + kicker + "</p>" +
        "<h3>Runway " + rwy.label + " <span class=\"mute\">(" + Math.round(rwy.heading) + "°)</span>" +
          (preferred ? '<span class="pref-pill">Headwind end</span>' : "") +
        "</h3>" +
        '<div class="end-values">' +
          '<div><p class="stat-label">Crosswind</p><p class="stat-value">' + crossLabel(comp, gust) + "</p></div>" +
          '<div><p class="stat-label">Along the runway</p><p class="stat-value">' + flowLabel(comp, gust) + "</p></div>" +
        "</div>" +
        status +
      "</article>"
    );
  }

  function polar(cx, cy, headingDeg, r) {
    var rad = headingDeg * Math.PI / 180;
    return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
  }

  function svgEl(name, attrs, text) {
    var s = "<" + name;
    Object.keys(attrs).forEach(function (k) {
      s += " " + k + "=\"" + attrs[k] + "\"";
    });
    if (text != null) return s + ">" + text + "</" + name + ">";
    return s + "/>";
  }

  function renderDiagram(result) {
    var size = 400;
    var cx = 200;
    var cy = 200;
    var r = 150;
    var hdg = result.runway.heading;
    var windFrom = result.windMagnetic;
    var a = polar(cx, cy, hdg, 118);
    var b = polar(cx, cy, hdg + 180, 118);
    var windTip = polar(cx, cy, windFrom, 28);
    var windTail = polar(cx, cy, windFrom, 132);
    // Component vectors from airport center along / across runway, scaled by 4 px/kt-or-mph (capped)
    var scale = 3.2;
    var xw = result.thisEnd.crosswind;
    var hw = result.thisEnd.headwind;
    var acrossHdg = hdg + 90; // right-hand side of the heading
    var xwEnd = polar(cx, cy, xw >= 0 ? acrossHdg : acrossHdg + 180, Math.min(110, Math.abs(xw) * scale));
    var hwEnd = polar(cx, cy, hw >= 0 ? hdg : hdg + 180, Math.min(110, Math.abs(hw) * scale));

    var parts = [];
    parts.push(svgEl("circle", { cx: cx, cy: cy, r: r, fill: "none", stroke: "#2a3548", "stroke-width": "1.5" }));
    parts.push(svgEl("circle", { cx: cx, cy: cy, r: 4, fill: "#e8b84a" }));
    ["N", "E", "S", "W"].forEach(function (lab, i) {
      var p = polar(cx, cy, i * 90, r + 16);
      parts.push(svgEl("text", {
        x: p.x, y: p.y, fill: "#8b97ad", "font-size": "13",
        "text-anchor": "middle", "dominant-baseline": "middle"
      }, lab));
    });
    // Runway
    parts.push(svgEl("line", {
      x1: a.x, y1: a.y, x2: b.x, y2: b.y,
      stroke: "#e8b84a", "stroke-width": "10", "stroke-linecap": "round"
    }));
    parts.push(svgEl("line", {
      x1: a.x, y1: a.y, x2: b.x, y2: b.y,
      stroke: "#0c121f", "stroke-width": "3", "stroke-linecap": "round", "stroke-dasharray": "8 8"
    }));
    var nose = polar(cx, cy, hdg, 118);
    parts.push(svgEl("text", {
      x: nose.x, y: nose.y, fill: "#e8b84a", "font-size": "12", "font-weight": "700",
      "text-anchor": "middle", "dominant-baseline": "middle",
      transform: "translate(0, " + (nose.y < cy ? -12 : 14) + ")"
    }, result.runway.label));
    var tail = polar(cx, cy, hdg + 180, 118);
    parts.push(svgEl("text", {
      x: tail.x, y: tail.y, fill: "#8b97ad", "font-size": "12", "font-weight": "600",
      "text-anchor": "middle", "dominant-baseline": "middle",
      transform: "translate(0, " + (tail.y < cy ? -12 : 14) + ")"
    }, result.reciprocal.label));
    // Wind from
    parts.push(svgEl("line", {
      x1: windTail.x, y1: windTail.y, x2: windTip.x, y2: windTip.y,
      stroke: "#6fe3d0", "stroke-width": "3", "stroke-linecap": "round",
      "marker-end": "url(#arrow-cyan)"
    }));
    // Components
    parts.push(svgEl("line", {
      x1: cx, y1: cy, x2: xwEnd.x, y2: xwEnd.y,
      stroke: "#f0a35a", "stroke-width": "2.5", "stroke-linecap": "round",
      "marker-end": "url(#arrow-warn)"
    }));
    parts.push(svgEl("line", {
      x1: cx, y1: cy, x2: hwEnd.x, y2: hwEnd.y,
      stroke: "#7dcf7d", "stroke-width": "2.5", "stroke-linecap": "round",
      "marker-end": "url(#arrow-ok)"
    }));

    var desc = "North-up wind diagram. Runway " + result.runway.label +
      " is aligned on heading " + Math.round(hdg) +
      " degrees. Wind is from " + Math.round(windFrom) +
      " degrees at " + fmtSpd(result.speed) +
      ". Crosswind " + crossLabel(result.thisEnd, result.thisGust) +
      ", " + flowLabel(result.thisEnd, result.thisGust) + " on runway " + result.runway.label + ".";

    var markers = [
      '<defs>',
      '<marker id="arrow-cyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#6fe3d0"/></marker>',
      '<marker id="arrow-warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#f0a35a"/></marker>',
      '<marker id="arrow-ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#7dcf7d"/></marker>',
      '</defs>'
    ].join("");

    diagram.innerHTML =
      '<svg viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="' + desc.replace(/"/g, "'") + '">' +
      markers + parts.join("") + "</svg>";
    caption.textContent = "North-up, magnetic. Teal arrow is the wind coming from " +
      Math.round(windFrom) + "°. Gold bar is the runway. Orange and green are the crosswind and along-runway components on " +
      result.runway.label + ".";
  }

  function recalculate() {
    var notes = [];
    var parsed = CW.parseRunwayOrHeading(elRunway.value, rwyMode);
    var dir = parseNumber(elDir);
    var spd = parseNumber(elSpd);
    var gust = hasValue(elGust) ? parseNumber(elGust) : null;
    var maxX = hasValue(elMax) ? parseNumber(elMax) : null;
    var variation = null;
    if (windRef === "true") {
      elVarRow.hidden = false;
      if (hasValue(elVar)) {
        var v = parseNumber(elVar);
        if (isFinite(v)) variation = varEW === "W" ? -v : v;
      } else {
        notes.push("METAR winds are true and runway numbers are magnetic. Enter the local variation so the wind can be converted, or confirm you already converted it.");
      }
    } else {
      elVarRow.hidden = true;
    }

    if (!parsed || !isFinite(dir) || !isFinite(spd)) {
      endsGrid.innerHTML = "";
      diagram.innerHTML = "";
      caption.textContent = "";
      showWarnings(notes);
      return;
    }
    if (gust != null && isFinite(gust) && gust < spd) {
      notes.push("The gust is below the sustained speed. Check the ATIS or METAR figures.");
    }

    var result = CW.compute({
      runway: elRunway.value,
      runwayMode: rwyMode,
      windDirection: dir,
      windReference: windRef,
      variationEast: variation,
      speed: spd,
      gust: isFinite(gust) ? gust : null,
      maxDemonstrated: isFinite(maxX) ? maxX : null
    });
    if (!result) {
      endsGrid.innerHTML = "";
      showWarnings(notes);
      return;
    }

    endsGrid.innerHTML =
      renderEnd(
        "Selected end",
        "Selected runway",
        result.runway,
        result.thisEnd,
        result.thisGust,
        result.thisCompare,
        result.preferredEnd === "this"
      ) +
      renderEnd(
        "Opposite end",
        "Opposite end",
        result.reciprocal,
        result.otherEnd,
        result.otherGust,
        result.otherCompare,
        result.preferredEnd === "other"
      );
    renderDiagram(result);
    showWarnings(notes);
  }

  document.querySelectorAll("[data-unit-group]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var group = btn.getAttribute("data-unit-group");
      var value = btn.getAttribute("data-unit");
      if (group === "rwy-mode") {
        rwyMode = value;
        document.getElementById("runway-hint").textContent =
          value === "heading"
            ? "A heading of 270° is treated as heading 270 (runway 27). The opposite end is 090°."
            : "Runway 27 means heading 270°. Left, right, or center suffixes (27L) are kept on the label. The opposite end is calculated automatically.";
      }
      if (group === "spd") {
        if (value !== spdUnit) {
          var s = parseNumber(elSpd);
          var g = parseNumber(elGust);
          var m = parseNumber(elMax);
          if (isFinite(s)) elSpd.value = String(Number(CW.convertSpeed(s, spdUnit, value).toFixed(1)));
          if (isFinite(g)) elGust.value = String(Number(CW.convertSpeed(g, spdUnit, value).toFixed(1)));
          if (isFinite(m)) elMax.value = String(Number(CW.convertSpeed(m, spdUnit, value).toFixed(1)));
        }
        spdUnit = value;
      }
      if (group === "ref") windRef = value;
      if (group === "varew") varEW = value;
      setSeg(group, value);
      recalculate();
    });
  });

  [elRunway, elDir, elSpd, elGust, elVar, elMax].forEach(function (el) {
    el.addEventListener("input", recalculate);
  });
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    recalculate();
  });

  recalculate();
})();

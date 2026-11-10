(function () {
  "use strict";
  var G = window.GlideDistanceCalcs;
  if (!G) return;
  var $ = function (id) { return document.getElementById(id); };
  var altUnit = "ft";
  var windMode = "component";

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
  bindSeg("alt", function (u) {
    var v = Number($("altitude").value);
    if (isFinite(v)) {
      $("altitude").value = u === "m" ? (v / 3.280839895).toFixed(1) : (v * 3.280839895).toFixed(0);
    }
    altUnit = u;
    render();
  });
  bindSeg("wind", function (u) {
    windMode = u;
    $("comp-row").hidden = u !== "component";
    $("vec-row").hidden = u !== "vector";
    render();
  });

  function fmt(n, d) {
    if (!isFinite(n)) return "—";
    return n.toLocaleString("en-US", { maximumFractionDigits: d == null ? 1 : d, minimumFractionDigits: 0 });
  }
  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value +
      "</p>" + (sub ? '<p class="stat-sub">' + sub + "</p>" : "") + "</div>";
  }

  function draw(r) {
    var wrap = $("diagram-wrap");
    if (!r.timeMin) { wrap.hidden = true; $("diagram").innerHTML = ""; return; }
    wrap.hidden = false;
    var R = r.stillAirNm;
    var d = r.windOffsetNm || 0;
    var max = Math.max(R + d, R) * 1.25 || 1;
    var W = 320, H = 320, cx = 160, cy = 200, scale = 120 / max;
    function xy(e, n) { return { x: cx + e * scale, y: cy - n * scale }; } // east, north; wind shift along +N? We'll put downwind to the right.
    // Place origin at left-center, downwind to the right.
    cx = 70 + d * scale;
    cy = 160;
    var o = { x: 70, y: 160 };
    var c = { x: 70 + d * scale, y: 160 };
    var svg = '<svg viewBox="0 0 320 320" role="img" aria-label="Reachable glide circle">';
    svg += '<rect width="320" height="320" fill="#0c121f"/>';
    svg += '<circle cx="' + c.x + '" cy="' + c.y + '" r="' + (R * scale) + '" fill="rgba(111,227,208,0.08)" stroke="#6fe3d0" stroke-width="2"/>';
    svg += '<line x1="20" y1="' + o.y + '" x2="300" y2="' + o.y + '" stroke="rgba(231,238,248,0.12)"/>';
    svg += '<circle cx="' + o.x + '" cy="' + o.y + '" r="4" fill="#e8b84a"/>';
    svg += '<text x="' + o.x + '" y="' + (o.y + 16) + '" fill="#e8b84a" font-size="10" text-anchor="middle" font-family="IBM Plex Sans,sans-serif">You</text>';
    if (d > 0) {
      svg += '<line x1="' + o.x + '" y1="' + o.y + '" x2="' + c.x + '" y2="' + c.y + '" stroke="#f0a35a" stroke-width="1.5" marker-end="url(#arr)"/>';
    }
    svg += '<text x="' + (c.x + R * scale + 4) + '" y="' + (c.y + 4) + '" fill="#8b97ad" font-size="10" font-family="IBM Plex Sans,sans-serif">still-air</text>';
    svg += "</svg>";
    $("diagram").innerHTML = svg;
  }

  function render() {
    var alt = Number($("altitude").value);
    if (altUnit === "m") alt = alt * 3.280839895;
    var r = G.compute({
      altitude: alt,
      glideRatio: $("ratio").value,
      bestGlide: $("vg").value,
      windMode: windMode,
      headwind: $("headwind").value,
      course: $("course").value,
      windFrom: $("wind-from").value,
      windSpeed: $("wind-spd").value,
      targetDistance: $("target").value,
      targetBearing: $("bearing").value
    });
    var warnings = $("warnings");
    if (!r) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>Enter a height above the ground and a glide ratio greater than zero.</p>";
      $("out-dist").innerHTML = '<span class="num">—</span> <span class="unit">NM</span>';
      $("stat-grid").innerHTML = "";
      draw({ timeMin: null });
      return;
    }
    warnings.hidden = true;
    $("out-dist").innerHTML = '<span class="num">' + fmt(r.stillAirNm, 2) + '</span> <span class="unit">NM</span>';
    $("out-sub").textContent = fmt(r.stillAirSm, 2) + " statute miles · " + fmt(r.stillAirFt, 0) + " ft · descent angle " + fmt(r.angleDeg, 2) + "°";
    var html = "";
    if (r.timeMin != null) {
      html += stat("Time to the ground", fmt(r.timeMin, 1) + " min", r.sinkFpm ? fmt(r.sinkFpm, 0) + " fpm still-air sink" : "");
      html += stat("Into the wind", fmt(r.intoWindNm, 2) + " NM", "worst-case range");
      html += stat("Downwind", fmt(r.downWindNm, 2) + " NM", "best-case range");
      if (r.alongCourseNm != null) html += stat("Along the course", fmt(r.alongCourseNm, 2) + " NM", r.groundspeed != null ? "GS " + fmt(r.groundspeed, 0) + " kt" : "");
    }
    if (r.canReach === true) html += stat("Target field", "In range", "inside the reachable circle");
    if (r.canReach === false) html += stat("Target field", "Out of range", "beyond the reachable circle");
    $("stat-grid").innerHTML = html;
    draw(r);
  }

  $("btn-example").addEventListener("click", function () {
    $("altitude").value = altUnit === "m" ? "1829" : "6000";
    $("ratio").value = "9";
    $("vg").value = "70";
    $("headwind").value = "10";
    render();
  });
  $("calc-form").addEventListener("input", render);
  $("calc-form").addEventListener("change", render);
  render();
})();

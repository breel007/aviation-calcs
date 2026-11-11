/**
 * UI for the great-circle distance calculator.
 * Math lives in calc.js; identifier lookup in lookup.js.
 */
(function () {
  "use strict";

  var C = window.GreatCircleDistanceCalcs;
  var NavLookup = window.NavLookup;
  if (!C || !NavLookup) return;

  var $ = function (id) { return document.getElementById(id); };
  var lookup = NavLookup.create({ dataDir: "data" });

  var viaPoints = $("via-points");
  var wpTemplate = $("wp-template");
  var warnings = $("warnings");
  var cycleEl = $("nasr-cycle");
  var resolving = 0;

  function fmt(n, d) {
    if (!isFinite(n)) return "—";
    return n.toLocaleString("en-US", { maximumFractionDigits: d == null ? 1 : d });
  }

  function fmtCoord(value, pos, neg) {
    if (!isFinite(value)) return "—";
    var a = Math.abs(value).toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
    return a + "°" + (value >= 0 ? pos : neg);
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + "</p><p class=\"stat-value\">" + value +
      "</p>" + (sub ? '<p class="stat-sub">' + sub + "</p>" : "") + "</div>";
  }

  function setHero(num, unit, sub) {
    $("out-hero").innerHTML = '<span class="num">' + num + '</span> <span class="unit" id="out-unit">' +
      (unit || "") + "</span>";
    $("out-sub").textContent = sub || "";
  }

  function clearOut(msg) {
    warnings.hidden = !msg;
    warnings.innerHTML = msg ? "<p>" + msg + "</p>" : "";
    setHero("—", "", "");
    $("stat-grid").innerHTML = "";
    var extra = $("extra-results");
    if (extra) extra.innerHTML = "";
  }

  function setWarnings(notes) {
    if (!notes || !notes.length) {
      warnings.hidden = true;
      warnings.innerHTML = "";
      return;
    }
    warnings.hidden = false;
    warnings.innerHTML = notes.map(function (n) { return "<p>" + n + "</p>"; }).join("");
  }

  function numValue(input) {
    if (!input) return NaN;
    var v = parseFloat(String(input.value).trim().replace(",", "."));
    return isFinite(v) ? v : NaN;
  }

  function course(deg) {
    if (deg == null || !isFinite(deg)) return "— (no unique course)";
    return fmt(deg, 1) + "° true";
  }

  function cards() {
    return Array.prototype.slice.call(document.querySelectorAll("#route-points .point-card"));
  }

  function cardLabel(card, index, total) {
    if (index === 0) return "From";
    if (index === total - 1) return "To";
    return total === 3 ? "Waypoint" : "Waypoint " + index;
  }

  function retitleCards() {
    var list = cards();
    list.forEach(function (card, i) {
      var title = card.querySelector(".point-title");
      if (title) title.textContent = cardLabel(card, i, list.length);
    });
  }

  function bindCard(card) {
    if (card._bound) return;
    card._bound = true;
    var ident = card.querySelector(".ident-input");
    var lat = card.querySelector(".lat-input");
    var lon = card.querySelector(".lon-input");
    ident.addEventListener("blur", function () { resolveCard(card); });
    ident.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        resolveCard(card).then(function () { run(); });
      }
    });
    [lat, lon].forEach(function (el) {
      el.addEventListener("input", function () {
        if (card._resolved && coordsChanged(card)) {
          card._manualCoords = true;
          renderResolved(card);
        }
      });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          run();
        }
      });
    });
    var picker = card.querySelector(".picker");
    picker.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-pick]");
      if (!btn) return;
      var idx = Number(btn.getAttribute("data-pick"));
      if (!card._matches || !card._matches[idx]) return;
      selectMatch(card, card._matches[idx], idx);
    });
    var remove = card.querySelector(".wp-remove");
    if (remove) {
      remove.addEventListener("click", function () {
        card.remove();
        retitleCards();
      });
    }
  }

  function coordsChanged(card) {
    var rec = card._resolved;
    if (!rec) return false;
    var lat = numValue(card.querySelector(".lat-input"));
    var lon = numValue(card.querySelector(".lon-input"));
    return !isFinite(lat) || !isFinite(lon) ||
      Math.abs(lat - rec.lat) > 1e-6 || Math.abs(lon - rec.lon) > 1e-6;
  }

  function applyCoords(card, rec) {
    card.querySelector(".lat-input").value = String(rec.lat);
    card.querySelector(".lon-input").value = String(rec.lon);
    card._manualCoords = false;
  }

  function selectMatch(card, rec, index) {
    card._resolved = rec;
    card._selected = index;
    card._manualCoords = false;
    applyCoords(card, rec);
    renderResolved(card);
    renderPicker(card);
  }

  function renderResolved(card) {
    var el = card.querySelector(".resolved");
    var rec = card._resolved;
    if (!rec) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    var ident = NavLookup.identLabel(rec);
    var where = NavLookup.locationLabel(rec);
    var bits = [esc(rec.name)];
    if (ident) bits.push("(" + esc(ident) + ")");
    if (where) bits.push("· " + esc(where));
    var coords = fmtCoord(rec.lat, "N", "S") + " " + fmtCoord(rec.lon, "E", "W");
    if (card._manualCoords) {
      el.innerHTML = bits.join(" ") + " <span class=\"resolved-note\">(coordinates edited)</span>";
    } else {
      el.innerHTML = bits.join(" ") + " · " + coords;
    }
    var desc = NavLookup.describe(rec);
    if (desc) el.innerHTML += '<span class="resolved-type"> · ' + esc(desc) + "</span>";
    el.hidden = false;
  }

  function renderPicker(card) {
    var el = card.querySelector(".picker");
    var matches = card._matches || [];
    if (matches.length < 2) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    var ident = card._normalized || "";
    var items = matches.map(function (rec, i) {
      var selected = i === card._selected ? " is-selected" : "";
      var pressed = i === card._selected ? "true" : "false";
      var loc = NavLookup.locationLabel(rec);
      var fr = NavLookup.freqLabel(rec);
      var typ = NavLookup.typeLabel(rec);
      var meta = [typ];
      if (fr) meta.push(fr);
      if (loc) meta.push(loc);
      return '<button type="button" class="picker-option' + selected +
        '" data-pick="' + i + '" aria-pressed="' + pressed + '">' +
        '<span class="picker-id">' + esc(ident) + "</span>" +
        '<span class="picker-name">' + esc(rec.name) + "</span>" +
        '<span class="picker-meta">' + esc(meta.join(" · ")) + "</span>" +
        "</button>";
    }).join("");
    el.innerHTML = "<p class=\"picker-label\">“" + esc(ident) + "” matches more than one place — pick one:</p>" +
      '<div class="picker-list" role="listbox">' + items + "</div>";
    el.hidden = false;
  }

  function setResolvedMessage(card, text, isError) {
    var el = card.querySelector(".resolved");
    el.hidden = !text;
    el.innerHTML = text ? '<span class="' + (isError ? "resolved-error" : "resolved-note") + '">' + esc(text) + "</span>" : "";
  }

  function resolveCard(card, options) {
    options = options || {};
    var identInput = card.querySelector(".ident-input");
    var raw = identInput.value;
    var normalized = NavLookup.normalizeIdent(raw);
    if (!normalized) {
      card._matches = null;
      card._resolved = null;
      card._selected = null;
      card._normalized = "";
      renderPicker(card);
      var el = card.querySelector(".resolved");
      el.hidden = true;
      el.innerHTML = "";
      return Promise.resolve(null);
    }
    if (!options.force && card._normalized === normalized && card._matches) {
      return Promise.resolve(card._resolved || null);
    }
    card._normalized = normalized;
    setResolvedMessage(card, "Looking up " + normalized + "…", false);
    resolving += 1;
    return lookup.lookup(raw).then(function (result) {
      var matches = result.matches || [];
      card._matches = matches;
      if (!matches.length) {
        card._resolved = null;
        card._selected = null;
        renderPicker(card);
        setResolvedMessage(card, "No airport, navaid, or fix named " + result.normalized +
          " in the loaded NASR / OurAirports data.", true);
        return null;
      }
      if (matches.length === 1) {
        selectMatch(card, matches[0], 0);
        return matches[0];
      }
      // Prefer a previously selected record if it is still in the list.
      var keep = -1;
      if (card._resolved) {
        for (var i = 0; i < matches.length; i++) {
          if (card._resolved.type === matches[i].type &&
              card._resolved.lat === matches[i].lat &&
              card._resolved.lon === matches[i].lon) {
            keep = i;
            break;
          }
        }
      }
      if (keep >= 0) {
        selectMatch(card, matches[keep], keep);
      } else {
        card._resolved = null;
        card._selected = null;
        renderPicker(card);
        setResolvedMessage(card, "Multiple matches — pick one below, or enter coordinates.", true);
      }
      return card._resolved;
    }).catch(function (err) {
      setResolvedMessage(card, "Lookup failed: " + (err && err.message ? err.message : "network error"), true);
      return null;
    }).then(function (rec) {
      resolving -= 1;
      return rec;
    });
  }

  function pointFromCard(card) {
    var ident = NavLookup.normalizeIdent(card.querySelector(".ident-input").value);
    if (ident && card._matches && card._matches.length > 1 && !card._resolved) {
      return { error: "Pick which “" + ident + "” you mean, or enter latitude and longitude." };
    }
    var lat = numValue(card.querySelector(".lat-input"));
    var lon = numValue(card.querySelector(".lon-input"));
    if (!isFinite(lat) || !isFinite(lon)) {
      if (ident && !card._resolved) {
        return { error: "Could not resolve “" + ident + "” and no coordinates were entered." };
      }
      return { error: "Enter an identifier or a valid latitude and longitude for each point." };
    }
    if (Math.abs(lat) > 90) return { error: "Latitude must be between −90 and 90." };
    var rec = card._resolved;
    return {
      lat: lat,
      lon: lon,
      name: rec && !card._manualCoords ? rec.name : null,
      ident: rec ? NavLookup.identLabel(rec) : (ident || null)
    };
  }

  function addWaypoint(prefill) {
    if (!wpTemplate || !viaPoints) return;
    var node = wpTemplate.content.firstElementChild.cloneNode(true);
    viaPoints.appendChild(node);
    bindCard(node);
    if (prefill) {
      if (prefill.ident) node.querySelector(".ident-input").value = prefill.ident;
      if (prefill.lat != null) node.querySelector(".lat-input").value = String(prefill.lat);
      if (prefill.lon != null) node.querySelector(".lon-input").value = String(prefill.lon);
    }
    retitleCards();
    return node;
  }

  function gatherAndRun() {
    var list = cards();
    var notes = [];
    var points = [];
    for (var i = 0; i < list.length; i++) {
      var p = pointFromCard(list[i]);
      if (p.error) {
        notes.push(p.error);
        continue;
      }
      points.push(p);
    }
    if (notes.length || points.length < 2) {
      clearOut(notes[0] || "Enter a from and to point.");
      if (notes.length > 1) setWarnings(notes);
      return;
    }
    var r = points.length === 2
      ? (function () {
          var one = C.compute({ lat1: points[0].lat, lon1: points[0].lon, lat2: points[1].lat, lon2: points[1].lon });
          if (!one) return null;
          one.legs = [{
            from: points[0], to: points[1],
            distanceNm: one.distanceNm, distanceKm: one.distanceKm,
            initialCourse: one.initialCourse, finalCourse: one.finalCourse,
            antipodal: one.antipodal, coincident: one.coincident,
            centralAngleDeg: one.centralAngleDeg
          }];
          return one;
        })()
      : C.computeRoute(points);
    if (!r) { clearOut("Enter valid latitudes (−90 to 90) and longitudes."); return; }
    setWarnings(r.antipodal || r.antipodalLeg
      ? ["An antipodal leg has a well-defined distance (half a circumference) but no unique initial course."]
      : []);
    var sub = points.length > 2
      ? (points.length - 1) + " great-circle legs"
      : "great-circle distance";
    setHero(fmt(r.distanceNm, 1), "NM", sub);
    var items = [
      stat("Distance", fmt(r.distanceNm, 1) + " NM", fmt(r.distanceKm, 1) + " km  ·  " + fmt(r.distanceSm, 1) + " sm"),
      stat("Initial true course", course(r.initialCourse), "at the departure point"),
      stat("Arrival true course", course(r.finalCourse), "at the destination"),
    ];
    if (r.centralAngleDeg != null && points.length === 2) {
      items.push(stat("Central angle", fmt(r.centralAngleDeg, 3) + "°", "on a sphere of radius 6,371 km"));
    } else if (points.length > 2) {
      items.push(stat("Legs", String(r.legs.length), "sum of great-circle segments"));
    }
    $("stat-grid").innerHTML = items.join("");
    var extra = $("extra-results");
    if (points.length > 2 && r.legs && extra) {
      var rows = r.legs.map(function (leg, idx) {
        var from = leg.from.ident || leg.from.name || "Point " + (idx + 1);
        var to = leg.to.ident || leg.to.name || "Point " + (idx + 2);
        return "<tr><td>" + esc(from) + "</td><td>" + esc(to) + "</td><td>" +
          fmt(leg.distanceNm, 1) + " NM</td><td>" + course(leg.initialCourse) + "</td></tr>";
      }).join("");
      extra.innerHTML = '<div class="table-wrap"><table class="leg-table"><thead><tr>' +
        "<th>From</th><th>To</th><th>Distance</th><th>Initial course</th></tr></thead><tbody>" +
        rows + "</tbody></table></div>";
    } else if (extra) {
      extra.innerHTML = "";
    }
  }

  function run() {
    var list = cards();
    return Promise.all(list.map(function (card) { return resolveCard(card); })).then(function () {
      gatherAndRun();
    });
  }

  function fillPoint(card, ident, lat, lon) {
    card.querySelector(".ident-input").value = ident || "";
    if (lat != null) card.querySelector(".lat-input").value = String(lat);
    if (lon != null) card.querySelector(".lon-input").value = String(lon);
    card._matches = null;
    card._resolved = null;
    card._selected = null;
    card._normalized = "";
    card._manualCoords = false;
  }

  function resetRoute() {
    while (viaPoints.firstChild) viaPoints.removeChild(viaPoints.firstChild);
    var list = cards();
    fillPoint(list[0], "KJFK", "40.639928", "-73.778692");
    fillPoint(list[1], "KLAX", "33.942496", "-118.408049");
    retitleCards();
    clearOut();
    run();
  }

  function setExample(pairs) {
    while (viaPoints.firstChild) viaPoints.removeChild(viaPoints.firstChild);
    var list = cards();
    fillPoint(list[0], pairs[0][0], pairs[0][1], pairs[0][2]);
    fillPoint(list[1], pairs[1][0], pairs[1][1], pairs[1][2]);
    retitleCards();
    run();
  }

  cards().forEach(bindCard);
  $("addWp").addEventListener("click", function () {
    var node = addWaypoint();
    node.querySelector(".ident-input").focus();
  });
  $("calcBtn").addEventListener("click", function () { run(); });
  $("exJfkLax").addEventListener("click", function () {
    setExample([
      ["KJFK", "40.639928", "-73.778692"],
      ["KLAX", "33.942496", "-118.408049"]
    ]);
  });
  $("exLhrSyd").addEventListener("click", function () {
    setExample([
      ["EGLL", "51.470748", "-0.459909"],
      ["YSSY", "-33.946098", "151.177002"]
    ]);
  });
  $("exSbaSadde").addEventListener("click", function () {
    setExample([
      ["KSBA", "34.426192", "-119.841493"],
      ["SADDE", "34.038994", "-118.764633"]
    ]);
  });
  $("resetBtn").addEventListener("click", resetRoute);

  var form = $("calc-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      run();
    });
  }

  lookup.loadMeta().then(function (meta) {
    if (!cycleEl || !meta) return;
    var cycle = meta.cycle || "";
    var pretty = cycle;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cycle);
    if (m) {
      var months = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
      pretty = Number(m[3]) + " " + months[Number(m[2]) - 1] + " " + m[1];
    }
    var oa = meta.ourairports
      ? " Non-U.S. ICAO airports are merged from OurAirports (public domain)."
      : "";
    cycleEl.innerHTML = "Airport, navaid, and fix coordinates are from the " +
      '<a href="https://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/NASR_Subscription/">FAA NASR 28-day subscription</a> ' +
      "effective " + esc(pretty) + " (public domain)." + oa;
  }).catch(function () { /* keep the static cycle sentence */ });

  run();
})();

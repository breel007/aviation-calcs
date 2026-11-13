(function () {
  "use strict";
  var C = window.WeatherGoNoGo;
  var S = window.WeatherGoNoGoStations;
  if (!C || !S) return;

  var $ = function (id) { return document.getElementById(id); };
  var userRemoved = [];
  var userAdded = [];
  var selected = [];
  var resolvedWaypoints = [];
  var unknownWaypoints = [];
  var ambiguousWaypoints = [];
  var routeGen = 0;
  var navLookup = window.NavLookup
    ? window.NavLookup.create({ dataDir: "../great-circle-distance/data" })
    : null;
  var CACHE_PREFIX = "aviatorcalcs.wxgnog.v2:";
  var MIN_REQUEST_GAP_MS = 2200; // IEM's advertised 1s IP throttle is closer to 2s in practice
  var lastRequestStart = 0;
  var fetchGen = 0;
  var lastFetch = null; // { key, parts, windows, selected, done }

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fillHourSelects() {
    var a = $("hour-start"), b = $("hour-end");
    var i, label;
    for (i = 0; i < 24; i++) {
      label = pad2(i) + ":00";
      a.appendChild(new Option(label, String(i)));
      b.appendChild(new Option(label, String(i)));
    }
    a.value = "7";
    b.value = "10";
  }

  function ensureTzOption(tz) {
    if (!tz) return;
    var sel = $("tz");
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === tz) return;
    }
    sel.appendChild(new Option(tz, tz));
  }

  function lookup(raw) {
    var q = String(raw || "").trim();
    if (!q) return null;
    var hit = S.find(q);
    if (hit) return hit;
    var sid = C.toIemId(q);
    hit = S.find(sid);
    if (hit) return hit;
    // Unknown to the catalog: still fetchable if the user typed an id.
    var id = sid || q.toUpperCase();
    if (!/^[A-Z0-9]{3,8}$/.test(id)) return null;
    return { sid: id, icao: id.length === 3 ? "K" + id : id, name: id, lat: null, lon: null, tz: "", state: "", stub: true };
  }

  function currentRoute() {
    var dep = lookup($("dep").value);
    var dest = lookup($("dest").value);
    return {
      dep: dep,
      dest: dest,
      waypoints: resolvedWaypoints.slice(),
      unknown: unknownWaypoints.slice()
    };
  }

  function routeFieldValue() {
    var el = $("route");
    return el ? el.value : "";
  }

  function findStationExact(token) {
    var q = String(token || "").trim().toUpperCase();
    if (!q) return null;
    var list = S.all();
    var i, s;
    for (i = 0; i < list.length; i++) {
      s = list[i];
      if (s.sid === q || s.icao === q) return s;
    }
    if (q.length === 4 && q.charAt(0) === "K") {
      var shortId = q.slice(1);
      for (i = 0; i < list.length; i++) {
        if (list[i].sid === shortId) return list[i];
      }
    }
    if (q.length === 3) {
      for (i = 0; i < list.length; i++) {
        if (list[i].icao === "K" + q) return list[i];
      }
    }
    return null;
  }

  function resolveIdent(token) {
    // Exact ICAO / FAA LID / K-prefix only. S.find also treats a unique
    // 3-letter suffix as a hit (AVE → PAVE Venetie), which would send a
    // navaid waypoint to the wrong place; those go to the NASR lookup.
    var hit = findStationExact(token);
    if (hit) {
      return Promise.resolve({
        ok: true,
        token: token,
        point: {
          sid: hit.sid,
          icao: hit.icao,
          name: hit.name,
          lat: hit.lat,
          lon: hit.lon,
          tz: hit.tz,
          state: hit.state,
          ident: token,
          source: "station"
        }
      });
    }
    if (!navLookup) return Promise.resolve({ ok: false, token: token });
    return navLookup.lookup(token).then(function (result) {
      var matches = result.matches || [];
      if (!matches.length) return { ok: false, token: token };
      var rec = matches[0];
      return {
        ok: true,
        token: token,
        ambiguous: matches.length > 1,
        chosen: rec,
        point: {
          sid: rec.icao || rec.id,
          icao: rec.icao || rec.id,
          id: rec.id,
          name: rec.name,
          lat: rec.lat,
          lon: rec.lon,
          type: rec.type,
          state: rec.state,
          ident: token,
          source: "nasr"
        }
      };
    }).catch(function () {
      return { ok: false, token: token };
    });
  }

  function waypointNotes() {
    var msgs = [];
    unknownWaypoints.forEach(function (tok) {
      msgs.push("Could not find waypoint “" + escapeHtml(tok) + "”. Check the identifier (airport ICAO or FAA LID, navaid, or five-letter fix).");
    });
    ambiguousWaypoints.forEach(function (row) {
      var rec = row.chosen;
      var label = (rec && (rec.name || rec.id)) || row.token;
      var kind = rec && rec.type ? rec.type : "place";
      var loc = rec && rec.state ? ", " + rec.state : "";
      msgs.push("“" + escapeHtml(row.token) + "” matches more than one place; using " + escapeHtml(label) + " (" + escapeHtml(kind) + loc + ").");
    });
    return msgs;
  }

  function applySelection(route) {
    if (route.dep && route.dep.tz) {
      ensureTzOption(route.dep.tz);
      // Only auto-switch tz when the departure changes and the user
      // has not just picked a custom zone — we always default to dep.
      if (!refreshStations._tzLocked) $("tz").value = route.dep.tz;
    }
    selected = C.selectRouteStations(S.all(), route.dep, route.dest, {
      corridorNm: Number($("corridor").value) || C.DEFAULT_CORRIDOR_NM,
      maxStations: Number($("max-stations").value) || C.DEFAULT_MAX_STATIONS,
      extras: userAdded.slice(),
      removed: userRemoved,
      waypoints: route.waypoints || []
    });
    renderStationTable(route);
    if (!lastFetch || lastFetch.done) {
      setWarnings(waypointNotes());
    }
  }

  function refreshStations() {
    var dep = lookup($("dep").value);
    var dest = lookup($("dest").value);
    var tokens = C.trimRouteTokens(C.parseRouteTokens(routeFieldValue()), dep, dest);
    var gen = ++routeGen;
    if (!tokens.length) {
      resolvedWaypoints = [];
      unknownWaypoints = [];
      ambiguousWaypoints = [];
      applySelection({ dep: dep, dest: dest, waypoints: [], unknown: [] });
      return Promise.resolve();
    }
    return Promise.all(tokens.map(resolveIdent)).then(function (results) {
      if (gen !== routeGen) return;
      resolvedWaypoints = [];
      unknownWaypoints = [];
      ambiguousWaypoints = [];
      results.forEach(function (row) {
        if (row && row.ok && row.point) {
          resolvedWaypoints.push(row.point);
          if (row.ambiguous) ambiguousWaypoints.push(row);
        } else if (row && row.token) {
          unknownWaypoints.push(row.token);
        }
      });
      applySelection({
        dep: dep,
        dest: dest,
        waypoints: resolvedWaypoints.slice(),
        unknown: unknownWaypoints.slice()
      });
    });
  }

  function renderStationTable(route) {
    var panel = $("station-panel");
    var body = $("station-body");
    var summary = $("station-summary");
    var hasPath = !!(route.dep || route.dest || (route.waypoints && route.waypoints.length) || (route.unknown && route.unknown.length));
    if (!hasPath) {
      panel.hidden = true;
      body.innerHTML = "";
      return;
    }
    panel.hidden = false;
    if (!selected.length) {
      summary.textContent = "Enter a known U.S. departure or destination so stations can be looked up. You can still add a station by identifier, or type waypoints in the route field.";
      body.innerHTML = "";
      return;
    }
    var autoN = selected.filter(function (s) { return s.auto; }).length;
    var bits = [];
    var labeled = C.formatRouteSummary(route.dep, route.dest, route.waypoints || []);
    if (labeled && labeled.label && labeled.pointCount >= 2) {
      bits.push(labeled.label);
    } else {
      var routeNm = selected[0] && selected[0].routeNm;
      if (isFinite(routeNm) && routeNm >= 5) bits.push("great-circle " + routeNm.toFixed(0) + " NM");
    }
    bits.push(selected.length + " station" + (selected.length === 1 ? "" : "s") + " selected");
    bits.push(autoN + " auto-picked along the corridor");
    if (route.unknown && route.unknown.length) {
      bits.push("unknown waypoint" + (route.unknown.length === 1 ? "" : "s") + ": " + route.unknown.join(", "));
    }
    summary.textContent = bits.join(" · ");
    body.innerHTML = selected.map(function (s) {
      var along = isFinite(s.alongNm) ? s.alongNm.toFixed(0) + " NM" : "—";
      var cross = isFinite(s.absCrossNm) ? s.absCrossNm.toFixed(0) + " NM" : "—";
      var role = s.role || "enroute";
      return "<tr>" +
        "<td><span class=\"sid\">" + escapeHtml(s.icao || s.sid) + "</span> " +
        escapeHtml(s.name || "") +
        " <span class=\"role-tag " + escapeHtml(role) + "\">" + escapeHtml(role) + "</span></td>" +
        "<td>" + along + "</td><td>" + cross + "</td>" +
        "<td><button type=\"button\" class=\"btn-tiny\" data-remove=\"" + escapeHtml(s.sid) + "\">Remove</button></td>" +
        "</tr>";
    }).join("");
  }

  function setWarnings(msgs) {
    var el = $("warnings");
    if (!msgs || !msgs.length) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    el.hidden = false;
    el.innerHTML = msgs.map(function (m) { return "<p>" + m + "</p>"; }).join("");
  }

  function setProgress(text) {
    $("progress").textContent = text || "";
  }

  function applyPreset(name) {
    var p = C.PRESETS[name];
    if (!p) return;
    $("min-ceil").value = p.minCeilingFt;
    $("min-vis").value = p.minVisibilitySm;
    $("max-wind").value = p.maxWindKt;
    $("max-gust").value = p.maxGustKt;
    $("ex-rain").checked = !!p.excludeRain;
    $("ex-snow").checked = !!p.excludeSnow;
    $("ex-fz").checked = !!p.excludeFreezing;
    $("ex-sev").checked = !!p.excludeSevere;
    document.querySelectorAll("[data-preset]").forEach(function (btn) {
      var on = btn.getAttribute("data-preset") === name;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function readMins() {
    return {
      minCeilingFt: $("min-ceil").value === "" ? null : Number($("min-ceil").value),
      minVisibilitySm: $("min-vis").value === "" ? null : Number($("min-vis").value),
      maxWindKt: $("max-wind").value === "" ? null : Number($("max-wind").value),
      maxGustKt: $("max-gust").value === "" ? null : Number($("max-gust").value),
      excludeRain: $("ex-rain").checked,
      excludeSnow: $("ex-snow").checked,
      excludeFreezing: $("ex-fz").checked,
      excludeSevere: $("ex-sev").checked
    };
  }

  function cacheGet(key) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || typeof obj.text !== "string") return null;
      var age = Date.now() - (obj.saved || 0);
      var thisYear = new Date().getFullYear();
      var maxAge = obj.year === thisYear ? 12 * 3600 * 1000 : 30 * 24 * 3600 * 1000;
      if (age > maxAge) return null;
      return obj.text;
    } catch (e) { return null; }
  }

  function evictWxCache() {
    try {
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf("aviatorcalcs.wxgnog.") === 0) keys.push(k);
      }
      keys.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) { /* ignore */ }
  }

  function cacheSet(key, val, year) {
    var payload = JSON.stringify({ v: 2, saved: Date.now(), year: year, text: val });
    try {
      localStorage.setItem(key, payload);
    } catch (e) {
      evictWxCache();
      try { localStorage.setItem(key, payload); } catch (e2) { /* quota / private mode */ }
    }
  }

  function fetchText(url) {
    return fetch(url, { method: "GET", mode: "cors", credentials: "omit" }).then(function (res) {
      return res.text().then(function (text) {
        return { ok: res.ok, status: res.status, text: text };
      });
    });
  }

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function waitForThrottle() {
    var wait = MIN_REQUEST_GAP_MS - (Date.now() - lastRequestStart);
    if (wait <= 0) {
      lastRequestStart = Date.now();
      return Promise.resolve();
    }
    return delay(wait).then(function () { lastRequestStart = Date.now(); });
  }

  function cacheKey(sids, windowObj) {
    return CACHE_PREFIX + sids.join(",") + ":" + windowObj.start.year + "-" + windowObj.start.month + "-" + windowObj.start.day + ":" + windowObj.end.year + "-" + windowObj.end.month + "-" + windowObj.end.day;
  }

  function loadYearCsv(sids, windowObj, attempt, gen) {
    if (gen !== fetchGen) return Promise.reject({ aborted: true });
    var url = C.buildAsosUrl(sids, windowObj.start, windowObj.end);
    var key = cacheKey(sids, windowObj);
    var cached = cacheGet(key);
    if (cached) return Promise.resolve({ text: cached, cached: true, year: windowObj.year });
    return waitForThrottle().then(function () {
      if (gen !== fetchGen) return Promise.reject({ aborted: true });
      return fetchText(url);
    }).then(function (res) {
      if (gen !== fetchGen) return Promise.reject({ aborted: true });
      var parsed = C.parseCsv(res.text);
      if (parsed.error === "rate-limited") {
        var n = attempt || 0;
        if (n < 4) {
          var back = Math.min(20000, 2500 * Math.pow(2, n));
          setProgress("Archive asked us to slow down — waiting " + Math.round(back / 1000) + "s, then retrying " + windowObj.year + "…");
          return delay(back).then(function () { return loadYearCsv(sids, windowObj, n + 1, gen); });
        }
        throw new Error("The Iowa Environmental Mesonet asked us to slow down. Wait a minute and try again.");
      }
      if (!res.ok && parsed.error) {
        throw new Error("The archive returned an error for " + windowObj.year + " (" + res.status + "). " + (parsed.message || ""));
      }
      if (parsed.error && parsed.error !== "empty") {
        throw new Error(parsed.message || "Could not parse archive data for " + windowObj.year + ".");
      }
      if (!parsed.error) cacheSet(key, res.text, windowObj.year);
      return { text: res.text, cached: false, year: windowObj.year };
    });
  }

  function groupRows(rows) {
    var map = {};
    for (var i = 0; i < rows.length; i++) {
      var sid = String(rows[i].station || "").toUpperCase();
      if (!map[sid]) map[sid] = [];
      map[sid].push(rows[i]);
    }
    return map;
  }

  function pctClass(p) {
    if (p == null) return "";
    if (p >= 80) return "pct-good";
    if (p >= 50) return "pct-mid";
    return "pct-low";
  }

  function fmtPct(p) {
    if (p == null || !isFinite(p)) return "—";
    return p.toFixed(0) + "%";
  }

  function failLabel(key) {
    var map = {
      ceiling: "ceiling",
      visibility: "visibility",
      rain: "rain",
      snow: "snow",
      freezing: "freezing precip",
      severe: "thunderstorm / severe",
      wind: "wind / gust"
    };
    return map[key] || key;
  }

  function barChart(el, items, opts) {
    opts = opts || {};
    if (!items || !items.length) {
      el.innerHTML = "<p class=\"muted\">No data to chart.</p>";
      return;
    }
    el.innerHTML = items.map(function (it) {
      var p = it.pct == null ? 0 : Math.max(0, Math.min(100, it.pct));
      var tone = p >= 80 ? "" : p >= 50 ? " mid" : " low";
      if (opts.counts) tone = "";
      var width = opts.counts && opts.max > 0 ? (100 * (it.count || 0) / opts.max) : p;
      var inWin = it.inWindow ? " in-window" : "";
      var val = opts.counts ? String(it.count || 0) : fmtPct(it.pct);
      return "<div class=\"chart-row\">" +
        "<span class=\"chart-lab\">" + escapeHtml(it.label) + "</span>" +
        "<span class=\"chart-track\"><i class=\"" + tone + inWin + "\" style=\"width:" + width.toFixed(1) + "%\"></i></span>" +
        "<span class=\"chart-val\">" + escapeHtml(val) + "</span>" +
        "</div>";
    }).join("");
  }

  function renderResults(result) {
    $("results-wrap").hidden = false;
    var route = result.route;
    var dayPct = route.dayAnyPct;
    var hero = $("hero");
    var severity = "ok";
    if (dayPct == null) severity = "caution";
    else if (dayPct < 50) severity = "severe";
    else if (dayPct < 80) severity = "caution";
    hero.setAttribute("data-severity", severity);
    $("out-day").innerHTML = "<span class=\"num\">" + (dayPct == null ? "—" : dayPct.toFixed(0)) + "</span> <span class=\"unit\">%</span>";
    var yearList = (result.windows || []).map(function (w) { return w.year; });
    var yearPhrase = yearList.length ? yearList[0] + "–" + yearList[yearList.length - 1] : "";
    var sub = [];
    if (route.possibleDays) {
      sub.push("Sample: " + route.dayCount + " of " + route.possibleDays + " days, " +
        route.hours.n + " of " + route.possibleHours + " hours scored");
    }
    if (route.dayCount) {
      sub.push(route.daysAnyGo + " of " + route.dayCount + " scored days had at least one route-go hour");
    }
    if (route.hourPct != null) sub.push(fmtPct(route.hourPct) + " of hours were a simultaneous go");
    if (route.dayAllPct != null) sub.push(fmtPct(route.dayAllPct) + " were solid (every hour in the window)");
    if (result.worstStation) {
      sub.push("weakest station " + (result.worstStation.icao || result.worstStation.sid) + " at " + fmtPct(result.worstStation.dayAnyPct) + " day-go");
    }
    $("out-sub").textContent = sub.join(" · ");
    $("hero-tag").textContent = (yearPhrase ? yearPhrase + " · " : "") + "any simultaneous-go hour in the window";

    var lead = C.leadingFailure(route.failCounts);
    var stats = "";
    function stat(label, value, note) {
      stats += "<div class=\"stat\"><p class=\"stat-label\">" + label + "</p><p class=\"stat-value\">" + value + "</p>" +
        (note ? "<p class=\"stat-sub\">" + note + "</p>" : "") + "</div>";
    }
    stat("Route hours go", fmtPct(route.hourPct), route.hours.n ? (route.hours.go + " of " + route.hours.n + " scored hours") : "no scored hours");
    stat("Days scored", route.dayCount + " of " + (route.possibleDays || 0), route.hours.n + " of " + (route.possibleHours || 0) + " hours in the window");
    stat("Solid go days", fmtPct(route.dayAllPct), "every in-window hour was a route go");
    stat("Incomplete hours", String(route.incompleteHours || 0), "a route station had no usable METAR within ±30 min");
    stat("Most common fail", lead.reason ? failLabel(lead.reason) : "—", lead.reason ? (lead.count + " route-hour no-gos") : "no scored failures");
    $("stat-grid").innerHTML = stats;

    var body = $("result-body");
    var rowsHtml = result.stations.map(function (s) {
      var leadS = C.leadingFailure(s.failCounts);
      return "<tr>" +
        "<td><span class=\"sid\">" + escapeHtml(s.icao || s.sid) + "</span> " + escapeHtml(s.name || "") + "</td>" +
        "<td class=\"" + pctClass(s.hourPct) + "\">" + fmtPct(s.hourPct) + "</td>" +
        "<td class=\"" + pctClass(s.dayAnyPct) + "\">" + fmtPct(s.dayAnyPct) + "</td>" +
        "<td>" + fmtPct(s.dayAllPct) + "</td>" +
        "<td>" + s.hours.n + "</td>" +
        "<td>" + (leadS.reason ? escapeHtml(failLabel(leadS.reason)) + " (" + leadS.count + ")" : "—") + "</td>" +
        "</tr>";
    }).join("");
    rowsHtml += "<tr>" +
      "<td><span class=\"sid\">ROUTE</span> route-score stations simultaneously</td>" +
      "<td class=\"" + pctClass(route.hourPct) + "\">" + fmtPct(route.hourPct) + "</td>" +
      "<td class=\"" + pctClass(route.dayAnyPct) + "\">" + fmtPct(route.dayAnyPct) + "</td>" +
      "<td>" + fmtPct(route.dayAllPct) + "</td>" +
      "<td>" + route.hours.n + "</td>" +
      "<td>" + (lead.reason ? escapeHtml(failLabel(lead.reason)) + " (" + lead.count + ")" : "—") + "</td>" +
      "</tr>";
    body.innerHTML = rowsHtml;

    var failKeys = ["ceiling", "visibility", "rain", "snow", "freezing", "severe", "wind"];
    var failItems = failKeys.map(function (k) {
      return { label: failLabel(k), count: route.failCounts[k] || 0, pct: route.hours.n ? 100 * (route.failCounts[k] || 0) / route.hours.n : 0 };
    });
    var failMax = 0;
    failItems.forEach(function (it) { if (it.count > failMax) failMax = it.count; });
    barChart($("fail-chart"), failItems, { counts: true, max: failMax || 1 });

    var years = Object.keys(route.byYear).map(Number).sort(function (a, b) { return a - b; });
    barChart($("year-chart"), years.map(function (y) {
      var cell = route.byYear[y];
      return { label: String(y), pct: cell && cell.n ? 100 * cell.go / cell.n : null };
    }));

    var start = result.hourStart, end = result.hourEnd;
    var hourItems = [];
    for (var h = 0; h < 24; h++) {
      var n = 0, go = 0;
      result.stations.forEach(function (s) {
        var cell = s.byHour[h];
        if (cell && cell.n) { n += cell.n; go += cell.go; }
      });
      hourItems.push({
        label: pad2(h),
        pct: n ? 100 * go / n : null,
        inWindow: C.hourInWindow(h, start, end)
      });
    }
    barChart($("hour-chart"), hourItems);
  }

  function queryPlan() {
    if (!selected.length) refreshStations();
    var dateVal = $("date").value;
    var dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateVal);
    if (!selected.length || !dm) return null;
    var month = Number(dm[2]), day = Number(dm[3]);
    var tz = $("tz").value || "UTC";
    var years = C.DEFAULT_YEARS; // fixed 5-year history
    var radius = Number($("radius").value);
    if (!isFinite(radius)) radius = C.DEFAULT_RADIUS_DAYS;
    var windows = C.dateWindows(month, day, { years: years, radiusDays: radius, tz: tz, now: new Date() });
    if (!windows.length) return null;
    var sids = selected.map(function (s) { return s.sid; });
    return {
      month: month,
      day: day,
      tz: tz,
      years: years,
      radius: radius,
      windows: windows,
      padded: C.paddedFetchWindows(windows, 1),
      sids: sids,
      selected: selected.slice(),
      key: sids.join(",") + "|" + month + "-" + day + "|" + years + "|" + radius,
      stubs: selected.filter(function (s) { return s.lat == null; })
    };
  }

  function applyParts(parts, plan, partial) {
    var allRows = [];
    var emptyYears = [];
    parts.forEach(function (part) {
      var parsed = C.parseCsv(part.text);
      if (!parsed.rows.length) emptyYears.push(part.year);
      allRows = allRows.concat(parsed.rows);
    });
    if (!allRows.length) {
      if (!partial) {
        setWarnings(waypointNotes().concat(["The archive returned no routine METARs for these stations and dates. Check the identifiers, or try a more recent year range."]));
        setProgress("");
      }
      return;
    }
    var loadedYears = parts.map(function (p) { return p.year; });
    var usedWindows = plan.windows.filter(function (w) { return loadedYears.indexOf(w.year) !== -1; });
    var grouped = groupRows(allRows);
    var series = plan.selected.map(function (s) {
      return {
        sid: s.sid,
        icao: s.icao,
        name: s.name,
        rows: grouped[s.sid] || grouped[C.toIemId(s.icao)] || []
      };
    });
    var missing = series.filter(function (s) { return !s.rows.length; }).map(function (s) { return s.icao || s.sid; });
    var result = C.computeClimatology(series, {
      tz: $("tz").value || plan.tz || "UTC",
      hourStart: Number($("hour-start").value),
      hourEnd: Number($("hour-end").value),
      mins: readMins(),
      windows: usedWindows,
      dropSparse: true,
      endpoints: plan.selected.reduce(function (acc, s) {
        if (s.role === "departure" || s.role === "destination") acc[s.sid] = s.role;
        return acc;
      }, {})
    });
    var notes = [];
    if (plan.stubs.length) {
      notes.push("No coordinates for " + plan.stubs.map(function (s) { return s.icao || s.sid; }).join(", ") + ", so they could not be auto-placed on the corridor. They will still be requested from the archive.");
    }
    if (partial) {
      notes.push("Showing " + loadedYears[0] + (loadedYears.length > 1 ? "–" + loadedYears[loadedYears.length - 1] : "") + " so far (" + parts.length + " of " + plan.padded.length + " years). Later years will fill in as they arrive.");
    }
    if (emptyYears.length) notes.push("No rows came back for " + emptyYears.join(", ") + " (the window may pre-date a station, or the archive had a gap).");
    if (missing.length) notes.push("No observations for " + missing.join(", ") + " in this sample.");
    if (result.droppedFromRoute && result.droppedFromRoute.length) {
      notes.push("Left out of the combined route score because they had a usable report for under " +
        Math.round(C.ROUTE_COVERAGE_MIN * 100) + "% of the window hours (still shown per station): " +
        result.droppedFromRoute.map(function (d) {
          return (d.icao || d.sid) + (d.role ? " — the " + d.role + " airport" : "") +
            " (" + d.hours + " of " + d.refHours + " hours, " + Math.round(100 * (d.coverage || 0)) + "%)";
        }).join("; ") + ".");
      var endpointsOut = result.droppedFromRoute.filter(function (d) { return d.role; });
      if (endpointsOut.length) {
        notes.push("Heads up: the route score does not include your " +
          endpointsOut.map(function (d) { return d.role + " (" + (d.icao || d.sid) + ")"; }).join(" or ") +
          ", because its archive is too patchy for this window. Check its own row below.");
      }
    }
    if (!partial && result.route.hours.n === 0) {
      notes.push("No complete route-hours were scored. Try widening the time window, dropping a station with a short archive, or loosening the minimums’ required fields.");
    }
    setWarnings(waypointNotes().concat(notes));
    renderResults(result);
    var cachedN = parts.filter(function (p) { return p.cached; }).length;
    if (partial) {
      setProgress("Loaded " + parts.length + " of " + plan.padded.length + " years (" + allRows.length.toLocaleString("en-US") + " observations so far)…");
    } else {
      setProgress("Done. " + allRows.length.toLocaleString("en-US") + " archived observations used" +
        (cachedN ? " (" + cachedN + " year" + (cachedN === 1 ? "" : "s") + " from browser cache)" : "") + ".");
    }
  }

  function recomputeLocal() {
    if (!lastFetch || !lastFetch.parts.length) return;
    applyParts(lastFetch.parts, lastFetch.plan, !lastFetch.done);
  }

  function setRunBusy(busy) {
    var btn = $("btn-run");
    if (btn) btn.disabled = !!busy;
  }

  function startFetch() {
    setRunBusy(true);
    Promise.resolve(refreshStations()).then(function () {
      startFetchAfterRoute();
    });
  }

  function startFetchAfterRoute() {
    var plan = queryPlan();
    if (!plan) {
      if (!selected.length) setWarnings(waypointNotes().concat(["Enter a departure and/or destination identifier, or add a station to the list."]));
      else setWarnings(waypointNotes().concat(["Pick a calendar date so the week of the year is known."]));
      setRunBusy(false);
      return;
    }
    if (lastFetch && lastFetch.key === plan.key && lastFetch.done) {
      lastFetch.plan = plan;
      applyParts(lastFetch.parts, plan, false);
      setRunBusy(false);
      return;
    }
    if (lastFetch && lastFetch.key === plan.key && !lastFetch.done) {
      return; // already loading this query
    }
    fetchGen += 1;
    var gen = fetchGen;
    lastFetch = { key: plan.key, parts: [], plan: plan, done: false };
    setRunBusy(true);
    setWarnings(waypointNotes().concat(plan.stubs.length ? ["No coordinates for " + plan.stubs.map(function (s) { return s.icao || s.sid; }).join(", ") + ", so they could not be auto-placed on the corridor. They will still be requested from the archive."] : []));
    setProgress("Requesting " + plan.windows.length + " year-window" + (plan.windows.length === 1 ? "" : "s") + " from the Iowa Environmental Mesonet…");

    var chain = Promise.resolve();
    plan.padded.forEach(function (w, idx) {
      chain = chain.then(function () {
        if (gen !== fetchGen) return Promise.reject({ aborted: true });
        setProgress("Fetching " + w.year + " (" + (idx + 1) + " of " + plan.padded.length + ") for " + plan.sids.length + " station" + (plan.sids.length === 1 ? "" : "s") + "…");
        return loadYearCsv(plan.sids, w, 0, gen).then(function (part) {
          if (gen !== fetchGen) return;
          lastFetch.parts.push(part);
          applyParts(lastFetch.parts, plan, lastFetch.parts.length < plan.padded.length);
        });
      });
    });
    chain.then(function () {
      if (gen !== fetchGen) return;
      lastFetch.done = true;
      if (!lastFetch.parts.length) {
        setWarnings(["The archive returned no routine METARs for these stations and dates. Check the identifiers, or try a more recent year range."]);
        setProgress("");
        return;
      }
      applyParts(lastFetch.parts, plan, false);
    }).catch(function (err) {
      if (err && err.aborted) return;
      setWarnings(waypointNotes().concat([err && err.message ? err.message : String(err)]));
      setProgress("");
    }).then(function () {
      if (gen === fetchGen) setRunBusy(false);
    });
  }

  function showHits(q) {
    var box = $("search-hits");
    var hits = S.search(q, 10);
    if (!q || !hits.length) { box.hidden = true; box.innerHTML = ""; return; }
    box.hidden = false;
    box.innerHTML = hits.map(function (s) {
      return "<li><button type=\"button\" data-sid=\"" + escapeHtml(s.sid) + "\"><span class=\"hit-id\">" +
        escapeHtml(s.icao) + "</span><span class=\"hit-name\">" + escapeHtml(s.name) +
        (s.state ? " (" + escapeHtml(s.state) + ")" : "") + "</span></button></li>";
    }).join("");
  }

  function addTypedStation(raw) {
    var hit = lookup(raw) || (S.search(raw, 1)[0] || null);
    if (!hit) {
      setWarnings(["Could not find “" + escapeHtml(raw) + "” in the U.S. ASOS/AWOS list. You can still try a raw identifier if the archive knows it."]);
      var stub = lookup(raw);
      if (!stub) return;
      hit = stub;
    }
    var sid = hit.sid;
    userRemoved = userRemoved.filter(function (id) { return id !== sid; });
    var already = userAdded.some(function (s) { return s.sid === sid; }) ||
      selected.some(function (s) { return s.sid === sid; });
    if (!already) userAdded.push(hit);
    $("add-station").value = "";
    $("search-hits").hidden = true;
    refreshStations();
  }

  fillHourSelects();
  applyPreset("VFR");

  var routeTimer = null;
  function onRouteChange(lockTz) {
    if (!lockTz) refreshStations._tzLocked = false;
    refreshStations();
  }
  ["dep", "dest", "route"].forEach(function (id) {
    if (!$(id)) return;
    $(id).addEventListener("input", function () {
      clearTimeout(routeTimer);
      routeTimer = setTimeout(function () { onRouteChange(false); }, 400);
    });
    $(id).addEventListener("change", function () { onRouteChange(false); });
    $(id).addEventListener("blur", function () { onRouteChange(false); });
  });
  ["corridor", "max-stations"].forEach(function (id) {
    $(id).addEventListener("change", function () { onRouteChange(true); });
  });
  $("tz").addEventListener("change", function () {
    refreshStations._tzLocked = true;
    recomputeLocal();
  });
  ["hour-start", "hour-end", "min-ceil", "min-vis", "max-wind", "max-gust", "ex-rain", "ex-snow", "ex-fz", "ex-sev"].forEach(function (id) {
    $(id).addEventListener("input", recomputeLocal);
    $(id).addEventListener("change", recomputeLocal);
  });

  $("station-body").addEventListener("click", function (ev) {
    var btn = ev.target.closest("[data-remove]");
    if (!btn) return;
    var sid = btn.getAttribute("data-remove");
    if (userRemoved.indexOf(sid) === -1) userRemoved.push(sid);
    userAdded = userAdded.filter(function (s) { return s.sid !== sid; });
    refreshStations();
  });

  $("btn-reset-stations").addEventListener("click", function () {
    userRemoved = [];
    userAdded = [];
    refreshStations();
  });

  var searchTimer = null;
  $("add-station").addEventListener("input", function () {
    var q = $("add-station").value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () { showHits(q); }, 120);
  });
  $("search-hits").addEventListener("click", function (ev) {
    var btn = ev.target.closest("[data-sid]");
    if (!btn) return;
    addTypedStation(btn.getAttribute("data-sid"));
  });
  $("btn-add").addEventListener("click", function () { addTypedStation($("add-station").value); });
  $("add-station").addEventListener("keydown", function (ev) {
    if (ev.key === "Enter") { ev.preventDefault(); addTypedStation($("add-station").value); }
  });

  document.querySelectorAll("[data-preset]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyPreset(btn.getAttribute("data-preset"));
      recomputeLocal();
    });
  });

  $("calc-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    startFetch();
  });
  $("btn-run").addEventListener("click", function (ev) {
    ev.preventDefault();
    startFetch();
  });

  $("btn-clear").addEventListener("click", function () {
    // Abort any in-flight download or waypoint lookup so they cannot refill the results.
    fetchGen += 1;
    routeGen += 1;
    lastFetch = null;
    resolvedWaypoints = [];
    unknownWaypoints = [];
    ambiguousWaypoints = [];
    setRunBusy(false);

    $("dep").value = "";
    $("dest").value = "";
    if ($("route")) $("route").value = "";
    $("date").value = "";
    $("add-station").value = "";
    var hits = $("search-hits");
    if (hits) { hits.hidden = true; hits.innerHTML = ""; }

    userRemoved = [];
    userAdded = [];
    refreshStations._tzLocked = false;
    refreshStations();

    $("results-wrap").hidden = true;
    $("out-day").innerHTML = '<span class="num">—</span> <span class="unit">%</span>';
    $("out-sub").textContent = "";
    $("stat-grid").innerHTML = "";
    $("result-body").innerHTML = "";
    $("fail-chart").innerHTML = "";
    $("year-chart").innerHTML = "";
    $("hour-chart").innerHTML = "";
    var hero = $("hero");
    if (hero) hero.removeAttribute("data-severity");
    setWarnings([]);
    setProgress("");
  });

  refreshStations();
})();

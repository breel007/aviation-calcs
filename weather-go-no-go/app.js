(function () {
  "use strict";
  var C = window.WeatherGoNoGo;
  var S = window.WeatherGoNoGoStations;
  if (!C || !S) return;

  var $ = function (id) { return document.getElementById(id); };
  var userRemoved = [];
  var userAdded = [];
  var selected = [];
  var running = false;
  var CACHE_PREFIX = "aviatorcalcs.wxgnog.v1:";

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
    return { dep: dep, dest: dest };
  }

  function refreshStations() {
    var route = currentRoute();
    var extras = userAdded.slice();
    if (route.dep && route.dep.tz) {
      ensureTzOption(route.dep.tz);
      // Only auto-switch tz when the departure changes and the user
      // has not just picked a custom zone — we always default to dep.
      if (!refreshStations._tzLocked) $("tz").value = route.dep.tz;
    }
    selected = C.selectRouteStations(S.all(), route.dep, route.dest, {
      corridorNm: Number($("corridor").value) || C.DEFAULT_CORRIDOR_NM,
      maxStations: Number($("max-stations").value) || C.DEFAULT_MAX_STATIONS,
      extras: extras,
      removed: userRemoved
    });
    renderStationTable(route);
  }

  function renderStationTable(route) {
    var panel = $("station-panel");
    var body = $("station-body");
    var summary = $("station-summary");
    if (!route.dep && !route.dest) {
      panel.hidden = true;
      body.innerHTML = "";
      return;
    }
    panel.hidden = false;
    if (!selected.length) {
      summary.textContent = "Enter a known U.S. departure or destination so stations can be looked up. You can still add a station by identifier.";
      body.innerHTML = "";
      return;
    }
    var routeNm = selected[0] && selected[0].routeNm;
    var autoN = selected.filter(function (s) { return s.auto; }).length;
    var bits = [selected.length + " station" + (selected.length === 1 ? "" : "s") + " selected"];
    if (isFinite(routeNm) && routeNm >= 5) bits.push("great-circle " + routeNm.toFixed(0) + " NM");
    bits.push(autoN + " auto-picked along the corridor");
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
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  }
  function cacheSet(key, val) {
    try { sessionStorage.setItem(key, val); } catch (e) { /* quota / private mode */ }
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

  function loadYearCsv(sids, windowObj, attempt) {
    var url = C.buildAsosUrl(sids, windowObj.start, windowObj.end);
    var key = CACHE_PREFIX + sids.join(",") + ":" + windowObj.start.year + "-" + windowObj.start.month + "-" + windowObj.start.day + ":" + windowObj.end.year + "-" + windowObj.end.month + "-" + windowObj.end.day;
    var cached = cacheGet(key);
    if (cached) return Promise.resolve({ text: cached, cached: true, year: windowObj.year });
    return fetchText(url).then(function (res) {
      var parsed = C.parseCsv(res.text);
      if (parsed.error === "rate-limited" && (!attempt || attempt < 2)) {
        setProgress("Archive asked us to slow down — waiting, then retrying " + windowObj.year + "…");
        return delay(15000).then(function () { return loadYearCsv(sids, windowObj, (attempt || 0) + 1); });
      }
      if (parsed.error === "rate-limited") {
        throw new Error("The Iowa Environmental Mesonet asked us to slow down. Wait a minute and try again.");
      }
      if (!res.ok && parsed.error) {
        throw new Error("The archive returned an error for " + windowObj.year + " (" + res.status + "). " + (parsed.message || ""));
      }
      if (parsed.error && parsed.error !== "empty") {
        throw new Error(parsed.message || "Could not parse archive data for " + windowObj.year + ".");
      }
      if (!parsed.error) cacheSet(key, res.text);
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
    if (route.dayCount) {
      sub.push(route.daysAnyGo + " of " + route.dayCount + " sampled days had at least one route-go hour");
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
    stat("Route hours go", fmtPct(route.hourPct), route.hours.n ? (route.hours.go + " of " + route.hours.n + " complete hours") : "no complete hours");
    stat("Solid go days", fmtPct(route.dayAllPct), "every in-window hour was a route go");
    stat("Incomplete hours", String(route.incompleteHours || 0), "a station was missing an evaluable METAR");
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
      "<td><span class=\"sid\">ROUTE</span> all stations simultaneously</td>" +
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

  function run() {
    if (running) return;
    if (!selected.length) refreshStations();
    if (!selected.length) {
      setWarnings(["Enter a departure and/or destination identifier, or add a station to the list."]);
      return;
    }
    var dateVal = $("date").value;
    var dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateVal);
    if (!dm) {
      setWarnings(["Pick a calendar date so the week of the year is known."]);
      return;
    }
    var month = Number(dm[2]), day = Number(dm[3]);
    var tz = $("tz").value || "UTC";
    var years = Number($("years").value) || C.DEFAULT_YEARS;
    var radius = Number($("radius").value);
    if (!isFinite(radius)) radius = C.DEFAULT_RADIUS_DAYS;
    var hourStart = Number($("hour-start").value);
    var hourEnd = Number($("hour-end").value);
    var mins = readMins();
    var windows = C.dateWindows(month, day, { years: years, radiusDays: radius, tz: tz, now: new Date() });
    if (!windows.length) {
      setWarnings(["Could not build a historical date window."]);
      return;
    }
    var padded = C.paddedFetchWindows(windows, 1);
    var sids = selected.map(function (s) { return s.sid; });
    var stubs = selected.filter(function (s) { return s.lat == null; });

    running = true;
    $("btn-run").disabled = true;
    $("results-wrap").hidden = true;
    var warn = [];
    if (stubs.length) {
      warn.push("No coordinates for " + stubs.map(function (s) { return s.icao || s.sid; }).join(", ") + ", so they could not be auto-placed on the corridor. They will still be requested from the archive.");
    }
    setWarnings(warn);
    setProgress("Requesting " + windows.length + " year-window" + (windows.length === 1 ? "" : "s") + " from the Iowa Environmental Mesonet…");

    var chain = Promise.resolve([]);
    padded.forEach(function (w, idx) {
      chain = chain.then(function (acc) {
        setProgress("Fetching " + w.year + " (" + (idx + 1) + " of " + padded.length + ") for " + sids.length + " station" + (sids.length === 1 ? "" : "s") + "…");
        return loadYearCsv(sids, w).then(function (part) {
          acc.push(part);
          return acc;
        }).then(function (acc2) {
          return delay(idx === padded.length - 1 ? 0 : 1200).then(function () { return acc2; });
        });
      });
    });

    chain.then(function (parts) {
      var allRows = [];
      var emptyYears = [];
      parts.forEach(function (part) {
        var parsed = C.parseCsv(part.text);
        if (!parsed.rows.length) emptyYears.push(part.year);
        allRows = allRows.concat(parsed.rows);
      });
      if (!allRows.length) {
        throw new Error("The archive returned no routine METARs for these stations and dates. Check the identifiers, or try a more recent year range.");
      }
      var grouped = groupRows(allRows);
      var series = selected.map(function (s) {
        return {
          sid: s.sid,
          icao: s.icao,
          name: s.name,
          rows: grouped[s.sid] || grouped[C.toIemId(s.icao)] || []
        };
      });
      var missing = series.filter(function (s) { return !s.rows.length; }).map(function (s) { return s.icao || s.sid; });
      var result = C.computeClimatology(series, {
        tz: tz,
        hourStart: hourStart,
        hourEnd: hourEnd,
        mins: mins,
        windows: windows,
        dropSparse: true,
        keepInRoute: selected.filter(function (s) {
          return s.role === "departure" || s.role === "destination";
        }).map(function (s) { return s.sid; })
      });
      var notes = warn.slice();
      if (emptyYears.length) notes.push("No rows came back for " + emptyYears.join(", ") + " (the window may pre-date a station, or the archive had a gap).");
      if (missing.length) notes.push("No observations for " + missing.join(", ") + " in this sample. They are omitted from route-hour denominators when missing.");
      if (result.droppedFromRoute && result.droppedFromRoute.length) {
        notes.push("Left out of the combined route score because of a short or patchy archive (still shown per station): " +
          result.droppedFromRoute.map(function (d) {
            return (d.icao || d.sid) + " (" + d.years + " of " + d.refYears + " years, " + d.hours + " of " + d.refHours + " hours)";
          }).join("; ") + ".");
      }
      if (result.route.hours.n === 0) notes.push("No complete route-hours were scored. Try widening the time window, dropping a station with a short archive, or loosening the minimums’ required fields.");
      setWarnings(notes);
      renderResults(result);
      setProgress("Done. " + allRows.length.toLocaleString("en-US") + " archived observations used" + (parts.filter(function (p) { return p.cached; }).length ? " (some years from session cache)" : "") + ".");
    }).catch(function (err) {
      setWarnings([err && err.message ? err.message : String(err)]);
      setProgress("");
    }).then(function () {
      running = false;
      $("btn-run").disabled = false;
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

  ["dep", "dest"].forEach(function (id) {
    $(id).addEventListener("change", function () {
      refreshStations._tzLocked = false;
      refreshStations();
    });
    $(id).addEventListener("blur", function () { refreshStations(); });
  });
  ["corridor", "max-stations"].forEach(function (id) {
    $(id).addEventListener("change", refreshStations);
  });
  $("tz").addEventListener("change", function () { refreshStations._tzLocked = true; });

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
    btn.addEventListener("click", function () { applyPreset(btn.getAttribute("data-preset")); });
  });

  $("btn-example").addEventListener("click", function () {
    $("dep").value = "KSBA";
    $("dest").value = "KSJC";
    $("date").value = "2026-06-15";
    $("years").value = "5";
    $("hour-start").value = "7";
    $("hour-end").value = "10";
    $("radius").value = "3";
    $("corridor").value = "25";
    $("max-stations").value = "10";
    applyPreset("VFR");
    userRemoved = [];
    userAdded = [];
    refreshStations._tzLocked = false;
    refreshStations();
    setWarnings([]);
    setProgress("Example loaded: Santa Barbara to San Jose, mid-June mornings, VFR 3,000 / 5, 5 years. Press “Check historical go / no-go” to query the archive.");
  });

  $("calc-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    run();
  });

  refreshStations();
})();

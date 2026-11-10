/**
 * Route weather go / no-go climatology.
 *
 * Pure parsing and statistics used by the page and by node tests.
 * Historical METARs are fetched elsewhere (app.js) from the Iowa
 * Environmental Mesonet ASOS archive; this module parses those CSV
 * rows, applies ceiling / visibility / weather / wind minimums, and
 * picks ASOS/AWOS stations along a great-circle corridor.
 *
 * Ceiling is the lowest BKN, OVC, or VV layer (AIM). Few and scattered
 * layers are not a ceiling. Flight-category thresholds in the presets
 * follow AIM Table 7-1-1 style values as a starting point for personal
 * minimums, not the airspace-specific legal minima in 14 CFR 91.155.
 *
 * This is a training aid. Climatology is not a forecast.
 */
(function (root) {
  "use strict";

  // Mean Earth radius in nautical miles (6371 km). 1 degree of latitude
  // is then about 60.04 NM. Used for haversine, cross-track, along-track.
  var NM_EARTH = 3440.065;
  var DEG2RAD = Math.PI / 180;
  var RAD2DEG = 180 / Math.PI;
  var DEFAULT_YEARS = 5;
  var DEFAULT_RADIUS_DAYS = 3;
  var DEFAULT_CORRIDOR_NM = 25;
  var DEFAULT_MAX_STATIONS = 10;
  var IEM_ASOS_URL = "https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py";

  var PRESETS = {
    VFR: {
      label: "VFR",
      minCeilingFt: 3000,
      minVisibilitySm: 5,
      excludeRain: false,
      excludeSnow: false,
      excludeFreezing: false,
      excludeSevere: false,
      maxWindKt: "",
      maxGustKt: ""
    },
    MVFR: {
      label: "MVFR or better",
      minCeilingFt: 1000,
      minVisibilitySm: 3,
      excludeRain: false,
      excludeSnow: false,
      excludeFreezing: false,
      excludeSevere: false,
      maxWindKt: "",
      maxGustKt: ""
    },
    IFR: {
      label: "IFR personal (500 / 1)",
      minCeilingFt: 500,
      minVisibilitySm: 1,
      excludeRain: false,
      excludeSnow: false,
      excludeFreezing: true,
      excludeSevere: true,
      maxWindKt: "",
      maxGustKt: ""
    }
  };

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function toNumber(v) {
    if (v == null || v === "") return null;
    if (typeof v === "number") return isFinite(v) ? v : null;
    var s = String(v).trim();
    if (!s || s === "M" || s === "null" || s === "NULL" || s === "None") return null;
    var n = Number(s);
    return isFinite(n) ? n : null;
  }

  function normId(s) {
    return String(s || "").trim().toUpperCase();
  }

  /**
   * Map a typed ICAO / IATA / IEM id onto the IEM ASOS station id.
   * CONUS IEM ids are 3-letter (KSBA → SBA). Alaska, Hawaii, and
   * most non-CONUS / international sites keep the 4-letter ICAO
   * (PHNL, PANC, TJSJ, CYYZ, EGLL). If a catalog is provided it
   * wins; otherwise the K-prefix rule is applied only for 4-letter
   * K-codes.
   */
  function toIemId(input, catalogFind) {
    var q = normId(input);
    if (!q) return "";
    if (typeof catalogFind === "function") {
      var hit = catalogFind(q);
      if (hit && hit.sid) return hit.sid;
    }
    if (q.length === 4 && q.charAt(0) === "K" && /^[A-Z0-9]{3}$/.test(q.slice(1))) {
      return q.slice(1);
    }
    return q;
  }

  function toRad(d) { return d * DEG2RAD; }
  function toDeg(r) { return r * RAD2DEG; }

  function haversineNm(lat1, lon1, lat2, lon2) {
    var p1 = toRad(lat1), p2 = toRad(lat2);
    var dlat = toRad(lat2 - lat1), dlon = toRad(lon2 - lon1);
    var a = Math.sin(dlat / 2) * Math.sin(dlat / 2) +
      Math.cos(p1) * Math.cos(p2) * Math.sin(dlon / 2) * Math.sin(dlon / 2);
    var c = 2 * Math.asin(Math.min(1, Math.sqrt(a)));
    return NM_EARTH * c;
  }

  function initialBearingRad(lat1, lon1, lat2, lon2) {
    var p1 = toRad(lat1), p2 = toRad(lat2);
    var dlon = toRad(lon2 - lon1);
    var y = Math.sin(dlon) * Math.cos(p2);
    var x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dlon);
    return Math.atan2(y, x);
  }

  function angularDistRad(lat1, lon1, lat2, lon2) {
    return haversineNm(lat1, lon1, lat2, lon2) / NM_EARTH;
  }

  /**
   * Signed cross-track distance (NM) of a point from the great-circle
   * through (lat1,lon1) → (lat2,lon2). Positive is to the right of the
   * course (Movable Type / spherical navigation convention).
   */
  function crossTrackNm(lat, lon, lat1, lon1, lat2, lon2) {
    var d13 = angularDistRad(lat1, lon1, lat, lon);
    var t13 = initialBearingRad(lat1, lon1, lat, lon);
    var t12 = initialBearingRad(lat1, lon1, lat2, lon2);
    return Math.asin(Math.sin(d13) * Math.sin(t13 - t12)) * NM_EARTH;
  }

  /**
   * Signed along-track distance (NM) from the start point to the
   * closest point on the great-circle, for the same points as
   * crossTrackNm. Negative means the foot is before the start.
   */
  function alongTrackNm(lat, lon, lat1, lon1, lat2, lon2) {
    var d13 = angularDistRad(lat1, lon1, lat, lon);
    var t13 = initialBearingRad(lat1, lon1, lat, lon);
    var t12 = initialBearingRad(lat1, lon1, lat2, lon2);
    var dXt = Math.asin(Math.sin(d13) * Math.sin(t13 - t12));
    var dAt = Math.atan2(
      Math.sin(d13) * Math.cos(t13 - t12),
      Math.cos(d13)
    );
    // Prefer the cosine form's sign from atan2, which is stable
    // near the start point. dXt is unused but documents the pair.
    void dXt;
    return dAt * NM_EARTH;
  }

  function alongTrackFraction(lat, lon, lat1, lon1, lat2, lon2) {
    var route = haversineNm(lat1, lon1, lat2, lon2);
    if (route < 1e-6) return 0;
    return alongTrackNm(lat, lon, lat1, lon1, lat2, lon2) / route;
  }

  function routeGeometry(station, dep, dest) {
    if (!station || !dep || !dest) return null;
    if (![station.lat, station.lon, dep.lat, dep.lon, dest.lat, dest.lon].every(isFiniteNumber)) {
      return null;
    }
    var routeNm = haversineNm(dep.lat, dep.lon, dest.lat, dest.lon);
    var alongNm = alongTrackNm(station.lat, station.lon, dep.lat, dep.lon, dest.lat, dest.lon);
    var crossNm = crossTrackNm(station.lat, station.lon, dep.lat, dep.lon, dest.lat, dest.lon);
    return {
      routeNm: routeNm,
      alongNm: alongNm,
      alongFrac: routeNm < 1e-6 ? 0 : alongNm / routeNm,
      crossNm: crossNm,
      absCrossNm: Math.abs(crossNm),
      distanceToDepNm: haversineNm(dep.lat, dep.lon, station.lat, station.lon)
    };
  }

  /**
   * Stations inside a corridor of half-width `corridorNm` around the
   * great-circle from dep to dest, and between the endpoints
   * (along-track fraction in [0, 1], with a tiny numerical pad).
   * Result is sorted by along-track distance.
   */
  function stationsInCorridor(stations, dep, dest, corridorNm) {
    var width = corridorNm == null ? DEFAULT_CORRIDOR_NM : Number(corridorNm);
    var out = [];
    if (!dep || !dest || !isFiniteNumber(dep.lat) || !isFiniteNumber(dest.lat)) return out;
    var routeNm = haversineNm(dep.lat, dep.lon, dest.lat, dest.lon);
    if (routeNm < 5) return out;
    var list = stations || [];
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (!isFiniteNumber(s.lat) || !isFiniteNumber(s.lon)) continue;
      var g = routeGeometry(s, dep, dest);
      if (!g) continue;
      if (g.absCrossNm <= width + 1e-6 && g.alongFrac >= -0.01 && g.alongFrac <= 1.01) {
        out.push(Object.assign({ station: s }, g));
      }
    }
    out.sort(function (a, b) { return a.alongNm - b.alongNm; });
    return out;
  }

  function sidOf(s) {
    if (!s) return "";
    return normId(s.sid || s.icao || s.id || s);
  }

  /**
   * Pick a capped, evenly spaced set of corridor stations.
   * Departure and destination are always included (when they have
   * coordinates or at least an id). `extras` are always included
   * (alternates / user-added). `removed` sids are dropped unless they
   * are the departure or destination — those can be removed too if
   * listed, so the caller decides. Here, dep/dest are kept unless
   * they appear in `removed`.
   *
   * Even spacing fills the largest along-track gaps first, placing
   * the candidate closest to each gap midpoint, up to maxStations.
   */
  function selectRouteStations(stations, dep, dest, opts) {
    opts = opts || {};
    var corridorNm = opts.corridorNm == null ? DEFAULT_CORRIDOR_NM : Number(opts.corridorNm);
    var maxStations = opts.maxStations == null ? DEFAULT_MAX_STATIONS : Number(opts.maxStations);
    if (!(maxStations >= 1)) maxStations = DEFAULT_MAX_STATIONS;
    var extras = opts.extras || [];
    var removed = {};
    (opts.removed || []).forEach(function (id) { removed[sidOf(id)] = true; });

    var bySid = {};
    function remember(s, role, auto) {
      if (!s) return;
      var id = sidOf(s);
      if (!id) return;
      if (removed[id]) return;
      var existing = bySid[id];
      var g = (dep && dest && isFiniteNumber(s.lat) && isFiniteNumber(dep.lat) && isFiniteNumber(dest.lat))
        ? routeGeometry(s, dep, dest)
        : null;
      var row = {
        sid: id,
        icao: s.icao || (id.length === 3 ? "K" + id : id),
        name: s.name || id,
        lat: s.lat,
        lon: s.lon,
        tz: s.tz || "",
        state: s.state || "",
        role: role,
        auto: !!auto,
        alongNm: g ? g.alongNm : null,
        alongFrac: g ? g.alongFrac : null,
        crossNm: g ? g.crossNm : null,
        absCrossNm: g ? g.absCrossNm : null,
        distanceToDepNm: g ? g.distanceToDepNm : null,
        routeNm: g ? g.routeNm : null
      };
      if (!existing) {
        bySid[id] = row;
        return;
      }
      // Promote role priority: departure > destination > extra > enroute
      var rank = { departure: 0, destination: 1, extra: 2, alternate: 2, enroute: 3 };
      if ((rank[role] == null ? 9 : rank[role]) < (rank[existing.role] == null ? 9 : rank[existing.role])) {
        row.auto = existing.auto && row.auto;
        bySid[id] = row;
      }
    }

    remember(dep, "departure", false);
    remember(dest, "destination", false);
    extras.forEach(function (s) { remember(s, "extra", false); });

    var selected = Object.keys(bySid).map(function (k) { return bySid[k]; });
    var routeNm = (dep && dest && isFiniteNumber(dep.lat) && isFiniteNumber(dest.lat))
      ? haversineNm(dep.lat, dep.lon, dest.lat, dest.lon)
      : 0;

    if (routeNm >= 5 && (stations || []).length) {
      var corridor = stationsInCorridor(stations, dep, dest, corridorNm);
      var slots = maxStations - selected.length;
      if (slots > 0) {
        var candidates = [];
        for (var i = 0; i < corridor.length; i++) {
          var c = corridor[i];
          var id = sidOf(c.station);
          if (!id || bySid[id] || removed[id]) continue;
          candidates.push(c);
        }
        var picked = pickEvenlySpaced(candidates, selected, slots, routeNm);
        picked.forEach(function (c) { remember(c.station, "enroute", true); });
      }
    }

    selected = Object.keys(bySid).map(function (k) { return bySid[k]; });
    selected.sort(function (a, b) {
      var fa = a.alongFrac, fb = b.alongFrac;
      if (isFiniteNumber(fa) && isFiniteNumber(fb) && fa !== fb) return fa - fb;
      if (isFiniteNumber(fa) && !isFiniteNumber(fb)) return -1;
      if (!isFiniteNumber(fa) && isFiniteNumber(fb)) return 1;
      if (a.role === "departure") return -1;
      if (b.role === "departure") return 1;
      if (a.role === "destination") return 1;
      if (b.role === "destination") return -1;
      return a.sid < b.sid ? -1 : 1;
    });
    return selected;
  }

  function pickEvenlySpaced(candidates, already, slots, routeNm) {
    if (slots <= 0 || !candidates.length) return [];
    var picked = [];
    var used = {};
    already.forEach(function (s) {
      if (isFiniteNumber(s.alongNm)) used[s.sid] = s.alongNm;
    });
    // Seed endpoints if they weren't already measured
    if (!already.length && routeNm > 0) {
      used.__start = 0;
      used.__end = routeNm;
    }

    function gaps() {
      var pts = [];
      Object.keys(used).forEach(function (k) { pts.push(used[k]); });
      if (!pts.length) {
        pts = [0, routeNm];
      } else {
        pts.sort(function (a, b) { return a - b; });
        if (pts[0] > 0.5) pts.unshift(0);
        if (pts[pts.length - 1] < routeNm - 0.5) pts.push(routeNm);
      }
      var g = [];
      for (var i = 0; i < pts.length - 1; i++) {
        g.push({ a: pts[i], b: pts[i + 1], mid: (pts[i] + pts[i + 1]) / 2, width: pts[i + 1] - pts[i] });
      }
      g.sort(function (x, y) { return y.width - x.width; });
      return g;
    }

    // Avoid clustering auto-picks (two ASOS on the same field, etc.).
    var targetN = Object.keys(used).length + slots;
    var minSpacing = Math.min(20, Math.max(8, routeNm / Math.max(targetN - 1, 1) * 0.5));

    function tooClose(alongNm) {
      var keys = Object.keys(used);
      for (var t = 0; t < keys.length; t++) {
        if (Math.abs(used[keys[t]] - alongNm) < minSpacing) return true;
      }
      return false;
    }

    function interiorIndices(gap, remaining) {
      var hits = [];
      for (var i = 0; i < remaining.length; i++) {
        var x = remaining[i].alongNm;
        // Strictly inside the gap so we do not re-pick endpoints, and
        // so an empty stretch (no ASOS between two selected sites)
        // is skipped in favour of the next largest fillable gap.
        if (x > gap.a + 0.5 && x < gap.b - 0.5 && !tooClose(x)) hits.push(i);
      }
      return hits;
    }

    var remaining = candidates.slice();
    for (var n = 0; n < slots && remaining.length; n++) {
      var gs = gaps();
      var gap = null;
      var interior = [];
      for (var gi = 0; gi < gs.length; gi++) {
        interior = interiorIndices(gs[gi], remaining);
        if (interior.length) { gap = gs[gi]; break; }
      }
      if (!gap) break; // no unused station left in any open stretch
      var bestI = -1, bestScore = Infinity;
      for (var ii = 0; ii < interior.length; ii++) {
        var i = interior[ii];
        var c = remaining[i];
        var score = Math.abs(c.alongNm - gap.mid);
        // slight preference for being closer to the track when tied
        score += (c.absCrossNm || 0) * 0.01;
        if (score < bestScore) { bestScore = score; bestI = i; }
      }
      if (bestI < 0) break;
      var choice = remaining.splice(bestI, 1)[0];
      picked.push(choice);
      used[sidOf(choice.station)] = choice.alongNm;
    }
    return picked;
  }

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function addDaysYmd(year, month, day, delta) {
    var dt = new Date(Date.UTC(year, month - 1, day));
    dt.setUTCDate(dt.getUTCDate() + delta);
    return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
  }

  function ymdEquals(a, b) {
    return a && b && a.year === b.year && a.month === b.month && a.day === b.day;
  }

  function clampCenter(year, month, day) {
    // JS overflows 29 Feb in a non-leap year to 1 Mar; pin to 28 Feb.
    if (month === 2 && day === 29) {
      var probe = new Date(Date.UTC(year, 1, 29));
      if (probe.getUTCMonth() !== 1) return { year: year, month: 2, day: 28 };
    }
    var dt = new Date(Date.UTC(year, month - 1, day));
    return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
  }

  function localTimeParts(date, tz) {
    if (!date || isNaN(date.getTime())) return null;
    var zone = tz || "UTC";
    try {
      var parts = new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        weekday: "short",
        hourCycle: "h23"
      }).formatToParts(date);
      var map = {};
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type !== "literal") map[parts[i].type] = parts[i].value;
      }
      return {
        year: Number(map.year),
        month: Number(map.month),
        day: Number(map.day),
        hour: Number(map.hour),
        minute: Number(map.minute),
        weekday: map.weekday,
        tz: zone
      };
    } catch (err) {
      return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        hour: date.getUTCHours(),
        minute: date.getUTCMinutes(),
        weekday: "",
        tz: "UTC",
        tzError: String(err && err.message ? err.message : err)
      };
    }
  }

  /**
   * Latest year whose week window (center ± radius) has already
   * finished, relative to `now` in timezone `tz`.
   */
  function lastCompleteYear(month, day, radiusDays, now, tz) {
    var parts = localTimeParts(now || new Date(), tz || "UTC");
    if (!parts) return (now || new Date()).getUTCFullYear() - 1;
    var end = addDaysYmd(parts.year, month, day, radiusDays);
    // If the window end is in a previous/next year, addDaysYmd handles it.
    // Compare calendar dates in the same year-space as `end`.
    var todayNum = parts.year * 10000 + parts.month * 100 + parts.day;
    var endNum = end.year * 10000 + end.month * 100 + end.day;
    // end was computed from parts.year as the center year, but
    // addDaysYmd(parts.year, month, day, r) uses the requested month/day
    // in this year, which is what we want.
    if (todayNum > endNum) return parts.year;
    return parts.year - 1;
  }

  /**
   * Week windows of inclusive local calendar dates for each of `years`
   * complete past years. Center is (month, day), radius default 3
   * (a 7-day week).
   */
  function dateWindows(month, day, opts) {
    opts = opts || {};
    var radius = opts.radiusDays == null ? DEFAULT_RADIUS_DAYS : Number(opts.radiusDays);
    if (!(radius >= 0)) radius = DEFAULT_RADIUS_DAYS;
    var years = opts.years == null ? DEFAULT_YEARS : Number(opts.years);
    if (!(years >= 1)) years = DEFAULT_YEARS;
    var tz = opts.tz || "UTC";
    var now = opts.now || new Date();
    var latest = opts.endYear != null ? Number(opts.endYear) : lastCompleteYear(month, day, radius, now, tz);
    var out = [];
    for (var y = latest - years + 1; y <= latest; y++) {
      var center = clampCenter(y, month, day);
      var start = addDaysYmd(center.year, center.month, center.day, -radius);
      var end = addDaysYmd(center.year, center.month, center.day, radius);
      out.push({
        year: y,
        center: center,
        start: start,
        end: end
      });
    }
    return out;
  }

  function hourInWindow(hour, startHour, endHour) {
    var h = Number(hour), a = Number(startHour), b = Number(endHour);
    if (!isFiniteNumber(h) || !isFiniteNumber(a) || !isFiniteNumber(b)) return false;
    if (a === b) return true; // all day
    if (a < b) return h >= a && h < b;
    return h >= a || h < b; // overnight
  }

  /**
   * Session / "flight-day" date key. For an overnight window (22–06)
   * hours before the end belong to the previous calendar date's session.
   */
  function sessionDateKey(parts, startHour, endHour) {
    var a = Number(startHour), b = Number(endHour);
    var y = parts.year, m = parts.month, d = parts.day, h = parts.hour;
    if (isFiniteNumber(a) && isFiniteNumber(b) && a > b && h < b) {
      var prev = addDaysYmd(y, m, d, -1);
      y = prev.year; m = prev.month; d = prev.day;
    }
    return y + "-" + pad2(m) + "-" + pad2(d);
  }

  function parseValidUtc(str) {
    var m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(str || "").trim());
    if (!m) return null;
    return new Date(Date.UTC(
      Number(m[1]), Number(m[2]) - 1, Number(m[3]),
      Number(m[4]), Number(m[5]), Number(m[6] || 0)
    ));
  }

  function parseCsv(text) {
    var raw = String(text || "").replace(/^\uFEFF/, "");
    if (/too many requests/i.test(raw) || /slow down/i.test(raw)) {
      return { error: "rate-limited", rows: [], message: "The archive asked us to slow down. Wait a moment and try again." };
    }
    if (/^ERROR\b/i.test(raw.trim()) || /unprocessable/i.test(raw)) {
      return { error: "bad-request", rows: [], message: raw.trim().slice(0, 240) };
    }
    var lines = raw.split(/\r?\n/);
    var rows = [];
    var header = null;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line || line.charAt(0) === "#") continue;
      var cells = line.split(",");
      if (!header) {
        header = cells.map(function (c) { return c.trim().toLowerCase(); });
        continue;
      }
      var obj = {};
      for (var c = 0; c < header.length; c++) {
        obj[header[c]] = cells[c] == null ? "" : String(cells[c]).trim();
      }
      rows.push(obj);
    }
    if (!header) return { error: "empty", rows: [], message: "No data returned for this station and date window." };
    return { error: null, rows: rows, header: header };
  }

  var CEILING_COVER = { BKN: true, OVC: true, VV: true };

  /**
   * Lowest BKN / OVC / VV height in feet. Returns null when there is
   * sky data but no ceiling (CLR / SKC / FEW / SCT / NSC / NCD / CAVOK).
   * Returns { missing: true } when every sky field is empty.
   */
  function ceilingFromLayers(covers, heights) {
    var any = false;
    var ceil = null;
    for (var i = 0; i < covers.length; i++) {
      var cover = normId(covers[i]).replace(/[^A-Z]/g, "");
      if (!cover) continue;
      any = true;
      if (CEILING_COVER[cover]) {
        var h = toNumber(heights[i]);
        if (h != null && (ceil == null || h < ceil)) ceil = h;
        else if (h == null && ceil == null) {
          // a ceiling layer with unknown height — treat as present but
          // unmeasurable; mark missing height by leaving a sentinel later
          any = true;
        }
      }
    }
    if (!any) return { missing: true, ceilingFt: null };
    return { missing: false, ceilingFt: ceil };
  }

  function ceilingFromRow(row) {
    if (!row) return { missing: true, ceilingFt: null };
    return ceilingFromLayers(
      [row.skyc1, row.skyc2, row.skyc3, row.skyc4],
      [row.skyl1, row.skyl2, row.skyl3, row.skyl4]
    );
  }

  /**
   * Classify METAR present-weather codes (IEM `wxcodes`, AIM 7-1).
   * Intensity / vicinity prefixes: -, +, VC.
   */
  function wxFlags(wxcodes) {
    var tokens = String(wxcodes || "").trim().toUpperCase().split(/\s+/).filter(Boolean);
    var flags = {
      rain: false,
      snow: false,
      freezing: false,
      thunder: false,
      heavyRain: false,
      hail: false,
      funnel: false,
      squall: false,
      severe: false,
      tokens: tokens
    };
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      var core = t.replace(/^(VC|\+|-)/, "");
      if (/TS/.test(t)) flags.thunder = true;
      if (/\+RA/.test(t) && t.slice(0, 2) !== "VC") flags.heavyRain = true;
      if (/GR/.test(core) || /GS/.test(core)) flags.hail = true;
      if (/FC/.test(core)) flags.funnel = true;
      if (/SQ/.test(core)) flags.squall = true;
      if (/RA/.test(core) || /DZ/.test(core)) flags.rain = true;
      if (/SN/.test(core) || /SG/.test(core)) flags.snow = true;
      if (/FZRA/.test(t) || /FZDZ/.test(t) || /FZUP/.test(t)) flags.freezing = true;
      if (core === "PL" || /SHPL/.test(core) || /TSPL/.test(core) || /(^|[^A-Z])PL$/.test(core)) {
        flags.freezing = true;
      }
    }
    flags.severe = flags.thunder || flags.heavyRain || flags.hail || flags.funnel || flags.squall;
    return flags;
  }

  function normalizeObs(row, tz) {
    if (!row) return null;
    var valid = parseValidUtc(row.valid);
    if (!valid) return null;
    var sky = ceilingFromRow(row);
    var vis = toNumber(row.vsby);
    var wind = toNumber(row.sknt);
    var gust = toNumber(row.gust);
    var wx = wxFlags(row.wxcodes);
    var parts = localTimeParts(valid, tz || "UTC");
    return {
      station: normId(row.station || row.sid || ""),
      valid: valid,
      validStamp: row.valid,
      local: parts,
      ceilingFt: sky.ceilingFt,
      skyMissing: sky.missing,
      visibilitySm: vis,
      windKt: wind,
      gustKt: gust,
      wxcodes: row.wxcodes || "",
      wx: wx
    };
  }

  /**
   * Evaluate one observation against personal minimums.
   * Comparisons are inclusive (>= min ceiling / visibility, <= max wind).
   * A missing field that is being checked makes the observation not
   * evaluable rather than an automatic no-go.
   */
  function evaluateObs(obs, mins) {
    mins = mins || {};
    var fail = {
      ceiling: false,
      visibility: false,
      rain: false,
      snow: false,
      freezing: false,
      severe: false,
      wind: false
    };
    var unknown = [];
    var minCeil = mins.minCeilingFt === "" || mins.minCeilingFt == null ? null : Number(mins.minCeilingFt);
    var minVis = mins.minVisibilitySm === "" || mins.minVisibilitySm == null ? null : Number(mins.minVisibilitySm);
    var maxWind = mins.maxWindKt === "" || mins.maxWindKt == null ? null : Number(mins.maxWindKt);
    var maxGust = mins.maxGustKt === "" || mins.maxGustKt == null ? null : Number(mins.maxGustKt);

    if (minCeil != null && isFinite(minCeil)) {
      if (!obs || obs.skyMissing) unknown.push("ceiling");
      else if (obs.ceilingFt != null && obs.ceilingFt < minCeil) fail.ceiling = true;
    }
    if (minVis != null && isFinite(minVis)) {
      if (!obs || obs.visibilitySm == null) unknown.push("visibility");
      else if (obs.visibilitySm < minVis) fail.visibility = true;
    }
    var wx = (obs && obs.wx) || wxFlags("");
    if (mins.excludeRain && wx.rain) fail.rain = true;
    if (mins.excludeSnow && wx.snow) fail.snow = true;
    if (mins.excludeFreezing && wx.freezing) fail.freezing = true;
    if (mins.excludeSevere && wx.severe) fail.severe = true;
    if (maxWind != null && isFinite(maxWind)) {
      if (!obs || obs.windKt == null) unknown.push("wind");
      else if (obs.windKt > maxWind) fail.wind = true;
    }
    if (maxGust != null && isFinite(maxGust)) {
      // A missing gust means no gust was reported; compare against
      // sustained if needed, but only fail on an actual gust value.
      if (obs && obs.gustKt != null && obs.gustKt > maxGust) fail.wind = true;
    }
    var reasons = [];
    Object.keys(fail).forEach(function (k) { if (fail[k]) reasons.push(k); });
    var evaluable = unknown.length === 0;
    var go = evaluable && reasons.length === 0;
    return { go: go, fail: fail, reasons: reasons, unknown: unknown, evaluable: evaluable };
  }

  function inDateWindows(parts, windows) {
    if (!parts || !windows || !windows.length) return false;
    var num = parts.year * 10000 + parts.month * 100 + parts.day;
    for (var i = 0; i < windows.length; i++) {
      var a = windows[i].start, b = windows[i].end;
      var n0 = a.year * 10000 + a.month * 100 + a.day;
      var n1 = b.year * 10000 + b.month * 100 + b.day;
      if (num >= n0 && num <= n1) return true;
    }
    return false;
  }

  function emptyFailCounts() {
    return { ceiling: 0, visibility: 0, rain: 0, snow: 0, freezing: 0, severe: 0, wind: 0 };
  }

  function bumpFail(counts, fail) {
    Object.keys(counts).forEach(function (k) { if (fail[k]) counts[k] += 1; });
  }

  function emptyHourMap() {
    var m = {};
    for (var h = 0; h < 24; h++) m[h] = { n: 0, go: 0 };
    return m;
  }

  function pct(go, n) {
    if (!n) return null;
    return 100 * go / n;
  }

  /**
   * Aggregate go / no-go statistics for one or more stations.
   *
   * series: [{ sid, name, rows: [raw IEM objects or pre-normalized] }]
   * opts: { tz, mins, hourStart, hourEnd, windows  OR  month, day, years, radiusDays, now }
   *
   * A route-hour is go only when every selected station with a slot
   * in that local hour is evaluable and go. Hours where any station
   * lacks an evaluable observation are omitted from the route
   * denominator (and counted as incomplete).
   */
  function computeClimatology(series, opts) {
    opts = opts || {};
    var tz = opts.tz || "UTC";
    var hourStart = opts.hourStart == null ? 0 : Number(opts.hourStart);
    var hourEnd = opts.hourEnd == null ? 0 : Number(opts.hourEnd);
    var mins = opts.mins || {};
    var windows = opts.windows;
    if (!windows && opts.month != null && opts.day != null) {
      windows = dateWindows(opts.month, opts.day, {
        years: opts.years,
        radiusDays: opts.radiusDays,
        now: opts.now,
        tz: tz,
        endYear: opts.endYear
      });
    }
    if (!windows) windows = [];

    var stationStats = [];
    var routeHours = {}; // key -> { stations: {sid: eval}, year, hour, dateKey }

    for (var s = 0; s < (series || []).length; s++) {
      var src = series[s];
      var sid = normId(src.sid || src.id || (src.rows && src.rows[0] && src.rows[0].station) || "S" + s);
      var st = {
        sid: sid,
        name: src.name || sid,
        icao: src.icao || sid,
        hours: { n: 0, go: 0 },
        days: {},
        byHour: emptyHourMap(),
        byYear: {},
        failCounts: emptyFailCounts(),
        skipped: 0,
        missingSky: 0,
        totalRows: 0,
        windowRows: 0
      };

      var rows = src.rows || [];
      // Keep the latest evaluable-or-not obs per local hour
      var byLocalHour = {};
      for (var i = 0; i < rows.length; i++) {
        st.totalRows += 1;
        var obs = rows[i] && rows[i].valid && rows[i].local ? rows[i] : normalizeObs(rows[i], tz);
        if (!obs) { st.skipped += 1; continue; }
        if (obs.skyMissing) st.missingSky += 1;
        if (!obs.local) { st.skipped += 1; continue; }
        if (windows.length && !inDateWindows(obs.local, windows)) continue;
        st.windowRows += 1;
        var key = sessionDateKey(obs.local, 0, 0); // calendar date first
        var hourKey = key + "T" + pad2(obs.local.hour);
        var prev = byLocalHour[hourKey];
        if (!prev || obs.local.minute >= prev.local.minute) byLocalHour[hourKey] = obs;
      }

      Object.keys(byLocalHour).forEach(function (hourKey) {
        var obs = byLocalHour[hourKey];
        var ev = evaluateObs(obs, mins);
        var inWin = hourInWindow(obs.local.hour, hourStart, hourEnd);
        var dateKey = sessionDateKey(obs.local, hourStart, hourEnd);
        var year = Number(dateKey.slice(0, 4));
        if (!st.byYear[year]) st.byYear[year] = { n: 0, go: 0, days: {} };
        st.byHour[obs.local.hour].n += ev.evaluable ? 1 : 0;
        if (ev.evaluable && ev.go) st.byHour[obs.local.hour].go += 1;

        if (!inWin) return;
        if (!ev.evaluable) { st.skipped += 1; return; }
        st.hours.n += 1;
        if (ev.go) st.hours.go += 1;
        else bumpFail(st.failCounts, ev.fail);
        if (!st.days[dateKey]) st.days[dateKey] = { n: 0, go: 0 };
        st.days[dateKey].n += 1;
        if (ev.go) st.days[dateKey].go += 1;
        st.byYear[year].n += 1;
        if (ev.go) st.byYear[year].go += 1;

        var rk = dateKey + "T" + pad2(obs.local.hour);
        if (!routeHours[rk]) {
          routeHours[rk] = { dateKey: dateKey, year: year, hour: obs.local.hour, evs: {} };
        }
        routeHours[rk].evs[sid] = ev;
      });

      var dayKeys = Object.keys(st.days);
      var daysAny = 0, daysAll = 0;
      dayKeys.forEach(function (k) {
        if (st.days[k].go > 0) daysAny += 1;
        if (st.days[k].go === st.days[k].n && st.days[k].n > 0) daysAll += 1;
      });
      st.dayCount = dayKeys.length;
      st.daysAnyGo = daysAny;
      st.daysAllGo = daysAll;
      st.hourPct = pct(st.hours.go, st.hours.n);
      st.dayAnyPct = pct(daysAny, dayKeys.length);
      st.dayAllPct = pct(daysAll, dayKeys.length);
      stationStats.push(st);
    }

    var expectedAll = stationStats.map(function (s) { return s.sid; });
    var keep = {};
    (opts.keepInRoute || []).forEach(function (id) { keep[normId(id)] = true; });
    var droppedFromRoute = [];
    if (opts.dropSparse) {
      var refYears = 0;
      var refHours = 0;
      var refPool = stationStats.filter(function (s) { return keep[s.sid]; });
      if (!refPool.length) refPool = stationStats.slice();
      refPool.forEach(function (s) {
        var y = Object.keys(s.byYear).length;
        if (y > refYears) refYears = y;
        if (s.hours.n > refHours) refHours = s.hours.n;
      });
      stationStats.forEach(function (s) {
        if (keep[s.sid]) return;
        var y = Object.keys(s.byYear).length;
        var sparseYears = refYears >= 2 && y < refYears * 0.7;
        var sparseHours = refHours > 0 && s.hours.n < refHours * 0.65 && (refHours - s.hours.n) >= 4;
        if (sparseYears || sparseHours) {
          droppedFromRoute.push({
            sid: s.sid,
            icao: s.icao,
            name: s.name,
            years: y,
            refYears: refYears,
            hours: s.hours.n,
            refHours: refHours
          });
        }
      });
    }
    var droppedSet = {};
    droppedFromRoute.forEach(function (d) { droppedSet[d.sid] = true; });
    var expected = expectedAll.filter(function (id) { return !droppedSet[id]; });
    if (!expected.length) expected = expectedAll.slice();

    var route = {
      hours: { n: 0, go: 0 },
      days: {},
      byHour: emptyHourMap(),
      byYear: {},
      failCounts: emptyFailCounts(),
      incompleteHours: 0
    };

    Object.keys(routeHours).forEach(function (rk) {
      var slot = routeHours[rk];
      var complete = true;
      var allGo = true;
      var mergedFail = emptyFailCounts();
      for (var i = 0; i < expected.length; i++) {
        var ev = slot.evs[expected[i]];
        if (!ev || !ev.evaluable) { complete = false; break; }
        if (!ev.go) {
          allGo = false;
          bumpFail(mergedFail, ev.fail);
        }
      }
      if (!complete) {
        route.incompleteHours += 1;
        return;
      }
      route.hours.n += 1;
      if (allGo) route.hours.go += 1;
      else bumpFail(route.failCounts, mergedFail);
      if (!route.days[slot.dateKey]) route.days[slot.dateKey] = { n: 0, go: 0 };
      route.days[slot.dateKey].n += 1;
      if (allGo) route.days[slot.dateKey].go += 1;
      if (!route.byYear[slot.year]) route.byYear[slot.year] = { n: 0, go: 0 };
      route.byYear[slot.year].n += 1;
      if (allGo) route.byYear[slot.year].go += 1;
      // byHour for the route uses only in-window complete hours (same set)
      route.byHour[slot.hour].n += 1;
      if (allGo) route.byHour[slot.hour].go += 1;
    });

    var rDayKeys = Object.keys(route.days);
    var rAny = 0, rAll = 0;
    rDayKeys.forEach(function (k) {
      if (route.days[k].go > 0) rAny += 1;
      if (route.days[k].go === route.days[k].n && route.days[k].n > 0) rAll += 1;
    });
    route.dayCount = rDayKeys.length;
    route.daysAnyGo = rAny;
    route.daysAllGo = rAll;
    route.hourPct = pct(route.hours.go, route.hours.n);
    route.dayAnyPct = pct(rAny, rDayKeys.length);
    route.dayAllPct = pct(rAll, rDayKeys.length);

    var worst = null;
    stationStats.forEach(function (s) {
      if (s.dayAnyPct == null) return;
      if (!worst || s.dayAnyPct < worst.dayAnyPct) worst = s;
    });

    return {
      windows: windows,
      tz: tz,
      hourStart: hourStart,
      hourEnd: hourEnd,
      stations: stationStats,
      route: route,
      routeStationSids: expected,
      droppedFromRoute: droppedFromRoute,
      worstStation: worst,
      stationCount: stationStats.length
    };
  }

  /**
   * Build a light IEM ASOS CSV URL for one date window (inclusive
   * calendar dates, already padded if the caller wants). Multiple
   * station ids are passed as repeated `station=` params. Times are
   * requested in UTC so the client can convert to a chosen zone.
   * report_type=3 is routine (hourly) METARs — SPECIs are omitted
   * so bad weather is not over-sampled.
   */
  function buildAsosUrl(sids, start, end, opts) {
    opts = opts || {};
    var params = [];
    function add(k, v) { params.push(encodeURIComponent(k) + "=" + encodeURIComponent(v)); }
    (sids || []).forEach(function (id) { add("station", toIemId(id)); });
    var fields = opts.fields || ["skyc1", "skyc2", "skyc3", "skyc4", "skyl1", "skyl2", "skyl3", "skyl4", "vsby", "wxcodes", "sknt", "gust"];
    fields.forEach(function (f) { add("data", f); });
    add("year1", String(start.year));
    add("month1", String(start.month));
    add("day1", String(start.day));
    add("year2", String(end.year));
    add("month2", String(end.month));
    add("day2", String(end.day));
    add("tz", opts.tz || "UTC");
    add("format", "onlycomma");
    add("latlon", "no");
    add("elev", "no");
    add("missing", "empty");
    add("trace", "T");
    add("direct", "no");
    add("report_type", opts.reportType || "3");
    return (opts.baseUrl || IEM_ASOS_URL) + "?" + params.join("&");
  }

  /**
   * Expand each week window by `padDays` on each side so local-time
   * filtering is not clipped by the UTC day boundary.
   */
  function paddedFetchWindows(windows, padDays) {
    var pad = padDays == null ? 1 : Number(padDays);
    return (windows || []).map(function (w) {
      return {
        year: w.year,
        start: addDaysYmd(w.start.year, w.start.month, w.start.day, -pad),
        end: addDaysYmd(w.end.year, w.end.month, w.end.day, pad),
        center: w.center
      };
    });
  }

  function leadingFailure(failCounts) {
    var keys = ["ceiling", "visibility", "rain", "snow", "freezing", "severe", "wind"];
    var best = null, n = 0;
    keys.forEach(function (k) {
      var v = failCounts && failCounts[k] || 0;
      if (v > n) { n = v; best = k; }
    });
    return { reason: best, count: n };
  }

  var api = {
    NM_EARTH: NM_EARTH,
    DEFAULT_YEARS: DEFAULT_YEARS,
    DEFAULT_RADIUS_DAYS: DEFAULT_RADIUS_DAYS,
    DEFAULT_CORRIDOR_NM: DEFAULT_CORRIDOR_NM,
    DEFAULT_MAX_STATIONS: DEFAULT_MAX_STATIONS,
    IEM_ASOS_URL: IEM_ASOS_URL,
    PRESETS: PRESETS,
    isFiniteNumber: isFiniteNumber,
    toNumber: toNumber,
    toIemId: toIemId,
    haversineNm: haversineNm,
    initialBearingDeg: function (a, b, c, d) {
      var r = initialBearingRad(a, b, c, d) * RAD2DEG;
      return (r + 360) % 360;
    },
    crossTrackNm: crossTrackNm,
    alongTrackNm: alongTrackNm,
    alongTrackFraction: alongTrackFraction,
    routeGeometry: routeGeometry,
    stationsInCorridor: stationsInCorridor,
    selectRouteStations: selectRouteStations,
    dateWindows: dateWindows,
    lastCompleteYear: lastCompleteYear,
    addDaysYmd: addDaysYmd,
    hourInWindow: hourInWindow,
    sessionDateKey: sessionDateKey,
    localTimeParts: localTimeParts,
    parseValidUtc: parseValidUtc,
    parseCsv: parseCsv,
    ceilingFromLayers: ceilingFromLayers,
    ceilingFromRow: ceilingFromRow,
    wxFlags: wxFlags,
    normalizeObs: normalizeObs,
    evaluateObs: evaluateObs,
    computeClimatology: computeClimatology,
    buildAsosUrl: buildAsosUrl,
    paddedFetchWindows: paddedFetchWindows,
    leadingFailure: leadingFailure
  };

  root.WeatherGoNoGo = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

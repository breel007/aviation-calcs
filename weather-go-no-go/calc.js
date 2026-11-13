/**
 * Route weather go / no-go climatology.
 *
 * Pure parsing and statistics used by the page and by node tests.
 * Historical METARs are fetched elsewhere (app.js) from the Iowa
 * Environmental Mesonet ASOS archive; this module parses those CSV
 * rows, applies ceiling / visibility / weather / wind minimums, and
 * picks ASOS/AWOS stations along a route corridor (a single
 * great-circle, or a polyline of great-circle legs through optional
 * waypoints).
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
   * Split a typed route string into identifier tokens. Spaces, commas,
   * slashes, and arrows are all accepted as separators, so "PRB SNS",
   * "KSBA, PRB, KSJC", and "KSBA → PRB → KSJC" produce the same list.
   */
  function parseRouteTokens(str) {
    return String(str || "")
      .toUpperCase()
      .split(/[^A-Z0-9]+/)
      .filter(Boolean);
  }

  function identList(place) {
    if (!place) return [];
    var out = [];
    function add(v) {
      var id = normId(v);
      if (!id) return;
      if (out.indexOf(id) === -1) out.push(id);
      if (id.length === 4 && id.charAt(0) === "K") {
        var shortId = id.slice(1);
        if (out.indexOf(shortId) === -1) out.push(shortId);
      } else if (id.length === 3) {
        var longId = "K" + id;
        if (out.indexOf(longId) === -1) out.push(longId);
      }
    }
    add(place.ident);
    add(place.icao);
    add(place.sid);
    add(place.id);
    return out;
  }

  function identMatches(token, place) {
    var t = normId(token);
    if (!t) return false;
    return identList(place).indexOf(t) !== -1;
  }

  /**
   * Drop a leading token that restates the departure and a trailing
   * token that restates the destination, so "KSBA PRB KSJC" and
   * "PRB" mean the same intermediate list when dep/dest are set.
   */
  function trimRouteTokens(tokens, dep, dest) {
    var t = (tokens || []).map(normId).filter(Boolean);
    if (t.length && identMatches(t[0], dep)) t = t.slice(1);
    if (t.length && identMatches(t[t.length - 1], dest)) t = t.slice(0, -1);
    return t;
  }

  function displayIdent(p) {
    if (!p) return "";
    if (p.ident) return normId(p.ident);
    return normId(p.icao || p.sid || p.id);
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
   * Deduplicate a vertex list: drop points without coordinates and
   * consecutive vertices closer than 0.001 NM. Returns { points, legs,
   * routeNm } where each leg has a, b, nm, and startAlong (cumulative
   * NM from the first vertex).
   */
  function buildRoutePath(dep, dest, waypoints) {
    var raw = [];
    if (dep) raw.push(dep);
    (waypoints || []).forEach(function (p) { raw.push(p); });
    if (dest) raw.push(dest);
    var points = [];
    for (var i = 0; i < raw.length; i++) {
      var p = raw[i];
      if (!p || !isFiniteNumber(p.lat) || !isFiniteNumber(p.lon)) continue;
      if (points.length) {
        var prev = points[points.length - 1];
        if (haversineNm(prev.lat, prev.lon, p.lat, p.lon) < 1e-3) continue;
      }
      points.push(p);
    }
    var legs = [];
    var acc = 0;
    for (var j = 0; j < points.length - 1; j++) {
      var nm = haversineNm(points[j].lat, points[j].lon, points[j + 1].lat, points[j + 1].lon);
      legs.push({ a: points[j], b: points[j + 1], nm: nm, startAlong: acc, index: j });
      acc += nm;
    }
    return { points: points, legs: legs, routeNm: acc };
  }

  /**
   * Placement of a point relative to a polyline of great-circle legs.
   * alongNm is measured from the first vertex, along the whole path,
   * to the closest foot on any leg. For a single-leg path this matches
   * routeGeometry exactly (including along-track values past the ends).
   */
  function polylineGeometry(station, pathOrPoints) {
    var path = pathOrPoints && pathOrPoints.legs && pathOrPoints.points
      ? pathOrPoints
      : buildRoutePath(null, null, pathOrPoints);
    if (!station || !isFiniteNumber(station.lat) || !isFiniteNumber(station.lon)) return null;
    if (!path.points.length) return null;
    if (path.legs.length === 0) {
      var d0 = haversineNm(path.points[0].lat, path.points[0].lon, station.lat, station.lon);
      return {
        routeNm: 0,
        alongNm: 0,
        alongFrac: 0,
        crossNm: 0,
        absCrossNm: d0,
        distanceToDepNm: d0,
        legIndex: 0
      };
    }
    if (path.legs.length === 1) {
      var g1 = routeGeometry(station, path.legs[0].a, path.legs[0].b);
      if (g1) g1.legIndex = 0;
      return g1;
    }
    var best = null;
    for (var i = 0; i < path.legs.length; i++) {
      var leg = path.legs[i];
      var g = routeGeometry(station, leg.a, leg.b);
      if (!g) continue;
      var onSeg = g.alongFrac >= 0 && g.alongFrac <= 1;
      var alongClamped = Math.max(0, Math.min(leg.nm, g.alongNm));
      var dist;
      if (onSeg) {
        dist = g.absCrossNm;
      } else if (g.alongNm < 0) {
        dist = haversineNm(station.lat, station.lon, leg.a.lat, leg.a.lon);
      } else {
        dist = haversineNm(station.lat, station.lon, leg.b.lat, leg.b.lon);
      }
      var cand = {
        routeNm: path.routeNm,
        alongNm: leg.startAlong + alongClamped,
        alongFrac: path.routeNm < 1e-6 ? 0 : (leg.startAlong + alongClamped) / path.routeNm,
        crossNm: onSeg ? g.crossNm : 0,
        absCrossNm: dist,
        distanceToDepNm: haversineNm(path.points[0].lat, path.points[0].lon, station.lat, station.lon),
        legIndex: i,
        onSeg: onSeg
      };
      if (!best) {
        best = cand;
        continue;
      }
      if (cand.onSeg && !best.onSeg) {
        best = cand;
        continue;
      }
      if (best.onSeg && !cand.onSeg) continue;
      if (cand.absCrossNm + 1e-9 < best.absCrossNm) {
        best = cand;
      } else if (Math.abs(cand.absCrossNm - best.absCrossNm) <= 1e-9 && cand.alongNm < best.alongNm) {
        best = cand;
      }
    }
    return best;
  }

  function stationInPathCorridor(station, path, width) {
    if (!path || !path.legs || !path.legs.length) return false;
    for (var i = 0; i < path.legs.length; i++) {
      var g = routeGeometry(station, path.legs[i].a, path.legs[i].b);
      if (!g) continue;
      if (g.absCrossNm <= width + 1e-6 && g.alongFrac >= -0.01 && g.alongFrac <= 1.01) return true;
    }
    return false;
  }

  function formatRouteSummary(dep, dest, waypoints) {
    var wps = waypoints || [];
    var parts = [];
    function pushIdent(p) {
      var id = displayIdent(p);
      if (!id) return;
      if (parts.length && parts[parts.length - 1] === id) return;
      parts.push(id);
    }
    pushIdent(dep);
    wps.forEach(pushIdent);
    pushIdent(dest);
    var path = buildRoutePath(dep, dest, wps);
    var label = parts.join(" → ");
    if (path.routeNm >= 0.5 && parts.length >= 2) {
      label += ", " + Math.round(path.routeNm) + " NM";
    }
    return {
      label: label,
      routeNm: path.routeNm,
      pointCount: path.points.length,
      legCount: path.legs.length
    };
  }

  function findStationForWaypoint(stations, wp) {
    if (!wp) return null;
    var keys = {};
    identList(wp).forEach(function (id) { keys[id] = true; });
    if (!Object.keys(keys).length) return null;
    var list = stations || [];
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (keys[sidOf(s)] || keys[normId(s.icao)]) return s;
    }
    return null;
  }

  /**
   * Stations inside a corridor of half-width `corridorNm` around the
   * great-circle from dep to dest, and between the endpoints
   * (along-track fraction in [0, 1], with a tiny numerical pad).
   * Result is sorted by along-track distance.
   */
  function stationsInCorridor(stations, dep, dest, corridorNm, waypoints) {
    var width = corridorNm == null ? DEFAULT_CORRIDOR_NM : Number(corridorNm);
    var out = [];
    var path = buildRoutePath(dep, dest, waypoints);
    if (path.routeNm < 5) return out;
    var list = stations || [];
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (!isFiniteNumber(s.lat) || !isFiniteNumber(s.lon)) continue;
      if (!stationInPathCorridor(s, path, width)) continue;
      var g = polylineGeometry(s, path);
      if (!g) continue;
      out.push(Object.assign({ station: s }, g));
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

    var waypoints = opts.waypoints || [];
    var path = buildRoutePath(dep, dest, waypoints);

    var bySid = {};
    function remember(s, role, auto) {
      if (!s) return;
      var id = sidOf(s);
      if (!id) return;
      if (removed[id]) return;
      var existing = bySid[id];
      var g = null;
      if (isFiniteNumber(s.lat)) {
        if (path.points.length >= 2 && path.routeNm >= 1e-6) {
          g = polylineGeometry(s, path);
        } else if (dep && dest && isFiniteNumber(dep.lat) && isFiniteNumber(dest.lat)) {
          g = routeGeometry(s, dep, dest);
        }
      }
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
    waypoints.forEach(function (wp) {
      var hit = findStationForWaypoint(stations, wp);
      if (hit) remember(hit, "enroute", true);
    });

    var selected = Object.keys(bySid).map(function (k) { return bySid[k]; });
    var routeNm = path.routeNm;

    if (routeNm >= 5 && (stations || []).length) {
      var corridor = stationsInCorridor(stations, dep, dest, corridorNm, waypoints);
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

  // ---- ±30-minute report matching ------------------------------------
  var MATCH_WINDOW_MIN = 30;     // a report counts for an hour if within ±30 min of hh:00
  var ROUTE_COVERAGE_MIN = 0.8;  // stations below 80% hour coverage leave the route score

  function ymdNum(d) { return d.year * 10000 + d.month * 100 + d.day; }
  function ymdFromKey(k) {
    return { year: Number(k.slice(0, 4)), month: Number(k.slice(5, 7)), day: Number(k.slice(8, 10)) };
  }
  // Local wall-clock minutes (time zone already applied), so hh:00 slots
  // and reports compare in the pilot's clock.
  function wallMinutes(p) {
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute || 0) / 60000;
  }
  function severityOf(ev) {
    if (!ev) return -1;
    return ev.go ? 0 : 1 + ev.reasons.length;
  }

  /**
   * Pick the report for an hour slot at wall-clock minute t from
   * `usable` (evaluable reports sorted by .t). Rule:
   *   1. only reports within ±30 minutes of the top of the hour count
   *      (inclusive: hh-1:30 … hh:30);
   *   2. the closest report wins;
   *   3. on an exact tie (e.g. one at :30 before and one at :30 after,
   *      or two reports at the same minute) the more conservative one
   *      wins: a no-go beats a go, and more failed limits beat fewer.
   *      Only routine METARs are requested, so ties are never a SPECI
   *      chosen over a routine report.
   */
  function matchReport(usable, t) {
    var lo = 0, hi = usable.length;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (usable[mid].t < t - MATCH_WINDOW_MIN) lo = mid + 1; else hi = mid;
    }
    var best = null, bestD = Infinity;
    for (var i = lo; i < usable.length && usable[i].t <= t + MATCH_WINDOW_MIN; i++) {
      var d = Math.abs(usable[i].t - t);
      if (d < bestD || (d === bestD && severityOf(usable[i].ev) > severityOf(best.ev))) {
        best = usable[i];
        bestD = d;
      }
    }
    return best;
  }

  /**
   * Aggregate go / no-go statistics for one or more stations.
   *
   * series: [{ sid, name, rows: [raw IEM objects or pre-normalized] }]
   * opts: { tz, mins, hourStart, hourEnd, windows  OR  month, day, years, radiusDays, now }
   *
   * Each in-window local hour is a slot at the top of the hour (hh:00).
   * Every station is matched to its closest evaluable report within
   * ±30 minutes of that time (see matchReport). With opts.dropSparse,
   * a station that covers fewer than 80% of the in-window hours that
   * any station covers is left out of the combined route score
   * (droppedFromRoute; still reported per station). A route-hour is go
   * only when every remaining station is matched and go; an hour where
   * a remaining station has no match is incomplete and left out.
   * route.possibleHours / possibleDays give the full sample size.
   * opts.endpoints: { sid: "departure" | "destination" } marks endpoints.
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

    // ---- Hour slots -------------------------------------------------
    // One slot per local calendar date and clock hour (top of the hour)
    // across the date windows, padded a day each side so overnight
    // windows can reach the next morning. In-window slots whose session
    // date is inside a window are the "possible" route hours.
    var slots = [];
    var possibleDayKeys = {};
    var seenCal = {};
    windows.forEach(function (w) {
      var d = addDaysYmd(w.start.year, w.start.month, w.start.day, -1);
      var endNum = ymdNum(addDaysYmd(w.end.year, w.end.month, w.end.day, 1));
      while (ymdNum(d) <= endNum) {
        var calKey = d.year + "-" + pad2(d.month) + "-" + pad2(d.day);
        if (!seenCal[calKey]) {
          seenCal[calKey] = true;
          for (var h = 0; h < 24; h++) {
            var parts = { year: d.year, month: d.month, day: d.day, hour: h, minute: 0 };
            var calIn = inDateWindows(parts, windows);
            var dateKey = sessionDateKey(parts, hourStart, hourEnd);
            var inWin = hourInWindow(h, hourStart, hourEnd) && inDateWindows(ymdFromKey(dateKey), windows);
            if (!calIn && !inWin) continue;
            if (inWin) possibleDayKeys[dateKey] = true;
            slots.push({
              t: wallMinutes(parts),
              hour: h,
              dateKey: dateKey,
              year: Number(dateKey.slice(0, 4)),
              calIn: calIn,
              inWin: inWin,
              key: dateKey + "T" + pad2(h)
            });
          }
        }
        d = addDaysYmd(d.year, d.month, d.day, 1);
      }
    });
    var possibleSlots = slots.filter(function (sl) { return sl.inWin; });
    var routeHours = {}; // key -> { dateKey, year, hour, evs: {sid: eval} }
    possibleSlots.forEach(function (sl) {
      routeHours[sl.key] = { dateKey: sl.dateKey, year: sl.year, hour: sl.hour, evs: {} };
    });

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
        windowRows: 0,
        possibleHours: possibleSlots.length,
        coverage: null
      };

      // Evaluable reports, sorted by local wall-clock time.
      var rows = src.rows || [];
      var usable = [];
      for (var i = 0; i < rows.length; i++) {
        st.totalRows += 1;
        var obs = rows[i] && rows[i].valid && rows[i].local ? rows[i] : normalizeObs(rows[i], tz);
        if (!obs) { st.skipped += 1; continue; }
        if (obs.skyMissing) st.missingSky += 1;
        if (!obs.local) { st.skipped += 1; continue; }
        st.windowRows += 1;
        var ev0 = evaluateObs(obs, mins);
        if (!ev0.evaluable) { st.skipped += 1; continue; }
        usable.push({ t: wallMinutes(obs.local), ev: ev0, obs: obs });
      }
      usable.sort(function (a, b) { return a.t - b.t; });

      for (var k = 0; k < slots.length; k++) {
        var sl = slots[k];
        var m = matchReport(usable, sl.t);
        if (!m) continue;
        var ev = m.ev;
        if (sl.calIn) {
          st.byHour[sl.hour].n += 1;
          if (ev.go) st.byHour[sl.hour].go += 1;
        }
        if (!sl.inWin) continue;
        st.hours.n += 1;
        if (ev.go) st.hours.go += 1;
        else bumpFail(st.failCounts, ev.fail);
        if (!st.days[sl.dateKey]) st.days[sl.dateKey] = { n: 0, go: 0 };
        st.days[sl.dateKey].n += 1;
        if (ev.go) st.days[sl.dateKey].go += 1;
        if (!st.byYear[sl.year]) st.byYear[sl.year] = { n: 0, go: 0 };
        st.byYear[sl.year].n += 1;
        if (ev.go) st.byYear[sl.year].go += 1;
        routeHours[sl.key].evs[sid] = ev;
      }

      var dayKeys = Object.keys(st.days);
      var daysAny = 0, daysAll = 0;
      dayKeys.forEach(function (k2) {
        if (st.days[k2].go > 0) daysAny += 1;
        if (st.days[k2].go === st.days[k2].n && st.days[k2].n > 0) daysAll += 1;
      });
      st.dayCount = dayKeys.length;
      st.daysAnyGo = daysAny;
      st.daysAllGo = daysAll;
      st.hourPct = pct(st.hours.go, st.hours.n);
      st.dayAnyPct = pct(daysAny, dayKeys.length);
      st.dayAllPct = pct(daysAll, dayKeys.length);
      stationStats.push(st);
    }

    // ---- Adaptive exclusion ------------------------------------------
    // Reference = in-window hours where at least one station has a
    // matched report. A station that covers less than
    // ROUTE_COVERAGE_MIN of those hours is left out of the combined
    // route score (still shown per station). Departure and destination
    // follow the same rule; callers flag them via opts.endpoints.
    var refKeys = Object.keys(routeHours).filter(function (rk) {
      return Object.keys(routeHours[rk].evs).length > 0;
    });
    var refHours = refKeys.length;
    var roles = {};
    var endpointsOpt = opts.endpoints || {};
    Object.keys(endpointsOpt).forEach(function (id) { roles[normId(id)] = endpointsOpt[id]; });
    stationStats.forEach(function (st2) {
      st2.coverage = refHours ? st2.hours.n / refHours : 0;
      st2.role = roles[st2.sid] || null;
    });
    var expectedAll = stationStats.map(function (st2) { return st2.sid; });
    var droppedFromRoute = [];
    if (opts.dropSparse) {
      var minCov = opts.coverageMin == null ? ROUTE_COVERAGE_MIN : Number(opts.coverageMin);
      var anyPass = stationStats.some(function (st2) { return st2.coverage >= minCov; });
      var maxCov = 0;
      stationStats.forEach(function (st2) { if (st2.coverage > maxCov) maxCov = st2.coverage; });
      var cut = anyPass ? minCov : maxCov * minCov; // nobody reaches the bar: keep the best-covered
      stationStats.forEach(function (st2) {
        if (st2.coverage < cut) {
          droppedFromRoute.push({
            sid: st2.sid,
            icao: st2.icao,
            name: st2.name,
            role: st2.role,
            hours: st2.hours.n,
            refHours: refHours,
            coverage: st2.coverage,
            years: Object.keys(st2.byYear).length,
            refYears: windows.length
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
      incompleteHours: 0,
      possibleHours: possibleSlots.length,
      possibleDays: Object.keys(possibleDayKeys).length
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
      possibleHours: route.possibleHours,
      possibleDays: route.possibleDays,
      refHours: refHours,
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
    parseRouteTokens: parseRouteTokens,
    trimRouteTokens: trimRouteTokens,
    buildRoutePath: buildRoutePath,
    polylineGeometry: polylineGeometry,
    formatRouteSummary: formatRouteSummary,
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
    leadingFailure: leadingFailure,
    matchReport: matchReport,
    MATCH_WINDOW_MIN: MATCH_WINDOW_MIN,
    ROUTE_COVERAGE_MIN: ROUTE_COVERAGE_MIN
  };

  root.WeatherGoNoGo = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

/**
 * Airport / navaid / fix identifier lookup against the compact NASR
 * (and optional OurAirports) JSON shards in ./data.
 *
 * Works in the browser (fetch) and in Node tests (fs). Each lookup
 * fetches only the apt, nav, and fix shards whose filename matches the
 * first character of the normalized identifier.
 */
(function (root) {
  "use strict";

  var TYPE_WORDS = /(?:\s+|-)(?:VORTAC|VOR\/DME|VORDME|VOR-DME|VOR|TACAN|NDB\/DME|NDB|DME|VOT|FAN\s+MARKER|INTERSECTION|INT|FIX)$/i;

  function normalizeIdent(raw) {
    if (raw == null) return "";
    var s = String(raw).trim().toUpperCase();
    s = s.replace(/[_/]+/g, " ").replace(/\s+/g, " ").trim();
    var prev;
    do {
      prev = s;
      s = s.replace(TYPE_WORDS, "").trim();
    } while (s !== prev);
    s = s.replace(/\s+/g, "");
    return s;
  }

  function shardLetter(ident) {
    var c = String(ident || "").charAt(0);
    if (/[A-Z0-9]/.test(c)) return c;
    return "_";
  }

  function asArray(value) {
    if (value == null) return [];
    return Array.isArray(value) ? value : [value];
  }

  function hydrate(key, rec) {
    if (!rec || typeof rec !== "object") return null;
    var out = {
      id: rec.id || key,
      name: rec.name || rec.id || key,
      type: rec.type || "unknown",
      lat: Number(rec.lat),
      lon: Number(rec.lon)
    };
    if (rec.icao) out.icao = rec.icao;
    if (rec.state) out.state = rec.state;
    if (rec.cc) out.cc = rec.cc;
    if (rec.freq != null && rec.freq !== "") out.freq = rec.freq;
    if (rec.closed) out.closed = true;
    if (rec.src) out.src = rec.src;
    if (!isFinite(out.lat) || !isFinite(out.lon)) return null;
    return out;
  }

  var TYPE_RANK = {
    airport: 0,
    heliport: 1,
    seaplane: 2,
    gliderport: 3,
    ultralight: 4,
    balloonport: 5,
    VORTAC: 10,
    "VOR/DME": 11,
    VOR: 12,
    TACAN: 13,
    "NDB/DME": 14,
    NDB: 15,
    "MARINE NDB": 16,
    DME: 17,
    VOT: 18,
    "FAN MARKER": 19,
    fix: 30
  };

  function typeRank(t) {
    return TYPE_RANK.hasOwnProperty(t) ? TYPE_RANK[t] : 25;
  }

  function sameFix(a, b) {
    return a.type === b.type && a.lat === b.lat && a.lon === b.lon &&
      (a.name || "") === (b.name || "") &&
      (a.freq == null ? null : a.freq) === (b.freq == null ? null : b.freq);
  }

  function sortMatches(matches) {
    return matches.slice().sort(function (a, b) {
      var d = typeRank(a.type) - typeRank(b.type);
      if (d) return d;
      var sa = (a.state || "") + (a.cc || "");
      var sb = (b.state || "") + (b.cc || "");
      if (sa < sb) return -1;
      if (sa > sb) return 1;
      return (a.name || "").localeCompare(b.name || "");
    });
  }

  function locationLabel(rec) {
    var parts = [];
    if (rec.state) parts.push(rec.state);
    if (rec.cc && rec.cc !== "US" && parts.indexOf(rec.cc) === -1) parts.push(rec.cc);
    return parts.join(", ");
  }

  function freqLabel(rec) {
    if (rec.freq == null || rec.freq === "") return "";
    if (/NDB|MARINE/.test(rec.type)) return rec.freq + " kHz";
    return rec.freq + " MHz";
  }

  function typeLabel(rec) {
    var t = rec.type || "place";
    if (rec.closed) return t + " (closed)";
    return t;
  }

  function describe(rec) {
    var bits = [typeLabel(rec)];
    var fr = freqLabel(rec);
    if (fr) bits.push(fr);
    var loc = locationLabel(rec);
    if (loc) bits.push(loc);
    return bits.join(" · ");
  }

  function identLabel(rec) {
    if (rec.icao && rec.id && rec.icao !== rec.id) return rec.icao + " / " + rec.id;
    return rec.icao || rec.id;
  }

  function create(options) {
    options = options || {};
    var dataDir = options.dataDir || "data";
    var readShard = options.readShard || defaultReadShard(dataDir);
    var readMeta = options.readMeta || defaultReadMeta(dataDir);
    var cache = Object.create(null);
    var metaPromise = null;

    function loadShard(kind, letter) {
      var key = kind + "/" + letter;
      if (cache[key]) return cache[key];
      cache[key] = Promise.resolve(readShard(kind, letter)).then(function (data) {
        return data || null;
      }).catch(function (err) {
        delete cache[key];
        throw err;
      });
      return cache[key];
    }

    function lookup(ident) {
      var normalized = normalizeIdent(ident);
      if (!normalized) {
        return Promise.resolve({ query: ident, normalized: "", matches: [] });
      }
      var letter = shardLetter(normalized);
      var kinds = ["apt", "nav", "fix"];
      return Promise.all(kinds.map(function (k) { return loadShard(k, letter); })).then(function (shards) {
        var matches = [];
        for (var i = 0; i < kinds.length; i++) {
          var shard = shards[i];
          if (!shard) continue;
          var raw = shard[normalized];
          asArray(raw).forEach(function (rec) {
            var h = hydrate(normalized, rec);
            if (!h) return;
            for (var j = 0; j < matches.length; j++) {
              if (sameFix(matches[j], h)) return;
            }
            matches.push(h);
          });
        }
        return {
          query: ident,
          normalized: normalized,
          matches: sortMatches(matches)
        };
      });
    }

    function loadMeta() {
      if (!metaPromise) {
        metaPromise = Promise.resolve(readMeta()).catch(function (err) {
          metaPromise = null;
          throw err;
        });
      }
      return metaPromise;
    }

    return {
      lookup: lookup,
      loadMeta: loadMeta,
      loadShard: loadShard,
      normalizeIdent: normalizeIdent,
      shardLetter: shardLetter
    };
  }

  function defaultReadShard(dataDir) {
    if (typeof window === "undefined") {
      var fs = require("fs");
      var path = require("path");
      return function (kind, letter) {
        var file = path.join(dataDir, kind, letter + ".json");
        return fs.promises.readFile(file, "utf8").then(function (text) {
          return JSON.parse(text);
        }).catch(function (err) {
          if (err && err.code === "ENOENT") return null;
          throw err;
        });
      };
    }
    return function (kind, letter) {
      var base = String(dataDir).replace(/\/$/, "");
      var url = base + "/" + encodeURIComponent(kind) + "/" + encodeURIComponent(letter) + ".json";
      return fetch(url).then(function (res) {
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("Failed to load " + url + " (" + res.status + ")");
        return res.json();
      });
    };
  }

  function defaultReadMeta(dataDir) {
    if (typeof window === "undefined") {
      var fs = require("fs");
      var path = require("path");
      return function () {
        var file = path.join(dataDir, "meta.json");
        return fs.promises.readFile(file, "utf8").then(function (text) {
          return JSON.parse(text);
        });
      };
    }
    return function () {
      var url = String(dataDir).replace(/\/$/, "") + "/meta.json";
      return fetch(url).then(function (res) {
        if (!res.ok) throw new Error("Failed to load " + url + " (" + res.status + ")");
        return res.json();
      });
    };
  }

  var api = {
    create: create,
    normalizeIdent: normalizeIdent,
    shardLetter: shardLetter,
    hydrate: hydrate,
    locationLabel: locationLabel,
    freqLabel: freqLabel,
    typeLabel: typeLabel,
    describe: describe,
    identLabel: identLabel
  };

  root.NavLookup = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

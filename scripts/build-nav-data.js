#!/usr/bin/env node
/**
 * Build compact, lazily loaded identifier lookup files for the
 * great-circle distance page from a FAA NASR 28-day subscription
 * (public domain) and, optionally, OurAirports (also public domain)
 * for non-U.S. ICAO airports.
 *
 * Expected NASR CSV files (from the APT, NAV, and FIX group zips on
 * the cycle page): APT_BASE.csv, NAV_BASE.csv, FIX_BASE.csv.
 *
 * Usage:
 *   node scripts/build-nav-data.js --dir /path/to/extracted-csvs \
 *       --ourairports /path/to/airports.csv \
 *       --out great-circle-distance/data
 *
 *   node scripts/build-nav-data.js --download --cycle 2026-10-29 \
 *       --out great-circle-distance/data
 *
 * Current-cycle group zips (replace the date to match the subscription):
 *   https://nfdc.faa.gov/webContent/28DaySub/extra/29_Oct_2026_APT_CSV.zip
 *   https://nfdc.faa.gov/webContent/28DaySub/extra/29_Oct_2026_NAV_CSV.zip
 *   https://nfdc.faa.gov/webContent/28DaySub/extra/29_Oct_2026_FIX_CSV.zip
 *   https://www.faa.gov/air_traffic/flight_info/aeronav/Aero_Data/NASR_Subscription/
 * OurAirports:
 *   https://davidmegginson.github.io/ourairports-data/airports.csv
 *
 * Output shards are minified JSON maps keyed by uppercase identifier.
 * A record is {id, name, type, lat, lon, state?, icao?, freq?, closed?, cc?}.
 * Navaid `type` is the NASR NAV_TYPE (VOR, VORTAC, NDB, …) and `freq`
 * is included when present. Files are split by kind (apt/nav/fix) and
 * first character so the page only fetches the shards it needs.
 */
"use strict";

var fs = require("fs");
var path = require("path");
var https = require("https");
var http = require("http");
var { execFileSync } = require("child_process");
var os = require("os");

var SITE_TYPES = {
  A: "airport",
  H: "heliport",
  C: "seaplane",
  U: "ultralight",
  G: "gliderport",
  B: "balloonport"
};

var OA_TYPES = {
  large_airport: "airport",
  medium_airport: "airport",
  small_airport: "airport",
  seaplane_base: "seaplane",
  heliport: "heliport"
};

var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function parseArgs(argv) {
  var out = {
    dir: null,
    apt: null,
    nav: null,
    fix: null,
    ourairports: null,
    out: path.join("great-circle-distance", "data"),
    cycle: null,
    download: false
  };
  for (var i = 2; i < argv.length; i++) {
    var a = argv[i];
    var next = argv[i + 1];
    if (a === "--download") out.download = true;
    else if (a === "--dir" && next) { out.dir = next; i++; }
    else if (a === "--apt" && next) { out.apt = next; i++; }
    else if (a === "--nav" && next) { out.nav = next; i++; }
    else if (a === "--fix" && next) { out.fix = next; i++; }
    else if (a === "--ourairports" && next) { out.ourairports = next; i++; }
    else if (a === "--out" && next) { out.out = next; i++; }
    else if (a === "--cycle" && next) { out.cycle = next; i++; }
    else if (a === "-h" || a === "--help") { out.help = true; }
    else die("Unknown argument: " + a + "\nRun with --help for usage.");
  }
  return out;
}

function parseCsv(text) {
  var rows = [];
  var row = [];
  var field = "";
  var inQuotes = false;
  for (var i = 0; i < text.length; i++) {
    var c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function csvObjects(text) {
  var rows = parseCsv(text);
  if (!rows.length) return [];
  var header = rows[0].map(function (h) { return String(h).trim(); });
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (r.length === 1 && r[0] === "") continue;
    var obj = {};
    for (var j = 0; j < header.length; j++) obj[header[j]] = r[j] != null ? r[j] : "";
    out.push(obj);
  }
  return out;
}

function walkFind(root, filename, maxDepth) {
  var found = [];
  function walk(dir, depth) {
    if (depth > maxDepth) return;
    var entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch (e) { return; }
    for (var i = 0; i < entries.length; i++) {
      var ent = entries[i];
      var p = path.join(dir, ent.name);
      if (ent.isFile() && ent.name === filename) found.push(p);
      else if (ent.isDirectory() && ent.name !== "." && ent.name !== "..") walk(p, depth + 1);
    }
  }
  walk(root, 0);
  return found;
}

function resolveCsv(explicit, searchRoot, filename) {
  if (explicit) {
    if (!fs.existsSync(explicit)) die("CSV not found: " + explicit);
    return explicit;
  }
  if (!searchRoot) return null;
  var hits = walkFind(searchRoot, filename, 6);
  if (!hits.length) return null;
  if (hits.length > 1) {
    console.warn("Multiple " + filename + " files; using " + hits[0]);
  }
  return hits[0];
}

function titleCase(s) {
  if (!s) return s;
  return s.toLowerCase().replace(/(^|[^A-Za-z0-9])([a-z])/g, function (_, a, b) {
    return a + b.toUpperCase();
  });
}

function roundCoord(x) {
  var n = Number(x);
  if (!isFinite(n)) return null;
  return Math.round(n * 1e6) / 1e6;
}

function shardLetter(ident) {
  var c = String(ident || "").charAt(0);
  if (/[A-Z0-9]/.test(c)) return c;
  return "_";
}

function addRecord(shards, ident, rec) {
  ident = String(ident || "").trim().toUpperCase();
  if (!ident) return;
  var letter = shardLetter(ident);
  if (!shards[letter]) shards[letter] = {};
  var bucket = shards[letter];
  var cur = bucket[ident];
  if (!cur) {
    bucket[ident] = rec;
    return;
  }
  var arr = Array.isArray(cur) ? cur : [cur];
  for (var i = 0; i < arr.length; i++) {
    var r = arr[i];
    if (r.type === rec.type && r.lat === rec.lat && r.lon === rec.lon &&
        (r.name || "") === (rec.name || "") && (r.freq == null ? null : r.freq) === (rec.freq == null ? null : rec.freq)) {
      return;
    }
  }
  arr.push(rec);
  bucket[ident] = arr;
}

function normalizeCycle(raw) {
  if (!raw) return null;
  var m = String(raw).trim().match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (!m) return null;
  var mo = ("0" + m[2]).slice(-2);
  var da = ("0" + m[3]).slice(-2);
  return m[1] + "-" + mo + "-" + da;
}

function cycleToZipStamp(cycle) {
  var p = cycle.split("-");
  var y = p[0], mo = Number(p[1]), d = Number(p[2]);
  return d + "_" + MONTHS[mo - 1] + "_" + y;
}

function downloadFile(url, dest) {
  return new Promise(function (resolve, reject) {
    function get(u, hops) {
      if (hops > 8) return reject(new Error("Too many redirects: " + u));
      var mod = u.startsWith("https") ? https : http;
      var req = mod.get(u, {
        headers: { "User-Agent": "aviatorcalcs-nav-data-builder/1.0" }
      }, function (res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          var next = res.headers.location;
          if (!/^https?:\/\//i.test(next)) {
            var base = new URL(u);
            next = new URL(next, base).toString();
          }
          res.resume();
          return get(next, hops + 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error("GET " + u + " → " + res.statusCode));
        }
        var file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on("finish", function () { file.close(resolve); });
        file.on("error", reject);
      });
      req.on("error", reject);
    }
    get(url, 0);
  });
}

async function downloadNasr(cycle, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  var stamp = cycleToZipStamp(cycle);
  var kinds = ["APT", "NAV", "FIX"];
  for (var i = 0; i < kinds.length; i++) {
    var kind = kinds[i];
    var url = "https://nfdc.faa.gov/webContent/28DaySub/extra/" + stamp + "_" + kind + "_CSV.zip";
    var zip = path.join(destDir, stamp + "_" + kind + "_CSV.zip");
    var extractDir = path.join(destDir, kind.toLowerCase());
    console.log("Downloading " + url);
    await downloadFile(url, zip);
    fs.mkdirSync(extractDir, { recursive: true });
    execFileSync("unzip", ["-o", "-q", zip, "-d", extractDir]);
  }
}

async function maybeDownloadOurAirports(dest) {
  var url = "https://davidmegginson.github.io/ourairports-data/airports.csv";
  console.log("Downloading " + url);
  await downloadFile(url, dest);
  return dest;
}

function compactRec(rec) {
  var out = { id: rec.id, name: rec.name, type: rec.type, lat: rec.lat, lon: rec.lon };
  if (rec.icao && rec.icao !== rec.id) out.icao = rec.icao;
  if (rec.state) out.state = rec.state;
  if (rec.cc && rec.cc !== "US") out.cc = rec.cc;
  if (rec.freq != null && rec.freq !== "") out.freq = rec.freq;
  if (rec.closed) out.closed = true;
  if (rec.src) out.src = rec.src;
  if (rec.name === rec.id && rec.type === "fix") delete out.name;
  return out;
}

function writeShards(outDir, kind, shards) {
  var dir = path.join(outDir, kind);
  fs.mkdirSync(dir, { recursive: true });
  var files = [];
  var letters = Object.keys(shards).sort();
  var records = 0;
  var keys = 0;
  for (var i = 0; i < letters.length; i++) {
    var letter = letters[i];
    var map = shards[letter];
    var idents = Object.keys(map);
    if (!idents.length) continue;
    var payload = {};
    for (var j = 0; j < idents.length; j++) {
      var ident = idents[j];
      var rec = map[ident];
      if (Array.isArray(rec)) payload[ident] = rec.map(compactRec);
      else payload[ident] = compactRec(rec);
      keys += 1;
    }
    var fileName = letter + ".json";
    var text = JSON.stringify(payload);
    fs.writeFileSync(path.join(dir, fileName), text);
    files.push({ letter: letter, bytes: Buffer.byteLength(text), keys: idents.length });
    records += idents.length;
  }
  return { files: files, keys: keys };
}

function parseFreq(raw) {
  if (raw == null) return null;
  var s = String(raw).trim();
  if (!s) return null;
  var n = Number(s);
  return isFinite(n) ? n : null;
}

function mainSync(args, aptPath, navPath, fixPath, oaPath) {
  console.log("Reading " + aptPath);
  var aptRows = csvObjects(fs.readFileSync(aptPath, "utf8"));
  console.log("Reading " + navPath);
  var navRows = csvObjects(fs.readFileSync(navPath, "utf8"));
  console.log("Reading " + fixPath);
  var fixRows = csvObjects(fs.readFileSync(fixPath, "utf8"));

  var aptShards = {};
  var navShards = {};
  var fixShards = {};
  var cycle = args.cycle ? normalizeCycle(args.cycle) : null;
  var nasrIcaos = Object.create(null);
  var counts = { airport: 0, navaid: 0, fix: 0, airportByType: {}, closedAirports: 0, ourairports: 0 };

  for (var i = 0; i < aptRows.length; i++) {
    var r = aptRows[i];
    var lat = roundCoord(r.LAT_DECIMAL);
    var lon = roundCoord(r.LONG_DECIMAL);
    if (lat == null || lon == null) continue;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    var lid = String(r.ARPT_ID || "").trim().toUpperCase();
    var icao = String(r.ICAO_ID || "").trim().toUpperCase();
    if (!lid && !icao) continue;
    if (!cycle && r.EFF_DATE) cycle = normalizeCycle(r.EFF_DATE);
    var typ = SITE_TYPES[String(r.SITE_TYPE_CODE || "A").trim()] || "airport";
    var rec = {
      id: lid || icao,
      icao: icao || undefined,
      name: titleCase(String(r.ARPT_NAME || lid || icao).trim()),
      type: typ,
      lat: lat,
      lon: lon,
      state: String(r.STATE_CODE || "").trim().toUpperCase() || undefined,
      cc: String(r.COUNTRY_CODE || "").trim().toUpperCase() || undefined,
      closed: String(r.ARPT_STATUS || "").trim() !== "O"
    };
    addRecord(aptShards, lid, rec);
    if (icao && icao !== lid) addRecord(aptShards, icao, rec);
    if (icao) nasrIcaos[icao] = true;
    if (lid) nasrIcaos[lid] = true;
    counts.airport += 1;
    counts.airportByType[typ] = (counts.airportByType[typ] || 0) + 1;
    if (rec.closed) counts.closedAirports += 1;
  }

  for (var n = 0; n < navRows.length; n++) {
    var nv = navRows[n];
    var status = String(nv.NAV_STATUS || "").trim().toUpperCase();
    if (status === "SHUTDOWN") continue;
    var nlat = roundCoord(nv.LAT_DECIMAL);
    var nlon = roundCoord(nv.LONG_DECIMAL);
    if (nlat == null || nlon == null) continue;
    var nid = String(nv.NAV_ID || "").trim().toUpperCase();
    if (!nid) continue;
    if (!cycle && nv.EFF_DATE) cycle = normalizeCycle(nv.EFF_DATE);
    var nrec = {
      id: nid,
      name: titleCase(String(nv.NAME || nid).trim()),
      type: String(nv.NAV_TYPE || "NAV").trim() || "NAV",
      lat: nlat,
      lon: nlon,
      state: String(nv.STATE_CODE || "").trim().toUpperCase() || undefined,
      cc: String(nv.COUNTRY_CODE || "").trim().toUpperCase() || undefined,
      freq: parseFreq(nv.FREQ)
    };
    addRecord(navShards, nid, nrec);
    counts.navaid += 1;
  }

  for (var f = 0; f < fixRows.length; f++) {
    var fx = fixRows[f];
    var flat = roundCoord(fx.LAT_DECIMAL);
    var flon = roundCoord(fx.LONG_DECIMAL);
    if (flat == null || flon == null) continue;
    var fid = String(fx.FIX_ID || "").trim().toUpperCase();
    if (!fid) continue;
    if (!cycle && fx.EFF_DATE) cycle = normalizeCycle(fx.EFF_DATE);
    var frec = {
      id: fid,
      name: fid,
      type: "fix",
      lat: flat,
      lon: flon,
      state: String(fx.STATE_CODE || "").trim().toUpperCase() || undefined,
      cc: String(fx.COUNTRY_CODE || "").trim().toUpperCase() || undefined
    };
    addRecord(fixShards, fid, frec);
    counts.fix += 1;
  }

  if (oaPath) {
    console.log("Merging OurAirports non-U.S. ICAO airports from " + oaPath);
    var oaRows = csvObjects(fs.readFileSync(oaPath, "utf8"));
    for (var o = 0; o < oaRows.length; o++) {
      var oa = oaRows[o];
      if (String(oa.type || "") === "closed") continue;
      var typ2 = OA_TYPES[String(oa.type || "")];
      if (!typ2) continue;
      var cc = String(oa.iso_country || "").trim().toUpperCase();
      if (cc === "US") continue;
      var icao2 = String(oa.icao_code || "").trim().toUpperCase();
      if (!/^[A-Z]{4}$/.test(icao2)) continue;
      if (nasrIcaos[icao2]) continue;
      var olat = roundCoord(oa.latitude_deg);
      var olon = roundCoord(oa.longitude_deg);
      if (olat == null || olon == null) continue;
      var region = String(oa.iso_region || "").trim().toUpperCase();
      var state = undefined;
      if (region) {
        var pref = cc + "-";
        state = region.indexOf(pref) === 0 ? region.slice(pref.length) : region;
      }
      var orec = {
        id: icao2,
        icao: icao2,
        name: String(oa.name || icao2).trim(),
        type: typ2,
        lat: olat,
        lon: olon,
        state: state,
        cc: cc || undefined,
        src: "oa"
      };
      addRecord(aptShards, icao2, orec);
      nasrIcaos[icao2] = true;
      counts.ourairports += 1;
      counts.airport += 1;
      counts.airportByType[typ2] = (counts.airportByType[typ2] || 0) + 1;
    }
  }

  if (!cycle) die("Could not determine the NASR cycle date (pass --cycle YYYY-MM-DD).");

  var outDir = path.resolve(args.out);
  if (fs.existsSync(outDir)) {
    // Remove previous shard files so leftover letters do not linger.
    ["apt", "nav", "fix"].forEach(function (kind) {
      var d = path.join(outDir, kind);
      if (!fs.existsSync(d)) return;
      fs.readdirSync(d).forEach(function (name) {
        if (name.endsWith(".json")) fs.unlinkSync(path.join(d, name));
      });
    });
  }
  fs.mkdirSync(outDir, { recursive: true });

  var aptInfo = writeShards(outDir, "apt", aptShards);
  var navInfo = writeShards(outDir, "nav", navShards);
  var fixInfo = writeShards(outDir, "fix", fixShards);

  function totalBytes(info) {
    return info.files.reduce(function (s, f) { return s + f.bytes; }, 0);
  }

  var meta = {
    cycle: cycle,
    cycleLabel: "NASR 28-day cycle effective " + cycle,
    source: "FAA NASR 28-day subscription (public domain)",
    sourceUrl: "https://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/NASR_Subscription/",
    ourairports: Boolean(oaPath),
    ourairportsSource: oaPath ? "OurAirports airports.csv (public domain)" : null,
    counts: {
      airport: counts.airport,
      navaid: counts.navaid,
      fix: counts.fix,
      ourairports: counts.ourairports,
      closedAirports: counts.closedAirports,
      airportByType: counts.airportByType
    },
    shards: {
      apt: aptInfo.files.map(function (f) { return f.letter; }),
      nav: navInfo.files.map(function (f) { return f.letter; }),
      fix: fixInfo.files.map(function (f) { return f.letter; })
    },
    bytes: {
      apt: totalBytes(aptInfo),
      nav: totalBytes(navInfo),
      fix: totalBytes(fixInfo)
    },
    generated: new Date().toISOString()
  };
  fs.writeFileSync(path.join(outDir, "meta.json"), JSON.stringify(meta));

  console.log("NASR cycle " + cycle);
  console.log("Airports (incl. OurAirports " + counts.ourairports + "): " + counts.airport +
    "  keys " + aptInfo.keys + "  " + meta.bytes.apt + " bytes");
  console.log("Navaids: " + counts.navaid + "  keys " + navInfo.keys + "  " + meta.bytes.nav + " bytes");
  console.log("Fixes: " + counts.fix + "  keys " + fixInfo.keys + "  " + meta.bytes.fix + " bytes");
  console.log("Wrote " + outDir);
  return meta;
}

async function run() {
  var args = parseArgs(process.argv);
  if (args.help) {
    console.log(fs.readFileSync(__filename, "utf8").split("Usage:\n")[1].split("Current-cycle")[0]);
    process.exit(0);
  }

  var searchRoot = args.dir ? path.resolve(args.dir) : null;
  if (args.download) {
    var cycle = normalizeCycle(args.cycle);
    if (!cycle) die("--download requires --cycle YYYY-MM-DD (the NASR effective date).");
    var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nasr-" + cycle + "-"));
    await downloadNasr(cycle, tmp);
    searchRoot = tmp;
    if (!args.ourairports) {
      args.ourairports = path.join(tmp, "ourairports-airports.csv");
      await maybeDownloadOurAirports(args.ourairports);
    }
  }

  var aptPath = resolveCsv(args.apt, searchRoot, "APT_BASE.csv");
  var navPath = resolveCsv(args.nav, searchRoot, "NAV_BASE.csv");
  var fixPath = resolveCsv(args.fix, searchRoot, "FIX_BASE.csv");
  if (!aptPath || !navPath || !fixPath) {
    die("Need APT_BASE.csv, NAV_BASE.csv, and FIX_BASE.csv.\n" +
      "Pass --dir to a NASR extract, or --apt/--nav/--fix, or --download --cycle YYYY-MM-DD.");
  }
  var oaPath = args.ourairports || (searchRoot && resolveCsv(null, searchRoot, "airports.csv"));
  if (args.ourairports && !fs.existsSync(args.ourairports)) die("OurAirports CSV not found: " + args.ourairports);
  if (oaPath && !fs.existsSync(oaPath)) oaPath = null;

  mainSync(args, aptPath, navPath, fixPath, oaPath || null);
}

run().catch(function (err) {
  console.error(err && err.stack || err);
  process.exit(1);
});

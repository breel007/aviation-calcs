/**
 * Offline METAR / SPECI decoder.
 *
 * Parses a raw METAR (or SPECI) into structured fields and FAA flight
 * category (LIFR / IFR / MVFR / VFR) from ceiling and visibility, using
 * the thresholds in the Aeronautical Information Manual:
 *   LIFR  ceiling < 500 ft and/or visibility < 1 SM
 *   IFR   ceiling 500–999 ft and/or visibility 1 to < 3 SM
 *   MVFR  ceiling 1,000–3,000 ft and/or visibility 3–5 SM
 *   VFR   ceiling > 3,000 ft and visibility > 5 SM
 *
 * Ceiling is the lowest broken (BKN), overcast (OVC), or vertical-visibility
 * (VV) layer. Few and scattered layers are not a ceiling.
 *
 * This is a training aid. Official weather is the source of truth.
 */
(function (root) {
  "use strict";

  var SM_M = 1609.344;
  var HPA_PER_INHG = 33.863886666666667;

  var WX_DESC = {
    MI: "shallow", PR: "partial", BC: "patches of", DR: "low drifting",
    BL: "blowing", SH: "showers of", TS: "thunderstorm", FZ: "freezing"
  };
  var WX_PRECIP = {
    DZ: "drizzle", RA: "rain", SN: "snow", SG: "snow grains",
    IC: "ice crystals", PL: "ice pellets", GR: "hail", GS: "small hail / snow pellets",
    UP: "unknown precipitation"
  };
  var WX_OBS = {
    BR: "mist", FG: "fog", FU: "smoke", VA: "volcanic ash", DU: "widespread dust",
    SA: "sand", HZ: "haze", PY: "spray"
  };
  var WX_OTHER = {
    PO: "dust/sand whirls", SQ: "squalls", FC: "funnel cloud",
    SS: "sandstorm", DS: "duststorm"
  };
  var SKY_COVER = {
    SKC: "sky clear", CLR: "clear (automated, below 12,000 ft)",
    NSC: "no significant cloud", NCD: "no cloud detected",
    FEW: "few", SCT: "scattered", BKN: "broken", OVC: "overcast",
    VV: "vertical visibility"
  };

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function normalizeHeading(deg) {
    var x = deg % 360;
    if (x < 0) x += 360;
    if (x === 0) return 360;
    return x;
  }

  function tokenize(raw) {
    return String(raw || "")
      .replace(/[\r\n]+/g, " ")
      .replace(/=\s*$/, "")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean);
  }

  function parseTempValue(tok) {
    if (tok == null || tok === "//") return null;
    var m = /^(M)?(\d{2})$/.exec(tok);
    if (!m) return null;
    var v = Number(m[2]);
    return m[1] ? -v : v;
  }

  function visToSm(vis) {
    if (!vis) return null;
    if (vis.cavok) return 9999 / SM_M * 1000 / 1; // handled below
    if (isFiniteNumber(vis.statuteMiles)) return vis.statuteMiles;
    if (isFiniteNumber(vis.meters)) return vis.meters / SM_M;
    return null;
  }

  function formatVis(vis) {
    if (!vis) return "";
    if (vis.cavok) return "CAVOK (10 km or more, no significant weather or cloud below 5,000 ft)";
    if (isFiniteNumber(vis.statuteMiles)) {
      var prefix = vis.plus ? "greater than " : vis.minus ? "less than " : "";
      return prefix + vis.text + " statute miles";
    }
    if (isFiniteNumber(vis.meters)) {
      var more = vis.meters === 9999 ? " (10 km or more)" : "";
      var dir = vis.direction ? " to the " + vis.direction : "";
      return vis.meters + " metres" + more + dir;
    }
    return vis.text || "";
  }

  function parseVisibilityToken(tok, nextTok) {
    if (tok === "CAVOK") {
      return { cavok: true, statuteMiles: 9999 / SM_M * 1000 > 6 ? 6.21 : 6.21, meters: 9999, text: "CAVOK", consumed: 1 };
    }
    // Combined "1" + "1/2SM"
    if (/^\d$/.test(tok) && nextTok && /^(?:[MP])?\d\/\dSM$/.test(nextTok)) {
      var frac = nextTok.replace(/SM$/, "");
      var pref = "";
      if (frac.charAt(0) === "P" || frac.charAt(0) === "M") {
        pref = frac.charAt(0);
        frac = frac.slice(1);
      }
      var parts = frac.split("/");
      var value = Number(tok) + Number(parts[0]) / Number(parts[1]);
      return {
        statuteMiles: value,
        plus: pref === "P",
        minus: pref === "M",
        text: tok + " " + frac,
        consumed: 2
      };
    }
    var sm = /^([MP])?(?:(\d{1,2})(?:\s+)?)?(?:(\d)\/(\d))?SM$/.exec(tok);
    if (sm) {
      var flag = sm[1] || "";
      var whole = sm[2] != null ? Number(sm[2]) : 0;
      var num = sm[3] != null ? Number(sm[3]) : 0;
      var den = sm[4] != null ? Number(sm[4]) : 1;
      var val = whole + (den ? num / den : 0);
      var text = (flag === "P" ? "P" : flag === "M" ? "M" : "") +
        (sm[2] ? sm[2] : "") + (sm[3] ? (sm[2] ? " " : "") + sm[3] + "/" + sm[4] : "") ;
      if (!sm[2] && !sm[3]) return null;
      return {
        statuteMiles: val,
        plus: flag === "P",
        minus: flag === "M",
        text: (flag === "P" ? ">" : flag === "M" ? "<" : "") + (sm[2] || "") + (sm[3] ? ((sm[2] ? " " : "") + sm[3] + "/" + sm[4]) : ""),
        consumed: 1
      };
    }
    // 4-digit metres, optional direction
    var met = /^(9999|\d{4})(NDV|N|NE|E|SE|S|SW|W|NW)?$/.exec(tok);
    if (met && /^\d{4}$/.test(met[1])) {
      return {
        meters: Number(met[1]),
        direction: met[2] && met[2] !== "NDV" ? met[2] : null,
        ndv: met[2] === "NDV",
        text: tok,
        consumed: 1
      };
    }
    return null;
  }

  function parseRvr(tok) {
    var m = /^R(\d{2}[LCR]?)\/([PM])?(\d{4})(?:V([PM])?(\d{4}))?(FT)?(?:\/([UDN]))?$/.exec(tok);
    if (!m) return null;
    function one(flag, val, unit) {
      return {
        flag: flag || null,
        value: Number(val),
        unit: unit === "FT" ? "ft" : "m",
        text: (flag === "P" ? ">" : flag === "M" ? "<" : "") + Number(val) + (unit === "FT" ? " ft" : " m")
      };
    }
    var unit = m[6] || "";
    return {
      runway: m[1],
      min: one(m[2], m[3], unit),
      max: m[5] != null ? one(m[4], m[5], unit) : null,
      trend: m[7] === "U" ? "increasing" : m[7] === "D" ? "decreasing" : m[7] === "N" ? "no change" : null,
      raw: tok
    };
  }

  var WX_RE = /^([-+]|VC)?((?:MI|PR|BC|DR|BL|SH|TS|FZ){0,2})((?:DZ|RA|SN|SG|IC|PL|GR|GS|UP){0,3})((?:BR|FG|FU|VA|DU|SA|HZ|PY)?)((?:PO|SQ|FC|SS|DS)?)$/;

  function parseWeather(tok) {
    if (tok === "NSW") {
      return { raw: tok, intensity: null, vc: false, text: "no significant weather" };
    }
    if (tok === "NSW" ) return null;
    var m = WX_RE.exec(tok);
    if (!m) return null;
    var intensity = m[1] === "+" || m[1] === "-" ? m[1] : null;
    var vc = m[1] === "VC";
    var desc = m[2] || "";
    var precip = m[3] || "";
    var obs = m[4] || "";
    var other = m[5] || "";
    if (!desc && !precip && !obs && !other) return null;
    // Reject tokens that are clearly something else
    if (/^(FM|RMK|TEMPO|BECMG|PROB|SPECI|METAR|TAF|AUTO|COR|NOSIG)$/.test(tok)) return null;
    // Must have at least a known code
    if (tok.length < 2) return null;

    var bits = [];
    if (vc) bits.push("in the vicinity");
    if (intensity === "-") bits.push("light");
    if (intensity === "+") bits.push("heavy");
    // special: +FC is tornado/waterspout
    function chunk(s, dict, size) {
      var words = [];
      for (var i = 0; i < s.length; i += size) {
        var code = s.substr(i, size);
        words.push(dict[code] || code);
      }
      return words;
    }
    var descWords = [];
    for (var i = 0; i < desc.length; i += 2) {
      var d = desc.substr(i, 2);
      descWords.push(WX_DESC[d] || d);
    }
    var precipWords = chunk(precip, WX_PRECIP, 2);
    var obsWords = obs ? [WX_OBS[obs] || obs] : [];
    var otherWords = other ? (other === "FC" && intensity === "+" ? ["tornado or waterspout"] : [WX_OTHER[other] || other]) : [];

    // wording: "heavy thunderstorm rain", "showers of rain", "patches of fog"
    bits = bits.concat(descWords);
    bits = bits.concat(precipWords);
    bits = bits.concat(obsWords);
    bits = bits.concat(otherWords);
    var text = bits.join(" ").replace(/\s+/g, " ").trim();
    // tidy "showers of rain" already good; "thunderstorm rain" → "thunderstorm with rain"
    text = text.replace("thunderstorm ", "thunderstorm with ");
    text = text.replace("in the vicinity ", "in the vicinity, ");
    return {
      raw: tok,
      intensity: intensity,
      vc: vc,
      descriptors: descWords,
      precipitation: precipWords,
      obscuration: obsWords,
      other: otherWords,
      text: text
    };
  }

  function parseSky(tok) {
    if (/^(SKC|CLR|NSC|NCD)$/.test(tok)) {
      return { cover: tok, coverText: SKY_COVER[tok], heightFt: null, cb: false, tcu: false, raw: tok };
    }
    var m = /^(FEW|SCT|BKN|OVC|VV)(\d{3}|\/\/\/)(CB|TCU)?$/.exec(tok);
    if (!m) return null;
    var height = m[2] === "///" ? null : Number(m[2]) * 100;
    return {
      cover: m[1],
      coverText: SKY_COVER[m[1]],
      heightFt: height,
      cb: m[3] === "CB",
      tcu: m[3] === "TCU",
      raw: tok
    };
  }

  function ceilingFt(layers, cavok) {
    if (cavok) return null; // no cloud below 5,000; not a ceiling for category if we treat as VFR
    if (!layers || !layers.length) return null;
    var ceil = null;
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i];
      if ((L.cover === "BKN" || L.cover === "OVC" || L.cover === "VV") && isFiniteNumber(L.heightFt)) {
        if (ceil == null || L.heightFt < ceil) ceil = L.heightFt;
      }
    }
    return ceil;
  }

  /**
   * Flight category. Visibility is evaluated in statute miles.
   * Greater-than visibilities (P6SM, 9999, CAVOK) are treated as > 5 SM.
   * Less-than visibilities use the stated value (M1/4SM is < 1 SM → LIFR).
   */
  function flightCategory(ceiling, visSm, visMeta) {
    var vis;
    if (visMeta && (visMeta.cavok || visMeta.plus || (isFiniteNumber(visMeta.meters) && visMeta.meters === 9999))) {
      vis = 6.2; // more than 5 SM
    } else {
      vis = visSm;
    }
    var ceil = ceiling; // null means unlimited / no ceiling
    var lifr = (isFiniteNumber(ceil) && ceil < 500) || (isFiniteNumber(vis) && vis < 1);
    var ifr = (isFiniteNumber(ceil) && ceil >= 500 && ceil < 1000) || (isFiniteNumber(vis) && vis >= 1 && vis < 3);
    var mvfr = (isFiniteNumber(ceil) && ceil >= 1000 && ceil <= 3000) || (isFiniteNumber(vis) && vis >= 3 && vis <= 5);
    if (lifr) return "LIFR";
    if (ifr) return "IFR";
    if (mvfr) return "MVFR";
    if (vis == null && ceil == null) return "VFR"; // CLR/SKC and missing vis? still assume VFR only if vis known
    return "VFR";
  }

  function parseWind(tok, nextTok) {
    var m = /^(VRB|\/\/\/|\d{3})(\d{2,3}|\/\/)(G(\d{2,3}))?(KT|MPS|KMH)$/.exec(tok);
    if (!m) {
      if (tok === "00000KT") {
        return { calm: true, direction: null, speedKt: 0, gustKt: null, variable: false, unit: "KT", raw: tok, consumed: 1 };
      }
      return null;
    }
    var unit = m[5];
    function toKt(spd) {
      if (spd == null || spd === "//") return null;
      var n = Number(spd);
      if (unit === "MPS") return n * 3600 / 1852;
      if (unit === "KMH") return n / 1.852;
      return n;
    }
    var dir = m[1] === "VRB" || m[1] === "///" ? null : Number(m[1]);
    var spd = toKt(m[2]);
    var gust = m[4] != null ? toKt(m[4]) : null;
    var calm = m[1] === "000" && Number(m[2]) === 0;
    var variableDir = null;
    var consumed = 1;
    if (nextTok && /^\d{3}V\d{3}$/.test(nextTok)) {
      var v = nextTok.split("V");
      variableDir = { from: Number(v[0]), to: Number(v[1]) };
      consumed = 2;
    }
    return {
      calm: calm,
      variable: m[1] === "VRB",
      direction: dir,
      speedKt: spd,
      gustKt: gust,
      unit: unit,
      variableDirection: variableDir,
      raw: tok + (consumed === 2 ? " " + nextTok : ""),
      consumed: consumed
    };
  }

  function describeWind(w) {
    if (!w) return "Wind missing.";
    if (w.calm) return "Wind calm.";
    var parts = [];
    if (w.variable) parts.push("Wind variable");
    else if (isFiniteNumber(w.direction)) parts.push("Wind from " + String(w.direction).padStart(3, "0") + "°");
    else parts.push("Wind");
    if (isFiniteNumber(w.speedKt)) {
      var spd = w.speedKt === Math.round(w.speedKt) ? String(Math.round(w.speedKt)) : w.speedKt.toFixed(1);
      parts.push("at " + spd + " kt");
    }
    if (isFiniteNumber(w.gustKt)) {
      var g = w.gustKt === Math.round(w.gustKt) ? String(Math.round(w.gustKt)) : w.gustKt.toFixed(1);
      parts.push("gusting " + g + " kt");
    }
    var s = parts.join(" ");
    if (w.variableDirection) {
      s += ", varying between " + String(w.variableDirection.from).padStart(3, "0") + "° and " + String(w.variableDirection.to).padStart(3, "0") + "°";
    }
    return s + ".";
  }

  function describeSky(layers, cavok) {
    if (cavok) return "CAVOK — no cloud below 5,000 ft, visibility 10 km or more, and no significant weather.";
    if (!layers || !layers.length) return "Sky condition missing.";
    return layers.map(function (L) {
      if (!isFiniteNumber(L.heightFt)) return L.coverText + (L.cb ? " cumulonimbus" : L.tcu ? " towering cumulus" : "");
      var h = L.heightFt.toLocaleString("en-US") + " ft";
      if (L.cover === "VV") return "Vertical visibility " + h + ".";
      return L.coverText.charAt(0).toUpperCase() + L.coverText.slice(1) + " at " + h + (L.cb ? " (cumulonimbus)" : L.tcu ? " (towering cumulus)" : "");
    }).join("; ") + ".";
  }

  function parseRemarks(tokens) {
    var raw = tokens.join(" ");
    var out = { raw: raw, ao: null, slpHpa: null, tempPreciseC: null, dewPreciseC: null, maintenance: false, notes: [] };
    if (tokens.indexOf("AO2") >= 0) { out.ao = "AO2"; out.notes.push("Automated station with precipitation discriminator (AO2)."); }
    else if (tokens.indexOf("AO1") >= 0) { out.ao = "AO1"; out.notes.push("Automated station without precipitation discriminator (AO1)."); }
    if (tokens.indexOf("$") >= 0) { out.maintenance = true; out.notes.push("Maintenance indicator ($)."); }
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      var slp = /^SLP(\d{3})$/.exec(t);
      if (slp) {
        var n = Number(slp[1]);
        // Tenths of hPa; 000–499 → 1000.0–1049.9, 500–999 → 950.0–999.9
        var slpVal = n >= 500 ? 900 + n / 10 : 1000 + n / 10;
        // 500–999 could also theoretically be 1500 but that's not used
        // Standard: if coded 000-499, 10xx.x; 500-999, 9xx.x
        slpVal = n < 500 ? 1000 + n / 10 : 900 + n / 10;
        out.slpHpa = slpVal;
        out.notes.push("Sea-level pressure " + slpVal.toFixed(1) + " hPa.");
      }
      var tg = /^T([01])(\d{3})([01])(\d{3})$/.exec(t);
      if (tg) {
        out.tempPreciseC = (tg[1] === "1" ? -1 : 1) * Number(tg[2]) / 10;
        out.dewPreciseC = (tg[3] === "1" ? -1 : 1) * Number(tg[4]) / 10;
        out.notes.push("Precise temperature " + (out.tempPreciseC >= 0 ? "" : "") + out.tempPreciseC.toFixed(1) + "°C, dewpoint " + out.dewPreciseC.toFixed(1) + "°C.");
      }
    }
    return out;
  }

  function parseAltimeter(tok) {
    var a = /^A(\d{4})$/.exec(tok);
    if (a) {
      var inhg = Number(a[1]) / 100;
      return { inHg: inhg, hPa: inhg * HPA_PER_INHG, raw: tok };
    }
    var q = /^Q(\d{3,4})$/.exec(tok);
    if (q) {
      var hpa = Number(q[1]);
      return { hPa: hpa, inHg: hpa / HPA_PER_INHG, raw: tok };
    }
    return null;
  }

  function parseTempDew(tok) {
    var m = /^(M?\d{2}|\/\/)\/(M?\d{2}|\/\/)$/.exec(tok);
    if (!m) return null;
    return { tempC: parseTempValue(m[1]), dewC: parseTempValue(m[2]), raw: tok };
  }

  /**
   * Parse weather-group tokens (wind through altimeter) starting at index i.
   * Shared by METAR and (via the TAF decoder) forecast groups.
   */
  function parseConditionTokens(tokens, start) {
    var i = start || 0;
    var out = {
      wind: null,
      visibility: null,
      rvr: [],
      weather: [],
      sky: [],
      tempDew: null,
      altimeter: null,
      nosig: false,
      cavok: false,
      consumedThrough: start
    };
    if (i < tokens.length && tokens[i] === "CAVOK") {
      out.cavok = true;
      out.visibility = { cavok: true, statuteMiles: 9999 / SM_M * 1000 > 6 ? 6.21 : 6.21, meters: 9999, text: "CAVOK", consumed: 1 };
      i++;
    }
    if (i < tokens.length) {
      var wind = parseWind(tokens[i], tokens[i + 1]);
      if (wind) {
        out.wind = wind;
        i += wind.consumed;
      }
    }
    if (!out.cavok && i < tokens.length && tokens[i] === "CAVOK") {
      out.cavok = true;
      out.visibility = { cavok: true, statuteMiles: 6.2137, meters: 9999, text: "CAVOK", consumed: 1 };
      i++;
    }
    if (!out.visibility && i < tokens.length) {
      var vis = parseVisibilityToken(tokens[i], tokens[i + 1]);
      if (vis) {
        out.visibility = vis;
        if (vis.cavok) out.cavok = true;
        i += vis.consumed;
      }
    }
    while (i < tokens.length) {
      var rvr = parseRvr(tokens[i]);
      if (!rvr) break;
      out.rvr.push(rvr);
      i++;
    }
    while (i < tokens.length) {
      if (tokens[i] === "RMK" || tokens[i] === "NOSIG") break;
      if (/^(FM\d{4,6}|TEMPO|BECMG|PROB\d{2}|BECMG|INTER)$/.test(tokens[i])) break;
      var wx = parseWeather(tokens[i]);
      if (!wx) break;
      out.weather.push(wx);
      i++;
    }
    while (i < tokens.length) {
      if (tokens[i] === "RMK" || tokens[i] === "NOSIG") break;
      if (/^(FM\d{4,6}|TEMPO|BECMG|PROB\d{2}|INTER)$/.test(tokens[i])) break;
      var sky = parseSky(tokens[i]);
      if (!sky) break;
      out.sky.push(sky);
      i++;
    }
    if (i < tokens.length) {
      var td = parseTempDew(tokens[i]);
      if (td) {
        out.tempDew = td;
        i++;
      }
    }
    if (i < tokens.length) {
      var alt = parseAltimeter(tokens[i]);
      if (alt) {
        out.altimeter = alt;
        i++;
      }
    }
    if (i < tokens.length && tokens[i] === "NOSIG") {
      out.nosig = true;
      i++;
    }
    out.consumedThrough = i;
    return out;
  }

  function summarizeCondition(c) {
    var sentences = [];
    if (c.wind) sentences.push(describeWind(c.wind));
    if (c.visibility) sentences.push("Visibility " + formatVis(c.visibility) + ".");
    if (c.rvr && c.rvr.length) {
      sentences.push(c.rvr.map(function (r) {
        var range = r.max ? r.min.text + " to " + r.max.text : r.min.text;
        var trend = r.trend ? ", " + r.trend : "";
        return "RVR runway " + r.runway + " " + range + trend;
      }).join("; ") + ".");
    }
    if (c.weather && c.weather.length) {
      sentences.push(c.weather.map(function (w) { return w.text.charAt(0).toUpperCase() + w.text.slice(1); }).join("; ") + ".");
    }
    if (c.sky && c.sky.length) sentences.push(describeSky(c.sky, false));
    else if (c.cavok) sentences.push(describeSky([], true));
    if (c.tempDew) {
      var t = c.tempDew;
      var ts = t.tempC == null ? "missing" : t.tempC + "°C";
      var ds = t.dewC == null ? "missing" : t.dewC + "°C";
      sentences.push("Temperature " + ts + ", dewpoint " + ds + ".");
    }
    if (c.altimeter) {
      sentences.push("Altimeter " + c.altimeter.inHg.toFixed(2) + " inHg (" + Math.round(c.altimeter.hPa) + " hPa).");
    }
    if (c.nosig) sentences.push("No significant change expected (NOSIG).");
    return sentences.join(" ");
  }

  function parseMetar(raw) {
    var text = String(raw || "").trim();
    if (!text) return { error: "Paste a METAR to decode." };
    var tokens = tokenize(text);
    if (!tokens.length) return { error: "Paste a METAR to decode." };

    var i = 0;
    var reportType = "METAR";
    if (tokens[i] === "METAR" || tokens[i] === "SPECI") {
      reportType = tokens[i];
      i++;
    }
    var corrected = false;
    var auto = false;
    var cancelled = false;
    // station
    if (i >= tokens.length || !/^[A-Z]{4}$/.test(tokens[i])) {
      // maybe COR/AMD before station in some TAF-like, or station missing
      if (tokens[i] === "COR" || tokens[i] === "AMD") {
        corrected = true;
        i++;
      }
    }
    if (i >= tokens.length || !/^[A-Z0-9]{4}$/.test(tokens[i])) {
      return { error: "Could not find a four-character station identifier. Check that this is a complete METAR." };
    }
    var station = tokens[i++];
    if (i < tokens.length && (tokens[i] === "COR")) { corrected = true; i++; }

    var time = null;
    if (i < tokens.length && /^\d{6}Z$/.test(tokens[i])) {
      var tm = tokens[i];
      time = { raw: tm, day: Number(tm.slice(0, 2)), hour: Number(tm.slice(2, 4)), minute: Number(tm.slice(4, 6)) };
      i++;
    }
    while (i < tokens.length && (tokens[i] === "AUTO" || tokens[i] === "COR" || tokens[i] === "RTD" || tokens[i] === "NIL")) {
      if (tokens[i] === "AUTO") auto = true;
      if (tokens[i] === "COR") corrected = true;
      if (tokens[i] === "NIL") cancelled = true;
      i++;
    }
    if (cancelled) {
      return { error: null, reportType: reportType, station: station, time: time, auto: auto, corrected: corrected, nil: true, plainEnglish: station + " reports NIL (no observation)." };
    }

    var cond = parseConditionTokens(tokens, i);
    i = cond.consumedThrough;
    var remarks = null;
    if (i < tokens.length && tokens[i] === "RMK") {
      remarks = parseRemarks(tokens.slice(i + 1));
    } else if (i < tokens.length) {
      // leftover tokens — try remarks without RMK, or record them
      remarks = { raw: tokens.slice(i).join(" "), notes: ["Unparsed tail: " + tokens.slice(i).join(" ")], leftover: tokens.slice(i) };
    }

    var visSm = cond.visibility ? visToSm(cond.visibility) : null;
    // CAVOK / 9999: more than 5 SM
    if (cond.cavok || (cond.visibility && cond.visibility.meters === 9999)) {
      visSm = 6.2137;
    }
    var ceil = ceilingFt(cond.sky, cond.cavok);
    // CAVOK implies no ceiling below 5000; treat as no ceiling for VFR
    var category = flightCategory(ceil, visSm, cond.visibility);
    if (!cond.visibility && !cond.cavok) {
      // cannot be sure of vis-based category; still use ceiling
      category = flightCategory(ceil, 99, null); // vis "unlimited" placeholder if missing? Better to use ceiling only
      if (ceil == null) category = "UNKNOWN";
      else if (ceil < 500) category = "LIFR";
      else if (ceil < 1000) category = "IFR";
      else if (ceil <= 3000) category = "MVFR";
      else category = "VFR";
    }

    var plain = [];
    plain.push((reportType === "SPECI" ? "Special observation" : "Routine METAR") + " for " + station +
      (time ? " at " + String(time.hour).padStart(2, "0") + ":" + String(time.minute).padStart(2, "0") + " Z on the " + time.day + "th" : "") +
      (auto ? ", automated" : "") + (corrected ? ", corrected" : "") + ".");
    plain.push(summarizeCondition(cond));
    if (remarks && remarks.notes && remarks.notes.length) {
      plain.push("Remarks: " + remarks.notes.join(" "));
    }
    if (category && category !== "UNKNOWN") {
      plain.push("Flight category: " + category + ".");
    }

    return {
      error: null,
      reportType: reportType,
      station: station,
      time: time,
      auto: auto,
      corrected: corrected,
      wind: cond.wind,
      visibility: cond.visibility,
      rvr: cond.rvr,
      weather: cond.weather,
      sky: cond.sky,
      tempDew: cond.tempDew,
      altimeter: cond.altimeter,
      nosig: cond.nosig,
      cavok: cond.cavok,
      remarks: remarks,
      ceilingFt: ceil,
      visibilitySm: visSm,
      flightCategory: category,
      plainEnglish: plain.filter(Boolean).join(" "),
      raw: text
    };
  }

  function compute(input) {
    if (typeof input === "string") return parseMetar(input);
    return parseMetar(input && input.raw);
  }

  var api = {
    SM_M: SM_M,
    HPA_PER_INHG: HPA_PER_INHG,
    WX_DESC: WX_DESC,
    WX_PRECIP: WX_PRECIP,
    WX_OBS: WX_OBS,
    WX_OTHER: WX_OTHER,
    isFiniteNumber: isFiniteNumber,
    tokenize: tokenize,
    parseWind: parseWind,
    parseWeather: parseWeather,
    parseSky: parseSky,
    parseVisibilityToken: parseVisibilityToken,
    parseRvr: parseRvr,
    parseAltimeter: parseAltimeter,
    parseTempDew: parseTempDew,
    parseRemarks: parseRemarks,
    parseConditionTokens: parseConditionTokens,
    ceilingFt: ceilingFt,
    flightCategory: flightCategory,
    visToSm: visToSm,
    formatVis: formatVis,
    describeWind: describeWind,
    describeSky: describeSky,
    summarizeCondition: summarizeCondition,
    parseMetar: parseMetar,
    compute: compute
  };

  root.MetarDecoder = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

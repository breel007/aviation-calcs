/**
 * Offline TAF decoder.
 *
 * A TAF is a terminal aerodrome forecast: an initial prevailing condition
 * followed by change groups —
 *   FMddhhmm   from (rapid, replaces the previous prevailing forecast)
 *   TEMPO      temporary fluctuations (less than half the period)
 *   BECMG      becoming (gradual change across a window)
 *   PROB30 / PROB40  probability of a condition (optionally with TEMPO)
 *
 * Weather, wind, visibility, and sky tokens are parsed with the same
 * rules as the METAR decoder. Flight category is computed for each group.
 *
 * Browser pages should load ../metar-decoder/calc.js first. Node tests
 * require that module from the sibling folder.
 */
(function (root) {
  "use strict";

  var Metar = (typeof module !== "undefined" && module.exports)
    ? require("../metar-decoder/calc.js")
    : root.MetarDecoder;

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function parsePeriodToken(tok) {
    // ddhh/ddhh  or occasionally hh/hh in older forms
    var m = /^(\d{2})(\d{2})\/(\d{2})(\d{2})$/.exec(tok);
    if (!m) return null;
    return {
      fromDay: Number(m[1]),
      fromHour: Number(m[2]),
      toDay: Number(m[3]),
      toHour: Number(m[4]),
      raw: tok
    };
  }

  function formatPeriod(p) {
    if (!p) return "";
    var toH = p.toHour === 24 ? "24:00" : pad(p.toHour) + ":00";
    return "from the " + p.fromDay + "th at " + pad(p.fromHour) + ":00 Z until the " + p.toDay + "th at " + toH + " Z";
  }

  function parseFromToken(tok) {
    // FM091530 or (rare 4-digit) FM1530
    var m = /^FM(\d{2})(\d{2})(\d{2})$/.exec(tok);
    if (m) return { day: Number(m[1]), hour: Number(m[2]), minute: Number(m[3]), raw: tok };
    var m4 = /^FM(\d{2})(\d{2})$/.exec(tok);
    if (m4) return { day: null, hour: Number(m4[1]), minute: Number(m4[2]), raw: tok };
    return null;
  }

  function formatFrom(fm) {
    if (!fm) return "";
    var clock = pad(fm.hour) + ":" + pad(fm.minute) + " Z";
    if (fm.day != null) return "From the " + fm.day + "th at " + clock;
    return "From " + clock;
  }

  function groupKindLabel(kind, prob) {
    if (kind === "FM") return "From (prevailing forecast changes)";
    if (kind === "TEMPO") return (prob ? "PROB" + prob + " temporary" : "Temporary");
    if (kind === "BECMG") return "Becoming";
    if (kind === "PROB") return "PROB" + (prob || "");
    if (kind === "INTER") return "Intermittent";
    return "Prevailing";
  }

  function categoryForCondition(cond) {
    var visSm = null;
    if (cond.visibility) {
      if (cond.cavok || cond.visibility.cavok || cond.visibility.meters === 9999 || cond.visibility.plus) visSm = 6.2137;
      else visSm = Metar.visToSm(cond.visibility);
    }
    var ceil = Metar.ceilingFt(cond.sky, cond.cavok);
    if (!cond.visibility && !cond.cavok) {
      if (ceil == null) return "UNKNOWN";
      if (ceil < 500) return "LIFR";
      if (ceil < 1000) return "IFR";
      if (ceil <= 3000) return "MVFR";
      return "VFR";
    }
    return Metar.flightCategory(ceil, visSm, cond.visibility);
  }

  function finishGroup(base, tokens, start) {
    var cond = Metar.parseConditionTokens(tokens, start);
    var cat = categoryForCondition(cond);
    var English = Metar.summarizeCondition(cond);
    return {
      kind: base.kind,
      label: groupKindLabel(base.kind, base.prob),
      prob: base.prob || null,
      period: base.period || null,
      from: base.from || null,
      wind: cond.wind,
      visibility: cond.visibility,
      rvr: cond.rvr,
      weather: cond.weather,
      sky: cond.sky,
      altimeter: cond.altimeter,
      cavok: cond.cavok,
      ceilingFt: Metar.ceilingFt(cond.sky, cond.cavok),
      flightCategory: cat,
      plainEnglish: English,
      consumedThrough: cond.consumedThrough,
      rawTokens: tokens.slice(start, cond.consumedThrough)
    };
  }

  function parseChangeHeader(tokens, i) {
    if (i >= tokens.length) return null;
    var tok = tokens[i];
    var fm = parseFromToken(tok);
    if (fm) {
      return { kind: "FM", from: fm, period: null, prob: null, consumed: 1 };
    }
    var prob = null;
    var consumed = 0;
    if (/^PROB\d{2}$/.test(tok)) {
      prob = Number(tok.slice(4));
      consumed = 1;
      i++;
      tok = tokens[i];
    }
    if (tok === "TEMPO" || tok === "BECMG" || tok === "INTER") {
      var kind = tok;
      consumed += 1;
      var period = null;
      if (tokens[i + 1] && parsePeriodToken(tokens[i + 1])) {
        period = parsePeriodToken(tokens[i + 1]);
        consumed += 1;
      }
      return { kind: kind, period: period, from: null, prob: prob, consumed: consumed };
    }
    if (prob != null) {
      // PROB30 1012/1016 ... (without TEMPO)
      var p = tokens[i] && parsePeriodToken(tokens[i]) ? parsePeriodToken(tokens[i]) : null;
      if (p) consumed += 1;
      return { kind: "PROB", period: p, from: null, prob: prob, consumed: consumed };
    }
    return null;
  }

  function parseTaf(raw) {
    var text = String(raw || "").trim();
    if (!text) return { error: "Paste a TAF to decode." };
    if (!Metar) return { error: "METAR parser is not loaded." };
    var tokens = Metar.tokenize(text);
    if (!tokens.length) return { error: "Paste a TAF to decode." };

    var i = 0;
    if (tokens[i] === "TAF") i++;
    var amended = false;
    var corrected = false;
    var cancelled = false;
    while (i < tokens.length && (tokens[i] === "AMD" || tokens[i] === "COR" || tokens[i] === "RTD")) {
      if (tokens[i] === "AMD") amended = true;
      if (tokens[i] === "COR") corrected = true;
      i++;
    }
    if (i >= tokens.length || !/^[A-Z0-9]{4}$/.test(tokens[i])) {
      return { error: "Could not find a four-character station identifier. Check that this is a complete TAF." };
    }
    var station = tokens[i++];
    var issued = null;
    if (i < tokens.length && /^\d{6}Z$/.test(tokens[i])) {
      var tm = tokens[i];
      issued = { raw: tm, day: Number(tm.slice(0, 2)), hour: Number(tm.slice(2, 4)), minute: Number(tm.slice(4, 6)) };
      i++;
    }
    var valid = null;
    if (i < tokens.length && parsePeriodToken(tokens[i])) {
      valid = parsePeriodToken(tokens[i]);
      i++;
    }
    if (i < tokens.length && tokens[i] === "CNL") {
      cancelled = true;
      i++;
    }
    if (cancelled) {
      return {
        error: null,
        station: station,
        issued: issued,
        valid: valid,
        amended: amended,
        corrected: corrected,
        cancelled: true,
        groups: [],
        plainEnglish: "TAF for " + station + " is cancelled (CNL).",
        raw: text
      };
    }

    var groups = [];
    // Initial prevailing group: weather tokens until a change header
    var first = finishGroup({ kind: "INITIAL", period: valid, from: null, prob: null }, tokens, i);
    groups.push(first);
    i = first.consumedThrough;

    while (i < tokens.length) {
      if (tokens[i] === "RMK") break;
      var header = parseChangeHeader(tokens, i);
      if (!header) {
        // Unparsed token — stop rather than looping forever
        break;
      }
      i += header.consumed;
      var g = finishGroup(header, tokens, i);
      groups.push(g);
      i = g.consumedThrough;
    }

    var sentences = [];
    sentences.push(
      "TAF" + (amended ? " amended" : "") + (corrected ? " corrected" : "") +
      " for " + station +
      (issued ? ", issued at " + pad(issued.hour) + ":" + pad(issued.minute) + " Z on the " + issued.day + "th" : "") +
      (valid ? ", valid " + formatPeriod(valid) : "") + "."
    );
    groups.forEach(function (g, idx) {
      var head;
      if (g.kind === "INITIAL") head = "Prevailing forecast";
      else if (g.kind === "FM") head = formatFrom(g.from);
      else head = g.label + (g.period ? " " + formatPeriod(g.period) : "");
      var cat = g.flightCategory && g.flightCategory !== "UNKNOWN" ? " Flight category " + g.flightCategory + "." : "";
      sentences.push((idx + 1) + ". " + head + ": " + (g.plainEnglish || "(no additional detail)") + cat);
    });

    return {
      error: null,
      station: station,
      issued: issued,
      valid: valid,
      amended: amended,
      corrected: corrected,
      cancelled: false,
      groups: groups,
      plainEnglish: sentences.join(" "),
      raw: text
    };
  }

  function compute(input) {
    if (typeof input === "string") return parseTaf(input);
    return parseTaf(input && input.raw);
  }

  var api = {
    parsePeriodToken: parsePeriodToken,
    formatPeriod: formatPeriod,
    parseFromToken: parseFromToken,
    formatFrom: formatFrom,
    parseTaf: parseTaf,
    compute: compute
  };

  root.TafDecoder = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

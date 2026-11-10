/**
 * Local ↔ UTC/Zulu conversion with IANA time zones and DST, plus a
 * flight-plan ETA helper.
 *
 * Offset and DST come from the runtime Intl API (no tz database of our
 * own). Civil local time is converted to UTC by iterating the zone
 * offset at that instant (handles DST). Ambiguous civil times at the
 * fall-back overlap use the first (DST) occurrence; a spring-forward
 * gap is flagged.
 */
(function (root) {
  "use strict";

  var ZONES = [
    { id: "UTC", label: "UTC / Zulu (Z)" },
    { id: "America/New_York", label: "Eastern (America/New_York)" },
    { id: "America/Chicago", label: "Central (America/Chicago)" },
    { id: "America/Denver", label: "Mountain (America/Denver)" },
    { id: "America/Phoenix", label: "Arizona, no DST (America/Phoenix)" },
    { id: "America/Los_Angeles", label: "Pacific (America/Los_Angeles)" },
    { id: "America/Anchorage", label: "Alaska (America/Anchorage)" },
    { id: "Pacific/Honolulu", label: "Hawaii (Pacific/Honolulu)" },
    { id: "America/Puerto_Rico", label: "Atlantic / Puerto Rico (AST, no DST)" },
    { id: "America/Adak", label: "Aleutian (America/Adak)" },
    { id: "Pacific/Guam", label: "Guam / Chamorro (Pacific/Guam)" },
    { id: "Pacific/Pago_Pago", label: "Samoa (Pacific/Pago_Pago)" },
    { id: "America/St_Johns", label: "Newfoundland (America/St_Johns)" },
    { id: "America/Halifax", label: "Atlantic Canada (America/Halifax)" },
    { id: "America/Toronto", label: "Eastern Canada (America/Toronto)" },
    { id: "America/Vancouver", label: "Pacific Canada (America/Vancouver)" },
    { id: "America/Mexico_City", label: "Mexico City (America/Mexico_City)" },
    { id: "Europe/London", label: "UK (Europe/London)" },
    { id: "Europe/Paris", label: "Central Europe (Europe/Paris)" },
    { id: "Europe/Berlin", label: "Germany (Europe/Berlin)" },
    { id: "Europe/Moscow", label: "Moscow (Europe/Moscow)" },
    { id: "Asia/Dubai", label: "Gulf (Asia/Dubai)" },
    { id: "Asia/Kolkata", label: "India (Asia/Kolkata)" },
    { id: "Asia/Singapore", label: "Singapore (Asia/Singapore)" },
    { id: "Asia/Tokyo", label: "Japan (Asia/Tokyo)" },
    { id: "Australia/Sydney", label: "Sydney (Australia/Sydney)" },
    { id: "Pacific/Auckland", label: "New Zealand (Pacific/Auckland)" }
  ];

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function partsInZone(utcMs, timeZone) {
    var fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
      hourCycle: "h23"
    });
    var map = {};
    fmt.formatToParts(new Date(utcMs)).forEach(function (p) {
      if (p.type !== "literal") map[p.type] = p.value;
    });
    var hour = parseInt(map.hour, 10);
    if (hour === 24) hour = 0;
    return {
      year: parseInt(map.year, 10),
      month: parseInt(map.month, 10),
      day: parseInt(map.day, 10),
      hour: hour,
      minute: parseInt(map.minute, 10),
      second: parseInt(map.second, 10),
      weekday: map.weekday
    };
  }

  /** Zone offset in minutes at a given UTC instant (local = UTC + offset). */
  function offsetMinutes(utcMs, timeZone) {
    var p = partsInZone(utcMs, timeZone);
    var asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    return (asUTC - utcMs) / 60000;
  }

  function offsetLabel(mins) {
    var sign = mins >= 0 ? "+" : "−";
    var abs = Math.abs(mins);
    var h = Math.floor(abs / 60);
    var m = Math.round(abs - h * 60);
    var hh = h < 10 ? "0" + h : String(h);
    var mm = m < 10 ? "0" + m : String(m);
    return "UTC" + sign + hh + ":" + mm;
  }

  function abbrev(utcMs, timeZone) {
    try {
      var fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: timeZone,
        timeZoneName: "short"
      });
      var map = {};
      fmt.formatToParts(new Date(utcMs)).forEach(function (p) {
        if (p.type !== "literal") map[p.type] = p.value;
      });
      return map.timeZoneName || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Convert a civil wall-clock in `timeZone` to a UTC millisecond timestamp.
   * Returns { utcMs, offsetMinutes, ambiguous, gap, skipped }.
   */
  function zonedCivilToUtc(year, month, day, hour, minute, second, timeZone) {
    second = second || 0;
    var target = Date.UTC(year, month - 1, day, hour, minute, second);
    var utc = target;
    var off;
    for (var i = 0; i < 4; i++) {
      off = offsetMinutes(utc, timeZone);
      utc = target - off * 60000;
    }
    var p = partsInZone(utc, timeZone);
    var matches =
      p.year === year && p.month === month && p.day === day &&
      p.hour === hour && p.minute === minute && p.second === second;

    // Probe ±1 hour for DST overlap / gap.
    var earlier = utc - 3600000;
    var later = utc + 3600000;
    var pEarlier = partsInZone(earlier, timeZone);
    var pLater = partsInZone(later, timeZone);
    var earlierMatches =
      pEarlier.year === year && pEarlier.month === month && pEarlier.day === day &&
      pEarlier.hour === hour && pEarlier.minute === minute && pEarlier.second === second;
    var laterMatches =
      pLater.year === year && pLater.month === month && pLater.day === day &&
      pLater.hour === hour && pLater.minute === minute && pLater.second === second;

    var ambiguous = !!(matches && (earlierMatches || laterMatches));
    var gap = !matches;
    return {
      utcMs: utc,
      offsetMinutes: off,
      ambiguous: ambiguous,
      gap: gap,
      valid: matches || ambiguous
    };
  }

  function pad(n, w) {
    var s = String(n);
    while (s.length < (w || 2)) s = "0" + s;
    return s;
  }

  function formatHm(hour, minute, second, withSec) {
    var s = pad(hour) + ":" + pad(minute);
    if (withSec) s += ":" + pad(second || 0);
    return s;
  }

  function formatZulu(hour, minute, second) {
    return pad(hour) + pad(minute) + (second ? pad(second) : "") + "Z";
  }

  /** Parse "1430", "14:30", "14:30:00", "2:30 PM", "1430Z", "2:30pm". */
  function parseTime(str) {
    if (str == null) return null;
    var raw = String(str).trim();
    if (!raw) return null;
    raw = raw.replace(/[Zz]$/, "").trim();
    var ampm = null;
    var m = raw.match(/\s*(am|pm|a\.m\.|p\.m\.)$/i);
    if (m) {
      ampm = m[1].charAt(0).toLowerCase();
      raw = raw.slice(0, m.index).trim();
    }
    var h, min, sec = 0;
    var colon = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (colon) {
      h = parseInt(colon[1], 10);
      min = parseInt(colon[2], 10);
      sec = colon[3] ? parseInt(colon[3], 10) : 0;
    } else if (/^\d{3,6}$/.test(raw)) {
      if (raw.length === 3) {
        h = parseInt(raw.slice(0, 1), 10);
        min = parseInt(raw.slice(1, 3), 10);
      } else if (raw.length === 4) {
        h = parseInt(raw.slice(0, 2), 10);
        min = parseInt(raw.slice(2, 4), 10);
      } else if (raw.length === 5) {
        h = parseInt(raw.slice(0, 1), 10);
        min = parseInt(raw.slice(1, 3), 10);
        sec = parseInt(raw.slice(3, 5), 10);
      } else {
        h = parseInt(raw.slice(0, 2), 10);
        min = parseInt(raw.slice(2, 4), 10);
        sec = parseInt(raw.slice(4, 6), 10);
      }
    } else {
      return null;
    }
    if (ampm) {
      if (h < 1 || h > 12) return null;
      if (ampm === "a" && h === 12) h = 0;
      if (ampm === "p" && h !== 12) h += 12;
    }
    if (h < 0 || h > 23 || min < 0 || min > 59 || sec < 0 || sec > 59) return null;
    return { hour: h, minute: min, second: sec };
  }

  /** Parse ETE as hours:minutes, decimal hours, or "1+30" / "1h30m". */
  function parseEte(str) {
    if (str == null) return null;
    if (typeof str === "number" && isFinite(str)) return str * 3600000;
    var raw = String(str).trim().toLowerCase();
    if (!raw) return null;
    var hm = raw.match(/^(\d+)\s*[h:+]\s*(\d{1,2})(?:\s*m)?$/);
    if (hm) return (parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10)) * 60000;
    var onlyMin = raw.match(/^(\d+)\s*m(?:in(?:utes?)?)?$/);
    if (onlyMin) return parseInt(onlyMin[1], 10) * 60000;
    var onlyHr = raw.match(/^(\d+(?:\.\d+)?)\s*h(?:r|ours?)?$/);
    if (onlyHr) return parseFloat(onlyHr[1]) * 3600000;
    var colon = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (colon) return (parseInt(colon[1], 10) * 60 + parseInt(colon[2], 10)) * 60000;
    var dec = raw.match(/^(\d+(?:\.\d+)?)$/);
    if (dec) return parseFloat(dec[1]) * 3600000;
    return null;
  }

  function parseDate(str) {
    if (!str) return null;
    var m = String(str).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    var year = +m[1], month = +m[2], day = +m[3];
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { year: year, month: month, day: day };
  }

  function convert(input) {
    if (!input) return null;
    var date = parseDate(input.date);
    var time = typeof input.time === "object" ? input.time : parseTime(input.time);
    if (!date || !time) return null;
    var fromZone = input.fromZone || "UTC";
    var toZone = input.toZone || "UTC";
    var src = zonedCivilToUtc(date.year, date.month, date.day, time.hour, time.minute, time.second || 0, fromZone);
    var utcParts = partsInZone(src.utcMs, "UTC");
    var destParts = partsInZone(src.utcMs, toZone);
    var fromOff = offsetMinutes(src.utcMs, fromZone);
    var toOff = offsetMinutes(src.utcMs, toZone);
    return {
      utcMs: src.utcMs,
      valid: src.valid,
      gap: src.gap,
      ambiguous: src.ambiguous,
      from: {
        zone: fromZone,
        parts: partsInZone(src.utcMs, fromZone),
        offsetMinutes: fromOff,
        offsetLabel: offsetLabel(fromOff),
        abbrev: abbrev(src.utcMs, fromZone)
      },
      utc: {
        parts: utcParts,
        zulu: formatZulu(utcParts.hour, utcParts.minute),
        clock: formatHm(utcParts.hour, utcParts.minute, utcParts.second, true)
      },
      to: {
        zone: toZone,
        parts: destParts,
        offsetMinutes: toOff,
        offsetLabel: offsetLabel(toOff),
        abbrev: abbrev(src.utcMs, toZone),
        clock: formatHm(destParts.hour, destParts.minute, destParts.second, true),
        dateChanged: destParts.year !== date.year || destParts.month !== date.month || destParts.day !== date.day
      }
    };
  }

  function eta(input) {
    if (!input) return null;
    var date = parseDate(input.date);
    var time = typeof input.time === "object" ? input.time : parseTime(input.time);
    var ete = parseEte(input.ete);
    if (!date || !time || ete == null || ete < 0) return null;
    var depZone = input.departZone || "UTC";
    var destZone = input.arriveZone || "UTC";
    var depIsZulu = !!input.departIsZulu;
    var src = zonedCivilToUtc(
      date.year, date.month, date.day, time.hour, time.minute, time.second || 0,
      depIsZulu ? "UTC" : depZone
    );
    var arrMs = src.utcMs + ete;
    var depUtc = partsInZone(src.utcMs, "UTC");
    var arrUtc = partsInZone(arrMs, "UTC");
    var depLocal = partsInZone(src.utcMs, depZone);
    var arrLocal = partsInZone(arrMs, destZone);
    return {
      departUtcMs: src.utcMs,
      arriveUtcMs: arrMs,
      eteMs: ete,
      eteHours: ete / 3600000,
      gap: src.gap,
      ambiguous: src.ambiguous,
      departZulu: formatZulu(depUtc.hour, depUtc.minute),
      arriveZulu: formatZulu(arrUtc.hour, arrUtc.minute),
      departLocal: depLocal,
      arriveLocal: arrLocal,
      departUtc: depUtc,
      arriveUtc: arrUtc,
      arriveDateChanged: arrLocal.year !== depLocal.year || arrLocal.month !== depLocal.month || arrLocal.day !== depLocal.day
    };
  }

  var api = {
    ZONES: ZONES,
    partsInZone: partsInZone,
    offsetMinutes: offsetMinutes,
    offsetLabel: offsetLabel,
    abbrev: abbrev,
    zonedCivilToUtc: zonedCivilToUtc,
    parseTime: parseTime,
    parseEte: parseEte,
    parseDate: parseDate,
    formatHm: formatHm,
    formatZulu: formatZulu,
    convert: convert,
    eta: eta
  };

  root.ZuluTimeCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

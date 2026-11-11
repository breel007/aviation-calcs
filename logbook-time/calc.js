/**
 * Pilot logbook time totals: add flight entries, convert hours-and-minutes
 * to decimal hours and aviation tenths, and subtotal by 14 CFR 61.51
 * categories.
 *
 * Exact decimal hours are h + m/60. Aviation tenths (a common logbook
 * practice, not a regulation) map minutes to the nearest tenth of an
 * hour, with 6 minutes = 0.1 h:
 *   0–2 min → 0.0, 3–8 → 0.1, …, 51–56 → 0.9, 57–60 → 1.0
 * which is Math.round(minutes / 6) / 10 in ordinary half-up rounding.
 *
 * Each entry always contributes to total time. Optional flags add the
 * same duration to PIC, SIC, solo, dual received, night, cross-country,
 * actual instrument, and simulated instrument. Optional day and night
 * landing counts are summed separately. When a date is present, rolling
 * 90-day, 6-month, and 12-month windows and a calendar year-to-date
 * total are also reported (as-of a chosen date). Those windows are
 * bookkeeping, not the 61.57 currency tests — use the currency checker
 * for passenger-landing and instrument-experience rules.
 *
 * Sources: 14 CFR 61.51 (logging of pilot time); FAA Pilot's Handbook
 * of Aeronautical Knowledge (logbook, categories of time); common
 * U.S. tenths-of-an-hour logging practice (6 minutes = 0.1 hour).
 */
(function (root) {
  "use strict";

  var FLAGS = ["pic", "sic", "solo", "dual", "night", "xc", "actualInst", "simInst"];

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function parseYmd(s) {
    if (s == null || s === "") return null;
    var m = String(s).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    var y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    var dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return dt;
  }

  function addMonths(dt, months) {
    var y = dt.getUTCFullYear();
    var mo = dt.getUTCMonth() + months;
    var d = dt.getUTCDate();
    var t = new Date(Date.UTC(y, mo, 1));
    var last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
    t.setUTCDate(Math.min(d, last));
    return t;
  }

  /**
   * Duration in exact hours from hours+minutes, a decimal-hours field,
   * or an "H:MM" / "HH:MM" string.
   */
  function durationHours(input) {
    if (!input) return null;
    if (input.hhmm != null && input.hhmm !== "") {
      var s = String(input.hhmm).trim();
      var m = s.match(/^(\d+)\s*:\s*([0-5]?\d)$/);
      if (!m) return null;
      return Number(m[1]) + Number(m[2]) / 60;
    }
    if (input.decimalHours != null && input.decimalHours !== "") {
      var dec = Number(input.decimalHours);
      if (!isFiniteNumber(dec) || dec < 0) return null;
      return dec;
    }
    var h = input.hours == null || input.hours === "" ? 0 : Number(input.hours);
    var min = input.minutes == null || input.minutes === "" ? 0 : Number(input.minutes);
    if (!isFiniteNumber(h) || !isFiniteNumber(min) || h < 0 || min < 0) return null;
    if (min >= 60) {
      h += Math.floor(min / 60);
      min = min % 60;
    }
    return h + min / 60;
  }

  function toHoursMinutes(hours) {
    if (!isFiniteNumber(hours) || hours < 0) return null;
    var totalMin = Math.round(hours * 60);
    return { hours: Math.floor(totalMin / 60), minutes: totalMin % 60, totalMinutes: totalMin };
  }

  function tenthsHours(hours) {
    if (!isFiniteNumber(hours) || hours < 0) return null;
    var hm = toHoursMinutes(hours);
    return hm.hours + Math.round(hm.minutes / 6) / 10;
  }

  function formatHm(hours) {
    var hm = toHoursMinutes(hours);
    if (!hm) return null;
    var mm = hm.minutes < 10 ? "0" + hm.minutes : String(hm.minutes);
    return hm.hours + ":" + mm;
  }

  function emptyTotals() {
    var t = { time: 0, landingsDay: 0, landingsNight: 0, count: 0 };
    FLAGS.forEach(function (f) { t[f] = 0; });
    return t;
  }

  function addTo(totals, hours, entry) {
    totals.time += hours;
    totals.count += 1;
    FLAGS.forEach(function (f) {
      if (entry[f]) totals[f] += hours;
    });
    var ld = entry.dayLandings == null || entry.dayLandings === "" ? 0 : Number(entry.dayLandings);
    var ln = entry.nightLandings == null || entry.nightLandings === "" ? 0 : Number(entry.nightLandings);
    if (isFiniteNumber(ld) && ld > 0) totals.landingsDay += ld;
    if (isFiniteNumber(ln) && ln > 0) totals.landingsNight += ln;
  }

  function decorate(totals) {
    var out = {
      timeHours: totals.time,
      timeHm: formatHm(totals.time),
      timeTenths: tenthsHours(totals.time),
      landingsDay: totals.landingsDay,
      landingsNight: totals.landingsNight,
      landings: totals.landingsDay + totals.landingsNight,
      count: totals.count
    };
    FLAGS.forEach(function (f) {
      out[f + "Hours"] = totals[f];
      out[f + "Hm"] = formatHm(totals[f]);
      out[f + "Tenths"] = tenthsHours(totals[f]);
    });
    return out;
  }

  function inRange(date, start, end) {
    return date >= start && date <= end;
  }

  function compute(input) {
    if (!input || !Array.isArray(input.entries)) return null;
    var asOf = parseYmd(input.asOf) || (function () {
      var n = new Date();
      return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
    })();
    var all = emptyTotals();
    var ytd = emptyTotals();
    var d90 = emptyTotals();
    var m6 = emptyTotals();
    var m12 = emptyTotals();
    var dated = 0, undated = 0, parsed = [];
    var start90 = new Date(asOf.getTime() - 90 * 24 * 3600 * 1000);
    var start6 = addMonths(asOf, -6);
    var start12 = addMonths(asOf, -12);
    var ytdStart = new Date(Date.UTC(asOf.getUTCFullYear(), 0, 1));

    for (var i = 0; i < input.entries.length; i++) {
      var e = input.entries[i] || {};
      var emptyDuration = (e.hhmm == null || e.hhmm === "") &&
        (e.decimalHours == null || e.decimalHours === "") &&
        (e.hours == null || e.hours === "") &&
        (e.minutes == null || e.minutes === "");
      if (emptyDuration && !e.date) continue;
      var hours = durationHours(e);
      if (hours == null) return null;
      if (hours === 0 && emptyDuration) continue;
      var date = parseYmd(e.date);
      if (e.date && e.date !== "" && !date) return null;
      if (date) dated += 1;
      else undated += 1;
      parsed.push({ hours: hours, date: date, tenths: tenthsHours(hours), hm: formatHm(hours) });
      addTo(all, hours, e);
      if (date) {
        if (inRange(date, ytdStart, asOf)) addTo(ytd, hours, e);
        if (inRange(date, start90, asOf)) addTo(d90, hours, e);
        if (inRange(date, start6, asOf)) addTo(m6, hours, e);
        if (inRange(date, start12, asOf)) addTo(m12, hours, e);
      }
    }
    if (all.count === 0) return null;
    return {
      asOf: asOf.toISOString().slice(0, 10),
      all: decorate(all),
      yearToDate: decorate(ytd),
      days90: decorate(d90),
      months6: decorate(m6),
      months12: decorate(m12),
      datedCount: dated,
      undatedCount: undated,
      entries: parsed,
      windows: {
        days90Start: start90.toISOString().slice(0, 10),
        months6Start: start6.toISOString().slice(0, 10),
        months12Start: start12.toISOString().slice(0, 10),
        yearToDateStart: ytdStart.toISOString().slice(0, 10)
      }
    };
  }

  var api = {
    FLAGS: FLAGS,
    durationHours: durationHours,
    toHoursMinutes: toHoursMinutes,
    tenthsHours: tenthsHours,
    formatHm: formatHm,
    parseYmd: parseYmd,
    addMonths: addMonths,
    compute: compute
  };
  root.LogbookTimeCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

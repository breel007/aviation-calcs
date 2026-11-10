/**
 * Sunrise, sunset, civil twilight, and FAA night definitions.
 *
 * Solar geometry follows the NOAA Solar Calculator algorithm
 * (https://gml.noaa.gov/grad/solcalc/), itself based on Jean Meeus,
 * Astronomical Algorithms. Sunrise/sunset use a zenith of 90.833°
 * (the sun's semi-diameter plus average atmospheric refraction).
 * Civil twilight uses a zenith of 96°.
 *
 * Longitude is positive east of Greenwich, matching the NOAA JS.
 *
 * FAA night (this page reports all three, because they are not the
 * same clock times):
 *   14 CFR 1.1 "Night" (logging, and the 1.1 definition generally)
 *     — end of evening civil twilight to beginning of morning civil
 *       twilight, as published in the Air Almanac.
 *   14 CFR 61.57(b) night passenger-carrying currency
 *     — 1 hour after sunset to 1 hour before sunrise.
 *   14 CFR 91.209 position lights
 *     — sunset to sunrise.
 *
 * Time-zone offsets (and DST) come from the Intl API via the IANA
 * zone of the airport or the zone the user selects.
 */
(function (root) {
  "use strict";

  var ZENITH_SUNSET = 90.833;
  var ZENITH_CIVIL = 96.0;

  function degToRad(d) { return Math.PI * d / 180.0; }
  function radToDeg(r) { return 180.0 * r / Math.PI; }

  function isLeapYear(yr) {
    return (yr % 4 === 0 && yr % 100 !== 0) || yr % 400 === 0;
  }

  function julianDay(year, month, day) {
    var y = year, m = month;
    if (m <= 2) {
      y -= 1;
      m += 12;
    }
    var A = Math.floor(y / 100);
    var B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5;
  }

  function timeJulianCent(jd) {
    return (jd - 2451545.0) / 36525.0;
  }

  function geomMeanLongSun(t) {
    var L0 = 280.46646 + t * (36000.76983 + t * 0.0003032);
    while (L0 > 360) L0 -= 360;
    while (L0 < 0) L0 += 360;
    return L0;
  }

  function geomMeanAnomalySun(t) {
    return 357.52911 + t * (35999.05029 - 0.0001537 * t);
  }

  function eccentricityEarthOrbit(t) {
    return 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  }

  function sunEqOfCenter(t) {
    var m = degToRad(geomMeanAnomalySun(t));
    return Math.sin(m) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
      Math.sin(2 * m) * (0.019993 - 0.000101 * t) +
      Math.sin(3 * m) * 0.000289;
  }

  function sunApparentLong(t) {
    var o = geomMeanLongSun(t) + sunEqOfCenter(t);
    var omega = 125.04 - 1934.136 * t;
    return o - 0.00569 - 0.00478 * Math.sin(degToRad(omega));
  }

  function meanObliquityOfEcliptic(t) {
    var seconds = 21.448 - t * (46.8150 + t * (0.00059 - t * 0.001813));
    return 23.0 + (26.0 + seconds / 60.0) / 60.0;
  }

  function obliquityCorrection(t) {
    var e0 = meanObliquityOfEcliptic(t);
    var omega = 125.04 - 1934.136 * t;
    return e0 + 0.00256 * Math.cos(degToRad(omega));
  }

  function sunDeclination(t) {
    var e = obliquityCorrection(t);
    var lambda = sunApparentLong(t);
    return radToDeg(Math.asin(Math.sin(degToRad(e)) * Math.sin(degToRad(lambda))));
  }

  function equationOfTime(t) {
    var epsilon = obliquityCorrection(t);
    var l0 = geomMeanLongSun(t);
    var e = eccentricityEarthOrbit(t);
    var m = geomMeanAnomalySun(t);
    var y = Math.tan(degToRad(epsilon) / 2.0);
    y *= y;
    var Etime = y * Math.sin(2 * degToRad(l0)) -
      2 * e * Math.sin(degToRad(m)) +
      4 * e * y * Math.sin(degToRad(m)) * Math.cos(2 * degToRad(l0)) -
      0.5 * y * y * Math.sin(4 * degToRad(l0)) -
      1.25 * e * e * Math.sin(2 * degToRad(m));
    return radToDeg(Etime) * 4.0; // minutes
  }

  function hourAngle(lat, solarDec, zenith) {
    var latRad = degToRad(lat);
    var sdRad = degToRad(solarDec);
    var arg = Math.cos(degToRad(zenith)) / (Math.cos(latRad) * Math.cos(sdRad)) -
      Math.tan(latRad) * Math.tan(sdRad);
    if (arg < -1 || arg > 1) return NaN;
    return Math.acos(arg); // radians
  }

  /**
   * Rise or set in minutes from 00:00 UTC, for a given zenith.
   * rise = true for the morning event.
   * Two-pass, matching NOAA calcSunriseSetUTC + refinement.
   */
  function eventUTC(rise, jd, latitude, longitude, zenith) {
    function pass(J) {
      var t = timeJulianCent(J);
      var eqTime = equationOfTime(t);
      var dec = sunDeclination(t);
      var ha = hourAngle(latitude, dec, zenith);
      if (!isFinite(ha)) return NaN;
      if (!rise) ha = -ha;
      var delta = longitude + radToDeg(ha);
      return 720 - 4.0 * delta - eqTime;
    }
    var first = pass(jd);
    if (!isFinite(first)) return NaN;
    return pass(jd + first / 1440.0);
  }

  function solarNoonUTC(jd, longitude) {
    var tnoon = timeJulianCent(jd - longitude / 360.0);
    var eqTime = equationOfTime(tnoon);
    var offset = 720.0 - longitude * 4 - eqTime;
    var newt = timeJulianCent(jd - 0.5 + offset / 1440.0);
    eqTime = equationOfTime(newt);
    return 720 - longitude * 4 - eqTime;
  }

  /** Minutes east of UTC (local = UTC + offset). Uses Intl. */
  function zoneOffsetMinutes(year, month, day, hour, minute, timeZone) {
    if (!timeZone || timeZone === "UTC") return 0;
    // Probe at the requested civil time by converting a UTC guess.
    var guess = Date.UTC(year, month - 1, day, hour, minute, 0);
    function off(utcMs) {
      var fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: timeZone,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hourCycle: "h23"
      });
      var map = {};
      fmt.formatToParts(new Date(utcMs)).forEach(function (p) {
        if (p.type !== "literal") map[p.type] = p.value;
      });
      var h = parseInt(map.hour, 10);
      if (h === 24) h = 0;
      var asUTC = Date.UTC(
        parseInt(map.year, 10), parseInt(map.month, 10) - 1, parseInt(map.day, 10),
        h, parseInt(map.minute, 10), parseInt(map.second, 10)
      );
      return (asUTC - utcMs) / 60000;
    }
    var o = off(guess);
    return off(guess - o * 60000);
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function minutesToClock(mins) {
    if (!isFinite(mins)) return null;
    var m = ((mins % 1440) + 1440) % 1440;
    var h = Math.floor(m / 60);
    var mm = Math.floor(m - h * 60 + 1e-9);
    var ss = Math.round((m - h * 60 - mm) * 60);
    if (ss === 60) { ss = 0; mm += 1; }
    if (mm === 60) { mm = 0; h += 1; }
    if (h === 24) h = 0;
    return {
      minutes: m,
      hour: h,
      minute: mm,
      second: ss,
      hhmm: pad(h) + ":" + pad(mm),
      hhmmss: pad(h) + ":" + pad(mm) + ":" + pad(ss),
      zulu: pad(h) + pad(mm) + "Z"
    };
  }

  function addMinutesToClock(clock, delta) {
    if (!clock) return null;
    return minutesToClock(clock.minutes + delta);
  }

  /**
   * Compute all events for a civil date at lat/lon in a given IANA zone.
   * `offsetHours` may be supplied directly (bypassing Intl) for tests.
   */
  function compute(input) {
    if (!input) return null;
    var lat = Number(input.lat);
    var lon = Number(input.lon);
    var year = Number(input.year);
    var month = Number(input.month);
    var day = Number(input.day);
    if (!isFinite(lat) || !isFinite(lon) || !isFinite(year) || !isFinite(month) || !isFinite(day)) return null;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    var tz = input.timeZone || "UTC";
    var offsetMin;
    if (input.offsetHours != null && isFinite(Number(input.offsetHours))) {
      offsetMin = Number(input.offsetHours) * 60;
    } else {
      // Offset at local noon, which is the right civil date almost everywhere.
      offsetMin = zoneOffsetMinutes(year, month, day, 12, 0, tz);
    }
    var tzHours = offsetMin / 60;

    var jd = julianDay(year, month, day);
    var sunriseUTC = eventUTC(true, jd, lat, lon, ZENITH_SUNSET);
    var sunsetUTC = eventUTC(false, jd, lat, lon, ZENITH_SUNSET);
    var civilDawnUTC = eventUTC(true, jd, lat, lon, ZENITH_CIVIL);
    var civilDuskUTC = eventUTC(false, jd, lat, lon, ZENITH_CIVIL);
    var noonUTC = solarNoonUTC(jd, lon);

    function localize(utcMin) {
      if (!isFinite(utcMin)) return null;
      return minutesToClock(utcMin + offsetMin);
    }

    var sunrise = localize(sunriseUTC);
    var sunset = localize(sunsetUTC);
    var civilDawn = localize(civilDawnUTC);
    var civilDusk = localize(civilDuskUTC);
    var solarNoon = localize(noonUTC);

    var polar = {
      noSunrise: !sunrise,
      noSunset: !sunset,
      noCivilDawn: !civilDawn,
      noCivilDusk: !civilDusk
    };
    // Continuous daylight / darkness (high latitude).
    var continuousDay = !sunrise && !sunset && lat > 0 && month >= 3 && month <= 9;
    var continuousNight = !sunrise && !sunset && !continuousDay;
    // A slightly more reliable check: solar elevation at noon.
    var dec = sunDeclination(timeJulianCent(jd + 0.5 - lon / 360));
    var noonElevApprox = 90 - Math.abs(lat - dec);
    if (!sunrise && !sunset) {
      if (noonElevApprox > 0) { continuousDay = true; continuousNight = false; }
      else { continuousDay = false; continuousNight = true; }
    }

    var nightLogStart = civilDusk;           // end of evening civil twilight
    var nightLogEnd = civilDawn;             // beginning of morning civil twilight
    var currencyStart = sunset ? addMinutesToClock(sunset, 60) : null;
    var currencyEnd = sunrise ? addMinutesToClock(sunrise, -60) : null;
    var lightsStart = sunset;
    var lightsEnd = sunrise;

    var dayLengthMin = isFinite(sunriseUTC) && isFinite(sunsetUTC) ? sunsetUTC - sunriseUTC : null;
    if (dayLengthMin != null && dayLengthMin < 0) dayLengthMin += 1440;
    var civilLengthMin = isFinite(civilDawnUTC) && isFinite(civilDuskUTC) ? civilDuskUTC - civilDawnUTC : null;
    if (civilLengthMin != null && civilLengthMin < 0) civilLengthMin += 1440;

    return {
      lat: lat,
      lon: lon,
      year: year,
      month: month,
      day: day,
      timeZone: tz,
      offsetMinutes: offsetMin,
      offsetHours: tzHours,
      offsetLabel: formatOffset(offsetMin),
      julianDay: jd,
      sunrise: sunrise,
      sunset: sunset,
      solarNoon: solarNoon,
      civilDawn: civilDawn,
      civilDusk: civilDusk,
      sunriseUTC: isFinite(sunriseUTC) ? minutesToClock(sunriseUTC) : null,
      sunsetUTC: isFinite(sunsetUTC) ? minutesToClock(sunsetUTC) : null,
      civilDawnUTC: isFinite(civilDawnUTC) ? minutesToClock(civilDawnUTC) : null,
      civilDuskUTC: isFinite(civilDuskUTC) ? minutesToClock(civilDuskUTC) : null,
      solarNoonUTC: isFinite(noonUTC) ? minutesToClock(noonUTC) : null,
      nightLogging: { start: nightLogStart, end: nightLogEnd, label: "End of evening civil twilight to beginning of morning civil twilight (14 CFR 1.1)" },
      nightCurrency: { start: currencyStart, end: currencyEnd, label: "1 hour after sunset to 1 hour before sunrise (14 CFR 61.57(b))" },
      positionLights: { start: lightsStart, end: lightsEnd, label: "Sunset to sunrise (14 CFR 91.209)" },
      dayLengthMin: dayLengthMin,
      civilLengthMin: civilLengthMin,
      polar: polar,
      continuousDay: continuousDay,
      continuousNight: continuousNight,
      declination: dec
    };
  }

  function formatOffset(mins) {
    var sign = mins >= 0 ? "+" : "−";
    var abs = Math.abs(Math.round(mins));
    var h = Math.floor(abs / 60);
    var m = abs - h * 60;
    return "UTC" + sign + pad(h) + ":" + pad(m);
  }

  function parseDate(str) {
    if (!str) return null;
    var m = String(str).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    return { year: +m[1], month: +m[2], day: +m[3] };
  }

  var api = {
    ZENITH_SUNSET: ZENITH_SUNSET,
    ZENITH_CIVIL: ZENITH_CIVIL,
    julianDay: julianDay,
    timeJulianCent: timeJulianCent,
    sunDeclination: sunDeclination,
    equationOfTime: equationOfTime,
    eventUTC: eventUTC,
    solarNoonUTC: solarNoonUTC,
    minutesToClock: minutesToClock,
    zoneOffsetMinutes: zoneOffsetMinutes,
    parseDate: parseDate,
    compute: compute
  };

  root.SunriseSunsetCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

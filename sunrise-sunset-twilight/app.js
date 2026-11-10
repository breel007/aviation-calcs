(function () {
  "use strict";
  var S = window.SunriseSunsetCalcs;
  var A = window.SunriseAirports;
  if (!S || !A) return;
  var $ = function (id) { return document.getElementById(id); };

  var ZONES = [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Phoenix",
    "America/Los_Angeles",
    "America/Anchorage",
    "America/Juneau",
    "America/Sitka",
    "America/Adak",
    "Pacific/Honolulu",
    "America/Puerto_Rico",
    "America/St_Thomas",
    "Pacific/Guam",
    "America/Boise",
    "America/Detroit",
    "America/Indiana/Indianapolis"
  ];

  function fillZones(selected) {
    var sel = $("tz");
    sel.innerHTML = "";
    ZONES.forEach(function (z) {
      var o = document.createElement("option");
      o.value = z;
      o.textContent = z;
      sel.appendChild(o);
    });
    if (selected && ZONES.indexOf(selected) === -1) {
      var extra = document.createElement("option");
      extra.value = selected;
      extra.textContent = selected;
      sel.appendChild(extra);
    }
    if (selected) sel.value = selected;
  }

  // Populate a compact datalist with ICAO + name (browsers handle a few hundred).
  (function fillList() {
    var dl = $("airport-list");
    A.AIRPORTS.forEach(function (a) {
      var o = document.createElement("option");
      o.value = a.icao;
      o.label = a.icao + " / " + a.iata + " — " + a.name;
      dl.appendChild(o);
    });
  })();

  function todayISO(tz) {
    var now = Date.now();
    var fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz || "UTC", year: "numeric", month: "2-digit", day: "2-digit" });
    // en-CA gives YYYY-MM-DD
    return fmt.format(new Date(now));
  }

  fillZones("America/Los_Angeles");
  if (!$("date").value) $("date").value = todayISO("America/Los_Angeles");

  function applyAirport(a) {
    if (!a) return;
    $("lat").value = a.lat.toFixed(4);
    $("lon").value = a.lon.toFixed(4);
    fillZones(a.tz);
    $("airport-hint").textContent = a.icao + " / " + a.iata + " — " + a.name +
      (a.elev != null ? " · field elevation about " + a.elev + " ft" : "") +
      ". Times use " + a.tz + ".";
  }

  $("airport").addEventListener("change", function () {
    var a = A.find($("airport").value);
    if (a) applyAirport(a);
    render();
  });
  $("airport").addEventListener("input", function () {
    var a = A.find($("airport").value);
    if (a && (a.icao === $("airport").value.toUpperCase() || a.iata === $("airport").value.toUpperCase())) {
      applyAirport(a);
      render();
    }
  });

  $("btn-geo").addEventListener("click", function () {
    if (!navigator.geolocation) {
      $("warnings").hidden = false;
      $("warnings").innerHTML = "<p>This browser does not offer geolocation.</p>";
      return;
    }
    navigator.geolocation.getCurrentPosition(function (pos) {
      $("lat").value = pos.coords.latitude.toFixed(4);
      $("lon").value = pos.coords.longitude.toFixed(4);
      $("airport").value = "";
      try {
        var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        fillZones(tz);
      } catch (e) {}
      $("airport-hint").textContent = "Using this device’s location. West longitude is negative.";
      render();
    }, function () {
      $("warnings").hidden = false;
      $("warnings").innerHTML = "<p>Location was not available. You can still type an airport or a lat/lon.</p>";
    });
  });

  $("btn-today").addEventListener("click", function () {
    $("date").value = todayISO($("tz").value || "UTC");
    render();
  });
  $("btn-lax").addEventListener("click", function () {
    $("airport").value = "KLAX";
    applyAirport(A.find("KLAX"));
    $("date").value = todayISO("America/Los_Angeles");
    render();
  });

  function clock(c, alsoZ) {
    if (!c) return "—";
    return c.hhmm + (alsoZ ? "  (" + c.zulu.replace(/Z$/, "") + "Z)" : "");
  }
  function stat(label, value, sub) {
    return '<div class="stat"><p class="stat-label">' + label + '</p><p class="stat-value">' + value +
      "</p>" + (sub ? '<p class="stat-sub">' + sub + "</p>" : "") + "</div>";
  }
  function nightCard(title, cfr, start, end, localLabel) {
    return '<div class="card-block night-card"><p class="cfr">' + cfr + "</p><h3>" + title + "</h3><p>Starts <strong>" +
      clock(start, true) + "</strong><br>Ends <strong>" + clock(end, true) + "</strong></p>" +
      (localLabel ? "<p class='hint'>" + localLabel + "</p>" : "") + "</div>";
  }

  function render() {
    var d = S.parseDate($("date").value);
    var warnings = $("warnings");
    if (!d) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>Enter a date, a latitude, and a longitude (or pick an airport).</p>";
      return;
    }
    var r = S.compute({
      lat: $("lat").value,
      lon: $("lon").value,
      year: d.year,
      month: d.month,
      day: d.day,
      timeZone: $("tz").value
    });
    if (!r) {
      warnings.hidden = false;
      warnings.innerHTML = "<p>Latitude must be between −90 and 90, longitude between −180 and 180.</p>";
      $("out-sunset").innerHTML = '<span class="num">—</span>';
      $("stat-grid").innerHTML = "";
      $("night-cards").innerHTML = "";
      return;
    }
    var msgs = [];
    if (r.continuousDay) msgs.push("The sun does not set at this latitude on this date (continuous daylight). Night definitions that depend on sunset or twilight may not apply in the usual way.");
    if (r.continuousNight) msgs.push("The sun does not rise at this latitude on this date (continuous darkness or civil night).");
    if (msgs.length) {
      warnings.hidden = false;
      warnings.innerHTML = msgs.map(function (m) { return "<p>" + m + "</p>"; }).join("");
    } else {
      warnings.hidden = true;
      warnings.innerHTML = "";
    }

    $("hero-tag").textContent = r.offsetLabel + " · " + r.timeZone;
    $("out-sunset").innerHTML = r.sunset
      ? '<span class="num">' + r.sunset.hhmm + "</span>"
      : '<span class="num">—</span>';
    $("out-sunset-sub").textContent = r.sunset
      ? r.sunsetUTC.zulu + " · sunrise " + r.sunrise.hhmm + " (" + r.sunriseUTC.zulu + ")"
      : (r.continuousDay ? "No sunset (continuous day)" : "No sunset computed");

    var dayLen = r.dayLengthMin != null ? Math.floor(r.dayLengthMin / 60) + " hr " + Math.round(r.dayLengthMin % 60) + " min" : "—";
    $("stat-grid").innerHTML =
      stat("Sunrise", r.sunrise ? r.sunrise.hhmm : "—", r.sunriseUTC ? r.sunriseUTC.zulu : "") +
      stat("Solar noon", r.solarNoon ? r.solarNoon.hhmm : "—", r.solarNoonUTC ? r.solarNoonUTC.zulu : "") +
      stat("Morning civil twilight", r.civilDawn ? r.civilDawn.hhmm : "—", "beginning; sun 6° below the horizon") +
      stat("Evening civil twilight ends", r.civilDusk ? r.civilDusk.hhmm : "—", "sun 6° below the horizon · day length " + dayLen);

    $("night-cards").innerHTML = '<div class="night-grid">' +
      nightCard("Night logging", "14 CFR 1.1", r.nightLogging.start, r.nightLogging.end, "End of evening civil twilight to beginning of morning civil twilight.") +
      nightCard("Passenger currency", "14 CFR 61.57(b)", r.nightCurrency.start, r.nightCurrency.end, "1 hour after sunset to 1 hour before sunrise.") +
      nightCard("Position lights", "14 CFR 91.209", r.positionLights.start, r.positionLights.end, "Sunset to sunrise.") +
      "</div>";
  }

  $("calc-form").addEventListener("input", render);
  $("calc-form").addEventListener("change", render);
  // Default view: KLAX today already in the form as LA coords; leave as-is (Los Angeles city, close enough) or set KLAX.
  applyAirport(A.find("KLAX"));
  $("airport").value = "KLAX";
  render();
})();

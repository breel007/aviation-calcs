/**
 * In-flight fuel remaining and ETA from distance to go, current
 * groundspeed, current fuel flow, and fuel on board.
 *
 *   ETE        = distance / groundspeed
 *   fuel burn  = ETE × fuel flow
 *   at dest    = on board − burn
 *   endurance  = on board / fuel flow
 *
 * An optional reserve is compared with the fuel at the destination.
 * The default reserves are the 14 CFR 91.151 / 91.167 planning times
 * (VFR day 30 min, VFR night 45 min, IFR 45 min after the destination,
 * plus an optional alternate ETE). Those are the same regulatory times
 * used on this site's preflight fuel planner; this page is the in-flight
 * remaining-fuel and ETA check, not a full trip plan.
 *
 * Sources: 14 CFR 91.151 (VFR fuel requirements), 91.167 (IFR fuel
 * requirements); FAA Pilot's Handbook of Aeronautical Knowledge (fuel
 * planning); this site's fuel-planning and time-speed-distance calculators.
 */
(function (root) {
  "use strict";

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function toNm(d, unit) {
    if (!isFiniteNumber(d) || d < 0) return NaN;
    if (unit === "sm") return d * 1609.344 / 1852;
    if (unit === "km") return d * 1000 / 1852;
    return d;
  }
  function toKt(v, unit) {
    if (!isFiniteNumber(v) || v <= 0) return NaN;
    if (unit === "mph") return v / 1.1507794480235425;
    if (unit === "kph" || unit === "km/h") return v / 1.852;
    return v;
  }

  function reserveHours(kind, alternateHours) {
    if (kind === "vfr-day") return 0.5;
    if (kind === "vfr-night") return 0.75;
    if (kind === "ifr") return 0.75 + (alternateHours || 0);
    if (kind === "custom") return null;
    return 0.5;
  }

  function compute(input) {
    if (!input) return null;
    var dist = toNm(Number(input.distance), input.distUnit || "nm");
    var gs = toKt(Number(input.groundspeed), input.speedUnit || "kt");
    var gph = Number(input.fuelFlow);
    var onboard = Number(input.onboard);
    if (!(dist >= 0) || !(gs > 0) || !(gph > 0) || !isFiniteNumber(onboard) || onboard < 0) return null;

    var ete = dist / gs;
    var burn = ete * gph;
    var atDest = onboard - burn;
    var endurance = onboard / gph;
    var surplusEndurance = atDest / gph;

    var kind = input.reserveKind || "vfr-day";
    var altH = 0;
    if (input.alternateHours != null && input.alternateHours !== "") {
      altH = Number(input.alternateHours);
      if (!isFiniteNumber(altH) || altH < 0) return null;
    } else if (input.alternateNm != null && input.alternateNm !== "") {
      var altNm = toNm(Number(input.alternateNm), input.distUnit || "nm");
      if (!isFiniteNumber(altNm) || altNm < 0) return null;
      altH = altNm / gs;
    }
    var resH;
    if (kind === "custom") {
      if (input.reserveHours != null && input.reserveHours !== "") {
        resH = Number(input.reserveHours);
      } else if (input.reserveUnits != null && input.reserveUnits !== "") {
        resH = Number(input.reserveUnits) / gph;
      } else {
        return null;
      }
      if (!isFiniteNumber(resH) || resH < 0) return null;
    } else {
      resH = reserveHours(kind, kind === "ifr" ? altH : 0);
    }
    var reserveFuel = resH * gph;
    var surplus = atDest - reserveFuel;

    var eta = null;
    if (input.nowMinutes != null && input.nowMinutes !== "") {
      var now = Number(input.nowMinutes);
      if (!isFiniteNumber(now) || now < 0) return null;
      eta = (now + ete * 60) % (24 * 60);
    }

    return {
      distanceNm: dist,
      groundspeedKt: gs,
      fuelFlow: gph,
      onboard: onboard,
      eteHours: ete,
      eteMin: ete * 60,
      burn: burn,
      atDestination: atDest,
      enduranceHours: endurance,
      reserveKind: kind,
      reserveHours: resH,
      reserveFuel: reserveFuel,
      surplus: surplus,
      surplusHours: surplus / gph,
      meetsReserve: surplus + 1e-12 >= 0,
      willArriveWithFuel: atDest + 1e-12 >= 0,
      etaMinutes: eta,
      alternateHours: kind === "ifr" ? altH : 0
    };
  }

  // ----- Display helpers (pure; used by app.js and test.js) -----------
  var FUEL_UNITS = {
    gal: { qty: "gal", flow: "gph" },
    L: { qty: "L", flow: "L/h" },
    lb: { qty: "lb", flow: "pph" },
    kg: { qty: "kg", flow: "kg/h" }
  };
  function fuelUnits(u) { return FUEL_UNITS[u] || FUEL_UNITS.gal; }

  function fmtNum(n, d) {
    if (!isFiniteNumber(n)) return "—";
    var p = Math.pow(10, d == null ? 1 : d);
    var r = Math.round(n * p) / p;
    if (r === 0) r = 0; // no "-0"
    return r.toLocaleString("en-US", { maximumFractionDigits: d == null ? 1 : d });
  }
  function fmtDuration(hours) {
    if (!isFiniteNumber(hours)) return "—";
    var neg = hours < 0;
    var m = Math.round(Math.abs(hours) * 60);
    var h = Math.floor(m / 60);
    m -= h * 60;
    var s = h > 0 ? h + " h " + String(m).padStart(2, "0") + " min" : m + " min";
    return neg ? "−" + s : s;
  }
  function fmtClock(min) {
    if (!isFiniteNumber(min)) return "—";
    var t = Math.round(((min % 1440) + 1440) % 1440) % 1440;
    var h = Math.floor(t / 60), m = t - h * 60;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  }
  function parseClock(s) {
    s = String(s == null ? "" : s).trim();
    if (!s) return undefined;
    var m = s.match(/^(\d{1,2}):?(\d{2})$/);
    if (!m) return NaN;
    var h = Number(m[1]), mi = Number(m[2]);
    if (h > 23 || mi > 59) return NaN;
    return h * 60 + mi;
  }
  var RESERVE_LABEL = {
    "vfr-day": "VFR day",
    "vfr-night": "VFR night",
    ifr: "IFR",
    custom: "custom"
  };

  // Hero + stat rows, every value with its unit.
  function describe(r, fuelUnit) {
    if (!r) return null;
    var u = fuelUnits(fuelUnit);
    var q = function (n) { return fmtNum(n, 1) + " " + u.qty; };
    var stats = [
      { label: "ETE", value: fmtDuration(r.eteHours) }
    ];
    if (r.etaMinutes != null) stats.push({ label: "ETA", value: fmtClock(r.etaMinutes) });
    stats.push(
      { label: "Fuel at destination", value: q(r.atDestination) + (r.willArriveWithFuel ? "" : " (arrives dry)") },
      { label: "Burn to destination", value: q(r.burn) },
      { label: "Endurance now", value: fmtDuration(r.enduranceHours) },
      { label: "Reserve required", value: q(r.reserveFuel) + " (" + fmtDuration(r.reserveHours) + ")" },
      { label: r.meetsReserve ? "Surplus over reserve" : "Short of reserve",
        value: q(Math.abs(r.surplus)) + " (" + fmtDuration(Math.abs(r.surplusHours)) + ")" },
      { label: "Distance remaining", value: fmtNum(r.distanceNm, 1) + " NM" },
      { label: "Groundspeed", value: fmtNum(r.groundspeedKt, 0) + " kt" },
      { label: "Fuel flow", value: fmtNum(r.fuelFlow, 1) + " " + u.flow }
    );
    if (r.reserveKind === "ifr" && r.alternateHours > 0) {
      stats.push({ label: "Alternate leg", value: fmtDuration(r.alternateHours) });
    }
    var reserveName = RESERVE_LABEL[r.reserveKind] || "chosen";
    return {
      hero: {
        num: fmtNum(r.atDestination, 1),
        unit: u.qty + " at destination",
        sub: (r.meetsReserve ? "Meets the " : "Below the ") + reserveName + " reserve of " +
          q(r.reserveFuel) + " (" + fmtDuration(r.reserveHours) + ")" +
          " · ETE " + fmtDuration(r.eteHours) +
          (r.etaMinutes != null ? " · ETA " + fmtClock(r.etaMinutes) : "")
      },
      stats: stats,
      meetsReserve: r.meetsReserve
    };
  }

  var api = {
    reserveHours: reserveHours, compute: compute, describe: describe,
    fuelUnits: fuelUnits, fmtDuration: fmtDuration, fmtClock: fmtClock, parseClock: parseClock
  };
  root.InflightFuelEtaCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

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

  var api = { reserveHours: reserveHours, compute: compute };
  root.InflightFuelEtaCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

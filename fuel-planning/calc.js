/**
 * Fuel planning: trip fuel, reserves, endurance, and fuel-weight conversion.
 *
 * Airplane fuel reserves cited from 14 CFR 91.151 (VFR) and 91.167 (IFR):
 *   VFR day   — 30 minutes at normal cruise after reaching the destination
 *   VFR night — 45 minutes at normal cruise after reaching the destination
 *   IFR       — fly to the destination, then to an alternate (if required),
 *               then 45 minutes at normal cruising speed
 *
 * Planning densities (standard US flight-planning figures, not a laboratory
 * density at a stated temperature):
 *   100LL / avgas  — 6.0 lb per US gallon
 *   Jet-A / Jet-A-1 — 6.7 lb per US gallon
 */
(function (root) {
  "use strict";

  var LB_PER_GAL = {
    "100LL": 6.0,
    "JET-A": 6.7
  };
  var US_GAL_TO_L = 3.785411784;
  var LB_TO_KG = 0.45359237;
  var NM_TO_SM = 1852 / 1609.344;
  var KT_TO_MPH = NM_TO_SM;

  var RESERVE_MINUTES = {
    "vfr-day": 30,
    "vfr-night": 45,
    ifr: 45
  };

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function densityLbPerGal(fuelType, custom) {
    if (fuelType === "custom") {
      if (isFiniteNumber(custom) && custom > 0) return custom;
      return NaN;
    }
    if (fuelType === "JET-A" || fuelType === "jeta" || fuelType === "jet-a") return LB_PER_GAL["JET-A"];
    return LB_PER_GAL["100LL"];
  }

  function gallonsToPounds(gal, lbPerGal) {
    return gal * lbPerGal;
  }

  function poundsToGallons(lb, lbPerGal) {
    if (!lbPerGal) return NaN;
    return lb / lbPerGal;
  }

  function gallonsToLiters(gal) {
    return gal * US_GAL_TO_L;
  }

  function litersToGallons(l) {
    return l / US_GAL_TO_L;
  }

  function poundsToKg(lb) {
    return lb * LB_TO_KG;
  }

  function kgToPounds(kg) {
    return kg / LB_TO_KG;
  }

  /**
   * Convert a burn rate into gallons per hour.
   * unit: "gph" | "pph" | "lph"
   */
  function burnToGph(burn, unit, lbPerGal) {
    if (!isFiniteNumber(burn) || burn < 0) return NaN;
    if (unit === "pph") return lbPerGal ? burn / lbPerGal : NaN;
    if (unit === "lph") return litersToGallons(burn);
    return burn; // gph
  }

  function hoursFromDistance(distanceNm, groundspeedKt) {
    if (!isFiniteNumber(distanceNm) || !isFiniteNumber(groundspeedKt)) return NaN;
    if (groundspeedKt <= 0) return NaN;
    if (distanceNm < 0) return NaN;
    return distanceNm / groundspeedKt;
  }

  function compute(input) {
    input = input || {};
    var notes = [];
    var fuelType = input.fuelType || "100LL";
    var lbPerGal = densityLbPerGal(fuelType, input.customLbPerGal);
    if (!isFiniteNumber(lbPerGal) || lbPerGal <= 0) {
      return { error: "Enter a fuel density in pounds per gallon." };
    }

    var gs = input.groundspeedKt;
    var dist = input.distanceNm;
    var altDist = isFiniteNumber(input.alternateNm) && input.alternateNm > 0 ? input.alternateNm : 0;
    var includeAlternate = !!input.includeAlternate && altDist > 0;

    var tripHours = hoursFromDistance(dist, gs);
    var altHours = includeAlternate ? hoursFromDistance(altDist, isFiniteNumber(input.alternateGsKt) && input.alternateGsKt > 0 ? input.alternateGsKt : gs) : 0;

    var reserveKind = input.reserveKind || "vfr-day";
    var reserveMin;
    if (reserveKind === "custom") {
      reserveMin = input.reserveMinutes;
    } else {
      reserveMin = RESERVE_MINUTES[reserveKind];
      if (reserveKind === "ifr" && includeAlternate === false) {
        notes.push("IFR reserve (14 CFR 91.167) is 45 minutes after the destination, plus fuel to an alternate when one is required under 91.169. No alternate distance was entered, so only the 45-minute reserve is included.");
      }
    }
    if (!isFiniteNumber(reserveMin) || reserveMin < 0) {
      return { error: "Enter a reserve time in minutes." };
    }
    var reserveHours = reserveMin / 60;

    var gph = burnToGph(input.burn, input.burnUnit || "gph", lbPerGal);
    if (!isFiniteNumber(gph) || gph < 0) {
      return { error: "Enter a fuel burn rate." };
    }

    var taxiGal = isFiniteNumber(input.taxiGal) && input.taxiGal > 0 ? input.taxiGal : 0;

    var result = {
      fuelType: fuelType === "custom" ? "custom" : (fuelType === "JET-A" || fuelType === "jeta" || fuelType === "jet-a" ? "JET-A" : "100LL"),
      lbPerGal: lbPerGal,
      groundspeedKt: gs,
      distanceNm: dist,
      alternateNm: includeAlternate ? altDist : 0,
      includeAlternate: includeAlternate,
      tripHours: tripHours,
      alternateHours: altHours,
      reserveKind: reserveKind,
      reserveMinutes: reserveMin,
      reserveHours: reserveHours,
      gph: gph,
      taxiGal: taxiGal,
      notes: notes,
      error: null
    };

    if (isFiniteNumber(tripHours)) {
      result.tripGal = tripHours * gph;
    } else {
      result.tripGal = NaN;
      if (isFiniteNumber(dist) && dist > 0 && !(isFiniteNumber(gs) && gs > 0)) {
        result.error = "Enter a groundspeed greater than zero to compute trip fuel.";
      }
    }
    result.alternateGal = isFiniteNumber(altHours) ? altHours * gph : 0;
    result.reserveGal = reserveHours * gph;
    result.totalGal = (isFiniteNumber(result.tripGal) ? result.tripGal : 0) + result.alternateGal + result.reserveGal + taxiGal;

    if (!isFiniteNumber(result.tripGal)) {
      // Still useful: reserve and unit conversions even without a trip
      result.totalGal = result.reserveGal + result.alternateGal + taxiGal;
    }

    result.tripLb = isFiniteNumber(result.tripGal) ? gallonsToPounds(result.tripGal, lbPerGal) : NaN;
    result.alternateLb = gallonsToPounds(result.alternateGal, lbPerGal);
    result.reserveLb = gallonsToPounds(result.reserveGal, lbPerGal);
    result.taxiLb = gallonsToPounds(taxiGal, lbPerGal);
    result.totalLb = gallonsToPounds(result.totalGal, lbPerGal);
    result.totalLiters = gallonsToLiters(result.totalGal);
    result.totalKg = poundsToKg(result.totalLb);

    var onboardGal = NaN;
    if (isFiniteNumber(input.onboardGal) && input.onboardGal >= 0) {
      onboardGal = input.onboardGal;
    } else if (isFiniteNumber(input.onboardLb) && input.onboardLb >= 0) {
      onboardGal = poundsToGallons(input.onboardLb, lbPerGal);
    }
    result.onboardGal = onboardGal;
    result.onboardLb = isFiniteNumber(onboardGal) ? gallonsToPounds(onboardGal, lbPerGal) : NaN;

    if (isFiniteNumber(onboardGal) && gph > 0) {
      result.enduranceHours = onboardGal / gph;
      result.reserveEnduranceHours = Math.max(0, (onboardGal - taxiGal) / gph);
      result.usableAfterTaxiGal = Math.max(0, onboardGal - taxiGal);
      result.surplusGal = onboardGal - result.totalGal;
      result.surplusHours = result.surplusGal / gph;
      if (isFiniteNumber(gs) && gs > 0) {
        result.rangeNm = result.enduranceHours * gs;
        result.rangeAfterReserveNm = Math.max(0, (onboardGal - taxiGal - result.reserveGal) / gph * gs);
      }
    }

    return result;
  }

  function convertFuel(amount, from, to, lbPerGal) {
    if (!isFiniteNumber(amount)) return NaN;
    var gal;
    switch (from) {
      case "gal": gal = amount; break;
      case "l": gal = litersToGallons(amount); break;
      case "lb": gal = poundsToGallons(amount, lbPerGal); break;
      case "kg": gal = poundsToGallons(kgToPounds(amount), lbPerGal); break;
      default: return NaN;
    }
    switch (to) {
      case "gal": return gal;
      case "l": return gallonsToLiters(gal);
      case "lb": return gallonsToPounds(gal, lbPerGal);
      case "kg": return poundsToKg(gallonsToPounds(gal, lbPerGal));
      default: return NaN;
    }
  }

  var api = {
    LB_PER_GAL: LB_PER_GAL,
    US_GAL_TO_L: US_GAL_TO_L,
    LB_TO_KG: LB_TO_KG,
    NM_TO_SM: NM_TO_SM,
    KT_TO_MPH: KT_TO_MPH,
    RESERVE_MINUTES: RESERVE_MINUTES,
    densityLbPerGal: densityLbPerGal,
    gallonsToPounds: gallonsToPounds,
    poundsToGallons: poundsToGallons,
    gallonsToLiters: gallonsToLiters,
    litersToGallons: litersToGallons,
    poundsToKg: poundsToKg,
    kgToPounds: kgToPounds,
    burnToGph: burnToGph,
    hoursFromDistance: hoursFromDistance,
    convertFuel: convertFuel,
    compute: compute
  };

  root.FuelPlanning = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

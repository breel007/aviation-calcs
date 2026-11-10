/**
 * Aircraft rental cost: Hobbs vs tach, wet vs dry, fuel, fees, and
 * pro-rata cost sharing under 14 CFR 61.113(c).
 *
 * Billed time:
 *   Hobbs: Hobbs end − Hobbs start (runs whenever the engine/master is on)
 *   Tach : tach end − tach start   (runs proportional to RPM; usually
 *          about 10–20% less than Hobbs on a typical flight)
 *
 * Wet rate: hourly rate includes fuel.
 * Dry rate: hourly rate + fuel bought (gallons × price). A wet rate with
 *   a fuel credit (you bought fuel away from base) subtracts the receipt.
 *
 * Pilot pro-rata share (61.113(c)): the private pilot must pay at least
 * an equal share of the operating expenses (fuel, oil, airport expenditures,
 * rental fees). Equal share = total / (passengers + 1).
 */
(function (root) {
  "use strict";

  function num(v) {
    if (v === "" || v == null) return 0;
    var n = Number(v);
    return isFinite(n) ? n : NaN;
  }

  function elapsed(start, end) {
    var s = Number(start);
    var e = Number(end);
    if (!isFinite(s) || !isFinite(e)) return null;
    if (e < s) return null;
    return e - s;
  }

  /** Convert tach to estimated Hobbs (or back) with a ratio Hobbs/tach. */
  function tachToHobbs(tach, ratio) {
    return tach * (ratio || 1.15);
  }

  function hobbsToTach(hobbs, ratio) {
    return hobbs / (ratio || 1.15);
  }

  /** Equivalent hourly rate when switching billing basis. */
  function equivalentRate(rate, fromBasis, ratio) {
    var r = ratio || 1.15;
    // A tach rate of $X on tach hours costs the same as X / r per Hobbs hour.
    if (fromBasis === "tach") return rate / r;
    return rate * r;
  }

  function compute(input) {
    if (!input) return null;
    var hours;
    if (input.timeMode === "meter") {
      hours = elapsed(input.meterStart, input.meterEnd);
      if (hours == null) return null;
    } else {
      hours = num(input.hours);
    }
    if (!isFinite(hours) || hours <= 0) return null;

    var rate = num(input.rate);
    var fuelGal = num(input.fuelGallons);
    var fuelPrice = num(input.fuelPrice);
    var instructorRate = num(input.instructorRate);
    var instructorHours = input.instructorHours === "" || input.instructorHours == null ? hours : num(input.instructorHours);
    var landing = num(input.landingFees);
    var tiedown = num(input.otherFees);
    var vals = [rate, fuelGal, fuelPrice, instructorRate, instructorHours, landing, tiedown];
    for (var i = 0; i < vals.length; i++) {
      if (!isFinite(vals[i]) || vals[i] < 0) return null;
    }
    if (rate <= 0) return null;

    var aircraft = rate * hours;
    var fuelCost = fuelGal * fuelPrice;
    var fuelLine = 0;
    if (input.rateType === "dry") {
      fuelLine = fuelCost;            // you pay for fuel on top of the dry rate
    } else if (input.fuelCredit) {
      fuelLine = -fuelCost;           // wet rate: club credits fuel you bought elsewhere
    }
    var instructor = instructorRate * instructorHours;
    var total = aircraft + fuelLine + instructor + landing + tiedown;
    if (total < 0) total = 0;

    var operating = aircraft + fuelLine + landing + tiedown; // excludes instruction
    var passengers = Math.max(0, Math.round(num(input.passengers)));
    var people = passengers + 1;
    var share = operating / people;

    var effectiveWet = input.rateType === "dry" && hours > 0 ? (aircraft + fuelCost) / hours : rate;
    var gph = num(input.gph);
    var impliedFuelPerHour = gph > 0 && fuelPrice > 0 ? gph * fuelPrice : null;
    var dryEquivalent = input.rateType === "wet" && impliedFuelPerHour != null ? rate - impliedFuelPerHour : null;
    var wetEquivalent = input.rateType === "dry" && impliedFuelPerHour != null ? rate + impliedFuelPerHour : null;

    return {
      hours: hours,
      aircraft: aircraft,
      fuel: fuelLine,
      fuelCost: fuelCost,
      instructor: instructor,
      fees: landing + tiedown,
      total: total,
      perHour: total / hours,
      effectiveWetRate: effectiveWet,
      dryEquivalent: dryEquivalent,
      wetEquivalent: wetEquivalent,
      operatingCost: operating,
      people: people,
      equalShare: share,
      pilotMinimum: share,
      passengersPayMax: passengers > 0 ? (operating - share) : 0,
      perPassengerMax: passengers > 0 ? (operating - share) / passengers : 0
    };
  }

  var api = {
    compute: compute,
    elapsed: elapsed,
    tachToHobbs: tachToHobbs,
    hobbsToTach: hobbsToTach,
    equivalentRate: equivalentRate
  };

  root.RentalCostCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

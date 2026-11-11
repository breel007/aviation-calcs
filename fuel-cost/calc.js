/**
 * Fuel cost per hour and per trip, from fuel flow and a price, or from
 * a known fuel quantity. Optional oil and a second price for a wet-vs-
 * dry or 100LL-vs-Jet-A comparison are supported but not required.
 *
 *   cost / hour = fuel flow (gal/h) × price ($/gal)
 *   trip cost   = cost / hour × time  =  gallons × price
 *
 * Fuel flow may be entered as gallons per hour or as pounds per hour
 * with a fuel density (default 6.0 lb/US gal for 100LL, 6.7 lb/US gal
 * for Jet-A, matching this site's fuel-weight and fuel-planning pages).
 *
 * Prices are whatever you type — the page does not fetch a live fuel
 * price. Results are a planning estimate, not a fuel bill.
 *
 * Sources: typical 100LL / Jet-A densities as used in FAA-H-8083-25
 * PHAK and on this site's fuel-weight calculator; time–fuel arithmetic
 * as in the fuel planner.
 */
(function (root) {
  "use strict";

  var LB_PER_GAL = { "100ll": 6.0, "jeta": 6.7, "jetb": 6.4, "custom": null };

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function hoursFrom(value, unit) {
    if (!isFiniteNumber(value) || value < 0) return NaN;
    if (unit === "min") return value / 60;
    return value;
  }

  function compute(input) {
    if (!input) return null;
    var price = Number(input.price);
    if (!isFiniteNumber(price) || price < 0) return null;

    var fuelType = input.fuelType || "100ll";
    var density = input.densityLbGal == null || input.densityLbGal === ""
      ? LB_PER_GAL[fuelType]
      : Number(input.densityLbGal);
    if (density != null && !isFiniteNumber(density)) density = LB_PER_GAL[fuelType];
    if (!isFiniteNumber(density) || density <= 0) density = 6.0;

    var gph = null;
    if (input.flow != null && input.flow !== "") {
      var flow = Number(input.flow);
      if (!isFiniteNumber(flow) || flow < 0) return null;
      var flowUnit = input.flowUnit || "gph";
      if (flowUnit === "pph" || flowUnit === "lb/h") gph = flow / density;
      else if (flowUnit === "lph" || flowUnit === "l/h") gph = flow / 3.785411784;
      else gph = flow;
    }

    var hours = null;
    if (input.time != null && input.time !== "") {
      hours = hoursFrom(Number(input.time), input.timeUnit || "h");
      if (!isFiniteNumber(hours)) return null;
    }

    var gallons = null;
    if (input.gallons != null && input.gallons !== "") {
      var g = Number(input.gallons);
      if (!isFiniteNumber(g) || g < 0) return null;
      var gu = input.gallonsUnit || "gal";
      gallons = (gu === "l" || gu === "litre") ? g / 3.785411784 : g;
    } else if (gph != null && hours != null) {
      gallons = gph * hours;
    }

    if (gph == null && gallons != null && hours != null && hours > 0) {
      gph = gallons / hours;
    }

    if (gph == null && gallons == null) return null;

    var costPerHour = gph != null ? gph * price : null;
    var tripFuelCost = gallons != null ? gallons * price : null;

    var oilQtPerHour = input.oilQtPerHour == null || input.oilQtPerHour === "" ? 0 : Number(input.oilQtPerHour);
    var oilPrice = input.oilPrice == null || input.oilPrice === "" ? 0 : Number(input.oilPrice);
    var oilPerHour = (isFiniteNumber(oilQtPerHour) && isFiniteNumber(oilPrice)) ? oilQtPerHour * oilPrice : 0;
    var oilTrip = (hours != null) ? oilPerHour * hours : null;

    var totalPerHour = costPerHour != null ? costPerHour + oilPerHour : null;
    var totalTrip = tripFuelCost != null ? tripFuelCost + (oilTrip || 0) : null;

    return {
      densityLbGal: density,
      gph: gph,
      gallons: gallons,
      hours: hours,
      price: price,
      costPerHour: costPerHour,
      tripFuelCost: tripFuelCost,
      oilPerHour: oilPerHour,
      oilTrip: oilTrip,
      totalPerHour: totalPerHour,
      totalTrip: totalTrip,
      poundsPerHour: gph != null ? gph * density : null,
      tripPounds: gallons != null ? gallons * density : null
    };
  }

  var api = { LB_PER_GAL: LB_PER_GAL, compute: compute };
  root.FuelCostCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

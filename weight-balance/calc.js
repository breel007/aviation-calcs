/**
 * Generic aircraft weight and balance / center-of-gravity calculations.
 *
 *   moment = weight × arm
 *   CG     = total moment / total weight
 *
 * Stations may be mass items (weight + arm) or fuel items (gallons ×
 * density + arm). Takeoff is after an optional taxi burn; landing is
 * after trip fuel burn, both subtracted from the fuel stations (first
 * fuel station by default).
 *
 * Preset arms and envelopes are typical published POH figures for
 * common trainers and are EXAMPLE VALUES only — always verify against
 * the W&B data in YOUR aircraft.
 */
(function (root) {
  "use strict";

  var FUEL_LB_PER_GAL = {
    "100LL": 6.0,
    "Jet-A": 6.7
  };

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function fuelDensity(type) {
    return FUEL_LB_PER_GAL[type] != null ? FUEL_LB_PER_GAL[type] : FUEL_LB_PER_GAL["100LL"];
  }

  function stationWeight(station, fuelType) {
    if (station && station.kind === "fuel") {
      var gal = isFiniteNumber(station.gallons) ? station.gallons : 0;
      return gal * fuelDensity(fuelType);
    }
    return isFiniteNumber(station && station.weight) ? station.weight : 0;
  }

  function stationMoment(station, fuelType) {
    var w = stationWeight(station, fuelType);
    var arm = isFiniteNumber(station && station.arm) ? station.arm : 0;
    return w * arm;
  }

  function totals(stations, fuelType) {
    var weight = 0;
    var moment = 0;
    var rows = (stations || []).map(function (s, i) {
      var w = stationWeight(s, fuelType);
      var arm = isFiniteNumber(s.arm) ? s.arm : 0;
      var m = w * arm;
      weight += w;
      moment += m;
      return {
        index: i,
        name: s.name || "",
        kind: s.kind || "mass",
        gallons: s.kind === "fuel" ? (isFiniteNumber(s.gallons) ? s.gallons : 0) : null,
        weight: w,
        arm: arm,
        moment: m
      };
    });
    return {
      rows: rows,
      weight: weight,
      moment: moment,
      cg: weight !== 0 ? moment / weight : null
    };
  }

  function firstFuelIndex(stations) {
    if (!stations) return -1;
    for (var i = 0; i < stations.length; i++) {
      if (stations[i] && stations[i].kind === "fuel") return i;
    }
    return -1;
  }

  function cloneStations(stations) {
    return (stations || []).map(function (s) {
      var copy = {};
      Object.keys(s).forEach(function (k) { copy[k] = s[k]; });
      return copy;
    });
  }

  /**
   * Subtract `gallons` of fuel from the first fuel station (not below zero).
   * Returns a new station list.
   */
  function burnFuel(stations, gallons) {
    var next = cloneStations(stations);
    var i = firstFuelIndex(next);
    if (i < 0 || !isFiniteNumber(gallons) || gallons <= 0) return next;
    var have = isFiniteNumber(next[i].gallons) ? next[i].gallons : 0;
    next[i].gallons = Math.max(0, have - gallons);
    return next;
  }

  /**
   * input:
   *   stations, fuelType, taxiGallons, tripGallons
   *   envelope: [{ arm, weight }, ...] in order around the polygon
   *   limits: { maxRamp, maxTakeoff, maxLanding } optional
   */
  function compute(input) {
    var stations = input.stations || [];
    var fuelType = input.fuelType || "100LL";
    var taxi = isFiniteNumber(input.taxiGallons) ? Math.max(0, input.taxiGallons) : 0;
    var trip = isFiniteNumber(input.tripGallons) ? Math.max(0, input.tripGallons) : 0;

    var ramp = totals(stations, fuelType);
    var takeoffStations = burnFuel(stations, taxi);
    var takeoff = totals(takeoffStations, fuelType);
    var landingStations = burnFuel(takeoffStations, trip);
    var landing = totals(landingStations, fuelType);

    var envelope = Array.isArray(input.envelope) ? input.envelope.slice() : [];
    var limits = input.limits || {};

    function status(pointWeight, pointCg) {
      var overMax = null;
      return {
        cg: pointCg,
        weight: pointWeight,
        insideEnvelope: envelope.length >= 3 && isFiniteNumber(pointCg) && isFiniteNumber(pointWeight)
          ? pointInPolygon(pointCg, pointWeight, envelope)
          : null,
        exceedsMaxTakeoff: isFiniteNumber(limits.maxTakeoff) ? pointWeight - limits.maxTakeoff : null,
        exceedsMaxLanding: isFiniteNumber(limits.maxLanding) ? pointWeight - limits.maxLanding : null,
        exceedsMaxRamp: isFiniteNumber(limits.maxRamp) ? pointWeight - limits.maxRamp : null
      };
    }

    return {
      fuelType: fuelType,
      fuelDensity: fuelDensity(fuelType),
      taxiGallons: taxi,
      tripGallons: trip,
      ramp: ramp,
      takeoff: takeoff,
      landing: landing,
      envelope: envelope,
      limits: limits,
      rampStatus: status(ramp.weight, ramp.cg),
      takeoffStatus: status(takeoff.weight, takeoff.cg),
      landingStatus: status(landing.weight, landing.cg)
    };
  }

  /**
   * Even-odd rule, inclusive of edges (within 1e-6).
   * x = arm (CG), y = weight.
   * envelope vertices: { arm, weight }
   */
  function pointInPolygon(arm, weight, envelope) {
    if (!envelope || envelope.length < 3) return false;
    if (onBoundary(arm, weight, envelope)) return true;
    var inside = false;
    var n = envelope.length;
    for (var i = 0, j = n - 1; i < n; j = i++) {
      var xi = envelope[i].arm;
      var yi = envelope[i].weight;
      var xj = envelope[j].arm;
      var yj = envelope[j].weight;
      var denom = (yj - yi);
      var intersect = ((yi > weight) !== (yj > weight)) &&
        (arm < ((xj - xi) * (weight - yi) / (denom || 1e-16) + xi));
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function onBoundary(arm, weight, envelope) {
    var n = envelope.length;
    for (var i = 0, j = n - 1; i < n; j = i++) {
      if (pointOnSegment(arm, weight, envelope[j].arm, envelope[j].weight, envelope[i].arm, envelope[i].weight)) {
        return true;
      }
    }
    return false;
  }

  function pointOnSegment(px, py, x1, y1, x2, y2) {
    var eps = 1e-6;
    var cross = (px - x1) * (y2 - y1) - (py - y1) * (x2 - x1);
    if (Math.abs(cross) > eps * (Math.abs(x2 - x1) + Math.abs(y2 - y1) + 1)) return false;
    var dot = (px - x1) * (x2 - x1) + (py - y1) * (y2 - y1);
    if (dot < -eps) return false;
    var len2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (dot - len2 > eps) return false;
    return true;
  }

  /**
   * Example presets. Arms and envelopes are typical published POH figures.
   * Empty weight and empty-weight arm are representative mid-range examples,
   * not any particular airplane. Always verify against YOUR aircraft's W&B data.
   */
  var PRESETS = {
    blank: {
      id: "blank",
      name: "Blank / custom",
      disclaimer: "Add your stations, arms, and CG envelope from YOUR aircraft’s W&B data.",
      fuelType: "100LL",
      stations: [
        { name: "Empty weight", kind: "mass", weight: 0, arm: 0 },
        { name: "Pilot / front seats", kind: "mass", weight: 0, arm: 0 },
        { name: "Fuel (usable)", kind: "fuel", gallons: 0, arm: 0 }
      ],
      envelope: [],
      limits: {},
      taxiGallons: 0,
      notes: []
    },
    c172s: {
      id: "c172s",
      name: "Cessna 172S (example)",
      disclaimer: "Example values from typical published Cessna 172S POH figures. Empty weight is a mid-range example, not a real airplane. Verify every number against YOUR aircraft’s W&B data.",
      fuelType: "100LL",
      datum: "Lower portion of the front face of the firewall; arms in inches aft of datum.",
      stations: [
        { name: "Empty weight (example)", kind: "mass", weight: 1663, arm: 40.0 },
        { name: "Pilot and front passenger", kind: "mass", weight: 340, arm: 37.0 },
        { name: "Rear passengers", kind: "mass", weight: 0, arm: 73.0 },
        { name: "Fuel, usable (max 53 gal)", kind: "fuel", gallons: 40, arm: 48.0, maxGallons: 53 },
        { name: "Baggage area 1 (max 120 lb)", kind: "mass", weight: 20, arm: 95.0, maxWeight: 120 },
        { name: "Baggage area 2 (max 50 lb)", kind: "mass", weight: 0, arm: 123.0, maxWeight: 50 }
      ],
      envelope: [
        { arm: 35.0, weight: 1500 },
        { arm: 35.0, weight: 1950 },
        { arm: 41.0, weight: 2550 },
        { arm: 47.3, weight: 2550 },
        { arm: 47.3, weight: 1500 }
      ],
      limits: { maxRamp: 2558, maxTakeoff: 2550, maxLanding: 2550, category: "Normal" },
      taxiGallons: 1.3,
      notes: [
        "Front-seat arm 37.0 in is the average-occupant figure (seat travel 34.0–46.0 in).",
        "Baggage areas 1 and 2 combined must not exceed 120 lb.",
        "Start, taxi and run-up fuel is often about 8 lb (≈ 1.3 gal) at the fuel arm."
      ]
    },
    pa28: {
      id: "pa28",
      name: "Piper PA-28-181 Archer (example)",
      disclaimer: "Example values from typical published PA-28-181 (Archer II/III) POH figures. Empty weight is a mid-range example, not a real airplane. Verify every number against YOUR aircraft’s W&B data.",
      fuelType: "100LL",
      datum: "78.4 in forward of the wing leading edge at the inboard intersection of the straight and tapered sections; arms in inches aft of datum.",
      stations: [
        { name: "Empty weight (example)", kind: "mass", weight: 1590, arm: 87.5 },
        { name: "Pilot and front passenger", kind: "mass", weight: 340, arm: 80.5 },
        { name: "Rear passengers", kind: "mass", weight: 0, arm: 118.1 },
        { name: "Fuel, usable (max 48 gal)", kind: "fuel", gallons: 48, arm: 95.0, maxGallons: 48 },
        { name: "Baggage (max 200 lb)", kind: "mass", weight: 0, arm: 142.8, maxWeight: 200 }
      ],
      envelope: [
        { arm: 82.0, weight: 1600 },
        { arm: 82.0, weight: 2050 },
        { arm: 88.6, weight: 2550 },
        { arm: 93.0, weight: 2550 },
        { arm: 93.0, weight: 1600 }
      ],
      limits: { maxRamp: 2558, maxTakeoff: 2550, maxLanding: 2550, category: "Normal" },
      taxiGallons: 1.3,
      notes: [
        "The drawn envelope uses a 1,600 lb lower bound so the forward 82.0 in limit (at 2,050 lb or less) and the 88.6 / 93.0 in limits at 2,550 lb can be plotted. Replace the polygon with the graph from YOUR POH if it starts at a different weight."
      ]
    },
    c152: {
      id: "c152",
      name: "Cessna 152 (example)",
      disclaimer: "Example values from typical published Cessna 152 POH figures (standard tanks). Empty weight is a mid-range example, not a real airplane. Verify every number against YOUR aircraft’s W&B data.",
      fuelType: "100LL",
      datum: "Front face of the firewall; arms in inches aft of datum.",
      stations: [
        { name: "Empty weight (example)", kind: "mass", weight: 1136, arm: 29.9 },
        { name: "Pilot and passenger", kind: "mass", weight: 340, arm: 39.0 },
        { name: "Fuel, usable (max 24.5 gal)", kind: "fuel", gallons: 24.5, arm: 42.2, maxGallons: 24.5 },
        { name: "Baggage area 1 (max 120 lb)", kind: "mass", weight: 20, arm: 64.0, maxWeight: 120 },
        { name: "Baggage area 2 (max 40 lb)", kind: "mass", weight: 0, arm: 84.0, maxWeight: 40 }
      ],
      envelope: [
        { arm: 31.0, weight: 1000 },
        { arm: 31.0, weight: 1350 },
        { arm: 32.65, weight: 1670 },
        { arm: 36.5, weight: 1670 },
        { arm: 36.5, weight: 1000 }
      ],
      limits: { maxRamp: 1670, maxTakeoff: 1670, maxLanding: 1670, category: "Utility" },
      taxiGallons: 0,
      notes: [
        "Seat arm 39.0 in is the average-occupant figure (seat travel 33–41 in).",
        "Standard tanks: 24.5 US gal usable at arm 42.2 in. Long-range tanks are different — do not use this preset for them.",
        "Baggage areas 1 and 2 combined must not exceed 120 lb."
      ]
    }
  };

  var api = {
    FUEL_LB_PER_GAL: FUEL_LB_PER_GAL,
    PRESETS: PRESETS,
    fuelDensity: fuelDensity,
    stationWeight: stationWeight,
    stationMoment: stationMoment,
    totals: totals,
    burnFuel: burnFuel,
    compute: compute,
    pointInPolygon: pointInPolygon,
    firstFuelIndex: firstFuelIndex,
    cloneStations: cloneStations
  };

  root.WeightBalanceCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

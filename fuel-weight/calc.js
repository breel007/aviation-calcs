/**
 * Aviation fuel mass ↔ volume, by fuel type, with optional temperature
 * correction of density.
 *
 * Standard U.S. flight-planning figures (not a laboratory density):
 *   100LL / avgas     6.0 lb per US gallon
 *   Jet-A / Jet-A-1   6.7 lb per US gallon
 *   Jet-B / JP-4      6.4 lb per US gallon
 *   JP-5              6.8 lb per US gallon
 *   JP-8              6.7 lb per US gallon
 *
 * When a temperature is supplied, density is adjusted from a 15 °C
 * reference specific gravity with a typical cubic-expansion coefficient
 * (avgas ≈ 0.00095 /°C, kerosene jet fuels ≈ 0.00079 /°C):
 *   ρ(T) = ρ15 (1 − α (T − 15 °C))
 *
 * Sources: FAA Pilot's Handbook of Aeronautical Knowledge (fuel weight
 * planning figures); ASTM D910 / D1655 typical specific gravities;
 * ICAO / AFM planning densities. Planning figures are what most POH
 * weight-and-balance examples use; temperature-corrected mass is an
 * estimate, not a fueler's ticket.
 */
(function (root) {
  "use strict";

  var US_GAL_TO_L = 3.785411784;
  var IMP_GAL_TO_L = 4.54609;
  var LB_TO_KG = 0.45359237;
  var WATER_LB_PER_US_GAL_15C = 8.345404; // 0.999 g/mL × 3.785411784 / 0.45359237

  var FUELS = {
    "100LL":     { name: "100LL avgas",          planLbGal: 6.0, sg15: 0.72, alpha: 0.00095, kind: "avgas" },
    "100-130":   { name: "100/130 avgas",        planLbGal: 6.0, sg15: 0.72, alpha: 0.00095, kind: "avgas" },
    "mogas":     { name: "Mogas / UL94",         planLbGal: 6.0, sg15: 0.72, alpha: 0.00095, kind: "avgas" },
    "JET-A":     { name: "Jet-A / Jet-A-1",      planLbGal: 6.7, sg15: 0.80, alpha: 0.00079, kind: "jet" },
    "JET-B":     { name: "Jet-B / JP-4",         planLbGal: 6.4, sg15: 0.76, alpha: 0.00090, kind: "jet" },
    "JP-5":      { name: "JP-5",                 planLbGal: 6.8, sg15: 0.82, alpha: 0.00079, kind: "jet" },
    "JP-8":      { name: "JP-8",                 planLbGal: 6.7, sg15: 0.80, alpha: 0.00079, kind: "jet" }
  };

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function fuelSpec(type, customLbGal) {
    if (type === "custom") {
      var c = Number(customLbGal);
      if (!isFiniteNumber(c) || c <= 0) return null;
      return { name: "Custom", planLbGal: c, sg15: c / WATER_LB_PER_US_GAL_15C, alpha: 0.0008, kind: "custom" };
    }
    return FUELS[type] || FUELS["100LL"];
  }

  function densityLbPerUsGal(spec, tempC, useTemp) {
    if (!useTemp || !isFiniteNumber(tempC)) return spec.planLbGal;
    var rho15 = spec.sg15 * WATER_LB_PER_US_GAL_15C;
    return rho15 * (1 - spec.alpha * (tempC - 15));
  }

  /**
   * input.fuelType, input.customLbGal
   * input.direction: "volume-to-mass" | "mass-to-volume"
   * input.volume, input.volumeUnit: "us-gal" | "imp-gal" | "L"
   * input.mass, input.massUnit: "lb" | "kg"
   * input.tempC (optional), input.useTemperature
   */
  function compute(input) {
    if (!input) return null;
    var spec = fuelSpec(input.fuelType || "100LL", input.customLbGal);
    if (!spec) return null;
    var useTemp = input.useTemperature === true && isFiniteNumber(Number(input.tempC));
    var tempC = useTemp ? Number(input.tempC) : null;
    var lbPerGal = densityLbPerUsGal(spec, tempC, useTemp);
    if (!(lbPerGal > 0)) return null;

    var usGal, lb;
    var dir = input.direction || "volume-to-mass";
    if (dir === "mass-to-volume") {
      var mass = Number(input.mass);
      if (!isFiniteNumber(mass) || mass < 0) return null;
      var mu = input.massUnit || "lb";
      lb = mu === "kg" ? mass / LB_TO_KG : mass;
      usGal = lb / lbPerGal;
    } else {
      var vol = Number(input.volume);
      if (!isFiniteNumber(vol) || vol < 0) return null;
      var vu = input.volumeUnit || "us-gal";
      if (vu === "L") usGal = vol / US_GAL_TO_L;
      else if (vu === "imp-gal") usGal = vol * IMP_GAL_TO_L / US_GAL_TO_L;
      else usGal = vol;
      lb = usGal * lbPerGal;
    }

    return {
      fuelType: input.fuelType || "100LL",
      fuelName: spec.name,
      planLbPerUsGal: spec.planLbGal,
      sg15: spec.sg15,
      alpha: spec.alpha,
      usedLbPerUsGal: lbPerGal,
      usedKgPerL: (lbPerGal / US_GAL_TO_L) * LB_TO_KG,
      temperatureApplied: useTemp,
      tempC: tempC,
      usGallons: usGal,
      impGallons: usGal * US_GAL_TO_L / IMP_GAL_TO_L,
      liters: usGal * US_GAL_TO_L,
      pounds: lb,
      kilograms: lb * LB_TO_KG
    };
  }

  var api = {
    FUELS: FUELS,
    US_GAL_TO_L: US_GAL_TO_L,
    IMP_GAL_TO_L: IMP_GAL_TO_L,
    LB_TO_KG: LB_TO_KG,
    WATER_LB_PER_US_GAL_15C: WATER_LB_PER_US_GAL_15C,
    fuelSpec: fuelSpec,
    densityLbPerUsGal: densityLbPerUsGal,
    compute: compute
  };

  root.FuelWeightCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

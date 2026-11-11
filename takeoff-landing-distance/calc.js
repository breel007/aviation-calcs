/**
 * Takeoff and landing distance corrections from a baseline (POH/AFM)
 * figure, using the kinematic and handbook factors in the Pilot's
 * Handbook of Aeronautical Knowledge plus common published surface
 * and slope planning factors.
 *
 * Wind (PHAK Ch. 11 — the ground-roll identity behind the familiar
 * “10 % of takeoff speed” memory items):
 *
 *   f_wind = ((V − Vw) / V)²
 *
 * V is liftoff or threshold speed, Vw is the runway-component wind
 * (positive headwind, negative tailwind). A headwind of 10 % of V
 * reduces distance by 19 % (0.9² = 0.81); a 10 % tailwind increases
 * it by 21 % (1.1² = 1.21), matching the PHAK figures.
 *
 * Weight (PHAK): takeoff (and landing ground-roll) distance varies
 * approximately with the square of the weight:
 *
 *   f_weight = (W / W_ref)²
 *
 * Density, two reports:
 *   • Training rule of thumb: about +10 % distance per 1,000 ft of
 *     density altitude above the baseline DA.
 *   • First-order constant-thrust physics: ground roll scales as 1/σ
 *     (liftoff TAS² grows as 1/σ; with constant thrust, acceleration
 *     is roughly unchanged). Propeller aircraft are typically worse
 *     because thrust also falls with density; treat 1/σ as a lower
 *     bound and prefer the POH chart.
 *
 * Slope (common planning factor, UK CAA Safety Sense / many training
 * syllabi): about 5 % distance change per 1 % runway slope.
 *   Takeoff: upslope increases distance.  f = 1 + 0.05 × slope_%
 *   Landing: downslope increases distance. f = 1 − 0.05 × slope_%
 *   (slope_% is positive uphill in the direction of the roll).
 *
 * Surface planning factors (typical CAA / training figures, dry paved
 * = 1.00): takeoff dry grass 1.20, wet grass 1.30; landing dry grass
 * 1.15, wet grass 1.35, wet paved 1.15. Soft or contaminated surfaces
 * are flagged rather than given a single multiplier.
 *
 * Combined (factors multiply, and they are estimates):
 *   D = D_ref × f_weight × f_wind × f_density × f_slope × f_surface
 *
 * These are not a substitute for the POH/AFM performance charts.
 *
 * Sources: FAA-H-8083-25 Pilot's Handbook of Aeronautical Knowledge,
 * Chapter 11, Aircraft Performance (wind and weight effects); FAA
 * Airplane Flying Handbook (takeoff and landing, density altitude);
 * UK CAA Safety Sense Leaflet 7 / aeroplane performance planning
 * factors (slope and grass); U.S. Standard Atmosphere 1976 for σ.
 */
(function (root) {
  "use strict";

  var M_PER_FT = 0.3048;
  var SURFACE = {
    "paved-dry": { takeoff: 1.00, landing: 1.00, label: "Dry paved" },
    "paved-wet": { takeoff: 1.00, landing: 1.15, label: "Wet paved" },
    "grass-dry": { takeoff: 1.20, landing: 1.15, label: "Dry grass (firm)" },
    "grass-wet": { takeoff: 1.30, landing: 1.35, label: "Wet grass" },
    "soft":      { takeoff: null, landing: null, label: "Soft or contaminated" }
  };

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function densityRatioAtDaFt(daFt) {
    var Atm = root.StandardAtmosphereCalcs;
    var hM = daFt * M_PER_FT;
    if (Atm && hM >= 0) {
      var p = Atm.propertiesAtGeopotential(hM);
      if (p && isFiniteNumber(p.densityRatio)) return p.densityRatio;
    }
    // ISA troposphere, including a short extrapolation below MSL.
    var T0 = 288.15, L = 0.0065, G0 = 9.80665, R = 287.05287;
    var tRatio = 1 - (L * hM) / T0;
    if (tRatio <= 0) return NaN;
    var exp = G0 / (R * L) - 1; // ρ/ρ0 = θ^((g/RL)−1)
    return Math.pow(tRatio, exp);
  }

  function compute(input) {
    if (!input) return null;
    var kind = input.kind === "landing" ? "landing" : "takeoff";
    var dRef = Number(input.distance);
    if (!isFiniteNumber(dRef) || dRef <= 0) return null;
    var distUnit = input.distanceUnit || "ft";
    var dRefFt = distUnit === "m" ? dRef / M_PER_FT : dRef;

    var fWeight = 1;
    var weightNote = "baseline weight";
    if (input.weight != null && input.weight !== "" &&
        input.weightRef != null && input.weightRef !== "") {
      var W = Number(input.weight), Wr = Number(input.weightRef);
      if (!isFiniteNumber(W) || !isFiniteNumber(Wr) || W <= 0 || Wr <= 0) return null;
      fWeight = (W / Wr) * (W / Wr);
      weightNote = "W/Wref = " + (W / Wr);
    }

    var fWind = 1;
    var windNote = "calm or not entered";
    var V = null, Vw = 0;
    if (input.speed != null && input.speed !== "") {
      V = Number(input.speed);
      if (!isFiniteNumber(V) || V <= 0) return null;
      if (input.headwind != null && input.headwind !== "") {
        Vw = Number(input.headwind);
        if (!isFiniteNumber(Vw)) return null;
      }
      var vg = V - Vw;
      if (vg <= 0) {
        return { error: "wind", message: "Headwind is at or above the liftoff or threshold speed, so the (V − Vw)² wind factor is not meaningful." };
      }
      fWind = (vg / V) * (vg / V);
      windNote = Vw >= 0
        ? "headwind " + Vw + " on V = " + V
        : "tailwind " + (-Vw) + " on V = " + V;
    }

    var da = input.densityAltitude == null || input.densityAltitude === "" ? null : Number(input.densityAltitude);
    var daRef = input.densityAltitudeRef == null || input.densityAltitudeRef === "" ? 0 : Number(input.densityAltitudeRef);
    var fDaThumb = 1, fDaSigma = 1;
    var sigma = null, sigmaRef = null;
    if (da != null) {
      if (!isFiniteNumber(da) || !isFiniteNumber(daRef)) return null;
      fDaThumb = 1 + 0.10 * (da - daRef) / 1000;
      if (fDaThumb <= 0) {
        return { error: "da", message: "The 10 % per 1,000 ft rule gives a non-physical factor at this density-altitude difference." };
      }
      sigma = densityRatioAtDaFt(da);
      sigmaRef = densityRatioAtDaFt(daRef);
      if (isFiniteNumber(sigma) && isFiniteNumber(sigmaRef) && sigma > 0) {
        fDaSigma = sigmaRef / sigma;
      }
    }

    var slope = input.slope == null || input.slope === "" ? 0 : Number(input.slope);
    if (!isFiniteNumber(slope)) return null;
    // slope percent, positive uphill in the direction of the roll
    var fSlope = kind === "landing" ? 1 - 0.05 * slope : 1 + 0.05 * slope;
    if (fSlope <= 0) {
      return { error: "slope", message: "The 5 % per 1 % slope factor is not meaningful at this slope." };
    }

    var surfaceKey = input.surface || "paved-dry";
    var surf = SURFACE[surfaceKey] || SURFACE["paved-dry"];
    var fSurface = surf[kind];
    if (fSurface == null) {
      return {
        error: "surface",
        message: "Soft or contaminated surfaces do not have a single reliable multiplier. Use the POH/AFM or do not go."
      };
    }

    // Primary combined estimate uses the 1/σ density factor when DA is
    // given, otherwise 1. The 10 %/1,000 ft rule is always reported
    // alongside when DA is entered.
    var fDensity = da != null && isFiniteNumber(fDaSigma) ? fDaSigma : 1;
    var correctedFt = dRefFt * fWeight * fWind * fDensity * fSlope * fSurface;
    var correctedThumbFt = dRefFt * fWeight * fWind * fDaThumb * fSlope * fSurface;

    return {
      kind: kind,
      baselineFt: dRefFt,
      correctedFt: correctedFt,
      correctedM: correctedFt * M_PER_FT,
      correctedThumbFt: correctedThumbFt,
      fWeight: fWeight,
      fWind: fWind,
      fDaThumb: fDaThumb,
      fDaSigma: fDaSigma,
      fDensity: fDensity,
      fSlope: fSlope,
      fSurface: fSurface,
      surfaceLabel: surf.label,
      sigma: sigma,
      sigmaRef: sigmaRef,
      densityAltitudeFt: da,
      densityAltitudeRefFt: da != null ? daRef : null,
      slopePercent: slope,
      speed: V,
      headwind: V != null ? Vw : null,
      weightNote: weightNote,
      windNote: windNote,
      deltaFt: correctedFt - dRefFt,
      deltaPct: (correctedFt / dRefFt - 1) * 100
    };
  }

  var api = {
    SURFACE: SURFACE,
    densityRatioAtDaFt: densityRatioAtDaFt,
    compute: compute
  };
  root.TakeoffLandingDistanceCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

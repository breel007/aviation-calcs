/**
 * Density altitude and related atmosphere calculations.
 *
 * Primary method: ICAO Standard Atmosphere (Doc 7488 / ISO 2533)
 * tropospheric model, valid below 11 km (36,089 ft).
 *
 * Station pressure is obtained by reducing the altimeter setting (QNH)
 * to field elevation with the ISA pressure-height relation the altimeter
 * assumes. Density altitude is the geopotential height in the ISA
 * troposphere that has the same air density.
 *
 * Humidity: when dewpoint is supplied, temperature is replaced by virtual
 * temperature, using Bolton (1980) / Magnus-Tetens vapor pressure and
 * Tv = T / (1 - (1 - Rd/Rv) * e / p).
 *
 * The common FAA/AOPA rule of thumb
 *   DA = PA + 120 * (OAT_C - ISA_C)
 * is also provided for comparison. It typically reads 100–200 ft high
 * on hot days relative to the ICAO density formula.
 */
(function (root) {
  "use strict";

  // ICAO Doc 7488 constants
  var T0 = 288.15;            // K, sea-level ISA temperature
  var L = 0.0065;             // K/m, standard lapse rate
  var G0 = 9.80665;           // m/s^2
  var R_DRY = 287.05287;      // J/(kg*K), specific gas constant, dry air
  var P0_HPA = 1013.25;       // hPa
  var RHO0 = 1.225;           // kg/m^3, sea-level ISA density
  var FT_PER_M = 1 / 0.3048;
  var M_PER_FT = 0.3048;
  // 1 inHg = 3386.389 Pa = 33.863886666666667 hPa
  var HPA_PER_INHG = 33.863886666666667;
  var P0_INHG = P0_HPA / HPA_PER_INHG; // 29.92126154 inHg (not 29.92 exactly)
  var G_OVER_RL = G0 / (R_DRY * L);    // ~5.25588
  var RL_OVER_G = 1 / G_OVER_RL;       // ~0.190263
  var DENSITY_EXP = 1 / (G_OVER_RL - 1); // ~0.234969
  var T0_OVER_L_M = T0 / L;            // 44330.76923 m
  var T0_OVER_L_FT = T0_OVER_L_M * FT_PER_M; // 145442.156 ft
  var TROPOPAUSE_FT = 11000 * FT_PER_M; // 36,089.24 ft
  var EPSILON = 0.622;                 // Rd/Rv
  var L_K_PER_FT = L * M_PER_FT;       // 0.0019812 K/ft

  var CONST = {
    T0: T0,
    L: L,
    G0: G0,
    R_DRY: R_DRY,
    P0_HPA: P0_HPA,
    P0_INHG: P0_INHG,
    RHO0: RHO0,
    FT_PER_M: FT_PER_M,
    M_PER_FT: M_PER_FT,
    HPA_PER_INHG: HPA_PER_INHG,
    G_OVER_RL: G_OVER_RL,
    RL_OVER_G: RL_OVER_G,
    DENSITY_EXP: DENSITY_EXP,
    T0_OVER_L_FT: T0_OVER_L_FT,
    TROPOPAUSE_FT: TROPOPAUSE_FT,
    L_K_PER_FT: L_K_PER_FT
  };

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function inHgToHpa(inhg) {
    return inhg * HPA_PER_INHG;
  }

  function hpaToInHg(hpa) {
    return hpa / HPA_PER_INHG;
  }

  function cToF(c) {
    return c * 9 / 5 + 32;
  }

  function fToC(f) {
    return (f - 32) * 5 / 9;
  }

  function ftToM(ft) {
    return ft * M_PER_FT;
  }

  function mToFt(m) {
    return m * FT_PER_M;
  }

  /**
   * Station pressure from QNH (altimeter setting) and field elevation.
   * p = QNH * (1 - L * h / T0) ^ (g / (R * L)), with h in metres.
   */
  function stationPressureHpa(altimeterHpa, elevationFt) {
    var hM = elevationFt * M_PER_FT;
    var factor = 1 - (L * hM) / T0;
    if (factor <= 0) return 0;
    return altimeterHpa * Math.pow(factor, G_OVER_RL);
  }

  /**
   * ISA geopotential height (ft) for a given pressure (troposphere).
   * h = (T0 / L) * (1 - (p / p0) ^ (R L / g))
   */
  function isaHeightFromPressureHpa(pHpa) {
    if (pHpa <= 0) return TROPOPAUSE_FT;
    var ratio = pHpa / P0_HPA;
    if (ratio <= 0) return TROPOPAUSE_FT;
    return T0_OVER_L_FT * (1 - Math.pow(ratio, RL_OVER_G));
  }

  /**
   * ISA temperature (°C) at a pressure altitude (ft).
   * T = 15 - 1.9812 * (PA / 1000)   (exactly 6.5 K/km)
   */
  function isaTempC(pressureAltitudeFt) {
    return 15 - L_K_PER_FT * pressureAltitudeFt;
  }

  /**
   * Air density (kg/m^3) from pressure (hPa) and temperature (°C),
   * optionally using virtual temperature for humidity.
   */
  function airDensity(pHpa, tempC) {
    var tK = tempC + 273.15;
    if (tK <= 0 || pHpa <= 0) return 0;
    return (pHpa * 100) / (R_DRY * tK);
  }

  /**
   * Density altitude (ft) from density, inverted ISA troposphere profile:
   *   sigma = rho / rho0
   *   DA = (T0 / L) * (1 - sigma ^ (1 / (g/(R L) - 1)))
   *
   * Equivalently:
   *   DA = 145442.16 * (1 - ((p/p0) * (T0/T)) ^ 0.234969) ft
   */
  function densityAltitudeFromDensity(rho) {
    if (rho <= 0) return TROPOPAUSE_FT;
    var sigma = rho / RHO0;
    return T0_OVER_L_FT * (1 - Math.pow(sigma, DENSITY_EXP));
  }

  function densityAltitudeFromPressureTemp(pHpa, tempC) {
    var tK = tempC + 273.15;
    if (tK <= 0 || pHpa <= 0) return TROPOPAUSE_FT;
    var sigma = (pHpa / P0_HPA) * (T0 / tK);
    return T0_OVER_L_FT * (1 - Math.pow(sigma, DENSITY_EXP));
  }

  /**
   * Bolton (1980) approximation to saturation vapor pressure over water,
   * also known as the Magnus-Tetens formula.
   * e (hPa) = 6.112 * exp(17.67 * Td / (Td + 243.5)), Td in °C.
   */
  function vaporPressureHpa(dewpointC) {
    return 6.112 * Math.exp((17.67 * dewpointC) / (dewpointC + 243.5));
  }

  /**
   * Virtual temperature (°C). Moist air is less dense than dry air at the
   * same pressure and temperature, so Tv > T and density altitude rises.
   * Tv = T / (1 - 0.378 * e / p)
   */
  function virtualTempC(tempC, stationPHpa, dewpointC) {
    var e = vaporPressureHpa(dewpointC);
    var tK = tempC + 273.15;
    var p = stationPHpa;
    if (p <= 0) return tempC;
    var tvK = tK / (1 - (1 - EPSILON) * e / p);
    return tvK - 273.15;
  }

  /**
   * FAA / AOPA / PHAK rule of thumb (ft):
   * DA ≈ PA + 120 * (OAT°C − ISA°C)
   */
  function ruleOfThumbDaFt(pressureAltitudeFt, oatC) {
    return pressureAltitudeFt + 120 * (oatC - isaTempC(pressureAltitudeFt));
  }

  /**
   * Rough performance factors vs sea-level ISA, clearly a rule of thumb.
   *   +10% takeoff roll per 1,000 ft DA
   *   −8% climb rate per 1,000 ft DA
   * Linear approximation; not valid as a substitute for the POH, and it
   * degrades at very high density altitude.
   */
  function performanceRuleOfThumb(densityAltitudeFt) {
    var thousands = densityAltitudeFt / 1000;
    var takeoffFactor = 1 + 0.10 * thousands;
    var climbFactor = 1 - 0.08 * thousands;
    if (climbFactor < 0) climbFactor = 0;
    return {
      takeoffFactor: takeoffFactor,
      climbFactor: climbFactor,
      takeoffPctVsSl: (takeoffFactor - 1) * 100,
      climbPctVsSl: (climbFactor - 1) * 100
    };
  }

  /**
   * Main entry. Inputs:
   *   elevationFt, altimeterInHg, oatC, dewpointC (optional, null/undefined)
   */
  function compute(input) {
    var elevationFt = input.elevationFt;
    var altimeterInHg = input.altimeterInHg;
    var oatC = input.oatC;
    var dewpointC = input.dewpointC;

    if (!isFiniteNumber(elevationFt) || !isFiniteNumber(altimeterInHg) || !isFiniteNumber(oatC)) {
      return null;
    }

    var altimeterHpa = inHgToHpa(altimeterInHg);
    var pHpa = stationPressureHpa(altimeterHpa, elevationFt);
    var pInHg = hpaToInHg(pHpa);
    var paFt = isaHeightFromPressureHpa(pHpa);
    var isaC = isaTempC(paFt);
    var isaDevC = oatC - isaC;
    var rhoDry = airDensity(pHpa, oatC);
    var daDryFt = densityAltitudeFromPressureTemp(pHpa, oatC);
    var daRuleFt = ruleOfThumbDaFt(paFt, oatC);

    var humid = null;
    if (isFiniteNumber(dewpointC)) {
      var tvC = virtualTempC(oatC, pHpa, dewpointC);
      var rhoWet = airDensity(pHpa, tvC);
      var daWetFt = densityAltitudeFromPressureTemp(pHpa, tvC);
      humid = {
        dewpointC: dewpointC,
        vaporPressureHpa: vaporPressureHpa(dewpointC),
        virtualTempC: tvC,
        density: rhoWet,
        densityAltitudeFt: daWetFt,
        humidityIncrementFt: daWetFt - daDryFt
      };
    }

    var daForPerf = humid ? humid.densityAltitudeFt : daDryFt;
    var tropWarning = paFt > TROPOPAUSE_FT - 1 || daDryFt > TROPOPAUSE_FT - 1 ||
      (humid && humid.densityAltitudeFt > TROPOPAUSE_FT - 1);

    return {
      elevationFt: elevationFt,
      altimeterInHg: altimeterInHg,
      altimeterHpa: altimeterHpa,
      oatC: oatC,
      stationPressureHpa: pHpa,
      stationPressureInHg: pInHg,
      pressureAltitudeFt: paFt,
      isaTempC: isaC,
      isaDeviationC: isaDevC,
      densityDry: rhoDry,
      densityRatioDry: rhoDry / RHO0,
      densityAltitudeFt: daDryFt,
      densityAltitudeRuleOfThumbFt: daRuleFt,
      humid: humid,
      performance: performanceRuleOfThumb(daForPerf),
      tropopauseWarning: tropWarning,
      formula: "ICAO Standard Atmosphere (Doc 7488) tropospheric density altitude"
    };
  }


  /**
   * 29.92 inHg is the conventional two-decimal display of ICAO standard
   * pressure 29.92126 inHg (1013.25 hPa). Mapping it back to p0 makes
   * sea-level ISA reset and "altimeter 29.92" show PA/DA of 0 ft, not 1 ft.
   */
  function isConventionalStandardInHg(inhg) {
    return isFiniteNumber(inhg) && Math.abs(inhg - 29.92) < 5e-4;
  }

  function isConventionalStandardHpa(hpa) {
    return isFiniteNumber(hpa) && Math.abs(hpa - 1013.25) < 5e-3;
  }

  function canonicalAltimeterInHg(inhg) {
    return isConventionalStandardInHg(inhg) ? P0_INHG : inhg;
  }

  function canonicalAltimeterHpa(hpa) {
    return isConventionalStandardHpa(hpa) ? P0_HPA : hpa;
  }

  // ISA deviation is a temperature difference, so °F = °C * 9/5 (no +32).
  function isaDevCToF(devC) {
    return devC * 9 / 5;
  }

  function isaDevFToC(devF) {
    return devF * 5 / 9;
  }

  /**
   * Two-way link between OAT and ISA deviation.
   *   ISA dev = OAT - ISA temperature at pressure altitude
   *   OAT     = ISA temperature at pressure altitude + ISA dev
   *
   * input.source is "oat" or "isa" (the last-edited field). The other
   * value is derived. Pressure altitude comes from elevation + altimeter.
   */
  function resolveOatAndIsaDev(input) {
    var elevationFt = input.elevationFt;
    var altimeterInHg = input.altimeterInHg;
    var source = input.source || "oat";
    if (!isFiniteNumber(elevationFt) || !isFiniteNumber(altimeterInHg)) return null;
    var altimeterHpa = inHgToHpa(altimeterInHg);
    var pHpa = stationPressureHpa(altimeterHpa, elevationFt);
    var paFt = isaHeightFromPressureHpa(pHpa);
    var isaC = isaTempC(paFt);
    var oatC;
    var isaDevC;
    if (source === "isa") {
      if (!isFiniteNumber(input.isaDeviationC)) return null;
      isaDevC = input.isaDeviationC;
      oatC = isaC + isaDevC;
    } else {
      if (!isFiniteNumber(input.oatC)) return null;
      oatC = input.oatC;
      isaDevC = oatC - isaC;
    }
    return {
      elevationFt: elevationFt,
      altimeterInHg: altimeterInHg,
      pressureAltitudeFt: paFt,
      isaTempC: isaC,
      oatC: oatC,
      isaDeviationC: isaDevC,
      source: source
    };
  }

  var api = {
    CONST: CONST,
    compute: compute,
    stationPressureHpa: stationPressureHpa,
    isaHeightFromPressureHpa: isaHeightFromPressureHpa,
    isaTempC: isaTempC,
    airDensity: airDensity,
    densityAltitudeFromPressureTemp: densityAltitudeFromPressureTemp,
    vaporPressureHpa: vaporPressureHpa,
    virtualTempC: virtualTempC,
    ruleOfThumbDaFt: ruleOfThumbDaFt,
    performanceRuleOfThumb: performanceRuleOfThumb,
    inHgToHpa: inHgToHpa,
    hpaToInHg: hpaToInHg,
    cToF: cToF,
    fToC: fToC,
    ftToM: ftToM,
    mToFt: mToFt,
    isConventionalStandardInHg: isConventionalStandardInHg,
    isConventionalStandardHpa: isConventionalStandardHpa,
    canonicalAltimeterInHg: canonicalAltimeterInHg,
    canonicalAltimeterHpa: canonicalAltimeterHpa,
    isaDevCToF: isaDevCToF,
    isaDevFToC: isaDevFToC,
    resolveOatAndIsaDev: resolveOatAndIsaDev
  };

  root.AviationCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

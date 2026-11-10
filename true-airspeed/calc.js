/**
 * Calibrated/indicated airspeed → true airspeed and Mach.
 *
 * Uses the ICAO Standard Atmosphere for pressure at a given pressure
 * altitude (ICAO Doc 7488 / ISO 2533), and the subsonic compressible
 * pitot-static relations:
 *
 *   q_c / p0 = (1 + 0.2 (CAS/a0)^2)^(7/2) − 1
 *   M       = sqrt( 5 [ (q_c/p + 1)^(2/7) − 1 ] )
 *   TAS     = M · a(T)     with  a = sqrt(γ R T)
 *
 * Input airspeed is treated as CAS. IAS equals CAS only when instrument
 * and position error are zero — always apply the POH airspeed calibration
 * if a certified figure is required.
 *
 * Constants match the density-altitude calculator:
 *   T0 = 288.15 K, L = 0.0065 K/m, p0 = 1013.25 hPa,
 *   g = 9.80665 m/s², R = 287.05287 J/(kg·K), γ = 1.4
 *
 * The stratosphere (isothermal at 11–20 km) is included so flight-level
 * calculations above 36,089 ft remain defined.
 */
(function (root) {
  "use strict";

  var T0 = 288.15;
  var L = 0.0065;
  var P0_HPA = 1013.25;
  var P0_PA = P0_HPA * 100;
  var G = 9.80665;
  var R = 287.05287;
  var GAMMA = 1.4;
  var EXP = G / (R * L);           // ≈ 5.25588
  var TROP_M = 11000;              // 11 km tropopause
  var TROP_T = T0 - L * TROP_M;    // 216.65 K
  var TROP_P = P0_PA * Math.pow(1 - L * TROP_M / T0, EXP);
  var FT_M = 0.3048;
  var KT_MPS = 1852 / 3600;
  var A0 = Math.sqrt(GAMMA * R * T0); // ≈ 340.294 m/s
  var A0_KT = A0 / KT_MPS;            // ≈ 661.479 kt
  var GAMMA_R = GAMMA * R;
  var ISA_LAPSE_C_PER_FT = L * FT_M;  // 0.0019812 °C/ft

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function cToF(c) { return c * 9 / 5 + 32; }
  function fToC(f) { return (f - 32) * 5 / 9; }
  function ftToM(ft) { return ft * FT_M; }
  function mToFt(m) { return m / FT_M; }
  function ktToMph(kt) { return kt * (1852 / 1609.344); }
  function ktToKmh(kt) { return kt * 1.852; }

  /** ISA temperature (°C) at a geometric/geopotential height in feet (troposphere + lower stratosphere). */
  function isaTempC(pressureAltitudeFt) {
    var h = ftToM(pressureAltitudeFt);
    if (h <= TROP_M) return (T0 - L * h) - 273.15;
    return TROP_T - 273.15;
  }

  /** Ambient ISA pressure (Pa) at a pressure altitude in feet. */
  function isaPressurePa(pressureAltitudeFt) {
    var h = ftToM(pressureAltitudeFt);
    if (h <= TROP_M) {
      return P0_PA * Math.pow(1 - L * h / T0, EXP);
    }
    return TROP_P * Math.exp(-G * (h - TROP_M) / (R * TROP_T));
  }

  function speedOfSoundMps(tempK) {
    return Math.sqrt(GAMMA_R * tempK);
  }

  function speedOfSoundKt(tempK) {
    return speedOfSoundMps(tempK) / KT_MPS;
  }

  /**
   * Subsonic CAS (m/s) and ambient pressure (Pa) → Mach.
   * Returns NaN if the impact-pressure ratio is not a valid subsonic value.
   */
  function machFromCasPa(casMps, ambientPa) {
    if (!(casMps >= 0) || !(ambientPa > 0)) return NaN;
    var qcOverP0 = Math.pow(1 + 0.2 * Math.pow(casMps / A0, 2), 3.5) - 1;
    var qc = qcOverP0 * P0_PA;
    var ratio = qc / ambientPa + 1;
    if (ratio < 1) return NaN;
    var m2 = 5 * (Math.pow(ratio, 2 / 7) - 1);
    if (m2 < 0) return 0;
    var m = Math.sqrt(m2);
    return m;
  }

  /**
   * Subsonic Mach and ambient pressure (Pa) → CAS (m/s).
   */
  function casFromMachPa(mach, ambientPa) {
    if (!(mach >= 0) || !(ambientPa > 0)) return NaN;
    var qc = ambientPa * (Math.pow(1 + 0.2 * mach * mach, 3.5) - 1);
    var inner = qc / P0_PA + 1;
    if (inner < 1) return NaN;
    var casSq = 5 * A0 * A0 * (Math.pow(inner, 2 / 7) - 1);
    if (casSq < 0) return 0;
    return Math.sqrt(casSq);
  }

  function densityRatio(ambientPa, tempK) {
    var rho = ambientPa / (R * tempK);
    var rho0 = P0_PA / (R * T0);
    return rho / rho0;
  }

  /**
   * @param {object} input
   * @param {number} input.casKt  Calibrated (or indicated) airspeed in knots
   * @param {number} input.pressureAltitudeFt
   * @param {number} [input.oatC]
   * @param {number} [input.isaDevC]  Used when oatC is omitted
   * @param {number} [input.mach]     If set with solveFor "cas", CAS is computed
   * @param {string} [input.solveFor] "tas" (default) or "cas"
   */
  function compute(input) {
    input = input || {};
    var paFt = input.pressureAltitudeFt;
    if (!isFiniteNumber(paFt)) {
      return { error: "Enter a pressure altitude." };
    }

    var isaC = isaTempC(paFt);
    var oatC;
    if (isFiniteNumber(input.oatC)) {
      oatC = input.oatC;
    } else if (isFiniteNumber(input.isaDevC)) {
      oatC = isaC + input.isaDevC;
    } else {
      return { error: "Enter outside air temperature or ISA deviation." };
    }
    var isaDevC = oatC - isaC;
    var tempK = oatC + 273.15;
    if (tempK <= 0) {
      return { error: "Temperature must be above absolute zero." };
    }

    var p = isaPressurePa(paFt);
    var a = speedOfSoundMps(tempK);
    var aKt = a / KT_MPS;
    var sigma = densityRatio(p, tempK);

    var casKt, mach, tasKt, tasMps;
    var solveFor = input.solveFor === "cas" ? "cas" : "tas";

    if (solveFor === "cas" && isFiniteNumber(input.mach)) {
      mach = input.mach;
      if (mach < 0) return { error: "Mach cannot be negative." };
      if (mach >= 1) {
        return { error: "This calculator uses the subsonic pitot formula (Mach < 1)." };
      }
      var casMpsFromM = casFromMachPa(mach, p);
      casKt = casMpsFromM / KT_MPS;
      tasMps = mach * a;
      tasKt = tasMps / KT_MPS;
    } else if (solveFor === "cas" && isFiniteNumber(input.tasKt)) {
      tasKt = input.tasKt;
      if (tasKt < 0) return { error: "True airspeed cannot be negative." };
      tasMps = tasKt * KT_MPS;
      mach = tasMps / a;
      if (mach >= 1) {
        return { error: "This calculator uses the subsonic pitot formula (Mach < 1)." };
      }
      casKt = casFromMachPa(mach, p) / KT_MPS;
    } else {
      casKt = input.casKt;
      if (!isFiniteNumber(casKt)) return { error: "Enter a calibrated or indicated airspeed." };
      if (casKt < 0) return { error: "Airspeed cannot be negative." };
      var casMps = casKt * KT_MPS;
      mach = machFromCasPa(casMps, p);
      if (!isFiniteNumber(mach)) return { error: "Could not compute Mach from that airspeed and altitude." };
      if (mach >= 1) {
        return {
          error: "The computed Mach number is 1 or greater. This page uses the subsonic formula only.",
          casKt: casKt,
          pressureAltitudeFt: paFt,
          oatC: oatC,
          isaTempC: isaC,
          isaDeviationC: isaDevC,
          mach: mach
        };
      }
      tasMps = mach * a;
      tasKt = tasMps / KT_MPS;
    }

    var easKt = tasKt * Math.sqrt(sigma);
    // Total air temperature for recovery factor 1 (adiabatic)
    var tatK = tempK * (1 + 0.2 * mach * mach);
    var tatC = tatK - 273.15;

    return {
      casKt: casKt,
      tasKt: tasKt,
      easKt: easKt,
      mach: mach,
      pressureAltitudeFt: paFt,
      oatC: oatC,
      oatF: cToF(oatC),
      isaTempC: isaC,
      isaDeviationC: isaDevC,
      tempK: tempK,
      ambientPa: p,
      ambientHpa: p / 100,
      speedOfSoundKt: aKt,
      speedOfSoundMps: a,
      densityRatio: sigma,
      tatC: tatC,
      tatF: cToF(tatC),
      tasMph: ktToMph(tasKt),
      tasKmh: ktToKmh(tasKt),
      casMph: ktToMph(casKt),
      error: null
    };
  }

  var api = {
    T0: T0,
    L: L,
    P0_HPA: P0_HPA,
    G: G,
    R: R,
    GAMMA: GAMMA,
    A0: A0,
    A0_KT: A0_KT,
    TROP_M: TROP_M,
    TROP_P: TROP_P,
    FT_M: FT_M,
    KT_MPS: KT_MPS,
    ISA_LAPSE_C_PER_FT: ISA_LAPSE_C_PER_FT,
    isFiniteNumber: isFiniteNumber,
    cToF: cToF,
    fToC: fToC,
    ftToM: ftToM,
    mToFt: mToFt,
    ktToMph: ktToMph,
    ktToKmh: ktToKmh,
    isaTempC: isaTempC,
    isaPressurePa: isaPressurePa,
    speedOfSoundMps: speedOfSoundMps,
    speedOfSoundKt: speedOfSoundKt,
    machFromCasPa: machFromCasPa,
    casFromMachPa: casFromMachPa,
    densityRatio: densityRatio,
    compute: compute
  };

  root.TrueAirspeed = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

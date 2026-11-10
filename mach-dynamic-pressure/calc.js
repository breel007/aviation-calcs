/**
 * Mach number and dynamic pressure.
 *
 *   M  = V / a,            a = √(γ R T)
 *   q  = ½ ρ V²  =  ½ γ P M²
 *
 * Equivalent airspeed is defined from dynamic pressure by
 *   q = ½ ρ0 V_eas²,  ρ0 = 1.225 kg/m³.
 *
 * Subsonic compressible impact pressure (isentropic, γ = 1.4):
 *   qc = P [ (1 + 0.2 M²)^3.5 − 1 ]
 *
 * Atmosphere may be entered as T, P, ρ, or taken from the U.S. Standard
 * Atmosphere 1976 at a geopotential altitude.
 *
 * Sources: NACA Report 1135; NASA Glenn Beginner's Guide (dynamic pressure,
 * Mach); U.S. Standard Atmosphere 1976; Anderson, Introduction to Flight.
 */
(function (root) {
  "use strict";

  var GAMMA = 1.4;
  var RS = 287.0528742;
  var P0 = 101325;
  var T0 = 288.15;
  var RHO0 = 1.225;
  var KT_MPS = 1852 / 3600;
  var M_PER_FT = 0.3048;
  var PA_PER_PSF = 47.88025898033584;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function speedOfSound(tempK) {
    if (!(tempK > 0)) return NaN;
    return Math.sqrt(GAMMA * RS * tempK);
  }

  function velocityMps(value, unit) {
    var v = Number(value);
    if (!isFiniteNumber(v) || v < 0) return NaN;
    if (unit === "kt") return v * KT_MPS;
    if (unit === "mph") return v * 0.44704;
    if (unit === "fps" || unit === "ft/s") return v * M_PER_FT;
    if (unit === "kmh" || unit === "km/h") return v / 3.6;
    return v;
  }

  function resolveAtmosphere(input) {
    var T, P, rho;
    if (input.atmosphere === "isa" || input.altitudeM != null && input.atmosphere !== "manual") {
      var Atm = root.StandardAtmosphereCalcs;
      if (!Atm) return { error: "Standard atmosphere library is not loaded." };
      var H = Number(input.altitudeM);
      if (!isFiniteNumber(H) || H < 0) return { error: "Enter a non-negative altitude." };
      var prop = Atm.propertiesAtGeopotential(H);
      if (!prop) return { error: "Altitude is outside the 0–86 km standard-atmosphere model." };
      T = prop.temperatureK;
      P = prop.pressurePa;
      rho = prop.densityKgM3;
      if (input.tempK != null && input.tempK !== "" && isFiniteNumber(Number(input.tempK))) {
        T = Number(input.tempK);
        rho = P / (RS * T);
      }
      return { temperatureK: T, pressurePa: P, densityKgM3: rho, altitudeM: H };
    }
    T = Number(input.tempK);
    P = Number(input.pressurePa);
    rho = Number(input.rho);
    if (isFiniteNumber(T) && T > 0 && isFiniteNumber(P) && P > 0 && !(isFiniteNumber(rho) && rho > 0)) {
      rho = P / (RS * T);
    } else if (isFiniteNumber(T) && T > 0 && isFiniteNumber(rho) && rho > 0 && !(isFiniteNumber(P) && P > 0)) {
      P = rho * RS * T;
    } else if (isFiniteNumber(P) && P > 0 && isFiniteNumber(rho) && rho > 0 && !(isFiniteNumber(T) && T > 0)) {
      T = P / (rho * RS);
    }
    if (!(isFiniteNumber(T) && T > 0 && isFiniteNumber(P) && P > 0 && isFiniteNumber(rho) && rho > 0)) {
      return { error: "Enter temperature and pressure, or density, for the ambient air." };
    }
    return { temperatureK: T, pressurePa: P, densityKgM3: rho, altitudeM: null };
  }

  function impactPressure(P, M) {
    if (!(M >= 0) || !(P > 0)) return NaN;
    // Isentropic (subsonic) formula; still well-defined mathematically above
    // Mach 1 but is not the pitot pressure behind a normal shock.
    return P * (Math.pow(1 + 0.2 * M * M, 3.5) - 1);
  }

  /**
   * input.speedMode: "velocity" | "mach"
   * input.velocity / input.velocityUnit  or  input.mach
   * atmosphere via resolveAtmosphere
   */
  function compute(input) {
    if (!input) return null;
    var atm = resolveAtmosphere(input);
    if (!atm || atm.error) return atm || null;
    var a = speedOfSound(atm.temperatureK);
    var V, M;
    if (input.speedMode === "mach") {
      M = Number(input.mach);
      if (!isFiniteNumber(M) || M < 0) return null;
      V = M * a;
    } else {
      V = velocityMps(input.velocity, input.velocityUnit || "m/s");
      if (!isFiniteNumber(V)) return null;
      M = V / a;
    }
    var q = 0.5 * atm.densityKgM3 * V * V;
    var qFromMach = 0.5 * GAMMA * atm.pressurePa * M * M;
    var Veas = Math.sqrt(2 * q / RHO0);
    var qc = impactPressure(atm.pressurePa, M);
    return {
      mach: M,
      velocityMps: V,
      speedOfSoundMps: a,
      dynamicPressurePa: q,
      dynamicPressurePsf: q / PA_PER_PSF,
      dynamicPressurePsi: q / 6894.757293168,
      easMps: Veas,
      easKt: Veas / KT_MPS,
      impactPressurePa: qc,
      temperatureK: atm.temperatureK,
      pressurePa: atm.pressurePa,
      densityKgM3: atm.densityKgM3,
      altitudeM: atm.altitudeM,
      qCheckPa: qFromMach,
      isSupersonic: M >= 1
    };
  }

  var api = {
    GAMMA: GAMMA,
    RS: RS,
    P0: P0,
    T0: T0,
    RHO0: RHO0,
    PA_PER_PSF: PA_PER_PSF,
    speedOfSound: speedOfSound,
    impactPressure: impactPressure,
    velocityMps: velocityMps,
    compute: compute
  };

  root.MachDynamicPressureCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

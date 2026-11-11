/**
 * Helicopter (or any actuator-disk) hover power, disk loading, and
 * an ideal hover ceiling.
 *
 *   disk loading   DL = T / A
 *   induced speed  v_i = √(DL / (2 ρ)) = √(T / (2 ρ A))
 *   ideal power    P_i = T v_i = T √(DL / (2 ρ))
 *   shaft power    P   = P_i / FM
 *
 * FM is the hover figure of merit (typically ~0.6–0.8 for a
 * well-designed rotor). Given a shaft-power limit, the minimum density
 * that can still hover is
 *   ρ_min = (T / (2 A)) × (T / (P FM))²
 * and this page converts that density to a pressure altitude in the
 * U.S. Standard Atmosphere, 1976 (troposphere and lower stratosphere).
 * That ceiling ignores Mach, stall, and engine lapse other than the
 * density in the induced-power term — it is an induced-power ceiling,
 * not a published hover-out-of-ground-effect chart.
 *
 * Sources: momentum / actuator-disk theory (Gessow and Myers; Leishman,
 * Principles of Helicopter Aerodynamics); hover figure of merit;
 * U.S. Standard Atmosphere, 1976, for the density-to-altitude inversion.
 */
(function (root) {
  "use strict";

  var T0 = 288.15, L = 0.0065, P0 = 101325, RHO0 = 1.225;
  var R = 287.05287, G0 = 9.80665;
  var EXP = G0 / (R * L);
  var TROP_M = 11000, TROP_T = T0 - L * TROP_M;
  var TROP_P = P0 * Math.pow(1 - L * TROP_M / T0, EXP);
  var TROP_RHO = TROP_P / (R * TROP_T);

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function toN(f, unit) {
    if (!isFiniteNumber(f) || f <= 0) return NaN;
    if (unit === "kgf" || unit === "kg") return f * G0;
    if (unit === "lbf" || unit === "lb") return f * 4.4482216152605;
    if (unit === "ton" || unit === "tonne") return f * 1000 * G0;
    return f;
  }
  function toM(d, unit) {
    if (!isFiniteNumber(d) || d <= 0) return NaN;
    if (unit === "ft") return d * 0.3048;
    if (unit === "in") return d * 0.0254;
    return d;
  }
  function toM2(a, unit) {
    if (!isFiniteNumber(a) || a <= 0) return NaN;
    if (unit === "ft2") return a * 0.3048 * 0.3048;
    return a;
  }
  function toW(p, unit) {
    if (!isFiniteNumber(p) || p <= 0) return NaN;
    if (unit === "hp" || unit === "shp") return p * 745.69987158227;
    if (unit === "kw" || unit === "kW") return p * 1000;
    return p;
  }

  function isaDensity(hM) {
    if (hM < 0) hM = 0;
    if (hM <= TROP_M) {
      var t = T0 - L * hM;
      var p = P0 * Math.pow(t / T0, EXP);
      return p / (R * t);
    }
    // Lower stratosphere, isothermal 216.65 K, to 20 km
    var p = TROP_P * Math.exp(-G0 * (hM - TROP_M) / (R * TROP_T));
    return p / (R * TROP_T);
  }

  function altitudeFromDensity(rho) {
    if (!(rho > 0)) return NaN;
    if (Math.abs(rho - RHO0) < 1e-15) return 0;
    if (rho >= TROP_RHO) {
      // ρ/ρ0 = (T/T0)^{EXP-1}  => T/T0 = (ρ/ρ0)^{1/(EXP-1)}
      var ratio = Math.pow(rho / RHO0, 1 / (EXP - 1));
      var t = T0 * ratio;
      return (T0 - t) / L;
    }
    var p = rho * R * TROP_T;
    if (p <= 0 || p > TROP_P) return NaN;
    return TROP_M + (R * TROP_T / G0) * Math.log(TROP_P / p);
  }

  function compute(input) {
    if (!input) return null;
    var thrust = toN(Number(input.thrust), input.thrustUnit || "n");
    if (!(thrust > 0)) return null;
    var area;
    if (input.area != null && input.area !== "") {
      area = toM2(Number(input.area), input.areaUnit || "m2");
    } else {
      var dia = toM(Number(input.diameter), input.diaUnit || "m");
      if (!(dia > 0)) return null;
      area = Math.PI * (dia / 2) * (dia / 2);
    }
    if (!(area > 0)) return null;
    var fm = input.fm == null || input.fm === "" ? 0.7 : Number(input.fm);
    if (!(fm > 0) || fm > 1) return null;

    var hM = 0;
    if (input.altitude != null && input.altitude !== "") {
      hM = Number(input.altitude);
      if ((input.altUnit || "ft") === "ft") hM = hM * 0.3048;
      if (!isFiniteNumber(hM) || hM < 0) return null;
    }
    var rho;
    if (input.density != null && input.density !== "") {
      rho = Number(input.density);
      if (!(rho > 0)) return null;
    } else {
      rho = isaDensity(hM);
    }

    var dl = thrust / area;
    var vi = Math.sqrt(dl / (2 * rho));
    var pIdeal = thrust * vi;
    var pShaft = pIdeal / fm;

    var ceilM = null, rhoMin = null;
    if (input.powerAvail != null && input.powerAvail !== "") {
      var pAv = toW(Number(input.powerAvail), input.powerUnit || "w");
      if (!(pAv > 0)) return null;
      rhoMin = (thrust / (2 * area)) * Math.pow(thrust / (pAv * fm), 2);
      if (rhoMin > 0 && rhoMin <= RHO0 * 1.05) {
        ceilM = altitudeFromDensity(rhoMin);
      }
    }

    return {
      thrustN: thrust,
      areaM2: area,
      diskLoadingPa: dl,
      density: rho,
      figureOfMerit: fm,
      inducedMps: vi,
      idealPowerW: pIdeal,
      shaftPowerW: pShaft,
      shaftPowerHp: pShaft / 745.69987158227,
      altitudeM: hM,
      rhoMin: rhoMin,
      hoverCeilingM: ceilM,
      hoverCeilingFt: ceilM == null ? null : ceilM / 0.3048,
      RHO0: RHO0
    };
  }

  var api = {
    T0: T0, RHO0: RHO0, G0: G0, TROP_RHO: TROP_RHO,
    isaDensity: isaDensity, altitudeFromDensity: altitudeFromDensity, compute: compute
  };
  root.HoverPowerCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

/**
 * Thrust required and power required in level, unaccelerated flight,
 * from a quadratic drag polar and ambient density.
 *
 *   q  = ½ ρ V²
 *   CL = W / (q S)
 *   CD = CD0 + k CL²      k = 1/(π e AR) if e and AR are given
 *   D  = q S CD           =  T_required
 *   P  = T_required × V   =  power required
 *
 * For a propeller, shaft power is P / η if a propeller efficiency is
 * entered. (L/D)max and the corresponding speed (minimum thrust
 * required) are also reported from the polar:
 *   (L/D)max = 1 / (2 √(CD0 k)),   V_Tmin = √( (2 W / (ρ S)) / CL* )
 *   with CL* = √(CD0 / k).
 *
 * Sources: Anderson, Aircraft Performance and Design / Introduction to
 * Flight; FAA PHAK (thrust and power required, L/D); the same polar as
 * this site's drag-polar calculator; U.S. Standard Atmosphere 1976 for
 * density at a density altitude.
 */
(function (root) {
  "use strict";

  var M_PER_FT = 0.3048;
  var N_PER_LBF = 4.4482216152605;
  var MPS_PER_KT = 1852 / 3600;
  var M2_PER_FT2 = M_PER_FT * M_PER_FT;
  var RHO0 = 1.225; // kg/m³, ISA / USSA 1976 sea level

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function toNewton(w, unit) {
    if (!isFiniteNumber(w) || w <= 0) return NaN;
    if (unit === "N") return w;
    if (unit === "kgf") return w * 9.80665;
    if (unit === "kN") return w * 1000;
    return w * N_PER_LBF; // lbf
  }

  function toM2(s, unit) {
    if (!isFiniteNumber(s) || s <= 0) return NaN;
    if (unit === "m2" || unit === "m²") return s;
    return s * M2_PER_FT2; // ft2
  }

  function toMps(v, unit) {
    if (!isFiniteNumber(v) || v <= 0) return NaN;
    if (unit === "mps" || unit === "m/s") return v;
    if (unit === "mph") return v * 1609.344 / 3600;
    if (unit === "kph" || unit === "km/h") return v * 1000 / 3600;
    return v * MPS_PER_KT;
  }

  function densityAtDaFt(daFt) {
    var Atm = root.StandardAtmosphereCalcs;
    var hM = daFt * M_PER_FT;
    if (Atm && hM >= 0) {
      var p = Atm.propertiesAtGeopotential(hM);
      if (p && isFiniteNumber(p.densityKgM3)) return p.densityKgM3;
    }
    var T0 = 288.15, L = 0.0065, G0 = 9.80665, R = 287.05287;
    var tRatio = 1 - (L * hM) / T0;
    if (tRatio <= 0) return NaN;
    return RHO0 * Math.pow(tRatio, G0 / (R * L) - 1);
  }

  function compute(input) {
    if (!input) return null;
    var W = toNewton(Number(input.weight), input.weightUnit || "lbf");
    var S = toM2(Number(input.area), input.areaUnit || "ft2");
    var V = toMps(Number(input.speed), input.speedUnit || "kt");
    if (!isFiniteNumber(W) || !isFiniteNumber(S) || !isFiniteNumber(V)) return null;

    var CD0 = Number(input.CD0);
    if (!isFiniteNumber(CD0) || CD0 <= 0) return null;
    var k;
    if (input.k != null && input.k !== "") {
      k = Number(input.k);
      if (!isFiniteNumber(k) || k <= 0) return null;
    } else {
      var e = input.e == null || input.e === "" ? 0.8 : Number(input.e);
      var AR = Number(input.AR);
      if (!isFiniteNumber(e) || !isFiniteNumber(AR) || e <= 0 || AR <= 0) return null;
      k = 1 / (Math.PI * e * AR);
    }

    var da = input.densityAltitude == null || input.densityAltitude === "" ? 0 : Number(input.densityAltitude);
    if (!isFiniteNumber(da)) return null;
    var rho = densityAtDaFt(da);
    if (!isFiniteNumber(rho) || rho <= 0) return null;

    var q = 0.5 * rho * V * V;
    var CL = W / (q * S);
    if (!isFiniteNumber(CL)) return null;
    var CD = CD0 + k * CL * CL;
    var D = q * S * CD;
    var LD = CD === 0 ? Infinity : CL / CD;
    var P = D * V; // watts

    var eta = null, Pshaft = null;
    if (input.eta != null && input.eta !== "") {
      eta = Number(input.eta);
      if (!isFiniteNumber(eta) || eta <= 0 || eta > 1) return null;
      Pshaft = P / eta;
    }

    var LDmax = 1 / (2 * Math.sqrt(CD0 * k));
    var CLmd = Math.sqrt(CD0 / k);
    var VTmin = Math.sqrt((2 * W / (rho * S)) / CLmd); // m/s, min thrust / (L/D)max
    // Min power is at CL = sqrt(3 CD0/k)
    var CLmp = Math.sqrt(3 * CD0 / k);
    var VPmin = Math.sqrt((2 * W / (rho * S)) / CLmp);

    return {
      weightN: W,
      areaM2: S,
      tasMps: V,
      tasKt: V / MPS_PER_KT,
      densityKgM3: rho,
      densityRatio: rho / RHO0,
      qPa: q,
      CL: CL,
      CD: CD,
      LD: LD,
      CD0: CD0,
      k: k,
      dragN: D,
      thrustRequiredN: D,
      thrustRequiredLbf: D / N_PER_LBF,
      powerRequiredW: P,
      powerRequiredKw: P / 1000,
      powerRequiredHp: P / 745.6998715822702, // mechanical horsepower
      eta: eta,
      shaftPowerW: Pshaft,
      shaftPowerHp: Pshaft != null ? Pshaft / 745.6998715822702 : null,
      LDmax: LDmax,
      speedLDmaxKt: VTmin / MPS_PER_KT,
      speedMinPowerKt: VPmin / MPS_PER_KT,
      stallWarning: CL > 2.0
    };
  }

  var api = { compute: compute, densityAtDaFt: densityAtDaFt };
  root.ThrustPowerRequiredCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

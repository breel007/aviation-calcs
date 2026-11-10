/**
 * Wing loading W/S, aspect ratio AR = b²/S, taper and mean aerodynamic
 * chord, and a stall-speed estimate
 *
 *   Vs = √( 2 (W/S) / (ρ CLmax) )
 *
 * For a linearly tapered wing,
 *   MAC = (2/3) cr (1 + τ + τ²) / (1 + τ),   τ = ct/cr,
 *   cr  = 2 S / (b (1 + τ)).
 *
 * Sources: NASA Glenn Beginner's Guide (wing geometry, wing loading);
 * Anderson, Introduction to Flight; FAA Pilot's Handbook of Aeronautical
 * Knowledge, Chapters 5 and 11.
 */
(function (root) {
  "use strict";

  var G0 = 9.80665;
  var RHO0 = 1.225;
  var KT_MPS = 1852 / 3600;
  var M_PER_FT = 0.3048;
  var LB_N = 4.4482216152605;
  var FT2_M2 = M_PER_FT * M_PER_FT;
  var PA_PER_PSF = 47.88025898033584;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function toNewtons(value, unit) {
    var n = Number(value);
    if (!isFiniteNumber(n) || n <= 0) return NaN;
    if (unit === "lbf" || unit === "lb") return n * LB_N;
    if (unit === "kg" || unit === "kgf") return n * G0;
    if (unit === "kN") return n * 1000;
    return n;
  }

  function toM(value, unit) {
    var n = Number(value);
    if (!isFiniteNumber(n) || n <= 0) return NaN;
    if (unit === "ft") return n * M_PER_FT;
    if (unit === "in") return n * 0.0254;
    return n;
  }

  function toM2(value, unit) {
    var n = Number(value);
    if (!isFiniteNumber(n) || n <= 0) return NaN;
    if (unit === "ft2") return n * FT2_M2;
    return n;
  }

  /**
   * Resolve planform from any consistent pair of S, b, AR, plus optional taper.
   */
  function planform(input) {
    var S = input.area != null && input.area !== "" ? toM2(input.area, input.areaUnit || "m2") : NaN;
    var b = input.span != null && input.span !== "" ? toM(input.span, input.spanUnit || "m") : NaN;
    var AR = input.aspectRatio != null && input.aspectRatio !== "" ? Number(input.aspectRatio) : NaN;
    var count = 0;
    if (isFiniteNumber(S)) count += 1;
    if (isFiniteNumber(b)) count += 1;
    if (isFiniteNumber(AR) && AR > 0) count += 1;
    if (count < 2) return null;
    if (isFiniteNumber(S) && isFiniteNumber(b)) AR = (b * b) / S;
    else if (isFiniteNumber(S) && isFiniteNumber(AR)) b = Math.sqrt(AR * S);
    else if (isFiniteNumber(b) && isFiniteNumber(AR)) S = (b * b) / AR;
    else return null;
    var taper = input.taper == null || input.taper === "" ? null : Number(input.taper);
    if (taper != null && (!isFiniteNumber(taper) || taper < 0 || taper > 1)) taper = null;
    var root = null, tip = null, mac = null;
    var chord = S / b;
    if (taper != null) {
      root = 2 * S / (b * (1 + taper));
      tip = root * taper;
      mac = (taper === 1)
        ? root
        : (2 / 3) * root * (1 + taper + taper * taper) / (1 + taper);
    }
    return {
      areaM2: S,
      spanM: b,
      aspectRatio: AR,
      taper: taper,
      meanChordM: chord,
      rootChordM: root,
      tipChordM: tip,
      macM: mac
    };
  }

  function compute(input) {
    if (!input) return null;
    var geo = planform(input);
    var W = input.weight != null && input.weight !== ""
      ? toNewtons(input.weight, input.weightUnit || "N")
      : NaN;
    if (!geo && !isFiniteNumber(W)) return null;

    var wingLoadingPa = null;
    if (geo && isFiniteNumber(W)) wingLoadingPa = W / geo.areaM2;

    var CLmax = input.CLmax == null || input.CLmax === "" ? null : Number(input.CLmax);
    if (CLmax != null && !(isFiniteNumber(CLmax) && CLmax > 0)) CLmax = null;

    var rho = input.rho == null || input.rho === "" ? RHO0 : Number(input.rho);
    if (!isFiniteNumber(rho) || rho <= 0) rho = RHO0;

    var vsMps = null;
    if (wingLoadingPa != null && CLmax != null) {
      vsMps = Math.sqrt(2 * wingLoadingPa / (rho * CLmax));
    }

    return {
      areaM2: geo ? geo.areaM2 : null,
      spanM: geo ? geo.spanM : null,
      aspectRatio: geo ? geo.aspectRatio : null,
      meanChordM: geo ? geo.meanChordM : null,
      taper: geo ? geo.taper : null,
      rootChordM: geo ? geo.rootChordM : null,
      tipChordM: geo ? geo.tipChordM : null,
      macM: geo ? geo.macM : null,
      weightN: isFiniteNumber(W) ? W : null,
      wingLoadingPa: wingLoadingPa,
      wingLoadingPsf: wingLoadingPa != null ? wingLoadingPa / PA_PER_PSF : null,
      wingLoadingKgM2: isFiniteNumber(W) && geo ? (W / G0) / geo.areaM2 : null,
      CLmax: CLmax,
      densityKgM3: rho,
      stallSpeedMps: vsMps,
      stallSpeedKt: vsMps != null ? vsMps / KT_MPS : null
    };
  }

  var api = {
    G0: G0,
    RHO0: RHO0,
    planform: planform,
    compute: compute
  };

  root.WingLoadingAspectRatioCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

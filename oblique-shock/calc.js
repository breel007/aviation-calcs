/**
 * Oblique shock for a perfect gas (default γ = 1.4), via the θ–β–M
 * relation and the equivalent normal-shock Mach number Mn1 = M1 sin β.
 *
 *   tan θ = 2 cot β (M1² sin²β − 1) / (M1² (γ + cos 2β) + 2)
 *
 * Given M1 and a turning angle θ below the maximum deflection, there
 * are two wave angles: a weak shock (the usual attached solution) and
 * a strong shock. The Mach angle μ = arcsin(1/M1) is the zero-deflection
 * (Mach-wave) limit; β = 90° is a normal shock (θ = 0 again).
 *
 * Downstream:
 *   Mn2 from the normal-shock identity on Mn1
 *   M2  = Mn2 / sin(β − θ)
 *   static and stagnation ratios from the normal-shock relations
 *
 * Sources: NACA Report 1135 (oblique-shock charts and the θ–β–M
 * equation); NASA Glenn; Anderson, Modern Compressible Flow. Downstream
 * ratios use the same normal-shock identities as this site's normal-
 * shock calculator.
 */
(function (root) {
  "use strict";

  var DEG = Math.PI / 180;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function machAngle(M) {
    if (!(M >= 1)) return NaN;
    return Math.asin(1 / M);
  }

  function thetaFromBeta(M, beta, gamma) {
    if (!(M > 1) || !(beta > 0) || beta >= Math.PI / 2) return NaN;
    var s = Math.sin(beta);
    var s2 = s * s;
    var num = 2 / Math.tan(beta) * (M * M * s2 - 1);
    var den = M * M * (gamma + Math.cos(2 * beta)) + 2;
    if (den === 0) return NaN;
    return Math.atan(num / den);
  }

  function normalRelations(Mn1, gamma) {
    var NS = root.NormalShockCalcs;
    if (NS && typeof NS.relations === "function") {
      return NS.relations(Mn1, gamma);
    }
    // Self-contained fallback, same identities as the normal-shock page.
    if (!(Mn1 >= 1) || !(gamma > 1)) return null;
    var gm1 = gamma - 1, gp1 = gamma + 1, M1sq = Mn1 * Mn1;
    var M2sq = (1 + 0.5 * gm1 * M1sq) / (gamma * M1sq - 0.5 * gm1);
    if (!(M2sq > 0)) return null;
    var P2_P1 = 1 + (2 * gamma / gp1) * (M1sq - 1);
    var rho2_rho1 = (gp1 * M1sq) / (gm1 * M1sq + 2);
    var T2_T1 = P2_P1 / rho2_rho1;
    var P02_P01 = Math.pow(rho2_rho1, gamma / gm1) * Math.pow(P2_P1, -1 / gm1);
    return { M2: Math.sqrt(M2sq), P2_P1: P2_P1, rho2_rho1: rho2_rho1, T2_T1: T2_T1, P02_P01: P02_P01 };
  }

  /**
   * Locate the β that maximizes θ for a given M (and the value of θ_max).
   */
  function maxDeflection(M, gamma) {
    var mu = machAngle(M);
    if (!isFiniteNumber(mu)) return null;
    var lo = mu + 1e-8, hi = Math.PI / 2 - 1e-8;
    // Golden-section maximize θ(β).
    var phi = (1 + Math.sqrt(5)) / 2;
    var c = hi - (hi - lo) / phi;
    var d = lo + (hi - lo) / phi;
    var i;
    for (i = 0; i < 80; i += 1) {
      var tc = thetaFromBeta(M, c, gamma);
      var td = thetaFromBeta(M, d, gamma);
      if (tc < td) lo = c;
      else hi = d;
      c = hi - (hi - lo) / phi;
      d = lo + (hi - lo) / phi;
      if (Math.abs(hi - lo) < 1e-14) break;
    }
    var beta = 0.5 * (lo + hi);
    var theta = thetaFromBeta(M, beta, gamma);
    return { beta: beta, theta: theta };
  }

  function solveBeta(M, theta, gamma, lo, hi) {
    var tLo = thetaFromBeta(M, lo, gamma);
    var tHi = thetaFromBeta(M, hi, gamma);
    // We want θ(β) - theta = 0. On the weak branch θ increases with β;
    // on the strong branch θ decreases with β.
    var flo = tLo - theta, fhi = tHi - theta;
    if (flo === 0) return lo;
    if (fhi === 0) return hi;
    if (flo * fhi > 0) return NaN;
    var a = lo, b = hi, fa = flo;
    var mid, i, fm;
    for (i = 0; i < 80; i += 1) {
      mid = 0.5 * (a + b);
      fm = thetaFromBeta(M, mid, gamma) - theta;
      if (Math.abs(fm) < 1e-15 || (b - a) < 1e-14) return mid;
      if (fa * fm <= 0) { b = mid; }
      else { a = mid; fa = fm; }
    }
    return mid;
  }

  function betasFromTheta(M, theta, gamma) {
    var mx = maxDeflection(M, gamma);
    if (!mx) return null;
    if (theta < -1e-12) return null;
    if (theta > mx.theta + 1e-10) {
      return { detached: true, thetaMax: mx.theta, betaMax: mx.beta };
    }
    var mu = machAngle(M);
    var weak = solveBeta(M, theta, gamma, mu + 1e-10, mx.beta);
    var strong = solveBeta(M, theta, gamma, mx.beta, Math.PI / 2 - 1e-10);
    if (theta <= 1e-14) {
      weak = mu;
      strong = Math.PI / 2;
    }
    return {
      detached: false,
      thetaMax: mx.theta,
      betaMax: mx.beta,
      weak: weak,
      strong: strong
    };
  }

  function stateFrom(M1, beta, theta, gamma) {
    var Mn1 = M1 * Math.sin(beta);
    if (!(Mn1 >= 1 - 1e-12)) return null;
    if (Mn1 < 1) Mn1 = 1;
    var ns = normalRelations(Mn1, gamma);
    if (!ns) return null;
    var Mn2 = ns.M2;
    var M2 = Mn2 / Math.sin(beta - theta);
    return {
      beta: beta,
      betaDeg: beta / DEG,
      Mn1: Mn1,
      Mn2: Mn2,
      M2: M2,
      P2_P1: ns.P2_P1,
      T2_T1: ns.T2_T1,
      rho2_rho1: ns.rho2_rho1,
      P02_P01: ns.P02_P01
    };
  }

  function compute(input) {
    if (!input) return null;
    var gamma = input.gamma == null || input.gamma === "" ? 1.4 : Number(input.gamma);
    if (!isFiniteNumber(gamma) || gamma <= 1 || gamma >= 3) return null;
    var M1 = Number(input.M1);
    if (!isFiniteNumber(M1) || M1 <= 1) return null;

    var mode = input.mode || "theta";
    var mx = maxDeflection(M1, gamma);
    var mu = machAngle(M1);
    var result = {
      M1: M1,
      gamma: gamma,
      machAngleDeg: mu / DEG,
      thetaMaxDeg: mx ? mx.theta / DEG : null,
      betaAtThetaMaxDeg: mx ? mx.beta / DEG : null
    };

    if (mode === "beta") {
      var betaDeg = Number(input.beta);
      if (!isFiniteNumber(betaDeg)) return null;
      var beta = betaDeg * DEG;
      if (beta < mu - 1e-8 || beta > Math.PI / 2 + 1e-8) return null;
      if (beta < mu) beta = mu;
      if (beta > Math.PI / 2) beta = Math.PI / 2;
      var theta = thetaFromBeta(M1, beta, gamma);
      if (beta === Math.PI / 2) theta = 0;
      var st = stateFrom(M1, beta, theta, gamma);
      if (!st) return null;
      st.thetaDeg = theta / DEG;
      result.branch = Math.abs(beta - Math.PI / 2) < 1e-8 ? "normal" : (mx && beta <= mx.beta + 1e-10 ? "weak" : "strong");
      result.weak = mx && beta <= mx.beta + 1e-10 ? st : null;
      result.strong = mx && beta > mx.beta + 1e-10 ? st : null;
      if (result.branch === "normal") result.strong = st;
      result.chosen = st;
      result.detached = false;
      return result;
    }

    var thetaDeg = Number(input.theta);
    if (!isFiniteNumber(thetaDeg) || thetaDeg < 0) return null;
    var theta = thetaDeg * DEG;
    var br = betasFromTheta(M1, theta, gamma);
    if (!br) return null;
    result.detached = br.detached;
    if (br.detached) return result;
    result.weak = stateFrom(M1, br.weak, theta, gamma);
    result.strong = stateFrom(M1, br.strong, theta, gamma);
    if (result.weak) result.weak.thetaDeg = thetaDeg;
    if (result.strong) result.strong.thetaDeg = thetaDeg;
    result.chosen = result.weak;
    return result;
  }

  var api = {
    machAngle: machAngle,
    thetaFromBeta: thetaFromBeta,
    maxDeflection: maxDeflection,
    betasFromTheta: betasFromTheta,
    compute: compute
  };
  root.ObliqueShockCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

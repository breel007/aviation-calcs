/**
 * Point of no return (PNR) and equal-time point (ETP / critical point).
 *
 * With outbound groundspeed O and homebound (return) groundspeed H,
 * and a safe endurance E (hours):
 *
 *   Distance to the PNR (from departure, return to departure):
 *     d_PNR = E × O × H / (O + H)
 *     t_out = E × H / (O + H)
 *
 * Equal-time point between A and B, total distance D:
 *     d_ETP from A = D × H / (O + H)
 *   Time from the ETP back to A equals time from the ETP on to B.
 *
 * Groundspeeds may be entered directly, or as a TAS and a wind component
 * (positive tailwind on the outbound leg, so O = TAS + wc, H = TAS − wc).
 *
 * Sources: FAA Pilot's Handbook of Aeronautical Knowledge (flight
 * planning, wind); classical equal-time-point / point-of-no-return
 * identities used in long-range and ETOPS-style planning; AIM / instrument
 * flight-planning practice. This is a planning identity, not an ETOPS
 * or fuel-reserve legal calculation.
 */
(function (root) {
  "use strict";

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function speeds(input) {
    var O, H;
    if (input.speedMode === "tas-wind") {
      var tas = Number(input.tas);
      var wc = Number(input.windComponent); // + outbound tailwind
      if (!isFiniteNumber(tas) || tas <= 0 || !isFiniteNumber(wc)) return null;
      O = tas + wc;
      H = tas - wc;
    } else {
      O = Number(input.outboundGs);
      H = Number(input.homeboundGs);
    }
    if (!isFiniteNumber(O) || !isFiniteNumber(H) || O <= 0 || H <= 0) return null;
    return { outbound: O, homebound: H };
  }

  /**
   * input.mode: "pnr" | "etp"
   * Speeds via speeds()
   * pnr: input.enduranceHours  (or input.enduranceMin)
   * etp: input.totalDistance
   */
  function compute(input) {
    if (!input) return null;
    var s = speeds(input);
    if (!s) return null;
    var O = s.outbound, H = s.homebound;
    var mode = input.mode || "pnr";

    if (mode === "etp") {
      var D = Number(input.totalDistance);
      if (!isFiniteNumber(D) || D <= 0) return null;
      var d = D * H / (O + H);
      var tToA = d / H;
      var tToB = (D - d) / O;
      return {
        mode: "etp",
        outboundGs: O,
        homeboundGs: H,
        totalDistance: D,
        distanceFromA: d,
        distanceFromB: D - d,
        timeToAHours: tToA,
        timeToBHours: tToB,
        timeToAMin: tToA * 60,
        timeToBMin: tToB * 60,
        stillAirMidpoint: D / 2
      };
    }

    var E;
    if (input.enduranceHours != null && input.enduranceHours !== "") {
      E = Number(input.enduranceHours);
    } else if (input.enduranceMin != null && input.enduranceMin !== "") {
      E = Number(input.enduranceMin) / 60;
    } else {
      return null;
    }
    if (!isFiniteNumber(E) || E <= 0) return null;

    var dPnr = E * O * H / (O + H);
    var tOut = E * H / (O + H);
    var tBack = E * O / (O + H);
    return {
      mode: "pnr",
      outboundGs: O,
      homeboundGs: H,
      enduranceHours: E,
      enduranceMin: E * 60,
      distance: dPnr,
      timeOutHours: tOut,
      timeOutMin: tOut * 60,
      timeBackHours: tBack,
      timeBackMin: tBack * 60,
      stillAirDistance: E * ((O + H) / 2) / 2, // 0.5 E * TAS if O+H = 2 TAS
      stillAirTimeHours: E / 2
    };
  }

  var api = {
    speeds: speeds,
    compute: compute
  };

  root.PointOfNoReturnCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

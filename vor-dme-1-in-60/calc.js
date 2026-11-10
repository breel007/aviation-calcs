/**
 * VOR / DME and 1-in-60 rule aviation math.
 *
 * The 1-in-60 rule: one degree of angular offset subtends about one unit
 * of arc in sixty units of distance (true factor is 2π/360 ≈ 1/57.3).
 *   offset ≈ distance × degrees / 60
 * Exact small-circle / radial offset: offset = distance × sin(degrees).
 *
 * Time to the station from a bearing change:
 *   tts_min = 60 × (time between bearings, min) / (degrees of change)
 *   distance_NM = groundspeed_kt × tts_hr
 *
 * DME slant range:
 *   horizontal_NM = √( DME² − (height_ft / FT_PER_NM)² )
 *
 * Lead radial / lead distance for a turn to join a course:
 *   radius_NM from TAS and bank (or a standard-rate turn),
 *   lead distance ≈ radius,  lead angle ≈ atan(radius / distance) (deg).
 *
 * Sources: FAA Pilot's Handbook of Aeronautical Knowledge (1-in-60,
 * Chapter 16); FAA Instrument Flying Handbook (DME, VOR, time-to-station,
 * lead radial); AIM navigation.
 */
(function (root) {
  "use strict";

  var FT_PER_NM = 6076.11548556;
  var G = 9.80665;
  var KT_MPS = 1852 / 3600;
  var DEG = Math.PI / 180;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function offsetNm(distanceNm, degrees) {
    return distanceNm * Math.sin(degrees * DEG);
  }

  function offsetRuleNm(distanceNm, degrees) {
    return distanceNm * degrees / 60;
  }

  function degreesForOffset(distanceNm, offsetNmVal) {
    if (!(distanceNm > 0)) return NaN;
    var x = offsetNmVal / distanceNm;
    if (x < -1 || x > 1) return NaN;
    return Math.asin(x) / DEG;
  }

  function timeToStationMin(elapsedMin, degreesChanged) {
    if (!(Math.abs(degreesChanged) > 0)) return NaN;
    return 60 * elapsedMin / Math.abs(degreesChanged);
  }

  function slantHorizontalNm(dmeNm, heightFt) {
    var hNm = heightFt / FT_PER_NM;
    if (dmeNm * dmeNm < hNm * hNm) return NaN;
    return Math.sqrt(dmeNm * dmeNm - hNm * hNm);
  }

  function turnRadiusNm(tasKt, bankDeg) {
    if (!(tasKt > 0) || !(bankDeg > 0) || bankDeg >= 90) return NaN;
    var v = tasKt * KT_MPS;
    var rM = (v * v) / (G * Math.tan(bankDeg * DEG));
    return rM / 1852;
  }

  function standardRateBank(tasKt) {
    if (!(tasKt > 0)) return NaN;
    var v = tasKt * KT_MPS;
    var omega = 3 * DEG; // 3°/s
    return Math.atan(omega * v / G) / DEG;
  }

  /**
   * input.mode: "offset" | "time-to-station" | "slant" | "lead"
   */
  function compute(input) {
    if (!input) return null;
    var mode = input.mode || "offset";

    if (mode === "offset") {
      var dist = Number(input.distanceNm);
      var deg = Number(input.degrees);
      if (!isFiniteNumber(dist) || dist < 0 || !isFiniteNumber(deg)) return null;
      var exact = offsetNm(dist, deg);
      var thumb = offsetRuleNm(dist, deg);
      return {
        mode: mode,
        distanceNm: dist,
        degrees: deg,
        offsetNm: exact,
        offsetRuleNm: thumb,
        offsetFt: exact * FT_PER_NM,
        offsetRuleFt: thumb * FT_PER_NM,
        headingChangeToParallel: deg,
        interceptSuggestion: Math.min(90, Math.max(20, 2 * Math.abs(deg)))
      };
    }

    if (mode === "time-to-station") {
      var elapsed = Number(input.elapsedMin);
      var ddeg = Number(input.degreesChanged);
      var gs = input.groundspeedKt == null || input.groundspeedKt === "" ? null : Number(input.groundspeedKt);
      var tts = timeToStationMin(elapsed, ddeg);
      if (!isFiniteNumber(tts) || tts < 0) return null;
      var distNm = isFiniteNumber(gs) && gs > 0 ? gs * tts / 60 : null;
      return {
        mode: mode,
        elapsedMin: elapsed,
        degreesChanged: ddeg,
        timeToStationMin: tts,
        groundspeedKt: isFiniteNumber(gs) && gs > 0 ? gs : null,
        distanceNm: distNm
      };
    }

    if (mode === "slant") {
      var dme = Number(input.dmeNm);
      var alt = Number(input.heightFt);
      if (!isFiniteNumber(dme) || dme < 0 || !isFiniteNumber(alt) || alt < 0) return null;
      var horiz = slantHorizontalNm(dme, alt);
      if (!isFiniteNumber(horiz)) {
        return { mode: mode, dmeNm: dme, heightFt: alt, error: "Slant range is shorter than the height. Check the DME and altitude." };
      }
      return {
        mode: mode,
        dmeNm: dme,
        heightFt: alt,
        heightNm: alt / FT_PER_NM,
        horizontalNm: horiz,
        slantErrorNm: dme - horiz,
        slantErrorFt: (dme - horiz) * FT_PER_NM
      };
    }

    if (mode === "lead") {
      var dist2 = Number(input.distanceNm);
      var tas = Number(input.tasKt);
      var bank = input.bankDeg == null || input.bankDeg === "" ? null : Number(input.bankDeg);
      var useStd = input.standardRate === true || bank == null;
      if (!isFiniteNumber(dist2) || dist2 <= 0 || !isFiniteNumber(tas) || tas <= 0) return null;
      var bankUsed = useStd ? standardRateBank(tas) : bank;
      if (!isFiniteNumber(bankUsed) || bankUsed <= 0) return null;
      var rNm = turnRadiusNm(tas, bankUsed);
      var leadDeg = Math.atan(rNm / dist2) / DEG;
      var leadDegRule = (rNm / dist2) * (180 / Math.PI); // same as atan for small, actually we use atan
      return {
        mode: mode,
        distanceNm: dist2,
        tasKt: tas,
        bankDeg: bankUsed,
        standardRate: useStd,
        turnRadiusNm: rNm,
        leadDeg: leadDeg,
        leadDistanceNm: rNm
      };
    }

    return null;
  }

  var api = {
    FT_PER_NM: FT_PER_NM,
    offsetNm: offsetNm,
    offsetRuleNm: offsetRuleNm,
    degreesForOffset: degreesForOffset,
    timeToStationMin: timeToStationMin,
    slantHorizontalNm: slantHorizontalNm,
    turnRadiusNm: turnRadiusNm,
    standardRateBank: standardRateBank,
    compute: compute
  };

  root.VorDmeCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

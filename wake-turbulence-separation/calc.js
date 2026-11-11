/**
 * FAA AIM 7-4-9 wake-turbulence separation look-up (legacy U.S. weight
 * classes: Super, Heavy, B757, Large, Small).
 *
 * This is a reference table for the minima published in AIM 7-4-9, not
 * a substitute for ATC instructions, and not the RECAT (FAA Order JO
 * 7110.126) or ICAO wake-category scheme used at some facilities.
 *
 * Weight classes (Pilot/Controller Glossary):
 *   Small  — 41,000 lb or less MTOW
 *   Large  — more than 41,000 lb and less than 300,000 lb
 *   Heavy  — 300,000 lb or more
 *   Super  — Airbus A380-800 and Antonov An-225 (type, not a weight)
 *   B757   — treated separately from other Large airplanes in 7-4-9
 *
 * Same-altitude (or slightly below) radar / in-trail, 7-4-9 a1:
 *   Heavy behind Super 5 NM; Large behind Super 7; Small behind Super 8;
 *   Heavy behind Heavy 3; Small or Large behind Heavy 5; Small behind
 *   B757 4.
 * Landing threshold, small follower only, 7-4-9 a2:
 *   Small behind Heavy 6 NM; Small behind Large (non-B757) 4 NM.
 * Same-threshold departure, 7-4-9 b (not waivable):
 *   behind Super 3 min; behind Heavy 2 min; Small behind B757 2 min.
 * Intersection / opposite-direction, 7-4-9 c–e:
 *   Small behind Large (except B757) 3 min, waivable (c);
 *   Small behind B757 3 min, not waivable (d);
 *   any aircraft behind Super 4 min, behind Heavy 3 min, not waivable (e).
 *
 * Sources: FAA Aeronautical Information Manual 7-4-9, Air Traffic Wake
 * Turbulence Separations; AIM 7-4 (wake turbulence); Pilot/Controller
 * Glossary, Aircraft Classes; 14 CFR 91.3 (pilot authority).
 */
(function (root) {
  "use strict";

  var CLASSES = ["super", "heavy", "b757", "large", "small"];

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function classFromWeight(lb, isSuperType, isB757) {
    if (isSuperType) return "super";
    if (isB757) return "b757";
    if (!isFiniteNumber(lb) || lb <= 0) return null;
    if (lb >= 300000) return "heavy";
    if (lb > 41000) return "large";
    return "small";
  }

  function lookup(leader, follower, scenario) {
    var L = leader, F = follower, s = scenario;
    if (CLASSES.indexOf(L) < 0 || CLASSES.indexOf(F) < 0) return null;

    if (s === "radar-in-trail") {
      if (L === "super" && F === "heavy") return { nm: 5, note: "AIM 7-4-9 a1(a)", waivable: false };
      if (L === "super" && F === "large") return { nm: 7, note: "AIM 7-4-9 a1(b)", waivable: false };
      if (L === "super" && F === "small") return { nm: 8, note: "AIM 7-4-9 a1(c)", waivable: false };
      if (L === "heavy" && F === "heavy") return { nm: 3, note: "AIM 7-4-9 a1(d)", waivable: false };
      if (L === "heavy" && (F === "small" || F === "large" || F === "b757")) {
        return { nm: 5, note: "AIM 7-4-9 a1(e) Small/Large behind Heavy", waivable: false };
      }
      if (L === "b757" && F === "small") return { nm: 4, note: "AIM 7-4-9 a1(f)", waivable: false };
      return { nm: null, minutes: null, note: "No additional AIM 7-4-9 a1 wake minimum for this pair (standard radar separation may still apply).", waivable: null };
    }

    if (s === "landing-threshold") {
      if (F === "small" && L === "heavy") return { nm: 6, note: "AIM 7-4-9 a2(a), measured when the leader is over the landing threshold", waivable: false };
      if (F === "small" && L === "large") return { nm: 4, note: "AIM 7-4-9 a2(b) Small behind Large, non-B757", waivable: false };
      if (F === "small" && L === "super") {
        return { nm: 8, note: "AIM 7-4-9 a2 does not list Super separately; the typical in-trail a1(c) value of 8 NM is shown. Confirm with ATC / the facility.", waivable: false, inferred: true };
      }
      if (F === "small" && L === "b757") {
        return { nm: null, minutes: null, note: "AIM 7-4-9 a2 does not list a Small-behind-B757 landing-threshold value (a1(f) in-trail is 4 NM). JO 7110.65 terminal landing figures can differ — use ATC.", waivable: null };
      }
      return { nm: null, minutes: null, note: "AIM 7-4-9 a2 lists landing-threshold miles only for a Small follower. Other pairs use the in-trail table or standard separation.", waivable: null };
    }

    if (s === "same-threshold-departure") {
      if (L === "super") return { minutes: 3, note: "AIM 7-4-9 b1, same threshold (or close parallels as described). Controllers may not reduce or waive.", waivable: false };
      if (L === "heavy") return { minutes: 2, note: "AIM 7-4-9 b2. Controllers may not reduce or waive.", waivable: false };
      if (L === "b757" && F === "small") return { minutes: 2, note: "AIM 7-4-9 b3 Small behind B757. Controllers may not reduce or waive.", waivable: false };
      return { minutes: null, note: "No additional AIM 7-4-9 b wake time for this pair (standard runway separation may still apply).", waivable: null };
    }

    if (s === "intersection-departure" || s === "opposite-direction") {
      var where = s === "intersection-departure"
        ? "intersection departure, same or opposite direction"
        : "opposite-direction departure or behind a low/missed approach";
      if (L === "super") return { minutes: 4, note: "AIM 7-4-9 e, " + where + " behind Super. Controllers may not reduce or waive.", waivable: false };
      if (L === "heavy") return { minutes: 3, note: "AIM 7-4-9 e, " + where + " behind Heavy. Controllers may not reduce or waive.", waivable: false };
      if (L === "b757" && F === "small") return { minutes: 3, note: "AIM 7-4-9 d, " + where + " behind B757. This 3-minute interval may not be waived.", waivable: false };
      if (L === "large" && F === "small") return { minutes: 3, note: "AIM 7-4-9 c, " + where + " behind a Large (except B757). This 3-minute interval may be waived upon specific pilot request.", waivable: true };
      return { minutes: null, note: "No additional AIM 7-4-9 c–e wake time for this pair.", waivable: null };
    }
    return null;
  }

  function compute(input) {
    if (!input) return null;
    var leader = input.leader, follower = input.follower;
    if ((!leader || leader === "") && isFiniteNumber(Number(input.leaderWeightLb))) {
      leader = classFromWeight(Number(input.leaderWeightLb), input.leaderIsSuper, input.leaderIsB757);
    }
    if ((!follower || follower === "") && isFiniteNumber(Number(input.followerWeightLb))) {
      follower = classFromWeight(Number(input.followerWeightLb), input.followerIsSuper, input.followerIsB757);
    }
    if (!leader || !follower) return null;
    var scenario = input.scenario || "same-threshold-departure";
    var row = lookup(leader, follower, scenario);
    if (!row) return null;
    return {
      leader: leader,
      follower: follower,
      scenario: scenario,
      nm: row.nm == null ? null : row.nm,
      minutes: row.minutes == null ? null : row.minutes,
      waivable: row.waivable,
      note: row.note,
      inferred: !!row.inferred,
      source: "AIM 7-4-9"
    };
  }

  var api = { CLASSES: CLASSES, classFromWeight: classFromWeight, lookup: lookup, compute: compute };
  root.WakeTurbulenceSeparationCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

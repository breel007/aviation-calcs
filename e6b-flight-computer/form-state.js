/**
 * Solve-for field state for the E6B forms (no DOM globals; testable in node).
 * The field being solved for is read-only, styled as the answer, and gets
 * the computed value written back after Solve — same idea as the
 * standalone time–speed–distance page.
 */
(function (root) {
  "use strict";

  // mode -> solve group -> { solveFor: [field ids] }
  var SOLVE = {
    tsd: {
      group: "tsd-solve",
      fallback: "distance",
      fields: {
        speed: ["tsd-speed"],
        time: ["tsd-hours", "tsd-minutes"],
        distance: ["tsd-distance"]
      }
    },
    fuel: {
      group: "fuel-solve",
      fallback: "fuel",
      fields: {
        rate: ["fuel-rate"],
        time: ["fuel-hours", "fuel-minutes"],
        fuel: ["fuel-qty"]
      }
    },
    offcourse: {
      group: "oc-solve",
      fallback: "distanceOff",
      fields: {
        distanceFlown: ["oc-flown"],
        degreesOff: ["oc-deg"],
        distanceOff: ["oc-off"]
      }
    }
  };

  function trim(n, digits) {
    if (typeof n !== "number" || !isFinite(n)) return "";
    var s = n.toFixed(digits);
    if (digits > 0) s = s.replace(/\.?0+$/, "");
    if (s === "-0") s = "0";
    return s;
  }

  function solvedIds(mode, solveFor) {
    var cfg = SOLVE[mode];
    if (!cfg) return [];
    return (cfg.fields[solveFor] || []).slice();
  }

  function allIds(mode) {
    var cfg = SOLVE[mode];
    if (!cfg) return [];
    var out = [];
    Object.keys(cfg.fields).forEach(function (k) {
      cfg.fields[k].forEach(function (id) { out.push(id); });
    });
    return out;
  }

  // Values to write back into the solved field(s), keyed by input id.
  function outputValues(mode, result) {
    if (!result || result.error) return {};
    var sf = result.solveFor;
    var out = {};
    function time(hId, mId) {
      if (!result.time) return;
      out[hId] = String(result.time.hours);
      out[mId] = trim(result.time.minutes, 1);
    }
    if (mode === "tsd") {
      if (sf === "distance") out["tsd-distance"] = trim(result.distance, 2);
      else if (sf === "speed") out["tsd-speed"] = trim(result.speed, 2);
      else if (sf === "time") time("tsd-hours", "tsd-minutes");
    } else if (mode === "fuel") {
      // solveFuel maps fuel→distance, rate→speed internally.
      if (sf === "distance") out["fuel-qty"] = trim(result.fuel, 2);
      else if (sf === "speed") out["fuel-rate"] = trim(result.rate, 2);
      else if (sf === "time") time("fuel-hours", "fuel-minutes");
    } else if (mode === "offcourse") {
      if (sf === "distanceOff") out["oc-off"] = trim(result.distanceOff, 2);
      else if (sf === "degreesOff") out["oc-deg"] = trim(result.degreesOff, 1);
      else if (sf === "distanceFlown") out["oc-flown"] = trim(result.distanceFlown, 2);
    }
    return out;
  }

  // Mark the solved field(s) read-only + .is-solved; free the others.
  // opts.clearSolved empties the newly solved fields (used when the user
  // switches "Solve for", so a stale typed input is not shown as an answer).
  function applySolvedState(doc, mode, solveFor, opts) {
    opts = opts || {};
    var solved = solvedIds(mode, solveFor);
    allIds(mode).forEach(function (id) {
      var el = doc.getElementById(id);
      if (!el) return;
      var on = solved.indexOf(id) !== -1;
      var was = !!el.readOnly;
      el.readOnly = on;
      if (el.classList) el.classList.toggle("is-solved", on);
      if (el.setAttribute) {
        if (on) el.setAttribute("aria-readonly", "true");
        else if (el.removeAttribute) el.removeAttribute("aria-readonly");
      }
      if (on) {
        el.placeholder = "Solved — press Solve";
        if (opts.clearSolved && !was) el.value = "";
      } else {
        el.placeholder = "";
      }
    });
    return solved;
  }

  function writeOutputs(doc, mode, result) {
    var vals = outputValues(mode, result);
    Object.keys(vals).forEach(function (id) {
      var el = doc.getElementById(id);
      if (el) el.value = vals[id];
    });
    return vals;
  }

  var api = {
    SOLVE: SOLVE,
    solvedIds: solvedIds,
    allIds: allIds,
    outputValues: outputValues,
    applySolvedState: applySolvedState,
    writeOutputs: writeOutputs
  };
  root.E6BFormState = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : this);

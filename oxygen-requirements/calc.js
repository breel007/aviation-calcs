/**
 * Supplemental-oxygen requirements and time of useful consciousness.
 *
 * Regulatory logic is taken from the public text of:
 *   14 CFR 91.211  (general aviation, unpressurized and pressurized)
 *   14 CFR 135.89  (commuter / on-demand, flight crew)
 *   14 CFR 121.327, 121.329, 121.333  (air carrier supplemental oxygen)
 *
 * Time of useful consciousness (TUC) values are the published FAA / Civil
 * Aerospace Medical Institute ranges for a sudden exposure at the given
 * cabin altitude (typical, mild activity). This page reports the bracket
 * from that table; it does not invent a precise physiological model.
 *
 * FAA TUC table (cabin altitude → useful consciousness):
 *    18,000 ft    20–30 min
 *    22,000 ft    10 min
 *    25,000 ft     3–5 min
 *    28,000 ft     2.5–3 min
 *    30,000 ft     1–2 min
 *    35,000 ft    30–60 s
 *    40,000 ft    15–20 s
 *    43,000 ft     9–12 s
 *    50,000 ft     9–12 s
 *
 * Sources: 14 CFR 91.211, 135.89, 121.327–121.333; FAA Pilot's Handbook
 * of Aeronautical Knowledge, Chapter 17 (aeromedical / hypoxia); FAA
 * Civil Aerospace Medical Institute hypoxia guidance (TUC table).
 */
(function (root) {
  "use strict";

  // Cabin altitude (ft) and a published TUC string. Midpoint seconds is
  // used only to pick the nearest table row, never as a precise prediction.
  var TUC_TABLE = [
    { alt: 18000, label: "20–30 minutes", loS: 20 * 60, hiS: 30 * 60 },
    { alt: 22000, label: "10 minutes", loS: 10 * 60, hiS: 10 * 60 },
    { alt: 25000, label: "3–5 minutes", loS: 3 * 60, hiS: 5 * 60 },
    { alt: 28000, label: "2.5–3 minutes", loS: 150, hiS: 180 },
    { alt: 30000, label: "1–2 minutes", loS: 60, hiS: 120 },
    { alt: 35000, label: "30–60 seconds", loS: 30, hiS: 60 },
    { alt: 40000, label: "15–20 seconds", loS: 15, hiS: 20 },
    { alt: 43000, label: "9–12 seconds", loS: 9, hiS: 12 },
    { alt: 50000, label: "9–12 seconds", loS: 9, hiS: 12 }
  ];

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function tucFor(cabinFt) {
    if (!isFiniteNumber(cabinFt) || cabinFt < 0) return null;
    if (cabinFt < 15000) {
      return {
        cabinFt: cabinFt,
        label: "Typically many minutes to hours at this cabin altitude; hypoxia can still develop, especially at night or with smoking or illness.",
        belowTable: true,
        nearestAlt: null
      };
    }
    if (cabinFt < 18000) {
      return {
        cabinFt: cabinFt,
        label: "Longer than the 20–30 minutes published at 18,000 ft; still a hypoxia risk. The FAA TUC table begins at 18,000 ft.",
        belowTable: true,
        nearestAlt: 18000
      };
    }
    // Nearest published row (no interpolation of the physiology).
    var best = TUC_TABLE[0];
    var bestD = Math.abs(cabinFt - best.alt);
    for (var i = 1; i < TUC_TABLE.length; i++) {
      var d = Math.abs(cabinFt - TUC_TABLE[i].alt);
      if (d < bestD) { best = TUC_TABLE[i]; bestD = d; }
    }
    // If between two rows, also mention the neighbors.
    var lo = TUC_TABLE[0], hi = TUC_TABLE[TUC_TABLE.length - 1];
    for (var j = 0; j < TUC_TABLE.length - 1; j++) {
      if (cabinFt >= TUC_TABLE[j].alt && cabinFt <= TUC_TABLE[j + 1].alt) {
        lo = TUC_TABLE[j];
        hi = TUC_TABLE[j + 1];
        break;
      }
      if (cabinFt > TUC_TABLE[j + 1].alt) {
        lo = TUC_TABLE[j + 1];
        hi = TUC_TABLE[j + 1];
      }
    }
    var between = lo !== hi && cabinFt !== lo.alt && cabinFt !== hi.alt;
    return {
      cabinFt: cabinFt,
      label: best.label,
      nearestAlt: best.alt,
      belowTable: false,
      between: between
        ? ("Between the published " + lo.alt.toLocaleString("en-US") + " ft value (" + lo.label +
           ") and the " + hi.alt.toLocaleString("en-US") + " ft value (" + hi.label + ").")
        : null,
      lo: lo,
      hi: hi
    };
  }

  function req91(cabinFt, durationMin, pressurized, flightAltFt) {
    var notes = [];
    var crewRequired = false;
    var crewAfter30 = false;
    var occupantsProvided = false;
    var pressurizedNotes = [];

    if (cabinFt > 15000) {
      crewRequired = true;
      occupantsProvided = true;
      notes.push("91.211(a)(3): at cabin pressure altitudes above 15,000 ft MSL, each occupant must be provided with supplemental oxygen.");
      notes.push("91.211(a)(2): the required minimum flight crew must be provided with and use supplemental oxygen for the entire time at cabin altitudes above 14,000 ft.");
    } else if (cabinFt > 14000) {
      crewRequired = true;
      notes.push("91.211(a)(2): at cabin pressure altitudes above 14,000 ft MSL, the required minimum flight crew must be provided with and use supplemental oxygen during the entire flight time at those altitudes.");
    } else if (cabinFt > 12500) {
      if (durationMin > 30) {
        crewRequired = true;
        notes.push("91.211(a)(1): at cabin pressure altitudes above 12,500 up to and including 14,000 ft MSL, the required minimum flight crew must use supplemental oxygen for that part of the flight at those altitudes that is of more than 30 minutes duration. Your entered time is " + durationMin + " min.");
      } else {
        crewAfter30 = true;
        notes.push("91.211(a)(1): crew oxygen is required only after 30 minutes at cabin altitudes above 12,500 through 14,000 ft. Your entered time is " + durationMin + " min, so the 30-minute threshold has not been reached.");
      }
    } else {
      notes.push("91.211(a) does not require supplemental oxygen at cabin pressure altitudes of 12,500 ft MSL or below. Hypoxia is still possible; night vision is degraded well below this altitude.");
    }

    if (pressurized && isFiniteNumber(flightAltFt)) {
      if (flightAltFt > 35000) {
        pressurizedNotes.push("91.211(b): above FL350 in a pressurized airplane, at least one pilot at the controls must wear an oxygen mask (with the usual quick-donning exceptions as written in the rule, which tighten further above FL410).");
      } else if (flightAltFt > 25000) {
        pressurizedNotes.push("91.211(b): above FL250 in a pressurized airplane, a 10-minute supplemental-oxygen supply must be available for each occupant, for a descent; and each flight-crew member on flight deck duty must have a quick-donning mask (ready within 5 seconds). Read the current text of 91.211(b) for the exact conditions.");
      }
    }
    return {
      part: "91",
      crewMustUse: crewRequired,
      crewAfter30: crewAfter30,
      occupantsProvided: occupantsProvided,
      notes: notes,
      pressurizedNotes: pressurizedNotes
    };
  }

  function req135(cabinFt, durationMin) {
    var notes = [];
    var pilotMustUse = false;
    var after30 = false;
    // 135.89 Pilot requirements: unpressurized (and cabin altitude in pressurized).
    if (cabinFt > 12000) {
      pilotMustUse = true;
      notes.push("135.89: at cabin pressure altitudes above 12,000 ft, each pilot at the flight controls must use supplemental oxygen continuously.");
    } else if (cabinFt > 10000) {
      if (durationMin > 30) {
        pilotMustUse = true;
        notes.push("135.89: at cabin pressure altitudes above 10,000 through 12,000 ft, each pilot at the controls must use oxygen for that part of the flight at those altitudes that is of more than 30 minutes duration.");
      } else {
        after30 = true;
        notes.push("135.89: pilot oxygen is required after 30 minutes at cabin altitudes above 10,000 through 12,000 ft. Your entered time is " + durationMin + " min.");
      }
    } else {
      notes.push("135.89 does not require the pilot to use oxygen at cabin pressure altitudes of 10,000 ft or below.");
    }
    return { part: "135", crewMustUse: pilotMustUse, crewAfter30: after30, notes: notes };
  }

  function req121(cabinFt, durationMin) {
    var notes = [];
    // 121.329 unpressurized / cabin altitude perspective.
    if (cabinFt > 15000) {
      notes.push("121.329(c)(3): at cabin pressure altitudes above 15,000 ft, oxygen must be provided to and used by each occupant.");
    } else if (cabinFt > 14000) {
      notes.push("121.329(c)(2): at cabin pressure altitudes above 14,000 ft, oxygen must be provided for each occupant (the 30-minute exception does not apply above 14,000).");
    } else if (cabinFt > 10000) {
      if (durationMin > 30) {
        notes.push("121.329(c)(1): at cabin pressure altitudes above 10,000 through 14,000 ft, oxygen must be provided for that part of the flight at those altitudes that is of more than 30 minutes duration, for each occupant.");
      } else {
        notes.push("121.329(c)(1): the 30-minute threshold for providing occupant oxygen between 10,000 and 14,000 ft has not been reached at your entered time of " + durationMin + " min.");
      }
    } else {
      notes.push("121.329(c) does not require the 10,000-ft supplemental-oxygen provision at cabin altitudes of 10,000 ft or below.");
    }
    notes.push("121.333 adds pressurized-cabin descent and mask-deployment requirements above FL250 (including a 10-minute supply and, at higher flight levels, mask discipline for the flight crew). Check the current rule for the airplane and flight level.");
    return { part: "121", notes: notes };
  }

  /**
   * input.cabinAltitudeFt  (required)
   * input.durationMin      (default 0; time at that cabin altitude)
   * input.pressurized      (boolean)
   * input.flightAltitudeFt (for 91.211(b) notes)
   */
  function compute(input) {
    if (!input) return null;
    var cabin = Number(input.cabinAltitudeFt);
    if (!isFiniteNumber(cabin) || cabin < 0 || cabin > 80000) return null;
    var duration = input.durationMin == null || input.durationMin === "" ? 0 : Number(input.durationMin);
    if (!isFiniteNumber(duration) || duration < 0) return null;
    var pressurized = input.pressurized === true;
    var flightAlt = input.flightAltitudeFt == null || input.flightAltitudeFt === ""
      ? (pressurized ? null : cabin)
      : Number(input.flightAltitudeFt);
    if (flightAlt != null && !isFiniteNumber(flightAlt)) flightAlt = null;

    return {
      cabinAltitudeFt: cabin,
      durationMin: duration,
      pressurized: pressurized,
      flightAltitudeFt: flightAlt,
      tuc: tucFor(cabin),
      part91: req91(cabin, duration, pressurized, flightAlt),
      part135: req135(cabin, duration),
      part121: req121(cabin, duration)
    };
  }

  var api = {
    TUC_TABLE: TUC_TABLE,
    tucFor: tucFor,
    compute: compute
  };

  root.OxygenRequirementsCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

/**
 * Flight training cost estimator: private, instrument, commercial, CFI.
 *
 * Flight cost  = dual hours × (aircraft wet rate + instructor rate)
 *              + solo hours × aircraft wet rate
 * Ground cost  = ground instruction hours × instructor rate
 * Fixed items  = ground school / home-study course, FAA knowledge test,
 *                DPE checkride fee, checkride aircraft time,
 *                headset & materials, medical exam.
 *
 * Hour presets: FAA minimums (14 CFR 61.109, 61.65, 61.129, 61.183 /
 * Part 141 appendices) vs a commonly cited national average.
 * The "average" figures are planning estimates, not FAA data.
 */
(function (root) {
  "use strict";

  /**
   * Presets. Times are flight hours.
   *   dual = with instructor, solo = solo or PIC time you pay aircraft only.
   * For instrument and commercial, part of the requirement is PIC/solo
   * time a pilot may already have; the preset assumes typical additional
   * time to buy from where most people start that rating.
   */
  var CERTS = {
    private: {
      label: "Private pilot (PPL)",
      part61Min: { dual: 20, solo: 20, ground: 10 }, // 61.109: 40 total, 20 dual, 10 solo
      part141Min: { dual: 20, solo: 15, ground: 35 }, // App. B: 35 total, 35 hr ground training
      average: { dual: 45, solo: 25, ground: 25 },
      knowledgeTest: 175,
      checkrideFee: 900,
      checkrideHours: 2,
      medical: 175,
      materials: 450,
      groundSchool: 300,
      faaRef: "14 CFR 61.109(a): 40 hours total, including 20 hours with an instructor and 10 hours solo. Part 141 Appendix B: 35 hours."
    },
    instrument: {
      label: "Instrument rating (IR)",
      part61Min: { dual: 15, solo: 40, ground: 15 }, // 61.65(d): 50 XC PIC, 40 instrument (15 with CFII)
      part141Min: { dual: 35, solo: 0, ground: 30 }, // App. C: 35 hr instrument training
      average: { dual: 40, solo: 15, ground: 20 },
      knowledgeTest: 175,
      checkrideFee: 1000,
      checkrideHours: 2,
      medical: 0,
      materials: 250,
      groundSchool: 300,
      faaRef: "14 CFR 61.65(d): 50 hours cross-country PIC and 40 hours actual or simulated instrument time, including 15 hours from a CFII. Many pilots already have part of the cross-country time. Part 141 Appendix C: 35 hours of instrument training."
    },
    commercial: {
      label: "Commercial pilot (CPL, single-engine)",
      part61Min: { dual: 20, solo: 80, ground: 15 }, // 61.129(a): 250 total; 20 training, 10 solo; assumes ~150 already
      part141Min: { dual: 55, solo: 65, ground: 35 }, // App. D: 120 total
      average: { dual: 25, solo: 100, ground: 20 },
      knowledgeTest: 175,
      checkrideFee: 1100,
      checkrideHours: 2,
      medical: 150,
      materials: 250,
      groundSchool: 300,
      faaRef: "14 CFR 61.129(a): 250 hours total, including 20 hours of training and 10 hours solo. The hours here assume you start with about 150 hours after private and instrument, so they only count the time you still need to build. Part 141 Appendix D: 120 hours (190 hours for an approved course)."
    },
    cfi: {
      label: "Flight instructor (CFI)",
      part61Min: { dual: 15, solo: 0, ground: 25 }, // no FAA minimum flight hours; spin endorsement
      part141Min: { dual: 25, solo: 0, ground: 40 }, // App. F: 25 hr flight, 40 hr ground
      average: { dual: 20, solo: 5, ground: 40 },
      knowledgeTest: 350, // FOI + FIA
      checkrideFee: 1200,
      checkrideHours: 2.5,
      medical: 0,
      materials: 300,
      groundSchool: 500,
      faaRef: "Part 61 sets no minimum flight hours for the CFI; it requires a commercial certificate, a spin-training endorsement (61.183(i)), and the FOI and FIA knowledge tests. Part 141 Appendix F: 25 hours of flight training and 40 hours of ground training."
    }
  };

  function num(v) {
    if (v === "" || v == null) return 0;
    var n = Number(v);
    return isFinite(n) ? n : NaN;
  }

  function preset(cert, basis) {
    var c = CERTS[cert];
    if (!c) return null;
    var key = basis === "part141" ? "part141Min" : basis === "average" ? "average" : "part61Min";
    var h = c[key];
    return {
      dualHours: h.dual,
      soloHours: h.solo,
      groundHours: h.ground,
      knowledgeTest: c.knowledgeTest,
      checkrideFee: c.checkrideFee,
      checkrideHours: c.checkrideHours,
      medical: c.medical,
      materials: c.materials,
      groundSchool: c.groundSchool
    };
  }

  function compute(input) {
    if (!input) return null;
    var dual = num(input.dualHours);
    var solo = num(input.soloHours);
    var ground = num(input.groundHours);
    var wet = num(input.aircraftRate);
    var cfi = num(input.instructorRate);
    var groundSchool = num(input.groundSchool);
    var knowledge = num(input.knowledgeTest);
    var dpe = num(input.checkrideFee);
    var checkrideHours = num(input.checkrideHours);
    var materials = num(input.materials);
    var medical = num(input.medical);
    var other = num(input.other);
    var contingency = num(input.contingencyPercent);
    var vals = [dual, solo, ground, wet, cfi, groundSchool, knowledge, dpe, checkrideHours, materials, medical, other, contingency];
    for (var i = 0; i < vals.length; i++) {
      if (!isFinite(vals[i]) || vals[i] < 0) return null;
    }
    if (dual + solo <= 0) return null;

    var lines = {
      dualAircraft: dual * wet,
      dualInstructor: dual * cfi,
      soloAircraft: solo * wet,
      groundInstruction: ground * cfi,
      groundSchool: groundSchool,
      knowledgeTest: knowledge,
      checkrideFee: dpe,
      checkrideAircraft: checkrideHours * wet,
      materials: materials,
      medical: medical,
      other: other
    };
    var subtotal = 0;
    for (var k in lines) subtotal += lines[k];
    var contingencyAmt = subtotal * contingency / 100;
    var total = subtotal + contingencyAmt;
    var flightHours = dual + solo + checkrideHours;
    var groups = {
      flying: lines.dualAircraft + lines.soloAircraft + lines.checkrideAircraft,
      instruction: lines.dualInstructor + lines.groundInstruction,
      testing: lines.knowledgeTest + lines.checkrideFee,
      other: lines.groundSchool + lines.materials + lines.medical + lines.other
    };
    var weeks = null;
    var perWeek = num(input.lessonsPerWeek);
    var hoursPerLesson = num(input.hoursPerLesson) || 1.3;
    if (perWeek > 0 && hoursPerLesson > 0) {
      weeks = (dual + solo) / (perWeek * hoursPerLesson);
    }
    return {
      lines: lines,
      groups: groups,
      subtotal: subtotal,
      contingency: contingencyAmt,
      total: total,
      flightHours: flightHours,
      costPerFlightHour: flightHours > 0 ? total / flightHours : null,
      weeks: weeks,
      monthlyBudget: weeks ? total / (weeks / 4.345) : null
    };
  }

  /** Total for a sequence of ratings (e.g., zero-to-CFI) using one rate set. */
  function pathTotal(certList, basis, rates) {
    var sum = 0;
    var parts = [];
    for (var i = 0; i < certList.length; i++) {
      var p = preset(certList[i], basis);
      if (!p) return null;
      p.aircraftRate = rates.aircraftRate;
      p.instructorRate = rates.instructorRate;
      var r = compute(p);
      if (!r) return null;
      parts.push({ cert: certList[i], total: r.total });
      sum += r.total;
    }
    return { total: sum, parts: parts };
  }

  var api = {
    CERTS: CERTS,
    preset: preset,
    compute: compute,
    pathTotal: pathTotal
  };

  root.TrainingCostCalcs = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

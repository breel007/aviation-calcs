/**
 * UI for the weight and balance calculator.
 * Math lives in calc.js (WeightBalanceCalcs).
 */
(function () {
  "use strict";

  var WB = window.WeightBalanceCalcs;
  if (!WB) return;

  var STORAGE_KEY = "aviation-calcs.wb.loadouts.v1";

  var elPreset = document.getElementById("preset");
  var elNote = document.getElementById("preset-note");
  var elDatum = document.getElementById("datum-note");
  var elTaxi = document.getElementById("taxi-gal");
  var elTrip = document.getElementById("trip-gal");
  var elStationBody = document.querySelector("#station-table tbody");
  var elEnvBody = document.querySelector("#envelope-table tbody");
  var elTotals = document.getElementById("totals");
  var elPlot = document.getElementById("plot");
  var elWarnings = document.getElementById("warnings");
  var elLoadName = document.getElementById("loadout-name");
  var elLoadList = document.getElementById("loadout-list");

  var state = {
    presetId: "c172s",
    fuelType: "100LL",
    stations: [],
    envelope: [],
    limits: {},
    taxiGallons: 0,
    tripGallons: 10,
    datum: "",
    disclaimer: "",
    notes: []
  };

  function parseNum(raw) {
    if (raw == null) return NaN;
    var s = String(raw).trim().replace(",", ".");
    if (s === "") return NaN;
    return Number(s);
  }

  function fmtNum(n, digits) {
    if (!isFinite(n)) return "—";
    var d = digits == null ? 1 : digits;
    var v = Number(n.toFixed(d));
    return v.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: 0 });
  }

  function loadPreset(id, keepFuelType) {
    var p = WB.PRESETS[id] || WB.PRESETS.blank;
    state.presetId = p.id;
    if (!keepFuelType) state.fuelType = p.fuelType || "100LL";
    state.stations = WB.cloneStations(p.stations);
    state.envelope = (p.envelope || []).map(function (v) { return { arm: v.arm, weight: v.weight }; });
    state.limits = Object.assign({}, p.limits || {});
    state.taxiGallons = p.taxiGallons || 0;
    state.tripGallons = id === "blank" ? 0 : 10;
    state.datum = p.datum || "";
    state.disclaimer = p.disclaimer || "";
    state.notes = p.notes ? p.notes.slice() : [];
    elTaxi.value = String(state.taxiGallons);
    elTrip.value = String(state.tripGallons);
    document.querySelectorAll('[data-unit-group="fuel"]').forEach(function (btn) {
      var on = btn.getAttribute("data-unit") === state.fuelType;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function fillPresetSelect() {
    elPreset.innerHTML = "";
    Object.keys(WB.PRESETS).forEach(function (id) {
      var opt = document.createElement("option");
      opt.value = id;
      opt.textContent = WB.PRESETS[id].name;
      elPreset.appendChild(opt);
    });
    elPreset.value = state.presetId;
  }

  function stationFromRow(tr) {
    var kind = tr.querySelector(".kind").value;
    var name = tr.querySelector(".name").value;
    var arm = parseNum(tr.querySelector(".arm").value);
    var row = { name: name, kind: kind, arm: isFinite(arm) ? arm : 0 };
    if (kind === "fuel") {
      var gal = parseNum(tr.querySelector(".gallons").value);
      row.gallons = isFinite(gal) ? gal : 0;
    } else {
      var w = parseNum(tr.querySelector(".weight").value);
      row.weight = isFinite(w) ? w : 0;
    }
    var maxG = tr.getAttribute("data-max-gal");
    var maxW = tr.getAttribute("data-max-wt");
    if (maxG) row.maxGallons = Number(maxG);
    if (maxW) row.maxWeight = Number(maxW);
    return row;
  }

  function readFormIntoState() {
    state.stations = Array.prototype.map.call(elStationBody.querySelectorAll("tr"), stationFromRow);
    state.envelope = Array.prototype.map.call(elEnvBody.querySelectorAll("tr"), function (tr) {
      return {
        arm: parseNum(tr.querySelector(".earm").value),
        weight: parseNum(tr.querySelector(".ewt").value)
      };
    }).filter(function (v) { return isFinite(v.arm) && isFinite(v.weight); });
    var taxi = parseNum(elTaxi.value);
    var trip = parseNum(elTrip.value);
    state.taxiGallons = isFinite(taxi) ? Math.max(0, taxi) : 0;
    state.tripGallons = isFinite(trip) ? Math.max(0, trip) : 0;
  }

  function renderStations() {
    elStationBody.innerHTML = "";
    state.stations.forEach(function (s, i) {
      var tr = document.createElement("tr");
      if (s.maxGallons != null) tr.setAttribute("data-max-gal", s.maxGallons);
      if (s.maxWeight != null) tr.setAttribute("data-max-wt", s.maxWeight);
      var isFuel = s.kind === "fuel";
      var w = WB.stationWeight(s, state.fuelType);
      tr.innerHTML =
        '<td><input class="input name" type="text" value="" autocomplete="off" aria-label="Station name"></td>' +
        '<td><select class="kind" aria-label="Station type"><option value="mass">Weight</option><option value="fuel">Fuel</option></select></td>' +
        '<td><input class="input gallons" type="number" inputmode="decimal" step="0.1" min="0" ' + (isFuel ? "" : "disabled ") + 'autocomplete="off" aria-label="Gallons"></td>' +
        '<td>' + (isFuel
          ? '<span class="weight-ro"></span>'
          : '<input class="input weight" type="number" inputmode="decimal" step="0.1" autocomplete="off" aria-label="Weight">') +
        "</td>" +
        '<td><input class="input arm" type="number" inputmode="decimal" step="0.1" autocomplete="off" aria-label="Arm"></td>' +
        '<td class="moment"></td>' +
        '<td class="narrow"><button type="button" class="icon-btn btn-del" aria-label="Remove station">×</button></td>';
      tr.querySelector(".name").value = s.name || "";
      tr.querySelector(".kind").value = isFuel ? "fuel" : "mass";
      if (isFuel) {
        tr.querySelector(".gallons").value = s.gallons != null ? s.gallons : 0;
        tr.querySelector(".weight-ro").textContent = fmtNum(w, 1);
      } else {
        tr.querySelector(".weight").value = s.weight != null ? s.weight : 0;
      }
      tr.querySelector(".arm").value = s.arm != null ? s.arm : 0;
      tr.querySelector(".moment").textContent = fmtNum(WB.stationMoment(s, state.fuelType), 0);
      tr.querySelector(".kind").addEventListener("change", function () {
        readFormIntoState();
        var row = state.stations[i];
        if (!row) return;
        if (this.value === "fuel") {
          row.kind = "fuel";
          row.gallons = row.gallons != null ? row.gallons : 0;
        } else {
          row.kind = "mass";
          row.weight = row.weight != null ? row.weight : 0;
        }
        renderAll();
      });
      tr.querySelector(".btn-del").addEventListener("click", function () {
        readFormIntoState();
        state.stations.splice(i, 1);
        renderAll();
      });
      ["input", "change"].forEach(function (ev) {
        tr.addEventListener(ev, function (e) {
          if (e.target.classList.contains("kind")) return;
          readFormIntoState();
          recompute();
        });
      });
      elStationBody.appendChild(tr);
    });
  }

  function renderEnvelope() {
    elEnvBody.innerHTML = "";
    state.envelope.forEach(function (v, i) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        '<td><input class="input earm" type="number" inputmode="decimal" step="0.01" aria-label="Envelope arm"></td>' +
        '<td><input class="input ewt" type="number" inputmode="decimal" step="1" aria-label="Envelope weight"></td>' +
        '<td class="narrow"><button type="button" class="icon-btn btn-del" aria-label="Remove point">×</button></td>';
      tr.querySelector(".earm").value = v.arm;
      tr.querySelector(".ewt").value = v.weight;
      tr.querySelector(".btn-del").addEventListener("click", function () {
        readFormIntoState();
        state.envelope.splice(i, 1);
        renderAll();
      });
      tr.addEventListener("input", function () {
        readFormIntoState();
        recompute();
      });
      elEnvBody.appendChild(tr);
    });
  }

  function flagLine(status, kind) {
    var bits = [];
    if (status.insideEnvelope === true) bits.push('<span class="status-in">Inside envelope</span>');
    else if (status.insideEnvelope === false) bits.push('<span class="status-out">Outside envelope</span>');
    else bits.push('<span class="mute">No envelope drawn</span>');
    if (kind === "takeoff" && status.exceedsMaxTakeoff != null && status.exceedsMaxTakeoff > 0.05) {
      bits.push('<span class="status-out">Over max takeoff by ' + fmtNum(status.exceedsMaxTakeoff, 0) + " lb</span>");
    }
    if (kind === "landing" && status.exceedsMaxLanding != null && status.exceedsMaxLanding > 0.05) {
      bits.push('<span class="status-out">Over max landing by ' + fmtNum(status.exceedsMaxLanding, 0) + " lb</span>");
    }
    if (kind === "ramp" && status.exceedsMaxRamp != null && status.exceedsMaxRamp > 0.05) {
      bits.push('<span class="status-out">Over max ramp by ' + fmtNum(status.exceedsMaxRamp, 0) + " lb</span>");
    }
    return bits.join(" · ");
  }

  function totalCard(title, block, status, kind) {
    var out = status && (status.insideEnvelope === false ||
      (status.exceedsMaxTakeoff != null && status.exceedsMaxTakeoff > 0.05 && kind === "takeoff") ||
      (status.exceedsMaxLanding != null && status.exceedsMaxLanding > 0.05 && kind === "landing") ||
      (status.exceedsMaxRamp != null && status.exceedsMaxRamp > 0.05 && kind === "ramp"));
    var inn = status && status.insideEnvelope === true && !out;
    return (
      '<article class="total-card' + (out ? " is-out" : inn ? " is-in" : "") + '">' +
        '<p class="stat-label">' + title + "</p>" +
        '<p class="stat-value">' + fmtNum(block.weight, 1) + " lb</p>" +
        '<p class="stat-sub">CG ' + (block.cg == null ? "—" : fmtNum(block.cg, 2) + " in") +
          " · moment " + fmtNum(block.moment, 0) + " in-lb</p>" +
        '<p class="stat-sub">' + flagLine(status, kind) + "</p>" +
      "</article>"
    );
  }

  function renderPlot(result) {
    var env = result.envelope || [];
    var pts = [];
    env.forEach(function (v) { pts.push(v); });
    if (result.takeoff.cg != null) pts.push({ arm: result.takeoff.cg, weight: result.takeoff.weight });
    if (result.landing.cg != null) pts.push({ arm: result.landing.cg, weight: result.landing.weight });
    if (!pts.length) {
      elPlot.innerHTML = '<p class="hint">Add at least three envelope points to draw the CG envelope.</p>';
      return;
    }
    var arms = pts.map(function (p) { return p.arm; });
    var wts = pts.map(function (p) { return p.weight; });
    var minX = Math.min.apply(null, arms);
    var maxX = Math.max.apply(null, arms);
    var minY = Math.min.apply(null, wts);
    var maxY = Math.max.apply(null, wts);
    var padX = Math.max(1, (maxX - minX) * 0.12) || 2;
    var padY = Math.max(50, (maxY - minY) * 0.12) || 100;
    minX -= padX; maxX += padX; minY = Math.max(0, minY - padY); maxY += padY;
    if (minX === maxX) { minX -= 2; maxX += 2; }
    if (minY === maxY) { minY -= 100; maxY += 100; }

    var W = 640, H = 400;
    var L = 58, R = 18, T = 18, B = 42;
    function x(arm) { return L + (arm - minX) / (maxX - minX) * (W - L - R); }
    function y(wt) { return T + (maxY - wt) / (maxY - minY) * (H - T - B); }

    var poly = env.map(function (v) { return x(v.arm).toFixed(1) + "," + y(v.weight).toFixed(1); }).join(" ");
    var ticks = [];
    function nice(min, max, count) {
      var span = max - min;
      var step = Math.pow(10, Math.floor(Math.log(span / count) / Math.LN10));
      var err = (span / count) / step;
      if (err >= 5) step *= 5;
      else if (err >= 2) step *= 2;
      var out = [];
      var v = Math.ceil(min / step) * step;
      for (; v <= max + 1e-9; v += step) out.push(v);
      return out;
    }
    nice(minX, maxX, 6).forEach(function (v) {
      var xx = x(v);
      ticks.push('<line x1="' + xx + '" y1="' + T + '" x2="' + xx + '" y2="' + (H - B) + '" stroke="#1b2436" stroke-width="1"/>');
      ticks.push('<text x="' + xx + '" y="' + (H - B + 16) + '" fill="#667289" font-size="11" text-anchor="middle">' + (Math.round(v * 10) / 10) + "</text>");
    });
    nice(minY, maxY, 6).forEach(function (v) {
      var yy = y(v);
      ticks.push('<line x1="' + L + '" y1="' + yy + '" x2="' + (W - R) + '" y2="' + yy + '" stroke="#1b2436" stroke-width="1"/>');
      ticks.push('<text x="' + (L - 6) + '" y="' + (yy + 3) + '" fill="#667289" font-size="11" text-anchor="end">' + Math.round(v).toLocaleString("en-US") + "</text>");
    });

    function dot(arm, wt, color, label) {
      if (!isFinite(arm) || !isFinite(wt)) return "";
      return '<circle cx="' + x(arm) + '" cy="' + y(wt) + '" r="6" fill="' + color + '" stroke="#080c16" stroke-width="2"/>' +
        '<text x="' + (x(arm) + 8) + '" y="' + (y(wt) - 8) + '" fill="' + color + '" font-size="12" font-weight="600">' + label + "</text>";
    }

    var desc = "Weight versus center-of-gravity plot. Takeoff is " +
      fmtNum(result.takeoff.weight, 0) + " pounds at " + fmtNum(result.takeoff.cg, 2) +
      " inches. Landing is " + fmtNum(result.landing.weight, 0) + " pounds at " +
      fmtNum(result.landing.cg, 2) + " inches.";

    elPlot.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + desc.replace(/"/g, "'") + '">' +
      '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#0c121f"/>' +
      ticks.join("") +
      (poly
        ? '<polygon points="' + poly + '" fill="rgba(232,184,74,0.15)" stroke="#e8b84a" stroke-width="2"/>'
        : "") +
      dot(result.takeoff.cg, result.takeoff.weight, "#6fe3d0", "Takeoff") +
      dot(result.landing.cg, result.landing.weight, "#f0a35a", "Landing") +
      '<text x="' + (W / 2) + '" y="' + (H - 8) + '" fill="#8b97ad" font-size="12" text-anchor="middle">CG — arm (in)</text>' +
      '<text x="14" y="' + (H / 2) + '" fill="#8b97ad" font-size="12" text-anchor="middle" transform="rotate(-90 14 ' + (H / 2) + ')">Weight (lb)</text>' +
      "</svg>";
  }

  function recompute() {
    // Update computed fuel weights / moments in the open table without a full rerender.
    Array.prototype.forEach.call(elStationBody.querySelectorAll("tr"), function (tr, i) {
      var s = state.stations[i];
      if (!s) return;
      var ro = tr.querySelector(".weight-ro");
      if (ro) ro.textContent = fmtNum(WB.stationWeight(s, state.fuelType), 1);
      var mom = tr.querySelector(".moment");
      if (mom) mom.textContent = fmtNum(WB.stationMoment(s, state.fuelType), 0);
    });

    var result = WB.compute({
      stations: state.stations,
      fuelType: state.fuelType,
      taxiGallons: state.taxiGallons,
      tripGallons: state.tripGallons,
      envelope: state.envelope,
      limits: state.limits
    });

    elNote.textContent = state.disclaimer;
    elDatum.textContent = state.datum
      ? ("Datum: " + state.datum + " Fuel density " + result.fuelDensity.toFixed(1) + " lb/gal.")
      : ("Fuel density " + result.fuelDensity.toFixed(1) + " lb/gal.");

    elTotals.innerHTML =
      totalCard("Ramp", result.ramp, result.rampStatus, "ramp") +
      totalCard("Takeoff", result.takeoff, result.takeoffStatus, "takeoff") +
      totalCard("Landing", result.landing, result.landingStatus, "landing");

    renderPlot(result);

    var notes = [];
    if (state.notes && state.notes.length) {
      // keep notes in the preset banner only
    }
    state.stations.forEach(function (s) {
      if (s.kind === "fuel" && s.maxGallons != null && s.gallons > s.maxGallons + 0.05) {
        notes.push((s.name || "Fuel") + " exceeds the example usable capacity of " + s.maxGallons + " gal.");
      }
      if (s.kind !== "fuel" && s.maxWeight != null && s.weight > s.maxWeight + 0.05) {
        notes.push((s.name || "A station") + " exceeds the example station limit of " + s.maxWeight + " lb.");
      }
    });
    if (result.takeoffStatus.insideEnvelope === false || result.landingStatus.insideEnvelope === false) {
      notes.push("Takeoff or landing CG is outside the envelope as drawn. Do not use this loading until it matches YOUR POH and official W&B data and sits inside limits.");
    }
    if (!notes.length) {
      elWarnings.hidden = true;
      elWarnings.innerHTML = "";
    } else {
      elWarnings.hidden = false;
      elWarnings.innerHTML = notes.map(function (n) { return "<p>" + n + "</p>"; }).join("");
    }
  }

  function renderAll() {
    fillPresetSelect();
    renderStations();
    renderEnvelope();
    recompute();
  }

  function readStore() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function writeStore(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      elWarnings.hidden = false;
      elWarnings.innerHTML = "<p>Could not write to localStorage in this browser.</p>";
    }
  }

  function refreshLoadoutList() {
    var list = readStore();
    elLoadList.innerHTML = "";
    if (!list.length) {
      var opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No saved loadouts";
      elLoadList.appendChild(opt);
      return;
    }
    list.forEach(function (item, i) {
      var opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = item.name + (item.savedAt ? " — " + item.savedAt : "");
      elLoadList.appendChild(opt);
    });
  }

  function snapshot() {
    readFormIntoState();
    return {
      name: (elLoadName.value || "Untitled").trim(),
      savedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      presetId: state.presetId,
      fuelType: state.fuelType,
      stations: WB.cloneStations(state.stations),
      envelope: state.envelope.map(function (v) { return { arm: v.arm, weight: v.weight }; }),
      limits: Object.assign({}, state.limits),
      taxiGallons: state.taxiGallons,
      tripGallons: state.tripGallons,
      datum: state.datum,
      disclaimer: state.disclaimer,
      notes: state.notes.slice()
    };
  }

  function applySnapshot(item) {
    state.presetId = item.presetId || "blank";
    state.fuelType = item.fuelType || "100LL";
    state.stations = WB.cloneStations(item.stations || []);
    state.envelope = (item.envelope || []).map(function (v) { return { arm: v.arm, weight: v.weight }; });
    state.limits = Object.assign({}, item.limits || {});
    state.taxiGallons = item.taxiGallons || 0;
    state.tripGallons = item.tripGallons || 0;
    state.datum = item.datum || "";
    state.disclaimer = item.disclaimer || "";
    state.notes = item.notes ? item.notes.slice() : [];
    elTaxi.value = String(state.taxiGallons);
    elTrip.value = String(state.tripGallons);
    document.querySelectorAll('[data-unit-group="fuel"]').forEach(function (btn) {
      var on = btn.getAttribute("data-unit") === state.fuelType;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    renderAll();
  }

  elPreset.addEventListener("change", function () {
    loadPreset(elPreset.value);
    renderAll();
  });
  document.querySelectorAll('[data-unit-group="fuel"]').forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.fuelType = btn.getAttribute("data-unit");
      document.querySelectorAll('[data-unit-group="fuel"]').forEach(function (b) {
        var on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      readFormIntoState();
      renderAll();
    });
  });
  elTaxi.addEventListener("input", function () { readFormIntoState(); recompute(); });
  elTrip.addEventListener("input", function () { readFormIntoState(); recompute(); });
  document.getElementById("btn-add-mass").addEventListener("click", function () {
    readFormIntoState();
    state.stations.push({ name: "New station", kind: "mass", weight: 0, arm: 0 });
    renderAll();
  });
  document.getElementById("btn-add-fuel").addEventListener("click", function () {
    readFormIntoState();
    state.stations.push({ name: "Fuel", kind: "fuel", gallons: 0, arm: 0 });
    renderAll();
  });
  document.getElementById("btn-add-vertex").addEventListener("click", function () {
    readFormIntoState();
    var last = state.envelope[state.envelope.length - 1];
    state.envelope.push({ arm: last ? last.arm : 0, weight: last ? last.weight : 0 });
    renderAll();
  });
  document.getElementById("btn-save").addEventListener("click", function () {
    var item = snapshot();
    var list = readStore();
    var idx = list.findIndex(function (x) { return x.name === item.name; });
    if (idx >= 0) list[idx] = item;
    else list.push(item);
    writeStore(list);
    refreshLoadoutList();
    elLoadName.value = item.name;
  });
  document.getElementById("btn-load").addEventListener("click", function () {
    var list = readStore();
    var item = list[Number(elLoadList.value)];
    if (item) applySnapshot(item);
  });
  document.getElementById("btn-delete").addEventListener("click", function () {
    var list = readStore();
    var i = Number(elLoadList.value);
    if (!list[i]) return;
    list.splice(i, 1);
    writeStore(list);
    refreshLoadoutList();
  });
  document.getElementById("calc-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    readFormIntoState();
    recompute();
  });

  loadPreset("c172s");
  renderAll();
  refreshLoadoutList();
})();

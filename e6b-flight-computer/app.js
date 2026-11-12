/**
 * Interactive E6B: mode forms, disk rotation, highlights, drag, and
 * the wind-side step animation. Math lives in calc.js; drawings in render-svg.js.
 */
(function () {
  "use strict";

  var E6B = window.E6BComputer;
  var R = window.E6BRender;
  var FS = window.E6BFormState;
  var CX = R.CX;
  var CY = R.CY;

  var mode = "tsd";
  var side = "computer";
  var diskAngle = 0;
  var animating = false;
  var drag = null;

  var form = document.getElementById("calc-form");
  var warnings = document.getElementById("warnings");
  var computerMount = document.getElementById("computer-mount");
  var windMount = document.getElementById("wind-mount");
  var computerStage = document.getElementById("computer-stage");
  var windStage = document.getElementById("wind-stage");
  var dragReadout = document.getElementById("drag-readout");
  var stepList = document.getElementById("wind-steps");
  var heroLabel = document.getElementById("hero-label");
  var heroValue = document.getElementById("hero-value");
  var heroSub = document.getElementById("hero-sub");
  var statGrid = document.getElementById("stat-grid");

  function $(id) { return document.getElementById(id); }

  function num(id) {
    var el = $(id);
    if (!el) return NaN;
    var v = parseFloat(String(el.value).trim());
    return isFinite(v) ? v : NaN;
  }

  function reduceMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function easeInOut(p) {
    return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  }

  function setDiskAngle(deg) {
    diskAngle = deg;
    var g = $("e6b-inner");
    if (g) g.setAttribute("transform", "rotate(" + deg.toFixed(4) + " " + CX + " " + CY + ")");
  }

  function animateValue(from, to, duration, apply, done) {
    if (reduceMotion() || duration <= 0) {
      apply(to);
      if (done) done();
      return;
    }
    var t0 = performance.now();
    function frame(now) {
      var p = Math.min(1, (now - t0) / duration);
      apply(from + (to - from) * easeInOut(p));
      if (p < 1) requestAnimationFrame(frame);
      else if (done) done();
    }
    requestAnimationFrame(frame);
  }

  function animateAngle(from, to, duration, apply, done) {
    var delta = E6B.shortestAngleDelta(from, to);
    animateValue(from, from + delta, duration, apply, done);
  }

  function clearWarnings() {
    warnings.hidden = true;
    warnings.innerHTML = "";
  }

  function showWarning(msg) {
    warnings.hidden = false;
    warnings.innerHTML = "<p>" + String(msg).replace(/</g, "&lt;") + "</p>";
  }

  function fmt(n, digits) {
    if (!isFinite(n)) return "—";
    var d = digits == null ? 1 : digits;
    var s = n.toFixed(d);
    if (d > 0) s = s.replace(/\.?0+$/, "");
    return s;
  }

  function fmtTime(t) {
    if (!t) return "—";
    var h = t.hours;
    var m = t.minutes;
    var mStr = (Math.abs(m - Math.round(m)) < 1e-6) ? String(Math.round(m)) : fmt(m, 1);
    if (h === 0) return mStr + " min";
    if (Math.abs(m) < 1e-6) return h + (h === 1 ? " h" : " h");
    return h + " h " + mStr + " min";
  }

  function fmtWca(wca) {
    if (!isFinite(wca)) return "—";
    if (Math.abs(wca) < 0.05) return "0°";
    var side = wca > 0 ? "R" : "L";
    return fmt(Math.abs(wca), 1) + "° " + side;
  }

  function headingStr(deg) {
    if (!isFinite(deg)) return "—";
    var n = Math.round(E6B.normalizeHeading(deg) * 10) / 10;
    var s = n.toFixed(1).replace(/\.0$/, "");
    return String(Math.round(n)).padStart(3, "0").slice(-3) + (s.indexOf(".") >= 0 ? s.slice(s.indexOf(".")) : "") + "°";
  }

  function headingStr3(deg) {
    if (!isFinite(deg)) return "—";
    var n = E6B.normalizeHeading(deg);
    var i = Math.round(n);
    if (i === 0) i = 360;
    return String(i).padStart(3, "0") + "°";
  }

  function setHero(label, valueHtml, sub) {
    heroLabel.textContent = label;
    heroValue.innerHTML = valueHtml;
    heroSub.textContent = sub || "";
  }

  function setStats(rows) {
    statGrid.innerHTML = rows.map(function (r) {
      return '<div class="stat"><p class="stat-label">' + r.label + "</p>" +
        '<p class="stat-value">' + r.value + "</p></div>";
    }).join("");
  }

  function setHighlights(items) {
    var g = $("e6b-highlights");
    if (!g) return;
    var markup = R.highlightsSvg(items || []);
    // highlightsSvg returns a <g id="e6b-highlights">...</g>; take inner only
    var tmp = document.createElement("div");
    tmp.innerHTML = markup;
    var inner = tmp.firstElementChild;
    g.innerHTML = inner ? inner.innerHTML : "";
  }

  function rebuildComputer(highlights) {
    computerMount.innerHTML = R.buildComputerSvg({
      rotationDeg: diskAngle,
      highlights: highlights || []
    });
    bindDrag();
  }

  function rebuildWind(opts) {
    opts = opts || {};
    windMount.innerHTML = R.buildWindSvg({
      roseHeading: opts.roseHeading != null ? opts.roseHeading : 360,
      tas: opts.tas != null ? opts.tas : 120,
      windFrom: opts.windFrom != null ? opts.windFrom : 360,
      windSpeed: opts.windSpeed != null ? opts.windSpeed : 0,
      showDot: !!opts.showDot,
      showCallouts: !!opts.showCallouts,
      wca: opts.wca,
      groundspeed: opts.groundspeed
    });
  }

  function setSide(next) {
    side = next;
    computerStage.hidden = side !== "computer";
    windStage.hidden = side !== "wind";
    document.querySelectorAll("[data-unit-group='side']").forEach(function (btn) {
      var on = btn.getAttribute("data-unit") === side;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function setMode(next) {
    mode = next;
    document.querySelectorAll("[data-unit-group='mode']").forEach(function (btn) {
      var on = btn.getAttribute("data-unit") === mode;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    document.querySelectorAll(".mode-fields").forEach(function (block) {
      block.hidden = block.getAttribute("data-mode") !== mode;
    });
    if (mode === "wind") setSide("wind");
    else setSide("computer");
    clearWarnings();
  }

  function unitOf(group) {
    var btn = document.querySelector("[data-unit-group='" + group + "'].is-active");
    return btn ? btn.getAttribute("data-unit") : null;
  }

  function setUnit(group, unit) {
    document.querySelectorAll("[data-unit-group='" + group + "']").forEach(function (btn) {
      var on = btn.getAttribute("data-unit") === unit;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function solveForOf(m) {
    var cfg = FS && FS.SOLVE[m];
    if (!cfg) return null;
    return unitOf(cfg.group) || cfg.fallback;
  }

  function refreshSolvedState(m, clear) {
    if (!FS || !FS.SOLVE[m]) return;
    FS.applySolvedState(document, m, solveForOf(m), { clearSolved: !!clear });
  }

  function refreshAllSolvedState() {
    ["tsd", "fuel", "offcourse"].forEach(function (m) { refreshSolvedState(m, false); });
  }

  function currentSolve() {
    if (mode === "tsd") {
      var solveFor = unitOf("tsd-solve") || "distance";
      return E6B.solveTsd({
        speed: num("tsd-speed"),
        distance: num("tsd-distance"),
        timeHours: num("tsd-hours"),
        timeMinutes: num("tsd-minutes"),
        solveFor: solveFor
      });
    }
    if (mode === "fuel") {
      var fsolve = unitOf("fuel-solve") || "fuel";
      return E6B.solveFuel({
        rate: num("fuel-rate"),
        fuel: num("fuel-qty"),
        timeHours: num("fuel-hours"),
        timeMinutes: num("fuel-minutes"),
        solveFor: fsolve
      });
    }
    if (mode === "tas") {
      var oatC = num("tas-oat");
      if (unitOf("tas-temp") === "f" && isFinite(oatC)) oatC = E6B.fToC(oatC);
      return E6B.solveTas({
        casKt: num("tas-cas"),
        pressureAltitudeFt: num("tas-pa"),
        oatC: oatC
      });
    }
    if (mode === "da") {
      var daOat = num("da-oat");
      if (unitOf("da-temp") === "f" && isFinite(daOat)) daOat = E6B.fToC(daOat);
      return E6B.solveDensityAltitude({
        pressureAltitudeFt: num("da-pa"),
        oatC: daOat
      });
    }
    if (mode === "convert") {
      return E6B.solveConvert({
        value: num("conv-value"),
        fromUnit: unitOf("conv-from") || "nm"
      });
    }
    if (mode === "offcourse") {
      return E6B.solveOffCourse({
        distanceFlown: num("oc-flown"),
        distanceOff: num("oc-off"),
        degreesOff: num("oc-deg"),
        solveFor: unitOf("oc-solve") || "distanceOff"
      });
    }
    if (mode === "wind") {
      return E6B.solveWindTriangle(num("wind-tc"), num("wind-tas"), num("wind-from"), num("wind-speed"));
    }
    return { error: "Choose a mode." };
  }

  function highlightsFor(result) {
    if (!result || result.error || !isFinite(result.rotationDeg)) return [];
    var items = [];
    if (mode === "tsd") {
      items.push({ angleDeg: E6B.scaleAngle(result.speed), label: fmt(result.speed, 1) + " kt", r: 348 });
      items.push({ angleDeg: E6B.scaleAngle(result.distance), label: fmt(result.distance, 1) + " NM", r: 348 });
    } else if (mode === "fuel") {
      items.push({ angleDeg: E6B.scaleAngle(result.rate), label: fmt(result.rate, 2) + " gph", r: 348 });
      items.push({ angleDeg: E6B.scaleAngle(result.fuel), label: fmt(result.fuel, 2) + " gal", r: 348 });
    } else if (mode === "tas") {
      items.push({ angleDeg: E6B.scaleAngle(result.casKt), label: "CAS " + fmt(result.casKt, 1), r: 348 });
      items.push({ angleDeg: E6B.scaleAngle(result.tasApproxKt), label: "dial TAS " + fmt(result.tasApproxKt, 1), r: 348 });
    } else if (mode === "da") {
      items.push({
        angleDeg: R.DA_POINTER,
        label: "DA " + fmt(result.densityAltitudeFt, 0) + " ft",
        r: R.R_DA_OUT
      });
    } else if (mode === "convert") {
      items.push({ angleDeg: E6B.scaleAngle(E6B.CONVERSION_MARKS.nm), label: fmt(result.nm, 2) + " NM", r: 348 });
      items.push({ angleDeg: E6B.scaleAngle(E6B.CONVERSION_MARKS.sm), label: fmt(result.sm, 2) + " SM", r: 348 });
      items.push({ angleDeg: E6B.scaleAngle(E6B.CONVERSION_MARKS.km), label: fmt(result.km, 2) + " km", r: 348 });
    } else if (mode === "offcourse") {
      items.push({ angleDeg: E6B.scaleAngle(result.distanceFlown), label: fmt(result.distanceFlown, 1) + " NM flown", r: 348 });
      items.push({ angleDeg: E6B.scaleAngle(result.distanceOff), label: fmt(result.distanceOff, 1) + " NM off", r: 348 });
    }
    return items;
  }

  function renderResult(result) {
    if (!result || result.error) {
      setHero("Result", '<span class="num">—</span>', result && result.error ? result.error : "");
      setStats([]);
      return;
    }
    if (mode === "tsd") {
      var focus = result.solveFor;
      if (focus === "distance") setHero("Distance", '<span class="num">' + fmt(result.distance, 2) + '</span> <span class="unit">NM</span>', "at " + fmt(result.speed, 1) + " kt in " + fmtTime(result.time));
      else if (focus === "time") setHero("Time", '<span class="num">' + fmtTime(result.time) + "</span>", fmt(result.distance, 2) + " NM at " + fmt(result.speed, 1) + " kt");
      else setHero("Speed", '<span class="num">' + fmt(result.speed, 2) + '</span> <span class="unit">kt</span>', fmt(result.distance, 2) + " NM in " + fmtTime(result.time));
      setStats([
        { label: "Distance", value: fmt(result.distance, 2) + " NM" },
        { label: "Speed", value: fmt(result.speed, 2) + " kt" },
        { label: "Time", value: fmtTime(result.time) },
        { label: "Time (hours)", value: fmt(result.timeHours, 3) + " h" }
      ]);
    } else if (mode === "fuel") {
      if (result.solveFor === "speed") setHero("Burn rate", '<span class="num">' + fmt(result.rate, 2) + '</span> <span class="unit">gph</span>', fmt(result.fuel, 2) + " gal in " + fmtTime(result.time));
      else if (result.solveFor === "time") setHero("Time", '<span class="num">' + fmtTime(result.time) + "</span>", fmt(result.fuel, 2) + " gal at " + fmt(result.rate, 2) + " gph");
      else setHero("Fuel", '<span class="num">' + fmt(result.fuel, 2) + '</span> <span class="unit">gal</span>', fmt(result.rate, 2) + " gph for " + fmtTime(result.time));
      setStats([
        { label: "Fuel", value: fmt(result.fuel, 2) + " gal" },
        { label: "Burn rate", value: fmt(result.rate, 2) + " gph" },
        { label: "Time", value: fmtTime(result.time) }
      ]);
    } else if (mode === "tas") {
      setHero("True airspeed", '<span class="num">' + fmt(result.tasKt, 1) + '</span> <span class="unit">kt</span>', "compressible pitot-static solution");
      setStats([
        { label: "TAS (exact)", value: fmt(result.tasKt, 1) + " kt" },
        { label: "TAS on the dial (CAS / √σ)", value: fmt(result.tasApproxKt, 1) + " kt" },
        { label: "CAS", value: fmt(result.casKt, 1) + " kt" },
        { label: "Mach", value: fmt(result.mach, 3) },
        { label: "EAS", value: fmt(result.easKt, 1) + " kt" },
        { label: "Density altitude", value: fmt(result.densityAltitudeFt, 0) + " ft" },
        { label: "Density ratio σ", value: fmt(result.densityRatio, 4) },
        { label: "ISA deviation", value: (result.isaDeviationC >= 0 ? "+" : "") + fmt(result.isaDeviationC, 1) + " °C" }
      ]);
    } else if (mode === "da") {
      setHero("Density altitude", '<span class="num">' + fmt(result.densityAltitudeFt, 0) + '</span> <span class="unit">ft</span>', "ICAO / ISO 2533, dry air");
      setStats([
        { label: "Density altitude", value: fmt(result.densityAltitudeFt, 0) + " ft" },
        { label: "Pressure altitude", value: fmt(result.pressureAltitudeFt, 0) + " ft" },
        { label: "OAT", value: fmt(result.oatC, 1) + " °C / " + fmt(result.oatF, 1) + " °F" },
        { label: "Rule of thumb (PA + 120 × ΔISA)", value: fmt(result.ruleOfThumbDaFt, 0) + " ft" },
        { label: "Density ratio σ", value: fmt(result.densityRatio, 4) },
        { label: "ISA deviation", value: (result.isaDeviationC >= 0 ? "+" : "") + fmt(result.isaDeviationC, 1) + " °C" }
      ]);
    } else if (mode === "convert") {
      setHero("Converted distance", '<span class="num">' + fmt(result.nm, 2) + '</span> <span class="unit">NM</span>', "same length in statute miles and kilometres");
      setStats([
        { label: "Nautical miles", value: fmt(result.nm, 3) + " NM" },
        { label: "Statute miles", value: fmt(result.sm, 3) + " SM" },
        { label: "Kilometres", value: fmt(result.km, 3) + " km" }
      ]);
    } else if (mode === "offcourse") {
      var ocNote = "1-in-60 rule: 1° off for 60 NM flown is 1 NM off course";
      if (result.solveFor === "degreesOff") setHero("Degrees off course", '<span class="num">' + fmt(result.degreesOff, 1) + '</span> <span class="unit">°</span>', ocNote);
      else if (result.solveFor === "distanceFlown") setHero("Distance flown", '<span class="num">' + fmt(result.distanceFlown, 2) + '</span> <span class="unit">NM</span>', ocNote);
      else setHero("Distance off course", '<span class="num">' + fmt(result.distanceOff, 2) + '</span> <span class="unit">NM</span>', ocNote);
      setStats([
        { label: "Degrees off", value: fmt(result.degreesOff, 1) + "°" },
        { label: "Distance flown", value: fmt(result.distanceFlown, 2) + " NM" },
        { label: "Distance off course", value: fmt(result.distanceOff, 2) + " NM" }
      ]);
    } else if (mode === "wind") {
      setHero("Wind correction / groundspeed",
        '<span class="num">' + fmtWca(result.wca) + "</span> <span class=\"unit\"> / " + fmt(result.groundspeed, 1) + " kt</span>",
        "true heading " + headingStr3(result.trueHeading));
      setStats([
        { label: "WCA", value: fmtWca(result.wca) },
        { label: "True heading", value: headingStr3(result.trueHeading) },
        { label: "Groundspeed", value: fmt(result.groundspeed, 1) + " kt" },
        { label: "Crosswind", value: fmt(Math.abs(result.crosswind), 1) + " kt " + (result.crosswind > 0.05 ? "from the right" : result.crosswind < -0.05 ? "from the left" : "") },
        { label: "Headwind", value: fmt(result.headwind, 1) + " kt" + (result.headwind < 0 ? " (tailwind)" : "") }
      ]);
    }
  }

  function setWindSteps(active) {
    if (!stepList) return;
    var items = stepList.querySelectorAll("li");
    items.forEach(function (li, i) {
      li.classList.remove("is-active", "is-done");
      if (i < active) li.classList.add("is-done");
      if (i === active) li.classList.add("is-active");
    });
  }

  function runWindAnimation(result, done) {
    var tc = result.trueCourse;
    var tas = result.tas;
    var wd = result.windFrom;
    var ws = result.windSpeed;
    rebuildWind({ roseHeading: wd, tas: tas, windFrom: wd, windSpeed: ws, showDot: false, showCallouts: false });
    setWindSteps(0);

    function setRose(heading) {
      var rot = -((heading === 360) ? 0 : heading);
      var rose = $("e6b-wind-rose");
      var dot = $("e6b-wind-dot");
      var t = "rotate(" + rot.toFixed(4) + " " + R.WX + " " + R.GROMMET_Y + ")";
      if (rose) rose.setAttribute("transform", t);
      if (dot) dot.setAttribute("transform", t);
    }
    function setCard(speedAtGrommet) {
      var card = $("e6b-wind-card");
      if (!card) return;
      card.setAttribute("transform", R.cardTransform(speedAtGrommet));
    }
    function setDotVisible(on, speed) {
      var dot = $("e6b-wind-dot");
      if (dot) dot.setAttribute("visibility", on ? "visible" : "hidden");
      var mark = $("e6b-wind-dot-mark");
      var core = $("e6b-wind-dot-core");
      var cy = R.GROMMET_Y - speed * R.PX_PER_KT;
      if (mark) { mark.setAttribute("cy", String(cy)); }
      if (core) { core.setAttribute("cy", String(cy)); }
    }

    // Start at unity-ish: rose on wind, card mid, no dot
    var startHeading = wd;
    setRose(startHeading);
    setCard(tas);
    setDotVisible(false, ws);

    var dur = reduceMotion() ? 0 : 750;

    function finish() {
      rebuildWind({
        roseHeading: tc, tas: tas, windFrom: wd, windSpeed: ws,
        showDot: true, showCallouts: true,
        wca: result.wca, groundspeed: result.groundspeed,
        grommetSpeed: isFinite(result.groundspeed) ? result.groundspeed : tas
      });
      setWindSteps(4);
      if (done) done();
    }

    if (dur === 0) { finish(); return; }

    // Step 0 already: wind under true index
    setWindSteps(0);
    setTimeout(function () {
      setWindSteps(1);
      setDotVisible(true, ws);
      setTimeout(function () {
        setWindSteps(2);
        // Slide the card so the grommet sits on the TAS arc
        var fromTas = Math.max(40, tas - 30);
        animateValue(fromTas, tas, 550, function (v) { setCard(v); }, function () {
          setCard(tas);
          setWindSteps(3);
          var fromH = wd;
          animateAngle(fromH, tc, dur, function (h) { setRose(h); }, function () {
            setRose(tc);
            setWindSteps(4);
            // Final slide: wind mark onto the TAS arc (grommet then reads GS)
            var endSpeed = isFinite(result.groundspeed) ? result.groundspeed : tas;
            animateValue(tas, endSpeed, 550, function (v) { setCard(v); }, function () {
              setCard(endSpeed);
              setTimeout(finish, 200);
            });
          });
        });
      }, 400);
    }, 350);
  }

  function solve() {
    clearWarnings();
    var result = currentSolve();
    if (result.error) {
      showWarning(result.error);
      renderResult(result);
      setHighlights([]);
      return;
    }
    renderResult(result);
    if (FS) FS.writeOutputs(document, mode, result);
    if (mode === "wind") {
      setSide("wind");
      animating = true;
      runWindAnimation(result, function () { animating = false; });
      return;
    }
    setSide("computer");
    var target = result.rotationDeg || 0;
    var hl = highlightsFor(result);
    animating = true;
    setHighlights([]);
    animateAngle(diskAngle, target, reduceMotion() ? 0 : 900, setDiskAngle, function () {
      setDiskAngle(target);
      setHighlights(hl);
      animating = false;
    });
  }

  function bindDrag() {
    var svg = computerMount.querySelector("svg");
    if (!svg) return;
    var inner = $("e6b-inner");
    if (!inner) return;

    function pointerAngle(ev) {
      var pt = svg.createSVGPoint();
      pt.x = ev.clientX;
      pt.y = ev.clientY;
      var ctm = svg.getScreenCTM();
      if (!ctm) return 0;
      var p = pt.matrixTransform(ctm.inverse());
      return Math.atan2(p.x - CX, CY - p.y) * 180 / Math.PI;
    }

    function onDown(ev) {
      if (animating) return;
      if (ev.pointerType === "mouse" && ev.button !== 0) return;
      ev.preventDefault();
      drag = {
        startPointer: pointerAngle(ev),
        startDisk: diskAngle,
        id: ev.pointerId
      };
      svg.classList.add("is-dragging");
      try { svg.setPointerCapture(ev.pointerId); } catch (e) {}
      setHighlights([]);
    }
    function onMove(ev) {
      if (!drag || ev.pointerId !== drag.id) return;
      ev.preventDefault();
      var a = pointerAngle(ev);
      setDiskAngle(drag.startDisk + E6B.shortestAngleDelta(drag.startPointer, a));
      if (dragReadout) {
        var under = E6B.outerOppositeInner(60, diskAngle, 10);
        dragReadout.textContent = "60-index under " + fmt(under, 1) + " (and 10× / 0.1× that tick)";
      }
    }
    function onUp(ev) {
      if (!drag || ev.pointerId !== drag.id) return;
      drag = null;
      svg.classList.remove("is-dragging");
    }
    svg.addEventListener("pointerdown", onDown);
    svg.addEventListener("pointermove", onMove);
    svg.addEventListener("pointerup", onUp);
    svg.addEventListener("pointercancel", onUp);
  }

  function onSegClick(ev) {
    var btn = ev.target.closest(".seg-btn");
    if (!btn) return;
    ev.preventDefault();
    var group = btn.getAttribute("data-unit-group");
    var unit = btn.getAttribute("data-unit");
    if (group === "mode") setMode(unit);
    else if (group === "side") setSide(unit);
    else {
      setUnit(group, unit);
      if (FS) {
        Object.keys(FS.SOLVE).forEach(function (m) {
          if (FS.SOLVE[m].group === group) refreshSolvedState(m, true);
        });
      }
    }
  }

  function loadExample() {
    if (mode === "tsd") {
      setUnit("tsd-solve", "distance");
      $("tsd-speed").value = "120";
      $("tsd-distance").value = "";
      $("tsd-hours").value = "0";
      $("tsd-minutes").value = "45";
    } else if (mode === "fuel") {
      setUnit("fuel-solve", "fuel");
      $("fuel-rate").value = "8.5";
      $("fuel-qty").value = "";
      $("fuel-hours").value = "2";
      $("fuel-minutes").value = "30";
    } else if (mode === "tas") {
      setUnit("tas-temp", "c");
      $("tas-cas").value = "120";
      $("tas-pa").value = "6000";
      $("tas-oat").value = "0";
    } else if (mode === "da") {
      setUnit("da-temp", "c");
      $("da-pa").value = "5000";
      $("da-oat").value = "30";
    } else if (mode === "convert") {
      setUnit("conv-from", "nm");
      $("conv-value").value = "100";
    } else if (mode === "offcourse") {
      setUnit("oc-solve", "distanceOff");
      $("oc-flown").value = "60";
      $("oc-deg").value = "6";
      $("oc-off").value = "";
    } else if (mode === "wind") {
      $("wind-tc").value = "90";
      $("wind-tas").value = "120";
      $("wind-from").value = "360";
      $("wind-speed").value = "20";
    }
    refreshAllSolvedState();
    solve();
  }

  function resetForm() {
    form.reset();
    setUnit("tsd-solve", "distance");
    setUnit("fuel-solve", "fuel");
    setUnit("tas-temp", "c");
    setUnit("da-temp", "c");
    setUnit("conv-from", "nm");
    setUnit("oc-solve", "distanceOff");
    $("tsd-speed").value = "120";
    $("tsd-minutes").value = "45";
    $("tsd-hours").value = "0";
    $("fuel-rate").value = "8.5";
    $("fuel-hours").value = "2";
    $("fuel-minutes").value = "30";
    $("tas-cas").value = "120";
    $("tas-pa").value = "6000";
    $("tas-oat").value = "0";
    $("da-pa").value = "5000";
    $("da-oat").value = "30";
    $("conv-value").value = "100";
    $("oc-flown").value = "60";
    $("oc-deg").value = "6";
    $("wind-tc").value = "90";
    $("wind-tas").value = "120";
    $("wind-from").value = "360";
    $("wind-speed").value = "20";
    refreshAllSolvedState();
    clearWarnings();
    setHighlights([]);
    setDiskAngle(0);
    rebuildComputer([]);
    rebuildWind({ roseHeading: 360, tas: 120, showDot: false });
    setWindSteps(-1);
    setHero("Result", '<span class="num">—</span>', "Enter values and press Solve to rotate the computer.");
    setStats([]);
    if (dragReadout) dragReadout.textContent = "";
  }

  document.querySelectorAll(".seg").forEach(function (seg) {
    seg.addEventListener("click", onSegClick);
  });
  $("btn-solve").addEventListener("click", function (ev) {
    ev.preventDefault();
    solve();
  });
  $("btn-example").addEventListener("click", function (ev) {
    ev.preventDefault();
    loadExample();
  });
  $("btn-reset").addEventListener("click", function (ev) {
    ev.preventDefault();
    resetForm();
  });
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    solve();
  });

  // Initial face, defaults already in the HTML.
  rebuildComputer([]);
  rebuildWind({ roseHeading: 360, tas: 120, showDot: false });
  setMode("tsd");
  refreshAllSolvedState();
  setHero("Result", '<span class="num">—</span>', "Enter values and press Solve to rotate the computer to the answer.");
})();

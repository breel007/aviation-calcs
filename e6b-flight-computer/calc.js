/**
 * E6B flight computer math.
 *
 * The circular slide-rule positions use one decade around the face:
 *   angle(x) = 360° × log10(x / 10)   (x mapped into [10, 100))
 * with 10 at the top and values increasing clockwise, like a mechanical E6B.
 *
 * Time–speed–distance and fuel use the same identity (distance = speed × time).
 * The rate / 60-minute index is the black triangle at 60 on the inner scale.
 *
 * The TAS window is laid out so that lining up OAT with pressure altitude
 * rotates the inner disk by 360° × log10(1/√σ), the incompressible E6B
 * relation TAS ≈ CAS / √σ. The numeric TAS reported to the pilot is the
 * subsonic compressible pitot-static solution (same formulas as the
 * true-airspeed calculator). The dial itself is the mechanical approximation.
 *
 * Density altitude uses the ICAO / ISO 2533 atmosphere (Doc 7488), dry air.
 * Wind-triangle answers use the same closed-form solution as the E6B wind
 * calculator: WCA = arcsin(crosswind / TAS), GS = √(TAS² − XW²) − headwind.
 *
 * Constants match the true-airspeed and density-altitude calculators:
 *   T0 = 288.15 K, L = 0.0065 K/m, p0 = 1013.25 hPa,
 *   g = 9.80665 m/s², R = 287.05287 J/(kg·K), γ = 1.4.
 *
 * Citations: FAA-H-8083-25C Pilot's Handbook of Aeronautical Knowledge
 * (Ch. 11 Aircraft Performance, Ch. 16 Navigation — E6B / wind triangle);
 * FAA-H-8083-3 Airplane Flying Handbook; ICAO Doc 7488 / ISO 2533;
 * standard E6B computer-manual conventions (rate index at 60, TAS window
 * by pressure altitude and OAT, wind-up / grommet-on-TAS method).
 */
(function (root) {
  "use strict";

  var T0 = 288.15;
  var L = 0.0065;
  var P0_HPA = 1013.25;
  var P0_PA = P0_HPA * 100;
  var G = 9.80665;
  var R = 287.05287;
  var GAMMA = 1.4;
  var EXP = G / (R * L);                 // ≈ 5.25588
  var DENSITY_EXP = 1 / (EXP - 1);       // ≈ 0.234969
  var TROP_M = 11000;
  var TROP_T = T0 - L * TROP_M;          // 216.65 K
  var TROP_P = P0_PA * Math.pow(1 - L * TROP_M / T0, EXP);
  var FT_M = 0.3048;
  var T0_OVER_L_FT = (T0 / L) / FT_M;    // ≈ 145442.16 ft
  var KT_MPS = 1852 / 3600;
  var A0 = Math.sqrt(GAMMA * R * T0);
  var A0_KT = A0 / KT_MPS;
  var NM_M = 1852;
  var SM_M = 1609.344;
  var KM_M = 1000;
  var NM_PER_SM = NM_M / SM_M;           // 1852 / 1609.344
  var NM_PER_KM = NM_M / KM_M;           // 1.852
  var SM_PER_KM = SM_M / KM_M;           // 1.609344
  var DEG = Math.PI / 180;

  // TAS-window layout: temperature marks live on the rotating disk,
  // pressure-altitude marks on the fixed plate. Chosen so that 15 °C
  // and 0 ft PA sit at 180° (bottom) when the scales are in unity
  // alignment (CAS = TAS, sea-level ISA). See tempAngle / paAngle.
  var WINDOW_C1 = 180 + 180 * Math.log10(T0); // ≈ 622.704

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function cToF(c) { return c * 9 / 5 + 32; }
  function fToC(f) { return (f - 32) * 5 / 9; }

  function wrapAngle(deg) {
    var x = deg % 360;
    if (x < 0) x += 360;
    return x;
  }

  /** Signed turn in (−180, 180] from one angle to another. */
  function shortestAngleDelta(fromDeg, toDeg) {
    var d = wrapAngle(toDeg) - wrapAngle(fromDeg);
    if (d > 180) d -= 360;
    if (d <= -180) d += 360;
    return d;
  }

  /**
   * Map a positive number onto [10, 100) — one trip around the E6B face.
   * 8.5, 85, and 850 all sit at the same tick.
   */
  function decadeNormalize(x) {
    if (!(x > 0) || !isFinite(x)) return NaN;
    var exp = Math.floor(Math.log10(x));
    var mant = x / Math.pow(10, exp);
    if (mant < 10) mant *= 10;
    if (mant >= 100 - 1e-12) mant = 10;
    return mant;
  }

  /**
   * Clockwise angle in degrees from the 10-index (top of the computer).
   * angle(10) = 0, angle(20) = 360 log10(2) ≈ 108.37, angle(60) ≈ 280.13.
   */
  function scaleAngle(x) {
    var v = decadeNormalize(x);
    if (!isFiniteNumber(v)) return NaN;
    return wrapAngle(360 * Math.log10(v / 10));
  }

  /** Inverse of scaleAngle for a value in a given decade (decadeBase * [1, 10)). */
  function valueFromAngle(angleDeg, decadeBase) {
    var base = isFiniteNumber(decadeBase) ? decadeBase : 10;
    return base * Math.pow(10, wrapAngle(angleDeg) / 360);
  }

  /**
   * Inner-disk rotation that places innerValue under outerValue.
   * Positive is clockwise, consistent with SVG/CSS rotate.
   */
  function diskRotationToAlign(innerValue, outerValue) {
    return shortestAngleDelta(scaleAngle(innerValue), scaleAngle(outerValue));
  }

  /**
   * After the disk is rotated by `rotationDeg`, the outer-scale value
   * sitting opposite an inner-scale value.
   */
  function outerOppositeInner(innerValue, rotationDeg, decadeBase) {
    return valueFromAngle(scaleAngle(innerValue) + rotationDeg, decadeBase);
  }

  function pointAtAngle(cx, cy, r, angleDeg) {
    var a = wrapAngle(angleDeg) * DEG;
    return {
      x: cx + r * Math.sin(a),
      y: cy - r * Math.cos(a)
    };
  }

  // --- Atmosphere -------------------------------------------------------

  function isaTempC(pressureAltitudeFt) {
    var h = pressureAltitudeFt * FT_M;
    if (h <= TROP_M) return (T0 - L * h) - 273.15;
    return TROP_T - 273.15;
  }

  function isaPressurePa(pressureAltitudeFt) {
    var h = pressureAltitudeFt * FT_M;
    if (h <= TROP_M) {
      return P0_PA * Math.pow(1 - L * h / T0, EXP);
    }
    return TROP_P * Math.exp(-G * (h - TROP_M) / (R * TROP_T));
  }

  function densityRatio(pressureAltitudeFt, oatC) {
    var tK = oatC + 273.15;
    if (!(tK > 0)) return NaN;
    var p = isaPressurePa(pressureAltitudeFt);
    return (p / P0_PA) * (T0 / tK);
  }

  /**
   * Density altitude (ft) from pressure altitude and OAT, dry air.
   * Tropospheric inversion below the tropopause density; isothermal
   * stratosphere (11–20 km) above that.
   */
  function densityAltitudeFt(pressureAltitudeFt, oatC) {
    var sigma = densityRatio(pressureAltitudeFt, oatC);
    if (!(sigma > 0)) return NaN;
    var tropSigma = (TROP_P / P0_PA) * (T0 / TROP_T);
    if (sigma >= tropSigma) {
      return T0_OVER_L_FT * (1 - Math.pow(sigma, DENSITY_EXP));
    }
    var rho = sigma * (P0_PA / (R * T0));
    var rhoTrop = TROP_P / (R * TROP_T);
    var hM = TROP_M + (R * TROP_T / G) * Math.log(rhoTrop / rho);
    return hM / FT_M;
  }

  function sigmaFromDensityAltitudeFt(daFt) {
    var h = daFt * FT_M;
    if (h <= TROP_M) {
      return Math.pow(1 - L * h / T0, EXP - 1);
    }
    var rhoTrop = TROP_P / (R * TROP_T);
    var rho0 = P0_PA / (R * T0);
    var rho = rhoTrop * Math.exp(-G * (h - TROP_M) / (R * TROP_T));
    return rho / rho0;
  }

  // --- TAS window geometry ---------------------------------------------

  /** Disk-local angle of an absolute temperature mark (° is on the rotating inner disk). */
  function tempAngle(tempK) {
    if (!(tempK > 0)) return NaN;
    return wrapAngle(WINDOW_C1 - 180 * Math.log10(tempK));
  }

  /** Fixed-plate angle of a pressure-altitude mark (thousands of feet sit on a ring). */
  function paAngle(pressureAltitudeFt) {
    var p = isaPressurePa(pressureAltitudeFt);
    if (!(p > 0)) return NaN;
    var delta = p / P0_PA;
    return wrapAngle(-180 * Math.log10(delta) - 180 * Math.log10(T0) + WINDOW_C1);
  }

  /**
   * Rotation of the inner disk that lines OAT up with pressure altitude
   * in the TAS window. Equals 360 log10(1/√σ) = −180 log10(σ).
   */
  function diskRotationForTasWindow(pressureAltitudeFt, oatC) {
    var sigma = densityRatio(pressureAltitudeFt, oatC);
    if (!(sigma > 0)) return NaN;
    return shortestAngleDelta(0, -180 * Math.log10(sigma));
  }

  /**
   * Incompressible / mechanical-E6B TAS. This is what the dial alignment
   * represents: TAS = CAS / √σ.
   */
  function tasE6bApproximate(casKt, pressureAltitudeFt, oatC) {
    var sigma = densityRatio(pressureAltitudeFt, oatC);
    if (!(sigma > 0) || !isFiniteNumber(casKt)) return NaN;
    return casKt / Math.sqrt(sigma);
  }

  function machFromCasPa(casMps, ambientPa) {
    if (!(casMps >= 0) || !(ambientPa > 0)) return NaN;
    var qcOverP0 = Math.pow(1 + 0.2 * Math.pow(casMps / A0, 2), 3.5) - 1;
    var qc = qcOverP0 * P0_PA;
    var ratio = qc / ambientPa + 1;
    if (ratio < 1) return NaN;
    var m2 = 5 * (Math.pow(ratio, 2 / 7) - 1);
    if (m2 < 0) return 0;
    return Math.sqrt(m2);
  }

  /**
   * Subsonic compressible TAS from CAS, pressure altitude, and OAT.
   * Same pitot-static relation as the true-airspeed calculator.
   */
  function tasCompressible(casKt, pressureAltitudeFt, oatC) {
    if (!(casKt >= 0) || !isFiniteNumber(pressureAltitudeFt) || !isFiniteNumber(oatC)) {
      return { error: "Enter calibrated airspeed, pressure altitude, and OAT." };
    }
    var tempK = oatC + 273.15;
    if (!(tempK > 0)) return { error: "Temperature must be above absolute zero." };
    var p = isaPressurePa(pressureAltitudeFt);
    var a = Math.sqrt(GAMMA * R * tempK);
    var mach = machFromCasPa(casKt * KT_MPS, p);
    if (!isFiniteNumber(mach)) {
      return { error: "Could not compute Mach from that airspeed and altitude." };
    }
    if (mach >= 1) {
      return { error: "The computed Mach number is 1 or greater. This page uses the subsonic formula only.", mach: mach };
    }
    var tasKt = (mach * a) / KT_MPS;
    var sigma = densityRatio(pressureAltitudeFt, oatC);
    var easKt = tasKt * Math.sqrt(sigma);
    var tasApprox = casKt / Math.sqrt(sigma);
    return {
      casKt: casKt,
      tasKt: tasKt,
      tasApproxKt: tasApprox,
      easKt: easKt,
      mach: mach,
      pressureAltitudeFt: pressureAltitudeFt,
      oatC: oatC,
      oatF: cToF(oatC),
      isaTempC: isaTempC(pressureAltitudeFt),
      isaDeviationC: oatC - isaTempC(pressureAltitudeFt),
      densityRatio: sigma,
      densityAltitudeFt: densityAltitudeFt(pressureAltitudeFt, oatC),
      speedOfSoundKt: a / KT_MPS,
      diskRotationDeg: diskRotationForTasWindow(pressureAltitudeFt, oatC),
      error: null
    };
  }

  // --- Time / speed / distance and fuel --------------------------------

  function parseTimeHours(input) {
    if (isFiniteNumber(input.timeHours) && !isFiniteNumber(input.timeMinutes)) {
      return input.timeHours;
    }
    var h = isFiniteNumber(input.timeHours) ? input.timeHours : 0;
    var m = isFiniteNumber(input.timeMinutes) ? input.timeMinutes : 0;
    if (isFiniteNumber(input.timeHours) || isFiniteNumber(input.timeMinutes)) {
      return h + m / 60;
    }
    return NaN;
  }

  function formatHms(timeHours) {
    if (!isFiniteNumber(timeHours) || timeHours < 0) return null;
    var totalMin = timeHours * 60;
    var hours = Math.floor(totalMin / 60 + 1e-10);
    var minutes = totalMin - hours * 60;
    // Keep a tidy display for values that are whole seconds or minutes.
    var minutesRounded = Math.round(minutes * 1e6) / 1e6;
    if (Math.abs(minutesRounded - 60) < 1e-8) {
      hours += 1;
      minutesRounded = 0;
    }
    return {
      hours: hours,
      minutes: minutesRounded,
      totalMinutes: totalMin,
      timeHours: timeHours
    };
  }

  /**
   * Solve any one of time, speed, and distance.
   * Units are consistent (typically kt and NM, or gph and gallons).
   */
  function solveProportion(input) {
    input = input || {};
    var speed = input.speed;
    var distance = input.distance;
    var timeHours = parseTimeHours(input);
    var solveFor = input.solveFor || "distance";

    if (solveFor === "distance") {
      if (!(speed > 0)) return { error: "Enter a speed or rate greater than zero." };
      if (!(timeHours > 0)) return { error: "Enter a time greater than zero." };
      distance = speed * timeHours;
    } else if (solveFor === "time") {
      if (!(speed > 0)) return { error: "Enter a speed or rate greater than zero." };
      if (!(distance > 0)) return { error: "Enter a distance or quantity greater than zero." };
      timeHours = distance / speed;
    } else if (solveFor === "speed") {
      if (!(timeHours > 0)) return { error: "Enter a time greater than zero." };
      if (!(distance > 0)) return { error: "Enter a distance or quantity greater than zero." };
      speed = distance / timeHours;
    } else {
      return { error: "Solve for time, speed, or distance." };
    }

    var rotationDeg = diskRotationToAlign(60, speed);
    var timeMin = timeHours * 60;
    var innerAnswer = timeMin;
    var outerAnswer = distance;
    // For a speed solution the rate index is already the answer (under the
    // distance, with time at the 60 index? Wait — standard E6B:
    //   Set rate index (60) under speed; time on inner, distance on outer.
    // When solving for speed: set time (inner) under distance (outer);
    //   read speed over the rate index.
    if (solveFor === "speed") {
      rotationDeg = diskRotationToAlign(timeMin, distance);
      innerAnswer = 60;
      outerAnswer = speed;
    }

    return {
      speed: speed,
      distance: distance,
      timeHours: timeHours,
      time: formatHms(timeHours),
      solveFor: solveFor,
      rotationDeg: rotationDeg,
      rateIndexOuter: outerOppositeInner(60, rotationDeg, decadeBaseFor(speed)),
      highlightInner: innerAnswer,
      highlightOuter: outerAnswer,
      highlightAngleDeg: scaleAngle(outerAnswer),
      error: null
    };
  }

  function decadeBaseFor(value) {
    if (!(value > 0)) return 10;
    var exp = Math.floor(Math.log10(value));
    // decadeBase is the value at the 10-tick in that decade, e.g. 10, 100, 1, 0.1
    var v = value / Math.pow(10, exp);
    if (v < 10) exp -= 1;
    return Math.pow(10, exp);
  }

  function solveTsd(input) {
    var result = solveProportion(input);
    if (result.error) return result;
    result.mode = "tsd";
    return result;
  }

  function solveFuel(input) {
    input = input || {};
    var mapped = {
      speed: input.rate,
      distance: input.fuel,
      timeHours: input.timeHours,
      timeMinutes: input.timeMinutes,
      solveFor: input.solveFor === "rate" ? "speed"
        : input.solveFor === "fuel" ? "distance"
        : input.solveFor || "distance"
    };
    var result = solveProportion(mapped);
    if (result.error) return result;
    result.mode = "fuel";
    result.rate = result.speed;
    result.fuel = result.distance;
    return result;
  }

  function solveTas(input) {
    input = input || {};
    var cas = input.casKt;
    var pa = input.pressureAltitudeFt;
    var oatC = input.oatC;
    if (!isFiniteNumber(oatC) && isFiniteNumber(input.oatF)) oatC = fToC(input.oatF);
    var out = tasCompressible(cas, pa, oatC);
    if (out.error && !isFiniteNumber(out.tasKt)) return out;
    out.mode = "tas";
    out.rotationDeg = out.diskRotationDeg;
    out.highlightInner = cas;
    out.highlightOuter = out.tasApproxKt;
    out.highlightAngleDeg = scaleAngle(out.tasApproxKt);
    return out;
  }

  function solveDensityAltitude(input) {
    input = input || {};
    var pa = input.pressureAltitudeFt;
    var oatC = input.oatC;
    if (!isFiniteNumber(oatC) && isFiniteNumber(input.oatF)) oatC = fToC(input.oatF);
    if (!isFiniteNumber(pa)) return { error: "Enter a pressure altitude." };
    if (!isFiniteNumber(oatC)) return { error: "Enter an outside air temperature." };
    var tempK = oatC + 273.15;
    if (!(tempK > 0)) return { error: "Temperature must be above absolute zero." };
    var sigma = densityRatio(pa, oatC);
    var da = densityAltitudeFt(pa, oatC);
    var isaC = isaTempC(pa);
    var rotationDeg = diskRotationForTasWindow(pa, oatC);
    return {
      mode: "da",
      pressureAltitudeFt: pa,
      oatC: oatC,
      oatF: cToF(oatC),
      isaTempC: isaC,
      isaDeviationC: oatC - isaC,
      densityRatio: sigma,
      densityAltitudeFt: da,
      ruleOfThumbDaFt: pa + 120 * (oatC - isaC),
      rotationDeg: rotationDeg,
      // The DA window is the highlighted answer; the rate-index alignment
      // is a side effect of the same window setting (TAS/CAS = 1/√σ).
      highlightInner: 10,
      highlightOuter: 10 / Math.sqrt(sigma),
      highlightAngleDeg: scaleAngle(10 / Math.sqrt(sigma)),
      error: null
    };
  }

  // --- Distance conversions --------------------------------------------

  var DIST_M = { nm: NM_M, sm: SM_M, km: KM_M };

  function convertDistance(value, fromUnit, toUnit) {
    var from = DIST_M[fromUnit];
    var to = DIST_M[toUnit];
    if (!from || !to || !(value >= 0) || !isFiniteNumber(value)) return NaN;
    return value * from / to;
  }

  /**
   * Conversion marks on the outer scale, used as labeled arrows.
   * Align the known quantity under its unit mark and read under the other.
   * NAUT is at 10, STAT at 11.5078, KM at 18.52 — the exact SI ratios.
   */
  var CONVERSION_MARKS = {
    nm: 10,
    sm: 10 * NM_PER_SM,
    km: 10 * NM_PER_KM
  };

  function solveConvert(input) {
    input = input || {};
    var value = input.value;
    var from = input.fromUnit || "nm";
    if (!isFiniteNumber(value) || value < 0) {
      return { error: "Enter a distance to convert." };
    }
    if (!DIST_M[from]) return { error: "Choose nautical miles, statute miles, or kilometres." };
    var nm = convertDistance(value, from, "nm");
    var sm = convertDistance(value, from, "sm");
    var km = convertDistance(value, from, "km");
    // Rotate so the known value on the inner scale sits under its unit mark
    // on the outer scale; the other marks then sit over the converted values.
    var fromMark = CONVERSION_MARKS[from];
    var rotationDeg = diskRotationToAlign(value, fromMark);
    var highlightUnit = from === "nm" ? "sm" : "nm";
    var highlightOuter = CONVERSION_MARKS[highlightUnit];
    var highlightInner = highlightUnit === "nm" ? nm : highlightUnit === "sm" ? sm : km;
    return {
      mode: "convert",
      value: value,
      fromUnit: from,
      nm: nm,
      sm: sm,
      km: km,
      rotationDeg: rotationDeg,
      highlightInner: highlightInner,
      highlightOuter: highlightOuter,
      highlightAngleDeg: scaleAngle(highlightOuter),
      marks: CONVERSION_MARKS,
      error: null
    };
  }

  // --- Off-course / 1-in-60 --------------------------------------------

  function solveOffCourse(input) {
    input = input || {};
    var flown = input.distanceFlown;
    var off = input.distanceOff;
    var deg = input.degreesOff;
    var solveFor = input.solveFor || "distanceOff";
    if (solveFor === "distanceOff") {
      if (!(flown > 0)) return { error: "Enter a distance flown greater than zero." };
      if (!isFiniteNumber(deg)) return { error: "Enter the number of degrees off course." };
      off = (Math.abs(deg) / 60) * flown;
    } else if (solveFor === "degreesOff") {
      if (!(flown > 0)) return { error: "Enter a distance flown greater than zero." };
      if (!isFiniteNumber(off)) return { error: "Enter the distance off course." };
      deg = 60 * (off / flown);
    } else if (solveFor === "distanceFlown") {
      if (!(Math.abs(deg) > 0)) return { error: "Enter the number of degrees off course." };
      if (!(off > 0)) return { error: "Enter the distance off course." };
      flown = off * 60 / Math.abs(deg);
    } else {
      return { error: "Solve for degrees off, distance off, or distance flown." };
    }
    // On the E6B this is the 60-index relation: set 60 under distance flown,
    // read distance off opposite degrees (or the inverse).
    var rotationDeg = diskRotationToAlign(60, flown);
    return {
      mode: "offcourse",
      distanceFlown: flown,
      distanceOff: off,
      degreesOff: deg,
      solveFor: solveFor,
      rotationDeg: rotationDeg,
      highlightInner: Math.abs(deg),
      highlightOuter: off,
      highlightAngleDeg: scaleAngle(off),
      error: null
    };
  }

  // --- Wind triangle (same convention as /e6b-wind/) -------------------

  function normalizeHeading(deg) {
    if (!isFiniteNumber(deg)) return NaN;
    var x = deg % 360;
    if (x < 0) x += 360;
    if (x === 0) return 360;
    return x;
  }

  function wrap180(deg) {
    var x = deg % 360;
    if (x > 180) x -= 360;
    if (x <= -180) x += 360;
    return x;
  }

  function courseWindComponents(courseDeg, windFromDeg, windSpeed) {
    var angle = wrap180(windFromDeg - courseDeg);
    var rad = angle * DEG;
    return {
      angleDeg: angle,
      crosswind: windSpeed * Math.sin(rad),
      headwind: windSpeed * Math.cos(rad)
    };
  }

  function solveWindTriangle(trueCourse, tas, windFrom, windSpeed) {
    if (![trueCourse, tas, windFrom, windSpeed].every(isFiniteNumber)) {
      return { error: "Enter course, true airspeed, wind direction, and wind speed." };
    }
    if (tas <= 0) return { error: "True airspeed must be greater than zero." };
    if (windSpeed < 0) return { error: "Wind speed cannot be negative." };

    var tc = normalizeHeading(trueCourse);
    var wd = normalizeHeading(windFrom);
    var comp = courseWindComponents(tc, wd, windSpeed);
    var xw = comp.crosswind;
    var hw = comp.headwind;

    if (Math.abs(xw) > tas + 1e-12) {
      return {
        error: "Crosswind is greater than true airspeed, so the course cannot be maintained.",
        trueCourse: tc,
        tas: tas,
        windFrom: wd,
        windSpeed: windSpeed,
        crosswind: xw,
        headwind: hw,
        windAngleDeg: comp.angleDeg,
        impossible: true
      };
    }

    var wca = Math.asin(Math.max(-1, Math.min(1, xw / tas))) / DEG;
    var th = normalizeHeading(tc + wca);
    var gs = Math.sqrt(Math.max(0, tas * tas - xw * xw)) - hw;
    var result = {
      mode: "wind",
      trueCourse: tc,
      tas: tas,
      windFrom: wd,
      windSpeed: windSpeed,
      windAngleDeg: comp.angleDeg,
      crosswind: xw,
      headwind: hw,
      wca: wca,
      trueHeading: th,
      groundspeed: gs,
      impossible: gs < 0,
      error: null
    };
    if (gs < 0) {
      result.error = "Computed groundspeed is negative — the headwind is stronger than the along-track airspeed. The course cannot be made good.";
    }
    return result;
  }

  /**
   * Position of the wind dot relative to the grommet, in a frame where
   * +y is toward the true index (up the card) and +x is to the right,
   * after the compass rose has been rotated so that `roseHeading` sits
   * under the true index. Units are the same as windSpeed (kt).
   *
   * The mark is always toward the wind-from mark on the rose, a distance
   * equal to the wind speed — the standard “plot the wind up from the
   * grommet” step. When the rose is then turned to the true course, the
   * same mark sits at the correct relative bearing.
   */
  function windDotOffset(windFrom, roseHeading, windSpeed) {
    var bearing = wrap180(windFrom - roseHeading);
    var rad = bearing * DEG;
    return {
      x: windSpeed * Math.sin(rad),
      y: windSpeed * Math.cos(rad),
      bearingDeg: bearing
    };
  }

  // Square-grid card readings (mechanical approximation):
  // grommet on TAS, speed increasing downward, wind plotted toward the
  // true index. The card GS is TAS minus the “up” component of the wind
  // (TAS − WS cos δ), and the card WCA is the angle whose tangent is
  // XW / TAS (or, on many cards, simply the labeled drift line through
  // the mark). These differ slightly from the exact trig answers.
  function cardApproximate(trueCourse, tas, windFrom, windSpeed) {
    var tc = normalizeHeading(trueCourse);
    var wd = normalizeHeading(windFrom);
    var comp = courseWindComponents(tc, wd, windSpeed);
    var gsCard = tas - comp.headwind;
    var wcaCard = Math.atan2(comp.crosswind, tas) / DEG;
    return { gsCard: gsCard, wcaCard: wcaCard };
  }

  var api = {
    T0: T0,
    L: L,
    P0_PA: P0_PA,
    P0_HPA: P0_HPA,
    G: G,
    R: R,
    GAMMA: GAMMA,
    EXP: EXP,
    DENSITY_EXP: DENSITY_EXP,
    TROP_M: TROP_M,
    TROP_P: TROP_P,
    TROP_T: TROP_T,
    FT_M: FT_M,
    T0_OVER_L_FT: T0_OVER_L_FT,
    A0: A0,
    A0_KT: A0_KT,
    NM_M: NM_M,
    SM_M: SM_M,
    KM_M: KM_M,
    NM_PER_SM: NM_PER_SM,
    NM_PER_KM: NM_PER_KM,
    WINDOW_C1: WINDOW_C1,
    CONVERSION_MARKS: CONVERSION_MARKS,
    isFiniteNumber: isFiniteNumber,
    cToF: cToF,
    fToC: fToC,
    wrapAngle: wrapAngle,
    shortestAngleDelta: shortestAngleDelta,
    decadeNormalize: decadeNormalize,
    scaleAngle: scaleAngle,
    valueFromAngle: valueFromAngle,
    diskRotationToAlign: diskRotationToAlign,
    outerOppositeInner: outerOppositeInner,
    pointAtAngle: pointAtAngle,
    decadeBaseFor: decadeBaseFor,
    isaTempC: isaTempC,
    isaPressurePa: isaPressurePa,
    densityRatio: densityRatio,
    densityAltitudeFt: densityAltitudeFt,
    sigmaFromDensityAltitudeFt: sigmaFromDensityAltitudeFt,
    tempAngle: tempAngle,
    paAngle: paAngle,
    diskRotationForTasWindow: diskRotationForTasWindow,
    tasE6bApproximate: tasE6bApproximate,
    tasCompressible: tasCompressible,
    parseTimeHours: parseTimeHours,
    formatHms: formatHms,
    solveTsd: solveTsd,
    solveFuel: solveFuel,
    solveTas: solveTas,
    solveDensityAltitude: solveDensityAltitude,
    convertDistance: convertDistance,
    solveConvert: solveConvert,
    solveOffCourse: solveOffCourse,
    normalizeHeading: normalizeHeading,
    wrap180: wrap180,
    courseWindComponents: courseWindComponents,
    solveWindTriangle: solveWindTriangle,
    windDotOffset: windDotOffset,
    cardApproximate: cardApproximate
  };

  root.E6BComputer = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

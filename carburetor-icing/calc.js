/**
 * Dewpoint, relative humidity, frost point, and carburetor-icing
 * potential from the FAA PHAK Figure 7-12 zones.
 *
 * Relative humidity uses the same Magnus / Bolton (1980) approximation
 * as this site's cloud-base calculator:
 *   es(t) = 6.112 × exp(17.67 t / (t + 243.5))   (t in °C, es in hPa)
 *   RH    = 100 × es(Td) / es(T)
 *
 * Frost point uses a Magnus formula over ice (Alduchov & Eskridge
 * style constants 21.87 and 265.5), inverted for the temperature at
 * which the current vapor pressure would saturate over a plane ice
 * surface. Frost point is slightly warmer than dewpoint when the
 * dewpoint is below 0 °C (ice saturates at a lower vapor pressure).
 *
 * PHAK Figure 7-12 (and the same chart in FAA training material):
 *   High carburetor icing potential:
 *     OAT 20–70 °F  and  RH 80–100 %
 *   Carburetor icing possible:
 *     OAT 20–100 °F and  RH ≥ 50 %
 * The caption states that icing is possible under conditions not
 * shown. AC 20-113 notes that a temperature–dewpoint spread of about
 * 20 °F or less corresponds roughly to RH of 50 % or more.
 *
 * Sources: FAA Pilot's Handbook of Aeronautical Knowledge, Figure
 * 7-12 (carburetor icing); AC 20-113; Bolton (1980) Magnus formula;
 * Alduchov & Eskridge ice-saturation constants for frost point.
 */
(function (root) {
  "use strict";

  // Water: Bolton 1980, matches cloud-base calculator.
  var A_W = 17.67, B_W = 243.5, EW0 = 6.112;
  // Ice: common Magnus pair (Alduchov-style).
  var A_I = 21.87, B_I = 265.5;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function cToF(c) { return c * 9 / 5 + 32; }
  function fToC(f) { return (f - 32) * 5 / 9; }

  function satWaterHpa(tC) {
    return EW0 * Math.exp((A_W * tC) / (tC + B_W));
  }
  function satIceHpa(tC) {
    return EW0 * Math.exp((A_I * tC) / (tC + B_I));
  }
  function invertMagnus(e, a, b) {
    if (!(e > 0)) return NaN;
    var x = Math.log(e / EW0);
    if (a - x === 0) return NaN;
    return (b * x) / (a - x);
  }

  function relativeHumidity(tC, tdC) {
    if (tdC > tC + 1e-9) return null;
    var es = satWaterHpa(tC);
    if (!(es > 0)) return null;
    var rh = 100 * satWaterHpa(tdC) / es;
    if (rh < 0) rh = 0;
    if (rh > 100) rh = 100;
    return rh;
  }

  function frostPointC(tdC) {
    // Vapor pressure from the dewpoint (saturation over liquid).
    var e = satWaterHpa(tdC);
    return invertMagnus(e, A_I, B_I);
  }

  /**
   * PHAK Fig 7-12 zones. "high" is a subset of "possible".
   * Returns "high" | "possible" | "outside"
   */
  function phakZone(tF, rh) {
    if (!isFiniteNumber(tF) || !isFiniteNumber(rh)) return null;
    var inHigh = tF >= 20 && tF <= 70 && rh >= 80 && rh <= 100 + 1e-9;
    var inPossible = tF >= 20 && tF <= 100 && rh >= 50;
    if (inHigh) return "high";
    if (inPossible) return "possible";
    return "outside";
  }

  function compute(input) {
    if (!input) return null;
    var tUnit = input.tempUnit || "C";
    var mode = input.mode || "dewpoint";
    var tRaw = Number(input.temperature);
    if (!isFiniteNumber(tRaw)) return null;
    var tC = (tUnit === "F" || tUnit === "f") ? fToC(tRaw) : tRaw;

    var tdC, rh;
    if (mode === "rh") {
      rh = Number(input.rh);
      if (!isFiniteNumber(rh) || rh <= 0 || rh > 100) return null;
      tdC = invertMagnus(satWaterHpa(tC) * (rh / 100), A_W, B_W);
    } else {
      var tdRaw = Number(input.dewpoint);
      if (!isFiniteNumber(tdRaw)) return null;
      tdC = (tUnit === "F" || tUnit === "f") ? fToC(tdRaw) : tdRaw;
      if (tdC > tC + 1e-6) return null;
      rh = relativeHumidity(tC, tdC);
      if (rh == null) return null;
    }
    if (!isFiniteNumber(tdC) || !isFiniteNumber(rh)) return null;

    var tF = cToF(tC);
    var tdF = cToF(tdC);
    var fpC = frostPointC(tdC);
    var spreadC = tC - tdC;
    var spreadF = tF - tdF;
    var zone = phakZone(tF, rh);
    var ac20113 = spreadF <= 20 + 1e-9; // roughly RH ≳ 50 %

    return {
      temperatureC: tC,
      temperatureF: tF,
      dewpointC: tdC,
      dewpointF: tdF,
      frostPointC: fpC,
      frostPointF: isFiniteNumber(fpC) ? cToF(fpC) : NaN,
      relativeHumidity: rh,
      spreadC: spreadC,
      spreadF: spreadF,
      phakZone: zone,
      ac20_113Spread: ac20113,
      zoneLabel: zone === "high"
        ? "High carburetor icing potential (PHAK Fig. 7-12)"
        : zone === "possible"
          ? "Carburetor icing possible (PHAK Fig. 7-12)"
          : "Outside the PHAK Fig. 7-12 shaded zones (icing still not ruled out)"
    };
  }

  var api = {
    satWaterHpa: satWaterHpa,
    satIceHpa: satIceHpa,
    relativeHumidity: relativeHumidity,
    frostPointC: frostPointC,
    phakZone: phakZone,
    compute: compute,
    cToF: cToF,
    fToC: fToC
  };
  root.CarburetorIcingCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

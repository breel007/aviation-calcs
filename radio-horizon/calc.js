/**
 * Geometric and radio line-of-sight horizon range, including the
 * common aviation “4/3 Earth” radio-horizon rule of thumb.
 *
 * Geometric horizon (k = 1, spherical Earth of radius R):
 *   d = √(2 R h + h²)   ≈ √(2 R h)   when h ≪ R
 *
 * Standard radio / radar horizon uses an effective-Earth factor
 * k = 4/3 to approximate average atmospheric refraction:
 *   d = √(2 k R h + h²)
 *
 * For two antennas the ranges add. In nautical miles with height in
 * feet, the small-height 4/3-Earth approximation is the familiar
 *   d_NM ≈ 1.23 ( √h1_ft + √h2_ft )
 * and the geometric (k = 1) cousin is about 1.06 √h_ft. Both the exact
 * √(2 k R h + h²) result and the 1.23-rule are reported.
 *
 * Default R is the mean spherical Earth 6,371 km. This is a smooth-
 * Earth, standard-refraction estimate — not a terrain, ducting, or
 * link-budget calculation.
 *
 * Sources: FAA Aeronautical Information Manual (radio line-of-sight /
 * VHF communications range, the 1.23 √h memory item as commonly
 * taught); ITU-R / standard 4/3-Earth radio horizon; FAA Pilot's
 * Handbook of Aeronautical Knowledge (VHF line-of-sight).
 */
(function (root) {
  "use strict";

  var R_MEAN_M = 6371000;
  var M_PER_NM = 1852;
  var M_PER_FT = 0.3048;
  var K_RADIO = 4 / 3;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function toM(h, unit) {
    if (!isFiniteNumber(h) || h < 0) return NaN;
    if (unit === "ft") return h * M_PER_FT;
    if (unit === "km") return h * 1000;
    if (unit === "nm") return h * M_PER_NM;
    return h;
  }

  function horizonM(h, k, R) {
    if (h === 0) return 0;
    return Math.sqrt(2 * k * R * h + h * h);
  }

  function compute(input) {
    if (!input) return null;
    var unit = input.altUnit || "ft";
    var h1 = toM(Number(input.height1), unit);
    if (!isFiniteNumber(h1) || h1 < 0) return null;
    var h2 = 0;
    if (input.height2 != null && input.height2 !== "") {
      h2 = toM(Number(input.height2), unit);
      if (!isFiniteNumber(h2) || h2 < 0) return null;
    }
    var R = input.radiusM != null && input.radiusM !== ""
      ? Number(input.radiusM) : R_MEAN_M;
    if (!(R > 0)) return null;

    var radio1 = horizonM(h1, K_RADIO, R);
    var radio2 = horizonM(h2, K_RADIO, R);
    var geo1 = horizonM(h1, 1, R);
    var geo2 = horizonM(h2, 1, R);
    var h1Ft = h1 / M_PER_FT;
    var h2Ft = h2 / M_PER_FT;
    var ruleRadioNm = 1.23 * (Math.sqrt(h1Ft) + Math.sqrt(h2Ft));
    var ruleGeoNm = 1.06 * (Math.sqrt(h1Ft) + Math.sqrt(h2Ft));

    return {
      height1M: h1,
      height2M: h2,
      height1Ft: h1Ft,
      height2Ft: h2Ft,
      radiusM: R,
      kRadio: K_RADIO,
      radioM: radio1 + radio2,
      radioNm: (radio1 + radio2) / M_PER_NM,
      radioKm: (radio1 + radio2) / 1000,
      radio1Nm: radio1 / M_PER_NM,
      radio2Nm: radio2 / M_PER_NM,
      geometricM: geo1 + geo2,
      geometricNm: (geo1 + geo2) / M_PER_NM,
      rule123Nm: ruleRadioNm,
      rule106Nm: ruleGeoNm
    };
  }

  var api = { R_MEAN_M: R_MEAN_M, K_RADIO: K_RADIO, horizonM: horizonM, compute: compute };
  root.RadioHorizonCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

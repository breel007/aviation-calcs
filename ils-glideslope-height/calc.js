/**
 * Height on an ILS (or LPV / visual) glide path relative to the
 * threshold crossing height.
 *
 *   h = TCH + x · tan θ
 *
 * x is the distance *before* the threshold (positive on short final).
 * θ is the published glide-path angle (usually 3°). TCH is the
 * published threshold crossing height (often about 50–60 ft). At the
 * threshold, x = 0 and h = TCH. One nautical mile before a 3.00° path
 * is 318.4 ft of path height plus the TCH (tan 3° × 6,076.115 ft).
 *
 * An optional DME (or GPS) antenna offset, measured from the threshold
 * toward the far end (typical glide-slope antenna is on the order of
 * 750–1,000+ ft past the threshold), converts a DME distance into x.
 * Descent rate at a given groundspeed is the same identity used on
 * this site's descent-rate calculator: fpm = GS × 6076.115 × tan θ / 60.
 *
 * Sources: FAA Instrument Flying Handbook (ILS, TCH, glide path);
 * FAA Instrument Procedures Handbook; AIM / TERPS 3° glide path;
 * this site's descent-rate and VDP calculators (same path geometry).
 */
(function (root) {
  "use strict";

  var FT_PER_NM = 1852 / 0.3048;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function toNm(x, unit) {
    if (!isFiniteNumber(x)) return NaN;
    if (unit === "ft") return x / FT_PER_NM;
    if (unit === "m") return (x / 0.3048) / FT_PER_NM;
    if (unit === "km") return (x * 1000 / 0.3048) / FT_PER_NM;
    if (unit === "sm") return (x * 1609.344) / 1852;
    return x;
  }
  function toFt(h, unit) {
    if (!isFiniteNumber(h) || h < 0) return NaN;
    if (unit === "m") return h / 0.3048;
    return h;
  }

  function compute(input) {
    if (!input) return null;
    var theta = input.angle == null || input.angle === "" ? 3 : Number(input.angle);
    if (!isFiniteNumber(theta) || theta <= 0 || theta >= 90) return null;
    var tch = toFt(input.tch == null || input.tch === "" ? 50 : Number(input.tch), input.tchUnit || "ft");
    if (!isFiniteNumber(tch) || tch < 0) return null;

    var mode = input.mode || "distance";
    var tanT = Math.tan(theta * Math.PI / 180);
    var ftPerNm = FT_PER_NM * tanT;

    var offsetNm = 0;
    if (input.antennaOffset != null && input.antennaOffset !== "") {
      offsetNm = toNm(Number(input.antennaOffset), input.offsetUnit || "ft");
      if (!isFiniteNumber(offsetNm) || offsetNm < 0) return null;
    }

    var xNm, heightFt, dmeNm = null;
    if (mode === "height") {
      heightFt = toFt(Number(input.height), input.heightUnit || "ft");
      if (!isFiniteNumber(heightFt)) return null;
      xNm = (heightFt - tch) / ftPerNm;
    } else {
      var raw = Number(input.distance);
      if (!isFiniteNumber(raw)) return null;
      if (input.distanceIsDme) {
        dmeNm = toNm(raw, input.distUnit || "nm");
        if (!isFiniteNumber(dmeNm) || dmeNm < 0) return null;
        xNm = dmeNm - offsetNm;
      } else {
        xNm = toNm(raw, input.distUnit || "nm");
        if (!isFiniteNumber(xNm)) return null;
        dmeNm = xNm + offsetNm;
      }
      heightFt = tch + xNm * ftPerNm;
    }

    var gs = null, fpm = null;
    if (input.groundspeed != null && input.groundspeed !== "") {
      gs = Number(input.groundspeed);
      if (!isFiniteNumber(gs) || gs < 0) return null;
      fpm = gs * ftPerNm / 60;
    }

    return {
      angleDeg: theta,
      tchFt: tch,
      distanceToThresholdNm: xNm,
      distanceToThresholdFt: xNm * FT_PER_NM,
      heightFt: heightFt,
      heightM: heightFt * 0.3048,
      ftPerNm: ftPerNm,
      antennaOffsetNm: offsetNm,
      dmeNm: dmeNm,
      groundspeedKt: gs,
      descentFpm: fpm,
      pastThreshold: xNm < 0
    };
  }

  var api = { FT_PER_NM: FT_PER_NM, compute: compute };
  root.IlsGlideslopeHeightCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

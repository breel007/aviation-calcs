/**
 * Center of gravity as a percent of mean aerodynamic chord (% MAC),
 * and the inverse (station from a % MAC).
 *
 *   % MAC = (CG station − LEMAC) / MAC × 100
 *   CG station = LEMAC + (% MAC / 100) × MAC
 *   TEMAC = LEMAC + MAC
 *
 * For a linearly tapered wing, the same MAC used on this site's wing-
 * loading calculator is available as a helper:
 *   MAC = (2/3) c_root (1 + τ + τ²) / (1 + τ),   τ = c_tip / c_root
 * and the spanwise station of the MAC, measured from the root, is
 *   y_MAC = (b/6) (1 + 2τ) / (1 + τ)
 * The leading-edge station of the MAC (LEMAC) still has to come from
 * the airframe geometry (root leading-edge station plus any sweep).
 *
 * Sources: FAA Pilot's Handbook of Aeronautical Knowledge (Ch. 10,
 * Weight and Balance — CG as percent of MAC); FAA-H-8083-1 Weight and
 * Balance Handbook; standard tapered-wing MAC (also NACA / any aircraft
 * design text).
 */
(function (root) {
  "use strict";

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function taperedMac(rootChord, tipChord) {
    if (!isFiniteNumber(rootChord) || !isFiniteNumber(tipChord)) return null;
    if (rootChord <= 0 || tipChord < 0 || tipChord > rootChord) return null;
    var tau = tipChord / rootChord;
    if (tau === 1) return rootChord;
    return (2 / 3) * rootChord * (1 + tau + tau * tau) / (1 + tau);
  }

  function yMacFromRoot(span, taper) {
    if (!isFiniteNumber(span) || !isFiniteNumber(taper)) return null;
    if (span <= 0 || taper < 0 || taper > 1) return null;
    return (span / 6) * (1 + 2 * taper) / (1 + taper);
  }

  function compute(input) {
    if (!input) return null;
    var mode = input.mode || "from-cg";
    var lemac = Number(input.lemac);
    var mac = Number(input.mac);
    if (!isFiniteNumber(lemac) || !isFiniteNumber(mac) || mac <= 0) return null;

    var temac = lemac + mac;
    var cg, pct;
    if (mode === "from-percent") {
      pct = Number(input.percentMac);
      if (!isFiniteNumber(pct)) return null;
      cg = lemac + (pct / 100) * mac;
    } else {
      cg = Number(input.cg);
      if (!isFiniteNumber(cg)) return null;
      pct = (cg - lemac) / mac * 100;
    }

    var fwd = input.fwdLimit == null || input.fwdLimit === "" ? null : Number(input.fwdLimit);
    var aft = input.aftLimit == null || input.aftLimit === "" ? null : Number(input.aftLimit);
    var within = null;
    if (isFiniteNumber(fwd) && isFiniteNumber(aft)) {
      var lo = Math.min(fwd, aft), hi = Math.max(fwd, aft);
      within = pct >= lo && pct <= hi;
    }

    var geo = null;
    if (input.rootChord != null && input.rootChord !== "" &&
        input.tipChord != null && input.tipChord !== "") {
      var macGeo = taperedMac(Number(input.rootChord), Number(input.tipChord));
      if (macGeo != null) {
        var taper = Number(input.tipChord) / Number(input.rootChord);
        var span = input.span == null || input.span === "" ? null : Number(input.span);
        geo = {
          mac: macGeo,
          taper: taper,
          yMac: isFiniteNumber(span) ? yMacFromRoot(span, taper) : null
        };
      }
    }

    return {
      mode: mode,
      cg: cg,
      lemac: lemac,
      temac: temac,
      mac: mac,
      percentMac: pct,
      fwdLimit: isFiniteNumber(fwd) ? fwd : null,
      aftLimit: isFiniteNumber(aft) ? aft : null,
      withinLimits: within,
      geometry: geo
    };
  }

  var api = {
    taperedMac: taperedMac,
    yMacFromRoot: yMacFromRoot,
    compute: compute
  };
  root.CgPercentMacCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

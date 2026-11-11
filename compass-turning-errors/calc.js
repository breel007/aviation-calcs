/**
 * Magnetic dip (dipole approximation) and the qualitative compass
 * turning and acceleration errors taught as UNOS / ANDS.
 *
 * A centered dipole field has dip (inclination) I related to magnetic
 * latitude λ by
 *   tan I = 2 tan λ.
 * Geographic latitude is used here only as a stand-in for magnetic
 * latitude; the magnetic and geographic equators do not coincide, so
 * the dip is an estimate, not a charted value.
 *
 * Turning error (northern hemisphere): the vertical component of the
 * Earth's field makes the compass lag when turning through north and
 * lead when turning through south. The memory item is UNOS — Undershoot
 * North, Overshoot South — meaning you roll out early when rolling out
 * on a northerly heading and late when rolling out on a southerly
 * heading. In the southern hemisphere the sense reverses (OSUN).
 *
 * Acceleration error (northern hemisphere): on an easterly or westerly
 * heading, acceleration makes the compass indicate a turn toward north
 * and deceleration toward south (ANDS). The sense again reverses south
 * of the magnetic equator. These errors vanish on a heading of north or
 * south, and they vanish at the magnetic equator (I = 0). This page
 * does not invent a number of degrees of lag or lead; the magnitude
 * depends on the compass, the bank, and the rate, and is not a single
 * published formula.
 *
 * Sources: FAA Pilot's Handbook of Aeronautical Knowledge (magnetic
 * compass, dip, turning and acceleration errors, UNOS / ANDS);
 * FAA Airplane Flying Handbook (compass turns); standard dipole
 * inclination tan I = 2 tan λ (e.g. Bartels / Chapman, Geomagnetism).
 */
(function (root) {
  "use strict";

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }
  function toRad(d) { return d * Math.PI / 180; }
  function toDeg(r) { return r * 180 / Math.PI; }
  function wrap360(deg) {
    var x = deg % 360;
    if (x < 0) x += 360;
    if (Math.abs(x - 360) < 1e-12) x = 0;
    return x;
  }

  function dipFromLatitude(latDeg) {
    if (!isFiniteNumber(latDeg) || Math.abs(latDeg) > 90) return null;
    if (Math.abs(Math.abs(latDeg) - 90) < 1e-12) return latDeg > 0 ? 90 : -90;
    return toDeg(Math.atan(2 * Math.tan(toRad(latDeg))));
  }

  function sector(heading) {
    var h = wrap360(heading);
    // Cardinal sectors used in the PHAK discussion: northerly / southerly
    // / easterly / westerly. "Northerly" here is the 90° arc centered on
    // north (315–045), likewise for the other cardinals.
    if (h >= 315 || h < 45) return "north";
    if (h >= 45 && h < 135) return "east";
    if (h >= 135 && h < 225) return "south";
    return "west";
  }

  function compute(input) {
    if (!input) return null;
    var lat = Number(input.latitude);
    if (!isFiniteNumber(lat) || Math.abs(lat) > 90) return null;
    var dip = dipFromLatitude(lat);
    var hemisphere = Math.abs(lat) < 1e-12 ? "equator" : (lat > 0 ? "north" : "south");
    var turnRule = hemisphere === "equator" ? "none"
      : (hemisphere === "north" ? "UNOS" : "OSUN");
    var accelRule = hemisphere === "equator" ? "none"
      : (hemisphere === "north" ? "ANDS" : "SAND");

    var heading = null, rollout = null, accel = null;
    if (input.heading != null && input.heading !== "") {
      heading = Number(input.heading);
      if (!isFiniteNumber(heading)) return null;
      heading = wrap360(heading);
      var sec = sector(heading);
      if (hemisphere === "equator" || Math.abs(dip) < 1e-9) {
        rollout = { action: "on heading", reason: "At the magnetic equator dip is zero, so there is no turning error to lead or lag the compass." };
        accel = { effect: "none", reason: "Acceleration error also vanishes at the magnetic equator." };
      } else if (sec === "north" || sec === "south") {
        var undershootNorth = hemisphere === "north";
        var early = (sec === "north") ? undershootNorth : !undershootNorth;
        rollout = {
          action: early ? "roll out early (undershoot the compass)" : "roll out late (overshoot the compass)",
          reason: hemisphere === "north"
            ? (sec === "north"
              ? "UNOS: in the northern hemisphere, roll out before the compass reaches a northerly heading (the compass lags through north)."
              : "UNOS: in the northern hemisphere, roll out after the compass passes a southerly heading (the compass leads through south).")
            : (sec === "north"
              ? "OSUN: in the southern hemisphere, roll out after the compass passes a northerly heading."
              : "OSUN: in the southern hemisphere, roll out before the compass reaches a southerly heading.")
        };
        accel = { effect: "none on this heading", reason: "Acceleration error is a factor on easterly and westerly headings, not on north or south." };
      } else {
        rollout = {
          action: "turning error is smallest on east or west",
          reason: "The PHAK turning-error discussion is about roll-out on northerly and southerly headings. Dip error is least on east and west."
        };
        var towardNorthOnAccel = hemisphere === "north";
        accel = {
          effect: towardNorthOnAccel
            ? "ANDS: acceleration indicates a turn toward north; deceleration toward south"
            : "SAND: acceleration indicates a turn toward south; deceleration toward north",
          reason: "On an easterly or westerly heading the compass card tilts and the vertical component of the Earth's field pulls the north-seeking end."
        };
      }
    }

    return {
      latitudeDeg: lat,
      dipDeg: dip,
      hemisphere: hemisphere,
      turnRule: turnRule,
      accelerationRule: accelRule,
      heading: heading,
      headingSector: heading == null ? null : sector(heading),
      rollout: rollout,
      acceleration: accel
    };
  }

  var api = { dipFromLatitude: dipFromLatitude, sector: sector, compute: compute };
  root.CompassTurningErrorsCalcs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

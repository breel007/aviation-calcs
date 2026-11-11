/**
 * Aviation Calcs — site configuration.
 *
 * This is the single place to change the public site URL.
 * When moving to a custom domain (for example https://aviatorcalcs.com):
 *   1. Set `baseUrl` below (no trailing slash).
 *   2. Run:  node scripts/write-site-files.js
 * That regenerates sitemap.xml and robots.txt, and updates canonical
 * and Open Graph URLs in every HTML page.
 */
(function (root) {
  "use strict";

  var SITE = {
    name: "Aviation Calcs",
    baseUrl: "https://aviatorcalcs.com",
    pages: [
      { path: "/", title: "Home", changefreq: "weekly", priority: "1.0" },
      { path: "/density-altitude/", title: "Density altitude calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/crosswind/", title: "Crosswind component calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/weight-balance/", title: "Weight and balance calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/e6b-wind/", title: "E6B wind triangle calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/fuel-planning/", title: "Aviation fuel planner", changefreq: "monthly", priority: "0.9" },
      { path: "/aviation-unit-converter/", title: "Aviation unit converter", changefreq: "monthly", priority: "0.9" },
      { path: "/true-airspeed/", title: "True airspeed calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/time-speed-distance/", title: "Time, speed and distance calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/top-of-descent/", title: "Top of descent calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/metar-decoder/", title: "METAR decoder", changefreq: "monthly", priority: "0.9" },
      { path: "/taf-decoder/", title: "TAF decoder", changefreq: "monthly", priority: "0.9" },
      { path: "/pilot-currency/", title: "FAA pilot currency checker", changefreq: "monthly", priority: "0.9" },
      { path: "/turn-radius/", title: "Turn radius calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/aircraft-ownership-cost/", title: "Aircraft ownership cost calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/aircraft-loan/", title: "Aircraft loan calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/flight-training-cost/", title: "Flight training cost calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/rental-cost/", title: "Aircraft rental cost calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/glide-distance/", title: "Glide distance calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/cloud-base/", title: "Cloud base calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/sunrise-sunset-twilight/", title: "Sunrise, sunset and FAA night calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/zulu-time-converter/", title: "Zulu time converter", changefreq: "monthly", priority: "0.9" },
      { path: "/holding-pattern-entry/", title: "Holding pattern entry calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/climb-gradient/", title: "Climb gradient calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/standard-atmosphere/", title: "Standard atmosphere calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/pressure-altitude/", title: "Pressure altitude calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/true-altitude/", title: "True altitude calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/reynolds-number/", title: "Reynolds number calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/mach-dynamic-pressure/", title: "Mach number and dynamic pressure calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/lift-drag-coefficient/", title: "Lift and drag coefficient calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/wing-loading-aspect-ratio/", title: "Wing loading and aspect ratio calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/isentropic-flow/", title: "Isentropic flow calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/normal-shock/", title: "Normal shock calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/rocket-equation/", title: "Rocket equation calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/orbital-velocity-period/", title: "Orbital velocity and period calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/hohmann-transfer/", title: "Hohmann transfer calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/breguet-range-endurance/", title: "Breguet range and endurance calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/visual-descent-point/", title: "Visual descent point calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/vor-dme-1-in-60/", title: "VOR / DME and 1-in-60 rule calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/fuel-weight/", title: "Aviation fuel weight calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/oxygen-requirements/", title: "Aircraft oxygen requirements calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/maneuvering-speed-weight/", title: "Maneuvering speed vs weight calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/stall-speed-weight-bank/", title: "Stall speed vs weight and bank calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/point-of-no-return/", title: "Point of no return and equal time point calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/weather-go-no-go/", title: "Route weather go / no-go climatology", changefreq: "monthly", priority: "0.9" },
      { path: "/descent-rate/", title: "Descent rate and glideslope VSI calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/takeoff-landing-distance/", title: "Takeoff and landing distance correction calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/runway-selection/", title: "Runway selection calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/hydroplaning-speed/", title: "Hydroplaning speed calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/cg-percent-mac/", title: "CG percent MAC calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/pivotal-altitude/", title: "Pivotal altitude calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/cold-temperature-correction/", title: "Cold temperature altitude correction calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/fuel-cost/", title: "Aviation fuel cost calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/drag-polar/", title: "Drag polar and L/D max calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/propeller-advance-ratio/", title: "Propeller advance ratio and tip Mach calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/specific-impulse/", title: "Specific impulse calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/oblique-shock/", title: "Oblique shock calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/prandtl-meyer/", title: "Prandtl–Meyer expansion calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/rvr-visibility/", title: "RVR to visibility calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/thrust-power-required/", title: "Thrust and power required calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/approach-speed/", title: "Approach and landing speed calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/true-magnetic-heading/", title: "True and magnetic heading calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/carburetor-icing/", title: "Carburetor icing, dewpoint and frost point calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/heat-index/", title: "Heat index calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/time-to-turn/", title: "Time to turn calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/pull-up-load-factor/", title: "Pull-up load factor calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/cd-nozzle/", title: "Convergent-divergent nozzle calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/satellite-fov/", title: "Satellite footprint and field-of-view calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/logbook-time/", title: "Pilot logbook time totals calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/delta-v-budget/", title: "Delta-v budget calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/terminal-velocity/", title: "Terminal velocity and ballistic re-entry calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/about.html", title: "About", changefreq: "yearly", priority: "0.4" },
      { path: "/privacy.html", title: "Privacy policy", changefreq: "yearly", priority: "0.3" }
    ]
  };

  function origin() {
    return SITE.baseUrl.replace(/\/+$/, "");
  }

  function absoluteUrl(path) {
    var p = path || "/";
    if (!/^\//.test(p)) p = "/" + p;
    return origin() + p;
  }

  SITE.origin = origin;
  SITE.absoluteUrl = absoluteUrl;

  root.AviationCalcsSite = SITE;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = SITE;
  }
})(typeof window !== "undefined" ? window : globalThis);

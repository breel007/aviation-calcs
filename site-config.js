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
      { path: "/e6b-flight-computer/", title: "E6B flight computer", changefreq: "monthly", priority: "0.9" },
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
      { path: "/great-circle-distance/", title: "Great-circle distance calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/wind-chill/", title: "Wind chill calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/thunderstorm-distance/", title: "Thunderstorm flash-to-bang distance calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/radio-horizon/", title: "Radio horizon and VHF range calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/ils-glideslope-height/", title: "ILS glideslope height calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/flight-level/", title: "Flight level and transition calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/wake-turbulence-separation/", title: "Wake turbulence separation calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/inflight-fuel-eta/", title: "In-flight fuel and ETA calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/compass-turning-errors/", title: "Compass turning errors calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/accelerate-stop/", title: "Accelerate-stop distance calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/service-ceiling/", title: "Service ceiling calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/wind-shear-gradient/", title: "Wind shear and gradient calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/maccready/", title: "MacCready speed-to-fly calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/balloon-lift/", title: "Hot-air balloon lift calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/parachute-descent/", title: "Parachute descent calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/drone-flight-time/", title: "Drone and multirotor flight time calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/electric-aircraft-endurance/", title: "Electric aircraft endurance calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/propeller-static-thrust/", title: "Propeller static thrust calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/hover-power/", title: "Hover power and disk loading calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/rotor-tip-speed/", title: "Rotor tip speed calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/crossover-altitude/", title: "Vmo/Mmo crossover altitude calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/thin-airfoil-lift/", title: "Thin-airfoil lift calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/lift-slope-ar/", title: "Finite-wing lift-slope calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/fanno-flow/", title: "Fanno flow calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/rayleigh-flow/", title: "Rayleigh flow calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/jet-engine-thrust/", title: "Jet engine thrust calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/brayton-cycle/", title: "Brayton cycle efficiency calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/sun-synchronous/", title: "Sun-synchronous orbit inclination calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/synodic-period/", title: "Synodic period calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/planetary-transfer/", title: "Planetary Hohmann transfer calculator", changefreq: "monthly", priority: "0.9" },
      { path: "/about.html", title: "About", changefreq: "yearly", priority: "0.4" },
      { path: "/privacy.html", title: "Privacy policy", changefreq: "yearly", priority: "0.3" }
    ],
    // Catalog order for the home page (and README). Some slugs appear in more than one group.
    groups: [
      { side: "pilot", id: "flight-planning", heading: "Flight Planning & Navigation", slugs: ["e6b-flight-computer", "time-speed-distance", "great-circle-distance", "e6b-wind", "fuel-planning", "inflight-fuel-eta", "aviation-unit-converter", "true-magnetic-heading", "compass-turning-errors", "top-of-descent", "descent-rate", "ils-glideslope-height", "holding-pattern-entry", "climb-gradient", "glide-distance", "maccready", "turn-radius", "time-to-turn", "visual-descent-point", "rvr-visibility", "wake-turbulence-separation", "vor-dme-1-in-60", "radio-horizon", "point-of-no-return", "true-altitude", "flight-level", "cold-temperature-correction", "weather-go-no-go"] },
      { side: "pilot", id: "performance", heading: "Performance", slugs: ["density-altitude", "takeoff-landing-distance", "accelerate-stop", "approach-speed", "crosswind", "runway-selection", "weight-balance", "cg-percent-mac", "true-airspeed", "crossover-altitude", "service-ceiling", "hydroplaning-speed", "stall-speed-weight-bank", "maneuvering-speed-weight", "pull-up-load-factor", "pivotal-altitude", "fuel-weight", "drone-flight-time", "drag-polar", "maccready", "parachute-descent", "balloon-lift", "thrust-power-required", "breguet-range-endurance", "electric-aircraft-endurance"] },
      { side: "pilot", id: "weather", heading: "Weather & Time", slugs: ["metar-decoder", "taf-decoder", "rvr-visibility", "pressure-altitude", "flight-level", "cloud-base", "carburetor-icing", "thunderstorm-distance", "heat-index", "wind-chill", "wind-shear-gradient", "zulu-time-converter", "sunrise-sunset-twilight", "standard-atmosphere", "true-altitude", "cold-temperature-correction", "weather-go-no-go"] },
      { side: "pilot", id: "costs", heading: "Regs, Currency & Costs", slugs: ["flight-training-cost", "aircraft-ownership-cost", "rental-cost", "fuel-cost", "aircraft-loan", "logbook-time", "pilot-currency", "oxygen-requirements"] },
      { side: "engineering", id: "atmosphere", heading: "Atmosphere", slugs: ["standard-atmosphere", "density-altitude", "pressure-altitude", "aviation-unit-converter"] },
      { side: "engineering", id: "aerodynamics", heading: "Aerodynamics", slugs: ["mach-dynamic-pressure", "reynolds-number", "lift-drag-coefficient", "thin-airfoil-lift", "terminal-velocity", "parachute-descent", "wing-loading-aspect-ratio", "lift-slope-ar", "drag-polar", "thrust-power-required", "cg-percent-mac", "isentropic-flow", "cd-nozzle", "normal-shock", "oblique-shock", "prandtl-meyer", "fanno-flow", "rayleigh-flow", "stall-speed-weight-bank", "true-airspeed", "turn-radius", "pull-up-load-factor"] },
      { side: "engineering", id: "propulsion", heading: "Propulsion", slugs: ["specific-impulse", "jet-engine-thrust", "brayton-cycle", "rocket-equation", "delta-v-budget", "breguet-range-endurance", "electric-aircraft-endurance", "thrust-power-required", "propeller-advance-ratio", "propeller-static-thrust", "hover-power", "rotor-tip-speed", "isentropic-flow", "cd-nozzle"] },
      { side: "engineering", id: "space", heading: "Space", slugs: ["orbital-velocity-period", "satellite-fov", "sun-synchronous", "hohmann-transfer", "planetary-transfer", "synodic-period", "delta-v-budget", "rocket-equation", "specific-impulse", "terminal-velocity"] }
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

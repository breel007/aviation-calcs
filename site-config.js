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

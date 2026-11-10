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

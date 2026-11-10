#!/usr/bin/env node
/**
 * Generate sitemap.xml and robots.txt from site-config.js,
 * and keep canonical / og:url / og:image tags in HTML in sync
 * with the configured base URL.
 *
 * Usage:  node scripts/write-site-files.js
 */
"use strict";

var fs = require("fs");
var path = require("path");
var SITE = require("../site-config.js");

var root = path.join(__dirname, "..");
var origin = SITE.origin();
var today = new Date().toISOString().slice(0, 10);

var KNOWN_HOST_PREFIXES = [
  "https://breel007.github.io/aviation-calcs",
  "http://breel007.github.io/aviation-calcs",
  "https://aviatorcalcs.com",
  "http://aviatorcalcs.com",
  "https://www.aviatorcalcs.com",
  "http://www.aviatorcalcs.com"
];

function writeSitemap() {
  var urls = SITE.pages.map(function (p) {
    return [
      "  <url>",
      "    <loc>" + SITE.absoluteUrl(p.path) + "</loc>",
      "    <lastmod>" + today + "</lastmod>",
      "    <changefreq>" + (p.changefreq || "monthly") + "</changefreq>",
      "    <priority>" + (p.priority || "0.5") + "</priority>",
      "  </url>"
    ].join("\n");
  }).join("\n");

  var xml = [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">",
    urls,
    "</urlset>",
    ""
  ].join("\n");

  fs.writeFileSync(path.join(root, "sitemap.xml"), xml);
  console.log("wrote sitemap.xml  (" + SITE.pages.length + " URLs, base " + origin + ")");
}

function writeRobots() {
  var txt = [
    "User-agent: *",
    "Allow: /",
    "",
    "Sitemap: " + SITE.absoluteUrl("/sitemap.xml"),
    ""
  ].join("\n");
  fs.writeFileSync(path.join(root, "robots.txt"), txt);
  console.log("wrote robots.txt");
}

function rewriteBaseUrls(text) {
  var next = text;
  KNOWN_HOST_PREFIXES.forEach(function (prefix) {
    if (prefix === origin) return;
    // Replace prefix only when it is a full origin+path prefix, not a substring of a longer host
    next = next.split(prefix).join(origin);
  });
  return next;
}

function listHtmlFiles(dir) {
  var out = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (ent) {
    if (ent.name === ".git" || ent.name === "node_modules") return;
    var full = path.join(dir, ent.name);
    if (ent.isDirectory()) out = out.concat(listHtmlFiles(full));
    else if (/\.html$/i.test(ent.name)) out.push(full);
  });
  return out;
}

function updateHtml() {
  var files = listHtmlFiles(root);
  var changed = 0;
  files.forEach(function (file) {
    var orig = fs.readFileSync(file, "utf8");
    var next = rewriteBaseUrls(orig);
    if (next !== orig) {
      fs.writeFileSync(file, next);
      changed += 1;
      console.log("  updated " + path.relative(root, file));
    }
  });
  console.log("HTML canonical/OG base URLs: " + changed + " file(s) updated");
}

writeSitemap();
writeRobots();
updateHtml();

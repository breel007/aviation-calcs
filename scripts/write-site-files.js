#!/usr/bin/env node
/**
 * Generate sitemap.xml and robots.txt from site-config.js,
 * keep canonical / og:url / og:image tags in HTML in sync
 * with the configured base URL, and rewrite every page footer
 * from SITE.footerLinks (so a Contact link can be added later
 * in one place).
 *
 * Usage:  node scripts/write-site-files.js
 */
"use strict";

var fs = require("fs");
var path = require("path");
var { execFileSync } = require("child_process");
var SITE = require("../site-config.js");

var root = path.join(__dirname, "..");
var origin = SITE.origin();

/** YYYY-MM-DD in the local timezone (the box is America/Los_Angeles). */
function localDate(d) {
  d = d || new Date();
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, "0");
  var day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

var today = localDate();

function walkFiles(dir) {
  var out = [];
  if (!fs.existsSync(dir)) return out;
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (ent) {
    var full = path.join(dir, ent.name);
    if (ent.isDirectory()) out = out.concat(walkFiles(full));
    else out.push(full);
  });
  return out;
}

function pageContentFiles(page) {
  if (page.path === "/") {
    return [
      path.join(root, "index.html"),
      path.join(root, "shared", "site.css"),
      path.join(root, "site-config.js")
    ].filter(function (f) { return fs.existsSync(f); });
  }
  if (/\.html$/i.test(page.path)) {
    var f = path.join(root, page.path.replace(/^\//, ""));
    return fs.existsSync(f) ? [f] : [];
  }
  var dir = path.join(root, page.path.replace(/^\/|\/$/g, ""));
  return walkFiles(dir);
}

function gitStatus(file) {
  try {
    var rel = path.relative(root, file);
    var out = execFileSync("git", ["status", "--porcelain", "--", rel], {
      cwd: root,
      encoding: "utf8"
    }).trim();
    return out; // e.g. " M path" or "?? path"
  } catch (e) {
    return "";
  }
}

function stripHead(html) {
  return String(html).replace(/<head\b[^>]*>[\s\S]*?<\/head>/i, "<head/>");
}

function htmlBodyChanged(file) {
  var rel = path.relative(root, file);
  var curr = fs.readFileSync(file, "utf8");
  try {
    var old = execFileSync("git", ["show", "HEAD:" + rel], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    return stripHead(curr) !== stripHead(old);
  } catch (e) {
    return true; // untracked or not in HEAD
  }
}

function contentChanged(page) {
  var files = pageContentFiles(page);
  if (!files.length) return true;
  return files.some(function (file) {
    var status = gitStatus(file);
    if (!status) return false;
    if (/\.html$/i.test(file)) return htmlBodyChanged(file);
    return true;
  });
}

function readPreviousLastmods() {
  var map = {};
  var file = path.join(root, "sitemap.xml");
  if (!fs.existsSync(file)) return map;
  var xml = fs.readFileSync(file, "utf8");
  var re = /<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g;
  var m;
  while ((m = re.exec(xml))) map[m[1]] = m[2];
  return map;
}

function lastmodFor(page, previous) {
  var loc = SITE.absoluteUrl(page.path);
  var prev = previous[loc];
  if (!prev || contentChanged(page)) return today;
  return prev;
}

var KNOWN_HOST_PREFIXES = [
  "https://breel007.github.io/aviation-calcs",
  "http://breel007.github.io/aviation-calcs",
  "https://aviatorcalcs.com",
  "http://aviatorcalcs.com",
  "https://www.aviatorcalcs.com",
  "http://www.aviatorcalcs.com"
];

function writeSitemap() {
  var previous = readPreviousLastmods();
  var urls = SITE.pages.map(function (p) {
    return [
      "  <url>",
      "    <loc>" + SITE.absoluteUrl(p.path) + "</loc>",
      "    <lastmod>" + lastmodFor(p, previous) + "</lastmod>",
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


function hrefFrom(fromFile, targetPath) {
  var fromDir = path.dirname(fromFile);
  // GitHub Pages serves 404.html at whatever missing path was requested
  // (for example /nope/deeper/x), so its links must be root-absolute.
  if (path.resolve(fromFile) === path.join(root, "404.html")) return targetPath;
  var destFile;
  if (targetPath === "/") destFile = path.join(root, "index.html");
  else destFile = path.join(root, targetPath.replace(/^\//, ""));
  var rel = path.relative(fromDir, destFile).replace(/\\/g, "/");
  if (targetPath === "/") {
    rel = rel.replace(/index\.html$/, "");
    if (rel === "" || rel === ".") rel = "./";
    else if (rel.slice(-1) !== "/") rel += "/";
  }
  return rel;
}

function updateFooters() {
  var links = SITE.footerLinks;
  if (!links || !links.length) {
    console.log("footer links: SITE.footerLinks is missing; skipped");
    return;
  }
  var files = listHtmlFiles(root);
  var changed = 0;
  files.forEach(function (file) {
    var orig = fs.readFileSync(file, "utf8");
    var inner = links.map(function (l) {
      return '        <a href="' + hrefFrom(file, l.path) + '">' + l.label + "</a>";
    }).join("\n");
    if (!/<nav class="footer-nav" aria-label="Footer">[\s\S]*?<\/nav>/.test(orig)) {
      console.log("  WARN  no footer-nav to rewrite in " + path.relative(root, file));
      return;
    }
    var nav = '<nav class="footer-nav" aria-label="Footer">\n' + inner + "\n      </nav>";
    var next = orig.replace(/<nav class="footer-nav" aria-label="Footer">[\s\S]*?<\/nav>/, nav);
    if (next !== orig) {
      fs.writeFileSync(file, next);
      changed += 1;
    }
  });
  console.log("footer nav: " + changed + " file(s) updated from SITE.footerLinks");
}

updateHtml();
updateFooters();
writeSitemap();
writeRobots();

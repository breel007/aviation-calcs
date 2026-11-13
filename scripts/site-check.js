#!/usr/bin/env node
/**
 * Site-wide checker for aviatorcalcs.com.
 *
 * Usage:
 *   node scripts/site-check.js
 *   node scripts/site-check.js --external
 *
 * Run this after adding or editing a calculator (and after
 * `node scripts/write-site-files.js`). Exit status is nonzero
 * if any check fails.
 *
 * --external  HEAD-request every outbound http(s) citation link.
 *             404 is a failure; 403 or a timeout is a warning.
 */
"use strict";

var fs = require("fs");
var path = require("path");
var http = require("http");
var https = require("https");
var { URL } = require("url");
var SITE = require("../site-config.js");

var root = path.join(__dirname, "..");
var checkExternal = process.argv.indexOf("--external") !== -1;
var failures = [];
var warnings = [];
var checks = 0;

function fail(msg) {
  failures.push(msg);
  console.log("  FAIL  " + msg);
}
function warn(msg) {
  warnings.push(msg);
  console.log("  WARN  " + msg);
}
function pass(msg) {
  checks += 1;
  console.log("  PASS  " + msg);
}

function walk(dir, acc) {
  acc = acc || [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (ent) {
    if (ent.name === ".git" || ent.name === "node_modules") return;
    var full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, acc);
    else acc.push(full);
  });
  return acc;
}

function listHtmlFiles() {
  return walk(root).filter(function (f) { return /\.html$/i.test(f); });
}

function calculatorDirs() {
  return fs.readdirSync(root, { withFileTypes: true }).filter(function (ent) {
    if (!ent.isDirectory()) return false;
    if (ent.name === "shared" || ent.name === "scripts" || ent.name === ".git") return false;
    var dir = path.join(root, ent.name);
    return fs.existsSync(path.join(dir, "index.html")) && fs.existsSync(path.join(dir, "test.js"));
  }).map(function (ent) { return ent.name; }).sort();
}

function calculatorPages() {
  return SITE.pages.filter(function (p) {
    return p.path !== "/" && !/\.html$/i.test(p.path);
  });
}

function rel(file) {
  return path.relative(root, file);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function attr(tag, name) {
  var re = new RegExp("\\b" + name + "\\s*=\\s*([\"'])([\\s\\S]*?)\\1", "i");
  var m = tag.match(re);
  return m ? m[2] : "";
}

function allTags(html, re) {
  var out = [];
  var m;
  var r = new RegExp(re.source, re.flags.indexOf("g") >= 0 ? re.flags : re.flags + "g");
  while ((m = r.exec(html))) out.push(m[0]);
  return out;
}

function expectedUrl(file) {
  var r = rel(file).replace(/\\/g, "/");
  if (r === "index.html") return SITE.absoluteUrl("/");
  if (r === "about.html") return SITE.absoluteUrl("/about.html");
  if (r === "privacy.html") return SITE.absoluteUrl("/privacy.html");
  var m = r.match(/^([^/]+)\/index\.html$/);
  if (m) return SITE.absoluteUrl("/" + m[1] + "/");
  return SITE.absoluteUrl("/" + r);
}

function resolveInternal(fromFile, raw) {
  if (raw == null) return { skip: true };
  var href = raw.trim();
  if (!href || href === "#") return { skip: true };
  if (/^(mailto:|tel:|javascript:|data:)/i.test(href)) return { skip: true };
  if (href.charAt(0) === "#") return { skip: true };

  var noHash = href.split("#")[0];
  var bare = noHash.split("?")[0];
  if (!bare) return { skip: true };

  if (/^https?:\/\//i.test(bare)) {
    var u;
    try { u = new URL(noHash); } catch (e) { return { error: "invalid URL " + noHash }; }
    var host = u.hostname.replace(/^www\./, "");
    if (host === "aviatorcalcs.com" || host === "breel007.github.io") {
      var pathname = u.pathname;
      if (host === "breel007.github.io") {
        pathname = pathname.replace(/^\/aviation-calcs/, "") || "/";
      }
      bare = pathname;
    } else {
      return { external: true, url: noHash };
    }
  }

  var fromDir = path.dirname(fromFile);
  var target;
  if (bare.charAt(0) === "/") {
    target = path.join(root, bare.replace(/^\//, ""));
  } else {
    target = path.resolve(fromDir, bare);
  }
  // Stay inside the site root
  if (!target.startsWith(root)) {
    return { error: "path escapes the site root: " + href };
  }
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    target = path.join(target, "index.html");
  }
  return { file: target, href: href };
}

var ADSENSE_META = '<meta name="google-adsense-account" content="ca-pub-4553483931481707">';
var ADSENSE_SCRIPT = 'src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4553483931481707"';

function checkPageChrome(file, html) {
  var r = rel(file);
  var isCalc = /\/index\.html$/.test(r) && r !== "index.html";
  var isRootPage = r === "index.html" || r === "about.html" || r === "privacy.html";

  if (html.indexOf(ADSENSE_META) === -1) {
    fail(r + " is missing the AdSense account meta tag (ca-pub-4553483931481707)");
  } else {
    pass(r + " has the AdSense account meta tag");
  }
  if (html.indexOf(ADSENSE_SCRIPT) === -1) {
    fail(r + " is missing the AdSense script tag");
  } else {
    pass(r + " has the AdSense script tag");
  }

  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) {
    fail(r + " is missing a viewport meta tag");
  } else {
    pass(r + " has a viewport meta tag");
  }

  var canonical = "";
  allTags(html, /<link\b[^>]*>/i).forEach(function (tag) {
    if (/\brel\s*=\s*["']canonical["']/i.test(tag)) canonical = attr(tag, "href");
  });
  var expected = expectedUrl(file);
  if (!canonical) {
    fail(r + " is missing a canonical URL");
  } else if (canonical !== expected) {
    fail(r + " canonical is not self-referencing (got " + canonical + ", expected " + expected + ")");
  } else {
    pass(r + " has a self-referencing canonical");
  }

  var ogUrl = "";
  var ogImage = "";
  allTags(html, /<meta\b[^>]*>/i).forEach(function (tag) {
    var prop = attr(tag, "property") || attr(tag, "name");
    if (prop === "og:url") ogUrl = attr(tag, "content");
    if (prop === "og:image") ogImage = attr(tag, "content");
  });
  if (!ogUrl) fail(r + " is missing og:url");
  else if (ogUrl !== expected) fail(r + " og:url does not match the canonical (" + ogUrl + ")");
  else pass(r + " has a matching og:url");

  if (!ogImage) {
    fail(r + " is missing og:image");
  } else {
    var resolved = resolveInternal(file, ogImage);
    if (resolved.external) {
      fail(r + " og:image points off-site (" + ogImage + ")");
    } else if (resolved.error) {
      fail(r + " og:image " + resolved.error);
    } else if (!resolved.file || !fs.existsSync(resolved.file)) {
      fail(r + " og:image file does not exist (" + ogImage + ")");
    } else {
      pass(r + " og:image exists (" + rel(resolved.file) + ")");
    }
  }

  var robots = "";
  allTags(html, /<meta\b[^>]*>/i).forEach(function (tag) {
    if ((attr(tag, "name") || "").toLowerCase() === "robots") robots = attr(tag, "content");
  });
  if (/noindex/i.test(robots)) {
    fail(r + " has a noindex robots directive");
  } else {
    pass(r + " is not noindex");
  }

  var hasShared = /shared\/site\.css/.test(html);
  var localCss = path.join(path.dirname(file), "styles.css");
  var hasLegacy = fs.existsSync(localCss) &&
    /href=["']styles\.css["']/.test(html) &&
    /--gold/.test(read(localCss)) &&
    /\.site-header/.test(read(localCss));
  if (hasShared) pass(r + " links the shared stylesheet");
  else if (hasLegacy) pass(r + " uses a local site stylesheet (legacy self-contained page)");
  else fail(r + " does not link shared/site.css");

  if (!/class=["'][^"']*site-header/.test(html)) fail(r + " is missing the site header");
  else pass(r + " has the site header");

  if (!/class=["'][^"']*site-footer/.test(html)) fail(r + " is missing the site footer");
  else pass(r + " has the site footer");

  if (isCalc) {
    if (!/class=["'][^"']*disclaimer/.test(html)) {
      fail(r + " is missing a disclaimer");
    } else if (!/POH|AFM|not a certified|not\s+(a |intended )?for flight|not\s+a substitute/i.test(html)) {
      fail(r + " disclaimer does not mention the POH/AFM or that it is not a certified / substitute tool");
    } else {
      pass(r + " has a consistent disclaimer");
    }
  }

  var ldBlocks = [];
  var ldRe = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  var lm;
  while ((lm = ldRe.exec(html))) ldBlocks.push(lm[1]);
  if (ldBlocks.length === 0 && (isCalc || r === "index.html")) {
    fail(r + " has no JSON-LD");
  }
  ldBlocks.forEach(function (block, i) {
    try {
      JSON.parse(block);
      pass(r + " JSON-LD block " + (i + 1) + " parses");
    } catch (e) {
      fail(r + " JSON-LD block " + (i + 1) + " does not parse: " + e.message);
    }
  });
}

function checkLinks(file, html) {
  var r = rel(file);
  var refs = [];
  allTags(html, /<(?:a|link)\b[^>]*>/i).forEach(function (tag) {
    var href = attr(tag, "href");
    if (href) refs.push({ kind: "href", value: href, tag: tag });
  });
  allTags(html, /<(?:script|img|source|iframe)\b[^>]*>/i).forEach(function (tag) {
    var src = attr(tag, "src");
    if (src) refs.push({ kind: "src", value: src, tag: tag });
  });
  var external = [];
  refs.forEach(function (ref) {
    var resolved = resolveInternal(file, ref.value);
    if (resolved.skip) return;
    if (resolved.external) {
      // --external checks citation links (<a href>), not fonts, preconnect, or ad scripts
      if (/^<a\b/i.test(ref.tag || "")) external.push(resolved.url);
      return;
    }
    if (resolved.error) {
      fail(r + " " + ref.kind + " " + ref.value + " — " + resolved.error);
      return;
    }
    if (!fs.existsSync(resolved.file)) {
      fail(r + " " + ref.kind + " \"" + ref.value + "\" does not resolve to an existing file");
    }
  });
  return external;
}

function uniqueMeta(files) {
  var titles = {};
  var descs = {};
  files.forEach(function (file) {
    var html = read(file);
    var r = rel(file);
    var tm = html.match(/<title>([^<]+)<\/title>/i);
    var title = tm ? tm[1].trim() : "";
    if (!title) fail(r + " is missing a <title>");
    else {
      if (titles[title]) fail("duplicate title on " + r + " and " + titles[title] + ": " + title);
      else titles[title] = r;
    }
    var desc = "";
    allTags(html, /<meta\b[^>]*>/i).forEach(function (tag) {
      if ((attr(tag, "name") || "").toLowerCase() === "description") desc = attr(tag, "content").trim();
    });
    if (!desc) fail(r + " is missing a meta description");
    else {
      if (descs[desc]) fail("duplicate meta description on " + r + " and " + descs[desc]);
      else descs[desc] = r;
    }
  });
  pass("titles and meta descriptions are unique across " + files.length + " pages");
}

function checkCatalog() {
  var dirs = calculatorDirs();
  var configSlugs = calculatorPages().map(function (p) {
    return p.path.replace(/^\/|\/$/g, "");
  }).sort();
  var indexHtml = read(path.join(root, "index.html"));
  var cardSlugs = [];
  allTags(indexHtml, /<a\b[^>]*class=["'][^"']*tool-card[^"']*["'][^>]*>/i).forEach(function (tag) {
    var href = attr(tag, "href").replace(/\/$/, "");
    if (href && cardSlugs.indexOf(href) === -1) cardSlugs.push(href);
  });
  cardSlugs.sort();

  dirs.forEach(function (d) {
    if (configSlugs.indexOf(d) === -1) fail("calculator directory " + d + "/ is not in site-config.js");
    if (cardSlugs.indexOf(d) === -1) fail("calculator directory " + d + "/ has no tool-card on index.html");
  });
  configSlugs.forEach(function (s) {
    if (dirs.indexOf(s) === -1) fail("site-config.js lists /" + s + "/ but that calculator directory is missing");
  });
  cardSlugs.forEach(function (s) {
    if (dirs.indexOf(s) === -1) fail("index.html tool-card href \"" + s + "/\" has no calculator directory");
  });
  if (dirs.length === configSlugs.length && dirs.every(function (d, i) { return d === configSlugs[i]; })) {
    pass("calculator directories match site-config.js (" + dirs.length + ")");
  }
  if (dirs.length === cardSlugs.length && dirs.slice().sort().join() === cardSlugs.join()) {
    pass("calculator directories match index.html tool-cards (" + dirs.length + ")");
  }

  var readme = read(path.join(root, "README.md"));
  configSlugs.forEach(function (s) {
    var re = new RegExp("\\(" + s + "/\\)");
    if (!re.test(readme)) fail("README.md does not list " + s + "/");
  });
  pass("README.md lists every calculator");

  var sitemap = read(path.join(root, "sitemap.xml"));
  var sitemapUrls = [];
  var lastmods = {};
  sitemap.replace(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g, function (_, loc, lastmod) {
    sitemapUrls.push(loc);
    lastmods[loc] = lastmod;
    return _;
  });
  var configUrls = SITE.pages.map(function (p) { return SITE.absoluteUrl(p.path); });
  configUrls.forEach(function (u) {
    if (sitemapUrls.indexOf(u) === -1) fail("sitemap.xml is missing " + u);
  });
  sitemapUrls.forEach(function (u) {
    if (configUrls.indexOf(u) === -1) fail("sitemap.xml has " + u + " which is not in site-config.js");
  });
  if (sitemapUrls.length === configUrls.length) {
    pass("sitemap.xml matches site-config.js (" + sitemapUrls.length + " URLs)");
  }

  var nItems = indexHtml.match(/"numberOfItems"\s*:\s*(\d+)/);
  var calcCount = calculatorPages().length;
  if (!nItems) fail("index.html JSON-LD is missing numberOfItems");
  else if (Number(nItems[1]) !== calcCount) {
    fail("index.html JSON-LD numberOfItems is " + nItems[1] + ", expected " + calcCount + " calculators");
  } else {
    pass("index.html JSON-LD numberOfItems is " + calcCount);
  }

  var listUrls = [];
  indexHtml.replace(/"@type":\s*"ListItem"[\s\S]*?"url":\s*"([^"]+)"/g, function (_, u) {
    listUrls.push(u);
    return _;
  });
  if (listUrls.length !== calcCount) {
    fail("index.html JSON-LD ItemList has " + listUrls.length + " entries, expected " + calcCount);
  } else {
    pass("index.html JSON-LD ItemList has one entry per calculator");
  }

  if (!SITE.groups || !SITE.groups.length) {
    fail("site-config.js is missing the groups catalog");
    return { lastmods: lastmods, sitemapUrls: sitemapUrls };
  }
  var groupIds = [];
  indexHtml.replace(/<section class="tool-group" id="([^"]+)"/g, function (_, id) {
    groupIds.push(id);
    return _;
  });
  var expectedIds = SITE.groups.map(function (g) { return g.id; });
  if (groupIds.join() !== expectedIds.join()) {
    fail("index.html group order is [" + groupIds.join(", ") + "], expected [" + expectedIds.join(", ") + "]");
  } else {
    pass("index.html groups are in the configured order");
  }
  SITE.groups.forEach(function (g) {
    var re = new RegExp('<section class="tool-group" id="' + g.id + '"[\\s\\S]*?</section>');
    var m = indexHtml.match(re);
    if (!m) {
      fail("index.html is missing section #" + g.id);
      return;
    }
    var slugs = [];
    m[0].replace(/<a class="tool-card" href="([^"]+)"/g, function (_, href) {
      slugs.push(href.replace(/\/$/, ""));
      return _;
    });
    if (slugs.join() !== g.slugs.join()) {
      fail("index.html #" + g.id + " card order is [" + slugs.join(", ") + "], expected [" + g.slugs.join(", ") + "]");
    } else {
      pass("index.html #" + g.id + " cards match the configured order (" + slugs.length + ")");
    }
  });

  return { lastmods: lastmods, sitemapUrls: sitemapUrls };
}

function contentFilesFor(page) {
  if (page.path === "/") {
    return ["index.html", "shared/site.css", "site-config.js"].map(function (f) {
      return path.join(root, f);
    }).filter(function (f) { return fs.existsSync(f); });
  }
  if (/\.html$/i.test(page.path)) {
    var f = path.join(root, page.path.replace(/^\//, ""));
    return fs.existsSync(f) ? [f] : [];
  }
  var dir = path.join(root, page.path.replace(/^\/|\/$/g, ""));
  return walk(dir);
}

function fileMtimeDate(file) {
  var d = fs.statSync(file).mtime;
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, "0");
  var day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

function checkLastmods(lastmods) {
  SITE.pages.forEach(function (page) {
    var loc = SITE.absoluteUrl(page.path);
    var lastmod = lastmods[loc];
    if (!lastmod) {
      fail("sitemap.xml has no lastmod for " + loc);
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) {
      fail("sitemap lastmod for " + loc + " is not YYYY-MM-DD: " + lastmod);
      return;
    }
    var files = contentFilesFor(page);
    var newest = files.reduce(function (acc, f) {
      var d = fileMtimeDate(f);
      return d > acc ? d : acc;
    }, "1970-01-01");
    // A lastmod in the future (legacy UTC stamp) is not treated as stale.
    // Fail only when the sitemap date is older than the page content.
    if (lastmod < newest && contentLooksTouched(page, files, lastmod)) {
      fail(loc + " sitemap lastmod " + lastmod + " is older than its content (" + newest + ")");
    }
  });
  pass("sitemap lastmod values are current for changed pages");
}

function contentLooksTouched(page, files, lastmod) {
  // Only flag pages whose non-head HTML or other assets changed after lastmod.
  return files.some(function (file) {
    if (fileMtimeDate(file) <= lastmod) return false;
    if (/\.html$/i.test(file)) {
      // Head-only typo/meta edits should not force a lastmod bump; if the
      // file is newer, still require lastmod >= mtime only when the body
      // also differs from... we already trust write-site-files. Here we
      // treat a newer html body as a real change if the file is dirty
      // enough that mtime is after lastmod AND it is not only the head.
      return true;
    }
    return true;
  });
}

function checkRobots() {
  var file = path.join(root, "robots.txt");
  if (!fs.existsSync(file)) {
    fail("robots.txt is missing");
    return;
  }
  var txt = read(file);
  if (!/User-agent:\s*\*/i.test(txt)) fail("robots.txt does not have a User-agent: * directive");
  else pass("robots.txt has User-agent: *");
  if (/^Disallow:\s*\/\s*$/m.test(txt) && !/^Allow:\s*\//m.test(txt)) {
    fail("robots.txt disallows the whole site");
  }
  if (!/^Allow:\s*\/\s*$/m.test(txt) && !/Disallow:\s*$/m.test(txt)) {
    // Allow: / is the site convention
    if (!/Allow:\s*\//.test(txt)) warn("robots.txt does not explicitly Allow: /");
  } else {
    pass("robots.txt allows pages to be crawled");
  }
  var sitemapLine = txt.match(/^Sitemap:\s*(\S+)/mi);
  var expected = SITE.absoluteUrl("/sitemap.xml");
  if (!sitemapLine) fail("robots.txt does not reference the sitemap");
  else if (sitemapLine[1] !== expected) fail("robots.txt sitemap is " + sitemapLine[1] + ", expected " + expected);
  else pass("robots.txt references " + expected);
}

function snapshotPath() {
  return path.join(__dirname, ".sitemap-snapshot.json");
}

function loadSnapshot() {
  var file = snapshotPath();
  if (!fs.existsSync(file)) return { urls: [] };
  try {
    return JSON.parse(read(file));
  } catch (e) {
    warn("could not parse " + rel(file) + ": " + e.message);
    return { urls: [] };
  }
}

function diffSnapshot(sitemapUrls, lastmods) {
  var prev = loadSnapshot();
  var prevMap = {};
  (prev.urls || []).forEach(function (u) {
    prevMap[u.loc] = u.lastmod;
  });
  var current = sitemapUrls.map(function (loc) {
    return { loc: loc, lastmod: lastmods[loc] };
  });
  var added = [];
  var changed = [];
  var removed = [];
  current.forEach(function (u) {
    if (!(u.loc in prevMap)) added.push(u);
    else if (prevMap[u.loc] !== u.lastmod) changed.push({ loc: u.loc, from: prevMap[u.loc], to: u.lastmod });
  });
  Object.keys(prevMap).forEach(function (loc) {
    if (sitemapUrls.indexOf(loc) === -1) removed.push({ loc: loc, lastmod: prevMap[loc] });
  });

  console.log("\n== New/changed URLs to submit to Google ==");
  if (!added.length && !changed.length) {
    console.log("  (none)");
  }
  added.forEach(function (u) {
    console.log("  NEW      " + u.loc + "  lastmod " + u.lastmod);
  });
  changed.forEach(function (u) {
    console.log("  CHANGED  " + u.loc + "  lastmod " + u.from + " → " + u.to);
  });
  if (removed.length) {
    console.log("  Removed since last snapshot:");
    removed.forEach(function (u) { console.log("  REMOVED  " + u.loc); });
  }
  if (added.length) {
    console.log("  Sitemap should be resubmitted in Google Search Console (new URL(s) added).");
  } else if (changed.length) {
    console.log("  Resubmitting the sitemap is optional but helpful (lastmod changed on existing URLs).");
  } else {
    console.log("  No sitemap resubmission needed.");
  }

  var snap = {
    generated: new Date().toISOString(),
    urls: current
  };
  fs.writeFileSync(snapshotPath(), JSON.stringify(snap, null, 2) + "\n");
  console.log("  Updated " + rel(snapshotPath()) + " (" + current.length + " URLs).");
  return { added: added, changed: changed, removed: removed };
}

function headCheck(url) {
  return new Promise(function (resolve) {
    var lib = url.startsWith("https") ? https : http;
    var req;
    var timer = setTimeout(function () {
      if (req) req.destroy();
      resolve({ url: url, status: 0, error: "timeout" });
    }, 10000);
    try {
      req = lib.request(url, { method: "HEAD", timeout: 10000 }, function (res) {
        clearTimeout(timer);
        resolve({ url: url, status: res.statusCode, headers: res.headers });
      });
      req.on("error", function (e) {
        clearTimeout(timer);
        resolve({ url: url, status: 0, error: e.message });
      });
      req.end();
    } catch (e) {
      clearTimeout(timer);
      resolve({ url: url, status: 0, error: e.message });
    }
  });
}

async function checkExternalLinks(urls) {
  var unique = Array.from(new Set(urls)).sort();
  console.log("\n== External links (" + unique.length + ") ==");
  for (var i = 0; i < unique.length; i++) {
    var result = await headCheck(unique[i]);
    var status = result.status;
    if (status === 404 || status === 410) {
      fail("external " + unique[i] + " returned " + status);
    } else if (status === 403 || status === 401 || status === 429 || status === 0) {
      warn("external " + unique[i] + " " + (result.error || ("returned " + status)));
    } else if (status >= 200 && status < 400) {
      pass("external " + unique[i] + " " + status);
    } else {
      warn("external " + unique[i] + " returned " + status);
    }
  }
}


// ---------------------------------------------------------------------------
// "undefined" / "NaN" guard. A page must never show these words: they mean a
// template key was missing or a number failed to parse. Checked statically:
//   1. the HTML with code stripped (visible text and attribute values),
//   2. JSON-LD string values,
//   3. every string literal / template-literal text in the page's own .js
//      files (what scripts can write into the page). Legit code such as
//      `typeof x === "undefined"` is ignored.
// ---------------------------------------------------------------------------
var BAD_WORD_RE = /\b(undefined|NaN)\b/;

function jsStringLiterals(src) {
  // Small tokenizer: returns [{text, line, prev}] for '..', "..", and the
  // static parts of `..` literals; skips comments and regex literals.
  var out = [];
  var i = 0, n = src.length, line = 1, lastSig = "";
  function pushLit(text, startLine, before) { out.push({ text: text, line: startLine, prev: before }); }
  while (i < n) {
    var ch = src[i];
    if (ch === "\n") { line++; i++; continue; }
    if (ch === "/" && src[i + 1] === "/") { while (i < n && src[i] !== "\n") i++; continue; }
    if (ch === "/" && src[i + 1] === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) { if (src[i] === "\n") line++; i++; }
      i += 2; continue;
    }
    if (ch === "'" || ch === '"') {
      var q = ch, s = "", startLine = line, before = src.slice(Math.max(0, i - 40), i);
      i++;
      while (i < n && src[i] !== q && src[i] !== "\n") {
        if (src[i] === "\\") { s += src[i + 1]; i += 2; continue; }
        s += src[i++];
      }
      i++;
      pushLit(s, startLine, before);
      lastSig = "a"; continue;
    }
    if (ch === "`") {
      var t = "", tl = line, depth = 0;
      i++;
      while (i < n) {
        if (src[i] === "\\") { t += src[i + 1]; i += 2; continue; }
        if (src[i] === "`") { i++; break; }
        if (src[i] === "$" && src[i + 1] === "{") {
          // skip the expression (no nested template support needed here)
          depth = 1; i += 2; t += " ";
          while (i < n && depth) { if (src[i] === "{") depth++; else if (src[i] === "}") depth--; if (src[i] === "\n") line++; i++; }
          continue;
        }
        if (src[i] === "\n") line++;
        t += src[i++];
      }
      pushLit(t, tl, "");
      lastSig = "a"; continue;
    }
    if (ch === "/" && (lastSig === "" || /[(,=:\[!&|?{};+\-*%<>~^]/.test(lastSig))) {
      // regex literal
      i++;
      var inClass = false;
      while (i < n && src[i] !== "\n") {
        if (src[i] === "\\") { i += 2; continue; }
        if (src[i] === "[") inClass = true;
        else if (src[i] === "]") inClass = false;
        else if (src[i] === "/" && !inClass) { i++; break; }
        i++;
      }
      while (i < n && /[a-z]/i.test(src[i])) i++;
      lastSig = "a"; continue;
    }
    if (!/\s/.test(ch)) lastSig = /[A-Za-z0-9_$)\]]/.test(ch) ? "a" : ch;
    i++;
  }
  return out;
}

function checkNoUndefinedText(file, html) {
  var r = rel(file);
  // JSON-LD values
  var ldRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi, m;
  var bad = [];
  while ((m = ldRe.exec(html))) {
    if (BAD_WORD_RE.test(m[1])) bad.push("JSON-LD");
  }
  var stripped = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  var hit = stripped.match(/[^<>]{0,40}\b(undefined|NaN)\b[^<>]{0,20}/);
  if (hit) bad.push("markup near \"" + hit[0].trim() + "\"");
  if (bad.length) {
    fail(r + " contains the literal text undefined/NaN (" + bad.join("; ") + ")");
  } else {
    pass(r + " has no undefined/NaN text");
  }

  // Page-local scripts that can build visible text.
  var dir = path.dirname(file);
  var srcRe = /<script\b[^>]*\bsrc=["']([^"']+\.js)(?:\?[^"']*)?["']/gi;
  while ((m = srcRe.exec(html))) {
    if (/^(https?:)?\/\//.test(m[1])) continue;
    var jsFile = m[1].charAt(0) === "/" ? path.join(root, m[1]) : path.join(dir, m[1]);
    if (!fs.existsSync(jsFile)) continue;
    var lits = jsStringLiterals(read(jsFile));
    lits.forEach(function (l) {
      if (!BAD_WORD_RE.test(l.text)) return;
      if (l.text === "undefined" && /typeof\s*\(?[\w$.\[\]"']*\)?\s*[!=]==?\s*$/.test(l.prev)) return;
      fail(rel(jsFile) + ":" + l.line + " has a string that would print undefined/NaN: \"" + l.text.slice(0, 60) + "\"");
    });
  }
}

async function main() {
  console.log("Aviation Calcs site check  (base " + SITE.origin() + ")\n");

  var htmlFiles = listHtmlFiles();
  var externals = [];

  console.log("== Page chrome, links, JSON-LD ==");
  htmlFiles.forEach(function (file) {
    var html = read(file);
    checkPageChrome(file, html);
    checkNoUndefinedText(file, html);
    externals = externals.concat(checkLinks(file, html));
  });
  uniqueMeta(htmlFiles);

  console.log("\n== Catalog, README, sitemap, index groups ==");
  var catalog = checkCatalog();

  console.log("\n== Google readiness ==");
  checkRobots();
  checkLastmods(catalog.lastmods);
  var diff = diffSnapshot(catalog.sitemapUrls, catalog.lastmods);

  if (checkExternal) {
    await checkExternalLinks(externals);
  }

  console.log("\n" + checks + " checks passed, " + failures.length + " failed, " + warnings.length + " warning(s)");
  if (failures.length) {
    console.log("\nFailures:");
    failures.forEach(function (f) { console.log("  - " + f); });
  }
  process.exit(failures.length ? 1 : 0);
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});

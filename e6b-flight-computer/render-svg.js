/**
 * SVG illustrations for the E6B computer (slide-rule) side and wind side.
 * Works in the browser (after calc.js) and in Node (require("./calc.js")).
 *
 * The face is an original drawing of the standard E6B conventions — a
 * logarithmic decade, rate index at 60, TAS / density-altitude windows,
 * and the wind-up plotting card — not a copy of any manufacturer's product.
 */
(function (root) {
  "use strict";

  var E6B = typeof require === "function" && typeof window === "undefined"
    ? require("./calc.js")
    : root.E6BComputer;

  var CX = 400;
  var CY = 400;
  var R_BEZEL = 392;
  var R_OUTER = 372;
  var R_OUTER_TICK = 350;
  var R_INNER = 328;
  var R_MIN_TICK = 306;
  var R_MIN_NUM = 290;
  var R_HOUR_NUM = 246;
  var R_WINDOW_OUT = 176;
  var R_WINDOW_IN = 122;
  var R_DA_OUT = 116;
  var R_DA_IN = 64;
  var TAS_A0 = 162;
  var TAS_A1 = 218;
  var DA_POINTER = 132;
  var DA_A0 = 78;
  var DA_A1 = 156;
  var WCA_BAND_H = 40;

  var FONT = '"IBM Plex Sans Condensed", "IBM Plex Sans", "DejaVu Sans", "Liberation Sans", sans-serif';
  var FONT_MONO = '"IBM Plex Mono", "DejaVu Sans Mono", monospace';

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function attr(obj) {
    var parts = [];
    Object.keys(obj).forEach(function (k) {
      if (obj[k] == null || obj[k] === false) return;
      // Keep SVG camelCase attributes (viewBox, stdDeviation) intact.
      var key = k === "className" ? "class" : k;
      parts.push(key + '="' + esc(obj[k]) + '"');
    });
    return parts.join(" ");
  }

  function el(name, attrs, children) {
    var a = attrs ? " " + attr(attrs) : "";
    if (children == null) return "<" + name + a + "/>";
    var body = Array.isArray(children) ? children.join("") : String(children);
    return "<" + name + a + ">" + body + "</" + name + ">";
  }

  function pt(r, ang) { return E6B.pointAtAngle(CX, CY, r, ang); }

  function annularSector(r0, r1, a0, a1) {
    var p1 = pt(r1, a0);
    var p2 = pt(r1, a1);
    var p3 = pt(r0, a1);
    var p0 = pt(r0, a0);
    var span = E6B.wrapAngle(a1 - a0);
    var large = span > 180 ? 1 : 0;
    return "M" + p1.x.toFixed(3) + " " + p1.y.toFixed(3) +
      " A" + r1 + " " + r1 + " 0 " + large + " 1 " + p2.x.toFixed(3) + " " + p2.y.toFixed(3) +
      " L" + p3.x.toFixed(3) + " " + p3.y.toFixed(3) +
      " A" + r0 + " " + r0 + " 0 " + large + " 0 " + p0.x.toFixed(3) + " " + p0.y.toFixed(3) +
      " Z";
  }

  function radialText(label, r, ang, opts) {
    opts = opts || {};
    var p = pt(r, ang);
    var size = opts.size || 14;
    var fill = opts.fill || "#141414";
    var weight = opts.weight || 600;
    var extra = opts.extraRotate || 0;
    return el("text", {
      x: p.x.toFixed(3),
      y: p.y.toFixed(3),
      transform: "rotate(" + (ang + extra).toFixed(3) + " " + p.x.toFixed(3) + " " + p.y.toFixed(3) + ")",
      "text-anchor": "middle",
      "dominant-baseline": "middle",
      fill: fill,
      "font-family": opts.font || FONT,
      "font-size": size,
      "font-weight": weight,
      "letter-spacing": opts.tracking != null ? opts.tracking : -0.3
    }, esc(label));
  }

  function tickAt(r0, r1, ang, width, color) {
    var a = pt(r0, ang);
    var b = pt(r1, ang);
    return el("line", {
      x1: a.x.toFixed(3), y1: a.y.toFixed(3),
      x2: b.x.toFixed(3), y2: b.y.toFixed(3),
      stroke: color || "#141414",
      "stroke-width": width || 1,
      "stroke-linecap": "square"
    });
  }

  function nearlyEqual(a, b, tol) {
    return Math.abs(a - b) < (tol || 1e-8);
  }

  function isLabeledMajor(v) {
    if (v >= 10 && v <= 30 && nearlyEqual(v, Math.round(v))) return true;
    if (v > 30 && v <= 50 && nearlyEqual(v % 2, 0)) return true;
    if (v > 50 && nearlyEqual(v % 5, 0)) return true;
    return false;
  }

  function forEachLogTick(cb) {
    var seen = Object.create(null);
    function walk(from, to, step) {
      var n = Math.round((to - from) / step);
      for (var i = 0; i <= n; i++) {
        var v = Math.round((from + i * step) * 1000) / 1000;
        if (v >= 100 - 1e-9) continue;
        var key = v.toFixed(3);
        if (seen[key]) continue;
        seen[key] = true;
        cb(v, step);
      }
    }
    walk(10, 20, 0.1);
    walk(20, 30, 0.2);
    walk(30, 50, 0.5);
    walk(50, 100, 1);
  }

  function tickLen(v, step, majorLen, midLen, minorLen) {
    if (isLabeledMajor(v)) return majorLen;
    if (v >= 10 && v < 20 && nearlyEqual(v % 0.5, 0)) return midLen;
    if (v >= 20 && v < 50 && nearlyEqual(v % 1, 0)) return midLen;
    if (v >= 50 && nearlyEqual(v % 5, 0)) return midLen;
    return minorLen;
  }

  function scaleTicks(rOuter, rInner, opts) {
    opts = opts || {};
    var parts = [];
    var invert = !!opts.invert; // inner disk: ticks grow inward from rOuter
    forEachLogTick(function (v, step) {
      var len = tickLen(v, step, opts.major || 16, opts.mid || 11, opts.minor || 6);
      var a = E6B.scaleAngle(v);
      var w = isLabeledMajor(v) ? (opts.majorW || 1.55) : (len > 8 ? 1.1 : 0.7);
      if (invert) parts.push(tickAt(rOuter, rOuter - len, a, w, opts.color));
      else parts.push(tickAt(rInner, rInner + len, a, w, opts.color));
    });
    return parts.join("");
  }

  function scaleLabels(r, opts) {
    opts = opts || {};
    var parts = [];
    var size = opts.size || 15;
    forEachLogTick(function (v) {
      if (!isLabeledMajor(v)) return;
      var label = String(Math.round(v));
      if (nearlyEqual(v, 10) && opts.tenLabel) label = opts.tenLabel;
      parts.push(radialText(label, r, E6B.scaleAngle(v), {
        size: size,
        fill: opts.fill || "#141414",
        weight: 700
      }));
    });
    return parts.join("");
  }

  function hoursLabels() {
    var marks = [
      [10, "1:40"], [12, "2:00"], [15, "2:30"], [18, "3:00"], [21, "3:30"],
      [24, "4:00"], [30, "5:00"], [36, "6:00"], [42, "7:00"], [48, "8:00"],
      [54, "9:00"], [70, "1:10"], [80, "1:20"], [90, "1:30"]
    ];
    return marks.map(function (m) {
      return radialText(m[1], R_HOUR_NUM, E6B.scaleAngle(m[0]), {
        size: 10,
        fill: "#8a1a1a",
        weight: 600
      });
    }).join("");
  }

  function conversionMarks() {
    var marks = [
      { key: "nm", label: "NAUT", sub: "MILES", color: "#1a3a6b", value: E6B.CONVERSION_MARKS.nm },
      { key: "sm", label: "STAT", sub: "MILES", color: "#8a1a1a", value: E6B.CONVERSION_MARKS.sm },
      { key: "km", label: "KM", sub: "", color: "#8a1a1a", value: E6B.CONVERSION_MARKS.km }
    ];
    return marks.map(function (m) {
      var a = E6B.scaleAngle(m.value);
      var tip = pt(R_OUTER - 1, a);
      var baseL = pt(R_OUTER + 12, a - 2.0);
      var baseR = pt(R_OUTER + 12, a + 2.0);
      return el("g", { "data-mark": m.key }, [
        el("polygon", {
          points: [tip, baseL, baseR].map(function (p) { return p.x.toFixed(2) + "," + p.y.toFixed(2); }).join(" "),
          fill: m.color
        }),
        radialText(m.label, R_BEZEL + 16, a, { size: 8, fill: m.color, weight: 700 })
      ]);
    }).join("");
  }

  function curvedTitle(text, r, midAng, span, opts) {
    opts = opts || {};
    var n = text.length;
    if (!n) return "";
    var start = midAng - span / 2;
    var step = n === 1 ? 0 : span / (n - 1);
    var out = [];
    for (var i = 0; i < n; i++) {
      var ch = text.charAt(i);
      if (ch === " ") continue;
      out.push(radialText(ch, r, start + i * step, {
        size: opts.size || 9,
        fill: opts.fill || "#1a1a1a",
        weight: opts.weight || 700,
        tracking: 0
      }));
    }
    return out.join("");
  }

  function knurl() {
    var parts = [];
    for (var i = 0; i < 240; i++) {
      var a = i * 1.5;
      var w = i % 2 === 0 ? 1.4 : 0.7;
      parts.push(tickAt(R_BEZEL - 2, R_BEZEL - 11, a, w, "rgba(20,20,24,0.45)"));
    }
    return parts.join("");
  }

  function tempMarks() {
    // Ticks every 10 °C (plus the ISA +15 °C mark); labels every 20 °C so
    // the °C and °F figures do not pile up on the window lip.
    var ticks = [-60, -50, -40, -30, -20, -10, 0, 10, 15, 20, 30, 40, 50];
    var labeled = { "-60": 1, "-40": 1, "-20": 1, "0": 1, "20": 1, "40": 1 };
    var parts = [];
    ticks.forEach(function (c) {
      var a = E6B.tempAngle(c + 273.15);
      var major = !!labeled[String(c)] || c === 0 || c === 15;
      var len = major ? 9 : 6;
      parts.push(tickAt(R_WINDOW_OUT + 1, R_WINDOW_OUT + 1 + len, a, major ? 1.3 : 0.8, "#141414"));
      if (labeled[String(c)]) {
        parts.push(radialText(String(c), R_WINDOW_OUT + 14, a, { size: 7.5, fill: "#141414", weight: 700 }));
        parts.push(radialText(String(Math.round(E6B.cToF(c))), R_WINDOW_OUT + 25, a, { size: 6.5, fill: "#8a1a1a", weight: 600 }));
      }
    });
    var legendA = E6B.tempAngle(213.15) + 7.5;
    parts.push(radialText("°C", R_WINDOW_OUT + 14, legendA, { size: 6.5, fill: "#141414", weight: 700 }));
    parts.push(radialText("°F", R_WINDOW_OUT + 25, legendA, { size: 6, fill: "#8a1a1a", weight: 700 }));
    return parts.join("");
  }

  function paMarks() {
    var ticks = [-2, 0, 2, 4, 5, 6, 8, 10, 12, 14, 15, 16, 18, 20, 22, 25, 30, 35, 40, 45, 50];
    var labeled = { "-2": 1, "0": 1, "5": 1, "10": 1, "15": 1, "20": 1, "25": 1, "30": 1, "35": 1, "40": 1, "45": 1, "50": 1 };
    var parts = [];
    var rNum = (R_WINDOW_IN + R_WINDOW_OUT) / 2;
    ticks.forEach(function (th) {
      var a = E6B.paAngle(th * 1000);
      var major = !!labeled[String(th)];
      parts.push(tickAt(R_WINDOW_IN + 2, R_WINDOW_OUT - 4, a, major ? 1.15 : 0.7, "#222"));
      if (major) {
        parts.push(radialText(String(th), rNum, a, { size: 8.5, fill: "#111", weight: 700 }));
      }
    });
    return parts.join("");
  }

  function daMarks() {
    var parts = [];
    var values = [-2, 0, 2, 4, 5, 6, 8, 10, 12, 14, 15, 16, 18, 20, 25, 30, 35, 40];
    var rNum = (R_DA_IN + R_DA_OUT) / 2 + 2;
    values.forEach(function (th) {
      var sigma = E6B.sigmaFromDensityAltitudeFt(th * 1000);
      if (!(sigma > 0)) return;
      var phi = -180 * Math.log10(sigma);
      var local = E6B.wrapAngle(DA_POINTER - phi);
      var major = th === 0 || th % 10 === 0;
      var labeled = major || th % 5 === 0;
      var tickEnd = labeled ? R_DA_OUT - 3 : R_DA_IN + 10;
      parts.push(tickAt(R_DA_IN + 2, tickEnd, local, major ? 1.3 : 0.8, "#141414"));
      if (labeled) {
        parts.push(radialText(String(th), rNum, local, { size: 8, fill: "#141414", weight: 700 }));
      }
    });
    return parts.join("");
  }

  function rateIndex() {
    var a = E6B.scaleAngle(60);
    var tip = pt(R_INNER + 2, a);
    var l = pt(R_INNER - 18, a - 2.4);
    var r = pt(R_INNER - 18, a + 2.4);
    return el("g", { id: "e6b-rate-index" }, [
      el("polygon", {
        points: [tip, l, r].map(function (p) { return p.x.toFixed(2) + "," + p.y.toFixed(2); }).join(" "),
        fill: "#111",
        stroke: "#111",
        "stroke-width": 0.6
      }),
      radialText("RATE", R_INNER - 28, a - 5.5, { size: 6.5, fill: "#111", weight: 700 })
    ]);
  }

  function tenIndex(r, inward) {
    var a = 0;
    // Inner-disk index (inward=true) stays on the inner disk and only
    // barely points at the outer scale, so it never covers outer labels.
    var tip = inward ? pt(R_INNER + 3, a) : pt(r + 2, a);
    var l = inward ? pt(R_INNER - 14, a - 1.8) : pt(r - 12, a - 1.8);
    var rgt = inward ? pt(R_INNER - 14, a + 1.8) : pt(r - 12, a + 1.8);
    return el("polygon", {
      points: [tip, l, rgt].map(function (p) { return p.x.toFixed(2) + "," + p.y.toFixed(2); }).join(" "),
      fill: "#8a1a1a"
    });
  }

  function defsBlock() {
    return el("defs", null, [
      el("radialGradient", { id: "e6b-plate", cx: "38%", cy: "32%", r: "75%" }, [
        el("stop", { offset: "0%", "stop-color": "#f4f5f7" }),
        el("stop", { offset: "45%", "stop-color": "#d5d8de" }),
        el("stop", { offset: "100%", "stop-color": "#9aa0a8" })
      ]),
      el("radialGradient", { id: "e6b-inner-fill", cx: "40%", cy: "34%", r: "78%" }, [
        el("stop", { offset: "0%", "stop-color": "#eceef1" }),
        el("stop", { offset: "55%", "stop-color": "#c5c9d0" }),
        el("stop", { offset: "100%", "stop-color": "#8e949c" })
      ]),
      el("radialGradient", { id: "e6b-bezel", cx: "35%", cy: "30%", r: "80%" }, [
        el("stop", { offset: "0%", "stop-color": "#d8dce2" }),
        el("stop", { offset: "40%", "stop-color": "#8b929a" }),
        el("stop", { offset: "72%", "stop-color": "#5c636c" }),
        el("stop", { offset: "100%", "stop-color": "#2c3036" })
      ]),
      el("radialGradient", { id: "e6b-brass", cx: "35%", cy: "30%", r: "70%" }, [
        el("stop", { offset: "0%", "stop-color": "#f0d189" }),
        el("stop", { offset: "55%", "stop-color": "#c4a35a" }),
        el("stop", { offset: "100%", "stop-color": "#6e5220" })
      ]),
      el("linearGradient", { id: "e6b-window-well", x1: "0", y1: "0", x2: "0", y2: "1" }, [
        el("stop", { offset: "0%", "stop-color": "#c8ccd2" }),
        el("stop", { offset: "100%", "stop-color": "#8a9098" })
      ]),
      el("filter", { id: "e6b-glow", x: "-50%", y: "-50%", width: "200%", height: "200%" }, [
        el("feGaussianBlur", { "stdDeviation": "3.5", result: "b" }),
        el("feMerge", null, [
          el("feMergeNode", { in: "b" }),
          el("feMergeNode", { in: "SourceGraphic" })
        ])
      ]),
      el("mask", { id: "e6b-inner-mask", maskUnits: "userSpaceOnUse", maskContentUnits: "userSpaceOnUse" }, [
        el("circle", { cx: CX, cy: CY, r: R_INNER - 0.5, fill: "#fff" }),
        el("path", { d: annularSector(R_WINDOW_IN, R_WINDOW_OUT, TAS_A0, TAS_A1), fill: "#000" }),
        el("path", { d: annularSector(R_DA_IN, R_DA_OUT, DA_A0, DA_A1), fill: "#000" })
      ]),
      el("clipPath", { id: "e6b-da-clip" }, [
        el("path", { d: annularSector(R_DA_IN - 1, R_DA_OUT + 1, DA_A0, DA_A1) })
      ])
    ].join(""));
  }

  function highlightGroup(highlights) {
    if (!highlights || !highlights.length) {
      return el("g", { id: "e6b-highlights" }, "");
    }
    var parts = highlights.map(function (h, i) {
      var ang = h.angleDeg;
      var r = h.r || (R_OUTER_TICK + 8);
      var p = pt(r, ang);
      var p2 = pt(r + 28, ang);
      var label = h.label || "";
      return el("g", { class: "e6b-hl", "data-hl": String(i) }, [
        el("circle", {
          cx: p.x.toFixed(3), cy: p.y.toFixed(3), r: 11,
          fill: "none",
          stroke: "#e8b84a",
          "stroke-width": 3,
          filter: "url(#e6b-glow)"
        }),
        el("circle", {
          cx: p.x.toFixed(3), cy: p.y.toFixed(3), r: 4.5,
          fill: "#6fe3d0",
          stroke: "#0b1018",
          "stroke-width": 0.8
        }),
        el("line", {
          x1: p.x.toFixed(3), y1: p.y.toFixed(3),
          x2: p2.x.toFixed(3), y2: p2.y.toFixed(3),
          stroke: "#e8b84a",
          "stroke-width": 1.6
        }),
        radialText(label, r + 44, ang, { size: 11, fill: "#8a5a00", weight: 700, font: FONT })
      ]);
    });
    return el("g", { id: "e6b-highlights" }, parts.join(""));
  }

  function hairline() {
    var a = 0;
    var p0 = pt(R_MIN_TICK - 4, a);
    var p1 = pt(R_OUTER + 6, a);
    return el("g", { id: "e6b-hairline" }, [
      el("line", {
        x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y,
        stroke: "rgba(180,20,20,0.75)",
        "stroke-width": 1.1
      }),
      el("polygon", {
        points: [pt(R_BEZEL - 12, 0), pt(R_BEZEL + 2, -3.4), pt(R_BEZEL + 2, 3.4)]
          .map(function (p) { return p.x.toFixed(2) + "," + p.y.toFixed(2); }).join(" "),
        fill: "#8a1a1a"
      })
    ]);
  }

  function buildComputerSvg(opts) {
    opts = opts || {};
    var rot = opts.rotationDeg || 0;
    var bg = opts.background != null ? opts.background : "none";
    var highlights = opts.highlights || [];

    var tasWell = el("path", {
      d: annularSector(R_WINDOW_IN - 2, R_WINDOW_OUT + 2, 0, 359.9),
      fill: "url(#e6b-window-well)",
      opacity: 0.95
    });

    var base = [
      opts.background && opts.background !== "none"
        ? el("rect", { x: -28, y: -28, width: 856, height: 856, fill: bg, rx: opts.bgRadius || 0 })
        : "",
      el("circle", { cx: CX, cy: CY, r: R_BEZEL, fill: "url(#e6b-bezel)" }),
      knurl(),
      el("circle", { cx: CX, cy: CY, r: R_OUTER + 4, fill: "url(#e6b-plate)", stroke: "#6a7078", "stroke-width": 1.2 }),
      // PA / window well ring (visible through the openings)
      el("circle", { cx: CX, cy: CY, r: R_WINDOW_OUT + 8, fill: "#b7bcc3" }),
      el("circle", { cx: CX, cy: CY, r: R_WINDOW_IN - 8, fill: "url(#e6b-plate)" }),
      tasWell,
      paMarks(),
      // DA well
      el("circle", { cx: CX, cy: CY, r: R_DA_OUT + 4, fill: "#c2c6cc" }),
      el("circle", { cx: CX, cy: CY, r: R_DA_IN - 6, fill: "url(#e6b-plate)" }),
      scaleTicks(R_OUTER, R_OUTER_TICK, { major: 20, mid: 13, minor: 8 }),
      scaleLabels(337, { size: 15 }),
      conversionMarks(),
      curvedTitle("STATUTE MILES   NAUTICAL MILES   KILOMETERS", R_OUTER - 52, 55, 86, { size: 7, fill: "#222" }),
      curvedTitle("GALLONS   POUNDS   TRUE AIRSPEED", R_OUTER - 52, 230, 78, { size: 7, fill: "#222" }),
      tenIndex(R_OUTER_TICK + 2, false)
    ].join("");

    var inner = el("g", {
      id: "e6b-inner",
      transform: "rotate(" + rot.toFixed(4) + " " + CX + " " + CY + ")"
    }, [
      el("path", {
        d: (function () {
          var r = R_INNER;
          var circle = "M " + (CX + r) + " " + CY +
            " A " + r + " " + r + " 0 1 1 " + (CX - r) + " " + CY +
            " A " + r + " " + r + " 0 1 1 " + (CX + r) + " " + CY + " Z";
          return circle + " " + annularSector(R_WINDOW_IN, R_WINDOW_OUT, TAS_A0, TAS_A1) +
            " " + annularSector(R_DA_IN, R_DA_OUT, DA_A0, DA_A1);
        })(),
        fill: "url(#e6b-inner-fill)",
        "fill-rule": "evenodd",
        stroke: "#5c636c",
        "stroke-width": 2
      }),
      // window frames (rotate with the disk)
      el("path", {
        d: annularSector(R_WINDOW_IN, R_WINDOW_OUT, TAS_A0, TAS_A1),
        fill: "none",
        stroke: "#2a2e34",
        "stroke-width": 2.2
      }),
      el("path", {
        d: annularSector(R_DA_IN, R_DA_OUT, DA_A0, DA_A1),
        fill: "none",
        stroke: "#2a2e34",
        "stroke-width": 1.8
      }),
      tempMarks(),
      el("g", { "clip-path": "url(#e6b-da-clip)" }, daMarks()),
      curvedTitle("PRESS. ALT.  × 1000 FT", R_WINDOW_IN + 9, (TAS_A0 + TAS_A1) / 2, 38, { size: 6, fill: "#333" }),
      curvedTitle("DA  × 1000 FT", R_DA_IN + 8, (DA_A0 + DA_A1) / 2, 36, { size: 6, fill: "#333" }),
      scaleTicks(R_INNER - 1, R_MIN_TICK, { invert: true, major: 18, mid: 12, minor: 7 }),
      scaleLabels(R_MIN_NUM, { size: 14 }),
      hoursLabels(),
      curvedTitle("MINUTES", (R_MIN_NUM + R_HOUR_NUM) / 2, 78, 16, { size: 6.5, fill: "#111" }),
      curvedTitle("HOURS", R_HOUR_NUM - 14, 78, 12, { size: 6, fill: "#8a1a1a" }),
      rateIndex(),
      tenIndex(R_INNER - 2, true)
    ].join(""));

    var daPointer = (function () {
      var a = DA_POINTER;
      var p0 = pt(R_DA_OUT + 1, a);
      var p1 = pt(R_DA_OUT + 14, a);
      var l = pt(R_DA_OUT + 14, a - 3);
      var r = pt(R_DA_OUT + 14, a + 3);
      return el("g", { id: "e6b-da-pointer" }, [
        el("line", {
          x1: p0.x.toFixed(2), y1: p0.y.toFixed(2),
          x2: p1.x.toFixed(2), y2: p1.y.toFixed(2),
          stroke: "#8a1a1a", "stroke-width": 1.6
        }),
        el("polygon", {
          points: [p0, l, r].map(function (p) { return p.x.toFixed(2) + "," + p.y.toFixed(2); }).join(" "),
          fill: "#8a1a1a"
        })
      ]);
    })();

    var titles = el("g", { id: "e6b-titles" }, [
      el("text", {
        x: CX, y: CY - 62,
        "text-anchor": "middle",
        fill: "#8a1a1a",
        "font-family": FONT,
        "font-size": 16,
        "font-weight": 700,
        "letter-spacing": 3
      }, "E6B"),
      el("text", {
        x: CX, y: CY - 46,
        "text-anchor": "middle",
        fill: "#1a1a1a",
        "font-family": FONT,
        "font-size": 11,
        "font-weight": 700,
        "letter-spacing": 2.2
      }, "FLIGHT COMPUTER"),
      el("text", {
        x: CX, y: CY - 32,
        "text-anchor": "middle",
        fill: "#333",
        "font-family": FONT,
        "font-size": 7,
        "font-weight": 600,
        "letter-spacing": 0.8
      }, "TIME  ·  SPEED  ·  DISTANCE")
    ].join(""));

    var pivot = el("g", { id: "e6b-pivot" }, [
      el("circle", { cx: CX, cy: CY, r: 22, fill: "url(#e6b-brass)", stroke: "#5a4314", "stroke-width": 1.2 }),
      el("circle", { cx: CX, cy: CY, r: 8, fill: "#6e5220" }),
      el("circle", { cx: CX - 3, cy: CY - 3, r: 2.2, fill: "#f0d189", opacity: 0.7 })
    ].join(""));

    var body = [
      defsBlock(),
      el("g", { id: "e6b-fixed-base" }, base),
      inner,
      daPointer,
      hairline(),
      highlightGroup(highlights),
      titles,
      pivot
    ].join("");

    var svgAttrs = {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "-28 -28 856 856",
      role: "img",
      "aria-label": opts.ariaLabel || "E6B flight computer, circular slide-rule side",
      class: "e6b-computer-svg"
    };
    if (opts.width) svgAttrs.width = opts.width;
    if (opts.height) svgAttrs.height = opts.height;
    var prefix = opts.standalone
      ? '<?xml version="1.0" encoding="UTF-8"?>\n'
      : "";
    return prefix + el("svg", svgAttrs, body);
  }

  // ---------- Wind side -------------------------------------------------

  var WX = 320;
  var GROMMET_Y = 292;
  var ROSE_OUTER = 248;
  var ROSE_INNER = 202;
  var WIN = { x: 190, y: 150, w: 260, h: 290 };
  var PX_PER_KT = 2.15;
  var CARD_SPEED0 = 30;
  var CARD_SPEED1 = 260;

  function windCardLocalY(speed) {
    return (speed - CARD_SPEED0) * PX_PER_KT;
  }

  function cardOffsetForTas(tas) {
    return GROMMET_Y - windCardLocalY(tas);
  }

  function buildWindCard() {
    var w = WIN.w;
    var h = windCardLocalY(CARD_SPEED1) + 20;
    var cx = w / 2;
    var originY = windCardLocalY(0); // radials emanate from zero-speed
    var parts = [];
    parts.push(el("rect", { x: 0, y: 0, width: w, height: h, fill: "#d8c9a0" }));
    // faint paper grain lines
    for (var gy = 0; gy < h; gy += 18) {
      parts.push(el("line", { x1: 0, y1: gy, x2: w, y2: gy, stroke: "rgba(80,60,20,0.06)", "stroke-width": 1 }));
    }

    var speeds = [];
    for (var s = 40; s <= 250; s += 10) speeds.push(s);
    speeds.forEach(function (s) {
      var r = Math.max(8, s * PX_PER_KT);
      var cy = originY;
      var major = s % 50 === 0;
      var mid = s % 20 === 0;
      var span = 70 * Math.PI / 180;
      var a0 = -Math.PI / 2 - span / 2;
      var a1 = -Math.PI / 2 + span / 2;
      // Arc of radius r around the zero-speed origin, clipped later by the window.
      var x0 = cx + r * Math.cos(a0);
      var y0 = cy + r * Math.sin(a0);
      var x1 = cx + r * Math.cos(a1);
      var y1 = cy + r * Math.sin(a1);
      parts.push(el("path", {
        d: "M" + x0.toFixed(2) + " " + y0.toFixed(2) + " A" + r.toFixed(2) + " " + r.toFixed(2) + " 0 0 1 " + x1.toFixed(2) + " " + y1.toFixed(2),
        fill: "none",
        stroke: major ? "#2a2418" : mid ? "#4a4438" : "#7a7468",
        "stroke-width": major ? 1.4 : mid ? 0.9 : 0.45
      }));
      if (major || s % 20 === 0) {
        // Numbers sit only to the right of the centerline so a callout
        // in the left half of the window cannot cover them.
        parts.push(el("text", {
          x: cx + 14,
          y: windCardLocalY(s) + 3,
          fill: "#1a160e",
          "font-family": FONT,
          "font-size": major ? 11 : 8.5,
          "font-weight": 700
        }, String(s)));
      }
    });

    // Drift radials from the zero-speed origin
    var angles = [];
    for (var d = -40; d <= 40; d += 2) angles.push(d);
    angles.forEach(function (d) {
      if (d === 0) return;
      var rad = d * Math.PI / 180;
      var len = CARD_SPEED1 * PX_PER_KT + 40;
      var x2 = cx + len * Math.sin(rad);
      var y2 = originY + len * Math.cos(rad);
      var major = d % 10 === 0;
      parts.push(el("line", {
        x1: cx, y1: originY, x2: x2.toFixed(2), y2: y2.toFixed(2),
        stroke: major ? "rgba(140,30,30,0.65)" : "rgba(60,50,30,0.28)",
        "stroke-width": major ? 1.05 : 0.45
      }));
      if (major) {
        var labR = 210 * PX_PER_KT;
        var lx = cx + labR * Math.sin(rad);
        var ly = originY + labR * Math.cos(rad);
        parts.push(el("text", {
          x: lx.toFixed(2), y: ly.toFixed(2),
          fill: "#8a1a1a",
          "font-family": FONT,
          "font-size": 8,
          "font-weight": 700,
          "text-anchor": "middle",
          "dominant-baseline": "middle"
        }, String(Math.abs(d)) + "°"));
      }
    });

    // Centerline
    parts.push(el("line", {
      x1: cx, y1: 0, x2: cx, y2: h,
      stroke: "#1a140c",
      "stroke-width": 1.6
    }));

    parts.push(el("text", {
      x: 10, y: 16,
      fill: "#3a3220",
      "font-family": FONT,
      "font-size": 8,
      "font-weight": 700,
      "letter-spacing": 1
    }, "TAS / GS — KT"));

    return { svg: parts.join(""), width: w, height: h, cx: cx, originY: originY };
  }

  function compassRose() {
    var parts = [];
    var ring = [
      "M " + (WX + ROSE_OUTER) + " " + GROMMET_Y,
      "A " + ROSE_OUTER + " " + ROSE_OUTER + " 0 1 1 " + (WX - ROSE_OUTER) + " " + GROMMET_Y,
      "A " + ROSE_OUTER + " " + ROSE_OUTER + " 0 1 1 " + (WX + ROSE_OUTER) + " " + GROMMET_Y,
      "Z",
      "M " + (WX + ROSE_INNER) + " " + GROMMET_Y,
      "A " + ROSE_INNER + " " + ROSE_INNER + " 0 1 0 " + (WX - ROSE_INNER) + " " + GROMMET_Y,
      "A " + ROSE_INNER + " " + ROSE_INNER + " 0 1 0 " + (WX + ROSE_INNER) + " " + GROMMET_Y,
      "Z"
    ].join(" ");
    parts.push(el("path", {
      d: ring,
      fill: "url(#e6b-bezel)",
      "fill-rule": "evenodd",
      stroke: "#2c3036",
      "stroke-width": 1
    }));
    parts.push(el("circle", { cx: WX, cy: GROMMET_Y, r: ROSE_INNER, fill: "none", stroke: "#4a5058", "stroke-width": 1.2 }));
    for (var d = 0; d < 360; d++) {
      var major = d % 10 === 0;
      var mid = d % 5 === 0;
      var len = major ? 14 : mid ? 9 : 5;
      var w = major ? 1.5 : mid ? 1 : 0.6;
      var a0 = E6B.pointAtAngle(WX, GROMMET_Y, ROSE_OUTER - 2, d);
      var a1 = E6B.pointAtAngle(WX, GROMMET_Y, ROSE_OUTER - 2 - len, d);
      parts.push(el("line", {
        x1: a0.x.toFixed(2), y1: a0.y.toFixed(2),
        x2: a1.x.toFixed(2), y2: a1.y.toFixed(2),
        stroke: "#141414", "stroke-width": w
      }));
      if (major) {
        var lab = d === 0 ? "360" : String(d);
        // Compass: 0 at top, numbers increase clockwise — already our convention.
        parts.push((function (ang, text) {
          var p = E6B.pointAtAngle(WX, GROMMET_Y, ROSE_OUTER - 28, ang);
          return el("text", {
            x: p.x.toFixed(2), y: p.y.toFixed(2),
            transform: "rotate(" + ang + " " + p.x.toFixed(2) + " " + p.y.toFixed(2) + ")",
            "text-anchor": "middle",
            "dominant-baseline": "middle",
            fill: (ang === 0 || ang === 90 || ang === 180 || ang === 270) ? "#8a1a1a" : "#141414",
            "font-family": FONT,
            "font-size": (ang % 30 === 0) ? 12 : 9,
            "font-weight": 700
          }, esc(text));
        })(d, lab));
      }
    }
    // Cardinals sit in the gap inside the ring so they do not collide
    // with 360 / 090 / 180 / 270 on the compass scale.
    var dirs = [[0, "N"], [90, "E"], [180, "S"], [270, "W"]];
    dirs.forEach(function (dir) {
      var p = E6B.pointAtAngle(WX, GROMMET_Y, ROSE_INNER - 16, dir[0]);
      parts.push(el("text", {
        x: p.x.toFixed(2), y: p.y.toFixed(2),
        transform: "rotate(" + dir[0] + " " + p.x.toFixed(2) + " " + p.y.toFixed(2) + ")",
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        fill: "#8a1a1a",
        "font-family": FONT,
        "font-size": 10,
        "font-weight": 700
      }, dir[1]));
    });
    return parts.join("");
  }

  function wcaScale() {
    // Fixed scale in an opaque header band so sliding-card speed labels
    // (the 60s when the grommet is on 120) do not show through it.
    var parts = [];
    var y = WIN.y + 11;
    var mid = WX;
    parts.push(el("rect", {
      x: WIN.x, y: WIN.y, width: WIN.w, height: WCA_BAND_H, rx: 6,
      fill: "#c5c9ce"
    }));
    parts.push(el("rect", {
      x: WIN.x, y: WIN.y + WCA_BAND_H - 8, width: WIN.w, height: 8,
      fill: "#c5c9ce"
    }));
    parts.push(el("line", {
      x1: WIN.x, y1: WIN.y + WCA_BAND_H,
      x2: WIN.x + WIN.w, y2: WIN.y + WCA_BAND_H,
      stroke: "#2a2e34", "stroke-width": 1
    }));
    parts.push(el("text", {
      x: mid, y: y + 1,
      "text-anchor": "middle",
      fill: "#8a1a1a",
      "font-family": FONT,
      "font-size": 7,
      "font-weight": 700,
      "letter-spacing": 0.8
    }, "WIND CORRECTION ANGLE"));
    for (var d = -30; d <= 30; d += 2) {
      var x = mid + d * 3.2;
      var major = d % 10 === 0;
      parts.push(el("line", {
        x1: x, y1: y + 5, x2: x, y2: y + (major ? 14 : 10),
        stroke: "#8a1a1a", "stroke-width": major ? 1.3 : 0.7
      }));
      if (major && d !== 0) {
        parts.push(el("text", {
          x: x, y: y + 25,
          "text-anchor": "middle",
          fill: "#8a1a1a",
          "font-family": FONT,
          "font-size": 7,
          "font-weight": 700
        }, String(Math.abs(d)) + "°"));
      }
    }
    parts.push(el("text", { x: mid - 118, y: y + 25, "text-anchor": "middle", fill: "#8a1a1a", "font-family": FONT, "font-size": 7, "font-weight": 700 }, "L"));
    parts.push(el("text", { x: mid + 118, y: y + 25, "text-anchor": "middle", fill: "#8a1a1a", "font-family": FONT, "font-size": 7, "font-weight": 700 }, "R"));
    return el("g", { id: "e6b-wca-scale" }, parts.join(""));
  }

  function buildWindSvg(opts) {
    opts = opts || {};
    var roseHeading = opts.roseHeading != null ? opts.roseHeading : 360;
    var tas = opts.tas != null ? opts.tas : 120;
    var windFrom = opts.windFrom != null ? opts.windFrom : 360;
    var windSpeed = opts.windSpeed != null ? opts.windSpeed : 0;
    var showDot = !!opts.showDot;
    var showCallouts = !!opts.showCallouts;
    var wca = opts.wca;
    var gs = opts.groundspeed;
    var bg = opts.background != null ? opts.background : "none";
    var card = buildWindCard();
    var cardX = WX - card.cx;
    var cardY = cardOffsetForTas(tas);

    var clipId = "e6b-wind-clip";
    var defs = el("defs", null, [
      el("radialGradient", { id: "e6b-bezel", cx: "35%", cy: "30%", r: "80%" }, [
        el("stop", { offset: "0%", "stop-color": "#d8dce2" }),
        el("stop", { offset: "40%", "stop-color": "#8b929a" }),
        el("stop", { offset: "72%", "stop-color": "#5c636c" }),
        el("stop", { offset: "100%", "stop-color": "#2c3036" })
      ]),
      el("radialGradient", { id: "e6b-brass", cx: "35%", cy: "30%", r: "70%" }, [
        el("stop", { offset: "0%", "stop-color": "#f0d189" }),
        el("stop", { offset: "55%", "stop-color": "#c4a35a" }),
        el("stop", { offset: "100%", "stop-color": "#6e5220" })
      ]),
      el("filter", { id: "e6b-glow", x: "-50%", y: "-50%", width: "200%", height: "200%" }, [
        el("feGaussianBlur", { "stdDeviation": "3.5", result: "b" }),
        el("feMerge", null, [el("feMergeNode", { in: "b" }), el("feMergeNode", { in: "SourceGraphic" })])
      ]),
      el("clipPath", { id: clipId }, [
        el("rect", { x: WIN.x, y: WIN.y + WCA_BAND_H, width: WIN.w, height: WIN.h - WCA_BAND_H })
      ])
    ].join(""));

    // Frame / body
    var bodyW = 640;
    var bodyH = 780;
    var frame = [
      bg && bg !== "none" ? el("rect", { x: 0, y: 0, width: bodyW, height: bodyH, fill: bg }) : "",
      el("rect", { x: 36, y: 16, width: 568, height: 748, rx: 28, fill: "url(#e6b-bezel)", stroke: "#2c3036", "stroke-width": 1.5 }),
      el("rect", { x: 52, y: 32, width: 536, height: 716, rx: 20, fill: "#cfd3d8", stroke: "#6a7078", "stroke-width": 1 }),
      el("text", {
        x: WX, y: 58,
        "text-anchor": "middle",
        fill: "#1a1a1a",
        "font-family": FONT,
        "font-size": 13,
        "font-weight": 700,
        "letter-spacing": 2.4
      }, "E6B  ·  WIND SIDE"),
      el("text", {
        x: WX, y: 74,
        "text-anchor": "middle",
        fill: "#8a1a1a",
        "font-family": FONT,
        "font-size": 9,
        "font-weight": 600,
        "letter-spacing": 1.4
      }, "TRUE COURSE INDEX")
    ].join("");

    var trueIndex = (function () {
      var top = GROMMET_Y - ROSE_OUTER;
      var pts = WX + "," + (top - 2) + " " + (WX - 12) + "," + (top - 22) + " " + (WX + 12) + "," + (top - 22);
      return el("g", { id: "e6b-true-index" }, [
        el("polygon", { points: pts, fill: "#8a1a1a" }),
        el("text", {
          x: WX, y: top - 26,
          "text-anchor": "middle",
          fill: "#8a1a1a",
          "font-family": FONT,
          "font-size": 8,
          "font-weight": 700,
          "letter-spacing": 1
        }, "TRUE INDEX")
      ]);
    })();

    var cardGroup = el("g", { "clip-path": "url(#" + clipId + ")" }, [
      el("g", {
        id: "e6b-wind-card",
        transform: "translate(" + cardX.toFixed(2) + " " + cardY.toFixed(2) + ")"
      }, card.svg)
    ].join(""));

    var roseRot = -((roseHeading === 360) ? 0 : roseHeading);
    var rose = el("g", {
      id: "e6b-wind-rose",
      transform: "rotate(" + roseRot.toFixed(4) + " " + WX + " " + GROMMET_Y + ")"
    }, compassRose());
    var windDot = el("g", { "clip-path": "url(#" + clipId + ")" }, [
      el("g", {
        id: "e6b-wind-dot",
        visibility: showDot ? "visible" : "hidden",
        transform: "rotate(" + roseRot.toFixed(4) + " " + WX + " " + GROMMET_Y + ")"
      }, [
        el("circle", {
          id: "e6b-wind-dot-mark",
          cx: WX,
          cy: GROMMET_Y - windSpeed * PX_PER_KT,
          r: 6,
          fill: "#8a1a1a",
          stroke: "#fff4d0",
          "stroke-width": 1.6,
          filter: showCallouts ? "url(#e6b-glow)" : null
        }),
        el("circle", {
          id: "e6b-wind-dot-core",
          cx: WX,
          cy: GROMMET_Y - windSpeed * PX_PER_KT,
          r: 2,
          fill: "#fff4d0"
        })
      ].join(""))
    ].join(""));

    var windowFrame = [
      el("rect", {
        x: WIN.x, y: WIN.y, width: WIN.w, height: WIN.h, rx: 6,
        fill: "none",
        stroke: "#2a2e34",
        "stroke-width": 3
      }),
      // grommet
      el("g", { id: "e6b-grommet" }, [
        el("circle", { cx: WX, cy: GROMMET_Y, r: 11, fill: "none", stroke: "#c4a35a", "stroke-width": 4 }),
        el("circle", { cx: WX, cy: GROMMET_Y, r: 7, fill: "none", stroke: "#5a4314", "stroke-width": 1 }),
        el("circle", { cx: WX, cy: GROMMET_Y, r: 2.2, fill: "#1a140c" })
      ].join("")),
      wcaScale()
    ].join("");

    var callouts = "";
    if (showCallouts && showDot && isFinite(wca) && isFinite(gs)) {
      var side = wca < 0 ? "L" : wca > 0 ? "R" : "";
      var wcaLbl = (wca === 0 ? "WCA 0°" : "WCA " + Math.abs(wca).toFixed(1) + "° " + side);
      var gsLbl = "GS " + gs.toFixed(1) + " kt";
      // Place callouts near the (world) wind-dot position
      var world = E6B.windDotOffset(windFrom, roseHeading, windSpeed);
      var cX = WX + world.x * PX_PER_KT;
      var cY = GROMMET_Y - world.y * PX_PER_KT;
      // Boxed callout in the lower-left of the window — on the open grid,
      // left of the TAS/GS numbers and below the wind dot.
      var boxW = 112;
      var boxH = 42;
      var boxX = WIN.x + 12;
      var boxY = WIN.y + WIN.h - 96;
      var tipX = cX - 14;
      var tipY = cY + 14;
      var joinX = boxX + boxW;
      var joinY = boxY + 10;
      callouts = el("g", { id: "e6b-wind-callouts" }, [
        el("circle", {
          cx: cX.toFixed(2), cy: cY.toFixed(2), r: 14,
          fill: "none", stroke: "#e8b84a", "stroke-width": 3,
          filter: "url(#e6b-glow)"
        }),
        el("line", {
          x1: tipX.toFixed(2), y1: tipY.toFixed(2),
          x2: joinX.toFixed(2), y2: joinY.toFixed(2),
          stroke: "#c4a35a", "stroke-width": 1.4
        }),
        el("rect", {
          x: boxX, y: boxY.toFixed(2), width: boxW, height: boxH, rx: 6,
          fill: "#fff8e8",
          stroke: "#c4a35a",
          "stroke-width": 1.5
        }),
        el("text", {
          x: boxX + 10, y: (boxY + 17).toFixed(2),
          "text-anchor": "start",
          fill: "#5a3a00",
          "font-family": FONT,
          "font-size": 12,
          "font-weight": 700
        }, esc(wcaLbl)),
        el("text", {
          x: boxX + 10, y: (boxY + 32).toFixed(2),
          "text-anchor": "start",
          fill: "#5a3a00",
          "font-family": FONT,
          "font-size": 12,
          "font-weight": 700
        }, esc(gsLbl))
      ].join(""));
    } else {
      callouts = el("g", { id: "e6b-wind-callouts" }, "");
    }

    var footer = el("text", {
      x: WX, y: 742,
      "text-anchor": "middle",
      fill: "#333",
      "font-family": FONT,
      "font-size": 8,
      "font-weight": 600
    }, "Plot wind toward the true index  ·  grommet on TAS  ·  read WCA and GS at the wind mark");

    var svgAttrs = {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 " + bodyW + " " + bodyH,
      role: "img",
      "aria-label": opts.ariaLabel || "E6B wind side: rotating azimuth, sliding grid, and grommet",
      class: "e6b-wind-svg"
    };
    if (opts.width) svgAttrs.width = opts.width;
    if (opts.height) svgAttrs.height = opts.height;

    var content = [
      defs, frame,
      cardGroup,
      rose,
      windDot,
      windowFrame,
      trueIndex,
      callouts,
      footer
    ].join("");

    var prefix = opts.standalone ? '<?xml version="1.0" encoding="UTF-8"?>\n' : "";
    return prefix + el("svg", svgAttrs, content);
  }

  var api = {
    CX: CX,
    CY: CY,
    WX: WX,
    GROMMET_Y: GROMMET_Y,
    PX_PER_KT: PX_PER_KT,
    R_INNER: R_INNER,
    R_OUTER: R_OUTER,
    R_DA_OUT: R_DA_OUT,
    DA_POINTER: DA_POINTER,
    cardOffsetForTas: cardOffsetForTas,
    windCardLocalY: windCardLocalY,
    buildComputerSvg: buildComputerSvg,
    buildWindSvg: buildWindSvg,
    highlightsSvg: highlightGroup,
    WIN: WIN
  };

  root.E6BRender = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

/**
 * Pinch / pan / reset zoom for the E6B instrument (no libraries).
 * Pure state + a gesture controller fed plain pointer objects, so the
 * logic is testable in node. app.js wires DOM events to it.
 */
(function (root) {
  "use strict";

  var MIN_SCALE = 1;
  var MAX_SCALE = 4;

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  // View transform: content is drawn as translate(tx, ty) scale(s) with
  // transform-origin 0 0, inside a viewport of size w × h that clips it.
  function createZoom(opts) {
    opts = opts || {};
    var min = opts.min != null ? opts.min : MIN_SCALE;
    var max = opts.max != null ? opts.max : MAX_SCALE;
    var st = { scale: 1, tx: 0, ty: 0, w: opts.width || 0, h: opts.height || 0 };
    var listeners = [];

    function emit() { listeners.forEach(function (fn) { fn(get()); }); }

    function clampPan() {
      // Keep the scaled content covering the viewport (no empty gutters).
      var minTx = st.w - st.w * st.scale;
      var minTy = st.h - st.h * st.scale;
      st.tx = clamp(st.tx, Math.min(0, minTx), 0);
      st.ty = clamp(st.ty, Math.min(0, minTy), 0);
      if (st.scale <= min + 1e-9) { st.scale = min; st.tx = 0; st.ty = 0; }
    }

    function get() { return { scale: st.scale, tx: st.tx, ty: st.ty, width: st.w, height: st.h }; }

    function setSize(w, h) {
      // Keep the same relative view when the viewport resizes.
      if (st.w > 0 && st.h > 0 && w > 0 && h > 0) {
        st.tx *= w / st.w;
        st.ty *= h / st.h;
      }
      st.w = w; st.h = h;
      clampPan();
      emit();
    }

    // Zoom to an absolute scale keeping viewport point (px, py) fixed.
    function zoomTo(scale, px, py) {
      var s1 = clamp(scale, min, max);
      var s0 = st.scale;
      if (px == null) px = st.w / 2;
      if (py == null) py = st.h / 2;
      // content point under (px, py): c = (p - t) / s0 → keep it at p
      st.tx = px - (px - st.tx) * (s1 / s0);
      st.ty = py - (py - st.ty) * (s1 / s0);
      st.scale = s1;
      clampPan();
      emit();
      return st.scale;
    }

    function zoomBy(factor, px, py) { return zoomTo(st.scale * factor, px, py); }

    function panBy(dx, dy) {
      st.tx += dx; st.ty += dy;
      clampPan();
      emit();
    }

    function reset() {
      st.scale = min; st.tx = 0; st.ty = 0;
      emit();
    }

    function isZoomed() { return st.scale > min + 1e-6; }

    function cssTransform() {
      return "translate(" + st.tx.toFixed(2) + "px, " + st.ty.toFixed(2) + "px) scale(" + st.scale.toFixed(4) + ")";
    }

    // Map a viewport point to unscaled content coordinates.
    function toContent(px, py) {
      return { x: (px - st.tx) / st.scale, y: (py - st.ty) / st.scale };
    }

    return {
      MIN: min, MAX: max,
      get: get, setSize: setSize, zoomTo: zoomTo, zoomBy: zoomBy, panBy: panBy,
      reset: reset, isZoomed: isZoomed, cssTransform: cssTransform, toContent: toContent,
      onChange: function (fn) { listeners.push(fn); }
    };
  }

  // Gesture controller.
  //   one pointer  → rotate (when canRotate says so), else pan when zoomed
  //   two pointers → pinch + pan (a running rotation is ended first)
  //   double tap   → reset to 1× (or 2× at the tap point when at 1×)
  //   ctrl+wheel   → zoom at the cursor (trackpad pinch); plain wheel ignored
  // Pointer objects: { id, x, y, t } with x/y in viewport coordinates.
  function createGestures(zoom, hooks) {
    hooks = hooks || {};
    var pts = {};
    var count = 0;
    var mode = null; // null | "rotate" | "pan" | "pinch"
    var last = null;
    var pinch = null;
    var tap = null;
    var lastTap = null;
    var TAP_MOVE = 10;
    var TAP_MS = 300;
    var DOUBLE_MS = 320;
    var DOUBLE_DIST = 36;

    function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
    function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
    function two() {
      var ids = Object.keys(pts);
      return [pts[ids[0]], pts[ids[1]]];
    }
    function endRotate(cancelled) {
      if (mode === "rotate" && hooks.onRotateEnd) hooks.onRotateEnd({ cancelled: !!cancelled });
    }
    function startPinch() {
      var p = two();
      pinch = { d0: Math.max(1, dist(p[0], p[1])), s0: zoom.get().scale, m: mid(p[0], p[1]) };
      mode = "pinch";
    }

    function down(p) {
      if (pts[p.id]) return mode;
      pts[p.id] = { x: p.x, y: p.y };
      count += 1;
      if (count === 1) {
        tap = { x: p.x, y: p.y, t: p.t || 0, moved: false };
        var rot = hooks.canRotate ? hooks.canRotate(p, zoom.isZoomed()) : false;
        if (rot) {
          mode = "rotate";
          if (hooks.onRotateStart) hooks.onRotateStart(p);
        } else if (zoom.isZoomed()) {
          mode = "pan";
          last = { x: p.x, y: p.y };
        } else {
          mode = null;
        }
      } else if (count === 2) {
        endRotate(true);
        tap = null;
        startPinch();
      }
      return mode;
    }

    function move(p) {
      var q = pts[p.id];
      if (!q) return mode;
      q.x = p.x; q.y = p.y;
      if (tap && Math.hypot(p.x - tap.x, p.y - tap.y) > TAP_MOVE) tap.moved = true;
      if (mode === "rotate") {
        if (hooks.onRotateMove) hooks.onRotateMove(p);
      } else if (mode === "pan") {
        zoom.panBy(p.x - last.x, p.y - last.y);
        last = { x: p.x, y: p.y };
      } else if (mode === "pinch" && count >= 2) {
        var pp = two();
        var m = mid(pp[0], pp[1]);
        var s = pinch.s0 * dist(pp[0], pp[1]) / pinch.d0;
        zoom.zoomTo(s, m.x, m.y);
        zoom.panBy(m.x - pinch.m.x, m.y - pinch.m.y);
        pinch.m = m;
      }
      return mode;
    }

    function up(p, cancelled) {
      if (!pts[p.id]) return mode;
      delete pts[p.id];
      count -= 1;
      if (count === 1 && mode === "pinch") {
        // Lifting one finger of a pinch: continue as a pan, never a rotate.
        var rest = pts[Object.keys(pts)[0]];
        mode = zoom.isZoomed() ? "pan" : null;
        last = { x: rest.x, y: rest.y };
        pinch = null;
        return mode;
      }
      if (count <= 0) {
        count = 0;
        endRotate(!!cancelled);
        var wasTap = !cancelled && tap && !tap.moved && ((p.t || 0) - tap.t) <= TAP_MS;
        mode = null;
        pinch = null;
        if (wasTap) {
          var t = p.t || 0;
          if (lastTap && t - lastTap.t <= DOUBLE_MS && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) <= DOUBLE_DIST) {
            lastTap = null;
            if (zoom.isZoomed()) zoom.reset();
            else zoom.zoomTo(2, p.x, p.y);
            if (hooks.onDoubleTap) hooks.onDoubleTap(zoom.get());
            tap = null;
            return "doubletap";
          }
          lastTap = { x: p.x, y: p.y, t: t };
        }
        tap = null;
      }
      return mode;
    }

    function wheel(ev) {
      if (!ev || !ev.ctrlKey) return false;
      var f = Math.exp(-clamp(ev.deltaY, -60, 60) * 0.01);
      zoom.zoomBy(f, ev.x, ev.y);
      return true;
    }

    return {
      down: down, move: move,
      up: function (p) { return up(p, false); },
      cancel: function (p) { return up(p, true); },
      wheel: wheel,
      mode: function () { return mode; },
      pointerCount: function () { return count; }
    };
  }

  var api = { MIN_SCALE: MIN_SCALE, MAX_SCALE: MAX_SCALE, createZoom: createZoom, createGestures: createGestures };
  root.E6BZoom = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : this);

/* Plasmie, drawn with the app's own renderer.
   curve / makeBlob / drawFace / drawProps / life / morph are ported from the app's
   brand sheet (app/brand/plasmie-brand.template.html) and the shapes come from its
   generated plasmie-shapes.json, so this is the real character, not a drawing of it.
   What's added here is only the driver: which state each blob shows, and when. */
(function () {
  "use strict";
  var DATA = window.PLASMIE_SHAPES;
  if (!DATA) return;
  var NS = "http://www.w3.org/2000/svg";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DOT_COLOURS = ["#7A3A82", "#3D7BE0", "#F07A3E"];

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function curve(p) {
    var n = p.length, d = "M" + p[0][0] + "," + p[0][1];
    for (var i = 0; i < n; i++) {
      var a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n], e = p[(i + 2) % n];
      d += " C" + (b[0] + (c[0] - a[0]) / 6).toFixed(2) + "," + (b[1] + (c[1] - a[1]) / 6).toFixed(2) +
        " " + (c[0] - (e[0] - b[0]) / 6).toFixed(2) + "," + (c[1] - (e[1] - b[1]) / 6).toFixed(2) +
        " " + c[0] + "," + c[1];
    }
    return d + "Z";
  }
  function bbox(p) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    p.forEach(function (q) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); });
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  function copy(p) { return p.map(function (q) { return q.slice(); }); }
  function lerp(a, b, k) { return a.map(function (p, i) { return [p[0] + (b[i][0] - p[0]) * k, p[1] + (b[i][1] - p[1]) * k]; }); }
  function easeOutExpo(k) { return k >= 1 ? 1 : 1 - Math.pow(2, -10 * k); }
  function easeOut(k) { return 1 - Math.pow(1 - k, 5); }

  function makeBlob(host, state) {
    var svg = el("svg", { viewBox: "-6 -14 112 120", "aria-hidden": "true", focusable: "false" }, host);
    var g = el("g", {}, svg), id = "clip" + Math.random().toString(36).slice(2, 8);
    var clip = el("path", {}, el("clipPath", { id: id }, el("defs", {}, svg)));
    var B = {
      svg: svg, g: g, clip: clip,
      body: el("path", {}, g),
      hi: el("ellipse", { opacity: 0.6, "clip-path": "url(#" + id + ")" }, g),
      face: el("g", {}, g), prop: el("g", {}, g),
      hello: host.getAttribute("data-hello") || "hi!",      // what the wave says (the map's Plasmie asks "ready to try?")
      state: state, pts: copy(DATA.shapes[state]), dirty: true, visible: true
    };
    return B;
  }

  function drawFace(B, st, b) {
    var f = DATA.faces[st], col = "var(--face)";
    if (st === "hi" || st === "tada") b = bbox(DATA.shapes.idle);   // the face sits on the body, not the arms
    B.face.replaceChildren();
    var cx = b.x + b.w / 2, gap = st === "busy" ? 8 : Math.min(b.w * 0.17, 13), r = st === "busy" ? 3.8 : 4.6;
    var ey = st === "busy" ? b.y + b.h * 0.15 : b.y + Math.min(b.h * 0.42, b.h - 14);
    var line = { fill: "none", stroke: col, "stroke-width": 3, "stroke-linecap": "round" };
    function eye(x) {
      switch (f.eyes) {
        case "happy": return el("path", Object.assign({ d: "M" + (x - 5) + "," + (ey + 1.5) + " Q" + x + "," + (ey - 5) + " " + (x + 5) + "," + (ey + 1.5) }, line), B.face);
        case "closed": return el("path", Object.assign({ d: "M" + (x - 5) + "," + ey + " Q" + x + "," + (ey + 4.5) + " " + (x + 5) + "," + ey }, line), B.face);
        case "flat": return el("path", { d: "M" + (x - 4.5) + "," + ey + " H" + (x + 4.5), stroke: col, "stroke-width": 3.2, "stroke-linecap": "round" }, B.face);
        case "up": el("circle", { cx: x, cy: ey, r: r, fill: col }, B.face); return el("circle", { cx: x + 1.2, cy: ey - 2.4, r: 1.7, fill: "var(--shine)" }, B.face);
        case "worried": el("circle", { cx: x, cy: ey + 1, r: r - 0.4, fill: col }, B.face);
          return el("path", { d: "M" + (x - 5) + "," + (ey - 6 + (x < cx ? 2 : 0)) + " L" + (x + 5) + "," + (ey - 6 + (x < cx ? 0 : 2)), stroke: col, "stroke-width": 2.4, "stroke-linecap": "round" }, B.face);
        case "wink": if (x > cx) return el("path", Object.assign({ d: "M" + (x - 5) + "," + ey + " Q" + x + "," + (ey - 4) + " " + (x + 5) + "," + ey }, line), B.face);
        /* falls through for the open eye */
        default: el("circle", { cx: x, cy: ey, r: r, fill: col }, B.face);
          return el("circle", { cx: x + 1.4, cy: ey - 1.6, r: 1.6, fill: "var(--shine)" }, B.face);
      }
    }
    eye(cx - gap); eye(cx + gap);
    var my = ey + 9;
    if (["hi", "tada", "idle", "success", "held", "promote"].indexOf(st) >= 0) [-1, 1].forEach(function (s) {
      el("ellipse", { cx: cx + s * (gap + 9), cy: my - 2, rx: 5.5, ry: 3.2, fill: "var(--blush)", opacity: 0.8 }, B.face);
    });
    switch (f.mouth) {
      case "smile": el("path", Object.assign({ d: "M" + (cx - 5) + "," + my + " Q" + cx + "," + (my + 5) + " " + (cx + 5) + "," + my }, line), B.face); break;
      case "grin": el("path", { d: "M" + (cx - 7) + "," + (my - 1) + " Q" + cx + "," + (my + 8) + " " + (cx + 7) + "," + (my - 1) + "Z", fill: col }, B.face); break;
      case "o": el("ellipse", { cx: cx, cy: my + 1, rx: 3.6, ry: 4.4, fill: col }, B.face); break;
      case "small": el("path", Object.assign({ d: "M" + (cx - 3) + "," + my + " Q" + cx + "," + (my + 2.5) + " " + (cx + 3) + "," + my }, line), B.face); break;
      case "flat": el("path", Object.assign({ d: "M" + (cx - 4) + "," + my + " H" + (cx + 4) }, line), B.face); break;
      case "wobble": el("path", Object.assign({ d: "M" + (cx - 6) + "," + (my + 1) + " q2,-3 4,0 t4,0 t4,0" }, line), B.face); break;
    }
  }

  function star(x, y, s, fill, parent, stroke) {
    var a = { d: "M" + x + "," + (y - s) + " L" + (x + s * 0.35) + "," + (y - s * 0.35) + " L" + (x + s) + "," + y + " L" + (x + s * 0.35) + "," + (y + s * 0.35) +
      " L" + x + "," + (y + s) + " L" + (x - s * 0.35) + "," + (y + s * 0.35) + " L" + (x - s) + "," + y + " L" + (x - s * 0.35) + "," + (y - s * 0.35) + "Z", fill: fill };
    if (stroke) { a.stroke = "var(--face)"; a["stroke-width"] = 1.2; }
    return el("path", a, parent);
  }

  function drawProps(B, st, b, T) {
    B.prop.replaceChildren();
    var f = DATA.faces[st], cx = b.x + b.w / 2, k, x, y, i;
    switch (f.prop) {
      case "dots": for (i = 0; i < 3; i++) {
        k = (T + i / 3) % 1; x = cx + (i - 1) * 9 * (1 - k); y = b.y - 22 + k * 30;
        el("circle", { cx: x, cy: y, r: 4, fill: DOT_COLOURS[i], opacity: Math.min(1, (1 - k) * 2.2) }, B.prop);
      } break;
      case "card": k = (T * 0.8) % 1; y = b.y - 26 + easeOut(Math.min(1, k * 1.6)) * 22;
        el("rect", { x: cx - 9, y: y, width: 18, height: 13, rx: 2.5, fill: "var(--card)", stroke: "var(--face)", "stroke-width": 2, opacity: k > 0.85 ? (1 - k) / 0.15 : 1 }, B.prop);
        el("path", { d: "M" + (cx - 5) + "," + (y + 5) + " H" + (cx + 5) + " M" + (cx - 5) + "," + (y + 9) + " H" + (cx + 2), stroke: "var(--face)", "stroke-width": 1.6, "stroke-linecap": "round" }, B.prop);
        break;
      case "spark": star(cx + b.w * 0.36, b.y - 6, 7 * (1 + 0.25 * Math.sin(T * 7.5)), "var(--spark)", B.prop, true); break;
      case "bang": y = b.y - 14 + 2.5 * Math.sin(T * 4); x = b.x + b.w + 2;
        el("circle", { cx: x, cy: y, r: 8.5, fill: "var(--spark)", stroke: "var(--face)", "stroke-width": 2 }, B.prop);
        el("path", { d: "M" + x + "," + (y - 4.5) + " V" + (y + 1), stroke: "var(--face)", "stroke-width": 2.6, "stroke-linecap": "round" }, B.prop);
        el("circle", { cx: x, cy: y + 4.4, r: 1.4, fill: "var(--face)" }, B.prop); break;
      case "sweat": k = (T * 0.85) % 1; x = b.x + b.w * 0.86; y = b.y + 2 + k * 14;
        el("path", { d: "M" + x + "," + (y - 6) + " Q" + (x + 4.5) + "," + (y + 1) + " " + x + "," + (y + 3.5) + " Q" + (x - 4.5) + "," + (y + 1) + " " + x + "," + (y - 6) + "Z", fill: "var(--sweat)", opacity: 1 - k * 0.6 }, B.prop); break;
      case "sand": {
        var mid = b.y + b.h * 0.47, floor = b.y + b.h * 0.86;
        for (i = 0; i < 4; i++) { k = (T * 1.4 + i / 4) % 1;
          el("circle", { cx: cx, cy: mid + k * (floor - mid - 4), r: 1.7, fill: "var(--spark)", opacity: k > 0.9 ? (1 - k) * 10 : 1 }, B.prop); }
        var pile = 4 + 3 * ((T * 0.15) % 1);
        el("path", { d: "M" + (cx - 13) + "," + floor + " Q" + cx + "," + (floor - pile * 2) + " " + (cx + 13) + "," + floor + "Z", fill: "var(--spark)" }, B.prop); break;
      }
      case "zzz": for (i = 0; i < 3; i++) { k = (T * 0.35 + i / 3) % 1;
        var z = el("text", { x: cx + 18 + k * 16, y: b.y - 4 - k * 22, "font-family": "'Baloo 2', sans-serif", "font-weight": 800, "font-size": 9 + k * 6, fill: "var(--zzz)", opacity: Math.sin(k * Math.PI) }, B.prop);
        z.textContent = "z"; } break;
      case "hello": {                                  // a "hi!" bubble beside the raised hand, as in the app
        // longer words widen the bubble to the right; its tail stays by the hand
        var half = Math.max(15, B.hello.length * 3.1), hb = el("g", { transform: "translate(" + (47 + half) + " 4)" }, B.prop);
        el("path", { d: "M" + -half + ",-8.5 H" + half + " A8.5,8.5 0 0 1 " + half + ",8.5 H" + (-half + 12) + " L" + (-half + 3.5) + ",13 L" + (-half + 7) + ",8.5 H" + -half + " A8.5,8.5 0 0 1 " + -half + ",-8.5Z", fill: "var(--card)", stroke: "var(--face)", "stroke-width": 1.3, "stroke-linejoin": "round" }, hb);
        var w = el("text", { x: 0, y: 4, "text-anchor": "middle", "font-family": "'Baloo 2', sans-serif", "font-weight": 800, "font-size": B.hello.length > 4 ? 11 : 12, fill: "var(--face)" }, hb);
        w.textContent = B.hello; break;
      }
      case "sparkles": [[-1, -0.2], [1, -0.4], [0.7, 0.9]].forEach(function (s, j) {
        var kk = (T * 1.1 + j * 0.33) % 1;
        star(cx + s[0] * (b.w / 2 + 6), b.y + b.h / 2 + s[1] * (b.h / 2 + 6), Math.sin(kk * Math.PI) * 5 + 1, "var(--spark)", B.prop);
      }); break;
    }
  }

  function shape(B) {
    var st = B.state, d = curve(B.pts), b = bbox(B.pts);
    B.box = b;
    B.body.setAttribute("d", d);
    B.body.setAttribute("fill", st === "off" ? "var(--off)" : "var(--body)");
    B.body.setAttribute("stroke", "var(--face)");
    B.body.setAttribute("stroke-width", "2.2");
    B.body.setAttribute("stroke-linejoin", "round");
    B.clip.setAttribute("d", d);
    B.hi.setAttribute("cx", b.x + b.w / 2); B.hi.setAttribute("cy", b.y + b.h * 0.74);
    B.hi.setAttribute("rx", b.w * 0.3); B.hi.setAttribute("ry", b.h * 0.17);
    B.hi.setAttribute("fill", "var(--body-hi)");
    drawFace(B, st, b);
  }

  /* breathing, kneading and wobble are one transform on the group */
  function life(B, t) {
    var st = B.state, b = B.box, cx = b.x + b.w / 2, cy = b.y + b.h, w = Math.sin(t * 2.6);
    var sx = 1 + 0.018 * w, sy = 1 - 0.018 * w, dx = 0;
    if (st === "summarize") { var k = Math.sin(t * 5.2); sx = 1 + 0.07 * k; sy = 1 - 0.07 * k; }
    if (st === "error") dx = 1.4 * Math.sin(t * 14);
    if (st === "success") sy *= 1 + 0.05 * Math.max(0, Math.sin(t * 6.5));
    if (B.squash) {
      var q = (performance.now() - B.squash) / 140;
      if (q >= 1) B.squash = 0; else { var s = Math.sin(q * Math.PI) * 0.06; sx *= 1 + s; sy *= 1 - s; }
    }
    B.g.setAttribute("transform", "translate(" + (cx + dx).toFixed(2) + " " + cy.toFixed(2) + ") scale(" + sx.toFixed(4) + " " + sy.toFixed(4) + ") translate(" + (-cx) + " " + (-cy) + ")");
  }

  function frame(B, t) {
    if (B.tween) B.tween(performance.now());
    if (B.dirty) { shape(B); B.dirty = false; }
    if (!reduce) life(B, t);
    drawProps(B, B.state, B.box, reduce ? 0.35 : t);
  }

  function morph(B, to) {
    var from = copy(B.pts), target = DATA.shapes[to], t0 = performance.now();
    B.state = to; B.dirty = true;
    if (reduce) { B.pts = copy(target); B.tween = null; return; }
    B.squash = t0;
    B.tween = function (now) {
      var k = Math.min(1, (now - t0) / 320);
      B.pts = lerp(from, target, easeOutExpo(k)); B.dirty = true;
      if (k >= 1) B.tween = null;
    };
  }

  /* ---- the page's blobs ---- */
  var blobs = [];
  document.querySelectorAll("[data-plasmie]").forEach(function (host) {
    var B = makeBlob(host, host.getAttribute("data-plasmie"));
    host.__blob = B; blobs.push(B);
  });

  /* the last section and the footer share the final screen: tell CSS how tall the footer is */
  var foot = document.getElementById("site-foot");
  function footH() { if (foot) document.documentElement.style.setProperty("--foot-h", foot.offsetHeight + "px"); }
  footH(); window.addEventListener("resize", footH);
  if (foot && "ResizeObserver" in window) new ResizeObserver(footH).observe(foot);   // fonts arriving late

  /* let other scripts (the Ask demo) change a blob's shape */
  window.Plasmie = { morph: function (host, state) { if (host && host.__blob) morph(host.__blob, state); } };

  /* the hero blob cycles through a day of states */
  var hero = document.getElementById("hero-blob");
  var caption = document.getElementById("hero-caption"), pause = document.getElementById("hero-pause");
  var CYCLE = [];
  document.querySelectorAll("#hero-states li").forEach(function (li) { CYCLE.push([li.getAttribute("data-state"), li.innerHTML]); });
  var idx = 0, running = false, wantRun = !reduce && CYCLE.length > 0, last = 0;

  function show(i) {
    idx = i;
    if (hero) morph(hero.__blob, CYCLE[i][0]);
    if (caption) caption.innerHTML = CYCLE[i][1];
  }
  if (CYCLE.length) show(0);

  if (pause) {
    if (reduce) pause.hidden = true;
    pause.addEventListener("click", function () {
      wantRun = !wantRun; running = wantRun;
      pause.textContent = wantRun ? "Pause" : "Play";
      pause.setAttribute("aria-pressed", wantRun ? "false" : "true");
      last = performance.now();
    });
  }
  if (hero) hero.addEventListener("click", function () { if (!done && document.documentElement.classList.contains("scrub")) return; show((idx + 1) % CYCLE.length); last = performance.now(); });

  /* The opening, scrubbed by scrolling through #hero-track. One continuous move, no fades:
     0.00-0.26  the lid opens from shut while the camera drops to eye level (the deck flattens)
     0.27-0.50  the view zooms into the notch; the screen is the page colour, so the Mac
                dissolves into the page
     0.51-0.67  the notch itself grows into the island, revealing Plasmie inside
     0.68-0.93  Plasmie pops up out of the island and grows to full size, while the
                island and the Mac sink down out of view
     0.94+      the status cycle runs, starting with hi */
  var track = document.getElementById("hero-track"), frameEl = document.getElementById("hero-frame");
  var scene = document.getElementById("intro-scene"), island = document.getElementById("intro-island");
  var notchEl = document.getElementById("intro-notch"), lid = frameEl && frameEl.querySelector(".lid");
  var mac = frameEl && frameEl.querySelector(".mac"), deck = frameEl && frameEl.querySelector(".deck"), edge = frameEl && frameEl.querySelector(".deck-edge");
  var lidFront = frameEl && frameEl.querySelector(".lid-front"), lidBack = frameEl && frameEl.querySelector(".lid-back");
  var inner = island && island.querySelector(".island-inner"), ear = island && island.querySelector(".ear");
  var geo = null, done = false;

  /* 4x4 matrices (row-major) for the Mac's parts, emitted as CSS matrix3d (column-major) */
  function T(x, y, z) { return [[1, 0, 0, x], [0, 1, 0, y], [0, 0, 1, z], [0, 0, 0, 1]]; }
  function RX(deg) { var r = deg * Math.PI / 180, c = Math.cos(r), sn = Math.sin(r);
    return [[1, 0, 0, 0], [0, c, -sn, 0], [0, sn, c, 0], [0, 0, 0, 1]]; }
  function PERSP(d) { return [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, -1 / d, 1]]; }
  function mul(a, b) { var r = [], i, j, k;
    for (i = 0; i < 4; i++) { r[i] = []; for (j = 0; j < 4; j++) { var v = 0; for (k = 0; k < 4; k++) v += a[i][k] * b[k][j]; r[i][j] = v; } }
    return r; }
  function m3d(list) { var m = list.reduce(mul), out = [], i, j;
    for (j = 0; j < 4; j++) for (i = 0; i < 4; i++) out.push(+m[i][j].toFixed(6));
    return "matrix3d(" + out.join(",") + ")"; }

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function seg(p, a, b) { return clamp01((p - a) / (b - a)); }
  function inOut(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function outBack(k) { var c = 1.4; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); }
  function fit(w, h) { return Math.min(w / 112, h / 120); }       // the blob's viewBox is 112 x 120

  function measure() {
    var keep = [lid.style.transform, scene.style.transform];
    lid.style.transform = "none"; scene.style.transform = "none";
    var f = frameEl.getBoundingClientRect(), n = notchEl.getBoundingClientRect(), m = mac.getBoundingClientRect();
    lid.style.transform = keep[0]; scene.style.transform = keep[1];
    var S = (f.width * 0.26) / n.width;                             // notch to a quarter of the frame
    var g = { f: f, S: S, cx: n.left - f.left + n.width / 2, cy: n.top - f.top + n.height / 2,
      tx: f.width / 2, ty: f.height * 0.3, nw: n.width, nh: n.height, macH: m.height, lidH: lid.offsetHeight, lidW: lid.offsetWidth };
    g.w0 = g.nw * S; g.h0 = g.nh * S; g.w1 = Math.min(Math.max(f.width * 0.94, 320), window.innerWidth - 24); g.h1 = g.w1 * 0.38;
    g.r0 = Math.min(g.h0 / 2, 6 * S); g.top = g.ty - g.h0 / 2;
    g.drop = window.innerHeight - (f.top + g.top) + 80;              // far enough to sink out of view
    inner.style.width = g.w1 + "px"; inner.style.height = g.h1 + "px";
    // where the island's blob sits once the island is fully open (inner is static, so measure it)
    var e = ear.getBoundingClientRect(), es = ear.style.transform;
    ear.style.transform = "none"; island.style.width = g.w1 + "px"; island.style.height = g.h1 + "px";
    island.style.top = g.top + "px"; island.style.transform = "translateX(-50%)";
    e = ear.getBoundingClientRect(); ear.style.transform = es;
    g.ex = e.left - f.left + e.width / 2; g.ey = e.top - f.top + e.height / 2;
    g.er = fit(e.width, e.height) / fit(f.width, f.height);
    geo = g;
  }

  function render(p) {
    if (!geo) measure();
    var g = geo;
    // 1. lid opens, camera drops from above to the hinge
    var o = inOut(seg(p, 0, 0.26)), theta = -90 + 90 * o;
    // The eye starts above the hinge (1.7 lid-heights up) and drops to hinge level. Perspective
    // is built into each part's own transform, shifted so both share that eye: WebKit ignores a
    // parent's perspective here, which flattened the lid and hid the deck.
    var ey = (-1.7 + 1.7 * o) * g.lidH, P = 1500, W = g.lidW, L = g.lidH;
    // Each part gets one explicit projective matrix (origin 0 0): eye shift, perspective with the
    // vanishing point on the Mac's centre line, then the part's own rotation. Chrome and WebKit
    // then draw exactly the same thing; WebKit misplaced perspective() and ignored a parent's.
    var view = [T(W / 2, 0, 0), T(0, ey, 0), PERSP(P), T(0, -ey, 0)];
    lid.style.transform = m3d([T(0, L, 0)].concat(view, [RX(theta), T(-W / 2, -L, 0)]));   // view applied at the hinge
    deck.style.transform = m3d([T(0, 3, 0)].concat(view, [RX(90), T(-W / 2, 0, 0)]));
    edge.style.transform = m3d([T(0, 3, 0)].concat(view, [RX(90), T(0, L, 0), RX(-90), T(-W / 2, 0, 0)]));
    // show the screen or the lid's back from the real viewing angle, not backface-visibility
    var a = -theta * Math.PI / 180, front = ey * Math.sin(a) + P * Math.cos(a) > 0;
    lidFront.style.visibility = front ? "visible" : "hidden";
    lidBack.style.visibility = front ? "hidden" : "visible";
    deck.classList.toggle("covered", !front);              // shut: the lid covers the keyboard
    // 2. zoom into the notch; 4. keep going up and out
    var z = inOut(seg(p, 0.27, 0.50)), S = Math.pow(g.S, z);
    var px = g.cx + (g.tx - g.cx) * z, py = g.cy + (g.ty - g.cy) * z;
    var out = inOut(seg(p, 0.68, 0.93)), lift = g.drop * out;
    scene.style.transform = "translate(" + (px - g.cx * S) + "px," + (py - g.cy * S + lift) + "px) scale(" + S + ")";
    // 3. the notch grows into the island
    var k = outBack(seg(p, 0.51, 0.67)), kl = seg(p, 0.51, 0.67);
    island.style.visibility = p >= 0.5 ? "visible" : "hidden";
    island.style.top = g.top + "px";
    island.style.width = (g.w0 + (g.w1 - g.w0) * k) + "px";
    island.style.height = (g.h0 + (g.h1 - g.h0) * k) + "px";
    var r = g.r0 + (34 - g.r0) * kl;
    island.style.borderRadius = "0 0 " + r + "px " + r + "px";
    island.style.transform = "translateX(-50%) translateY(" + lift + "px)";
    ear.style.transform = "scale(" + Math.max(0, outBack(seg(p, 0.55, 0.67))) + ")";
    // 4. the same blob leaves the island and grows into the hero
    var flying = p >= 0.68;
    ear.style.visibility = flying ? "hidden" : "visible";
    if (hero) {
      var q = outBack(seg(p, 0.68, 0.93));
      var sc = g.er + (1 - g.er) * q;
      var dx = (g.ex - g.f.width / 2) * (1 - q), dy = (g.ey - g.f.height / 2) * (1 - q);
      hero.style.opacity = flying ? "1" : "0";
      hero.style.transform = "translate(" + dx + "px," + dy + "px) scale(" + sc + ")";
    }
    var finished = p >= 0.94;
    frameEl.classList.toggle("finished", finished);
    // in the notch and on the way out Plasmie rests; it says hi once the rotation starts
    if (finished && !done) { done = true; show(0); running = wantRun; last = performance.now(); }
    if (!finished) {
      done = false; running = false; idx = 0;
      if (hero && hero.__blob.state !== "idle") morph(hero.__blob, "idle");
    }
  }

  /* Stepping through the page (the opening's stops, then each section). Native mandatory snapping can't hold a stop per gesture:
     a trackpad flick plus its momentum runs past a stop, and small wheel deltas snap back.
     So inside the opening one gesture (wheel, trackpad, swipe or key) moves exactly one stop,
     scrolled by hand with snapping paused, and input is then ignored until the wheel stream
     goes quiet for 150 ms (the end of trackpad momentum). CSS snap stays as the fallback for
     scrollbar drags and when this script doesn't run. */
  function stepThroughOpening(stopEls) {
    var root = document.documentElement;
    var animating = false, consumed = false, lastWheel = 0, lastAbs = 0, stepAt = -1e9, arrived = 0, touchY = null, release = 0;
    function points() {                                // the opening's stops, then every section, then the end
      var pts = [0];
      stopEls.forEach(function (el) { pts.push(el.offsetTop + track.offsetTop); });
      document.querySelectorAll("main > section").forEach(function (sec) {
        pts.push(sec.offsetTop);
        // a pinned section (the map) has a second stop where its own scroll ends
        if (sec.hasAttribute("data-stop-end")) pts.push(sec.offsetTop + sec.offsetHeight - window.innerHeight);
      });
      pts.push(root.scrollHeight - window.innerHeight);
      return pts.sort(function (a, b) { return a - b; });
    }
    function next(dir) {
      var pts = points(), y = window.scrollY, i;
      if (dir > 0) { for (i = 0; i < pts.length; i++) if (pts[i] > y + 2) return pts[i]; }
      else { for (i = pts.length - 1; i >= 0; i--) if (pts[i] < y - 2) return pts[i]; }
      return null;
    }
    // step only when the next stop is within a screen; a section taller than the screen
    // (small phones) scrolls natively until its end first, so nothing is skipped
    function inOpening(dir) {
      var t = next(dir);
      return t !== null && Math.abs(t - window.scrollY) <= window.innerHeight + 2;
    }
    function step(dir) {
      var y = window.scrollY, target = next(dir);
      if (target === null) return;
      animating = true; stepAt = performance.now(); root.style.scrollSnapType = "none";
      var from = y, t0 = performance.now(), dur = Math.min(1100, 450 + Math.abs(target - from) * 0.6), done = false;
      function finish() {                                 // always runs once: at the end, or by the timeout
        if (done) return; done = true; clearTimeout(release);
        window.scrollTo(0, target); root.style.scrollSnapType = ""; animating = false; arrived = performance.now();
      }
      release = setTimeout(finish, dur + 300);            // hard release, even if frames stop (hidden tab)
      (function frame(now) {
        if (done) return;
        var k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        window.scrollTo(0, from + (target - from) * e);
        if (k < 1) requestAnimationFrame(frame); else finish();
      })(t0);
    }
    window.addEventListener("wheel", function (e) {
      var dir = e.deltaY > 0 ? 1 : e.deltaY < 0 ? -1 : 0;
      if (!dir || e.ctrlKey) return;                    // ctrl+wheel is pinch-zoom
      // gaps use the event's own creation time: while the animation keeps the page busy, queued
      // momentum events arrive in bursts, and handler time would show false "pauses"
      var abs = Math.abs(e.deltaY), gap = e.timeStamp - lastWheel, prev = lastAbs, now = performance.now();
      lastWheel = e.timeStamp; lastAbs = abs;
      if (!animating && !inOpening(dir)) return;        // no stop within a screen: native scrolling
      e.preventDefault();
      if (abs < 2) return;                                // resting finger / momentum dust
      // A step's own momentum must not trigger another, but a NEW swipe must, even one that starts
      // while momentum is still running. Momentum only decays; a fresh swipe climbs. So re-arm on
      // a pause, or on a clearly rising delta (sooner than 350 ms is still the same flick).
      var rising = abs >= 6 && abs > prev * 1.5;
      if (gap > 150 || (rising && now - stepAt > 350)) consumed = false;
      if (animating || consumed || abs < 4) return;
      if (now - arrived < 250) return;                    // a brief hold at each stop
      consumed = true; step(dir);
    }, { passive: false });
    window.addEventListener("touchstart", function (e) { touchY = e.touches[0].clientY; }, { passive: true });
    window.addEventListener("touchmove", function (e) {
      if (touchY === null) return;
      var dir = touchY - e.touches[0].clientY > 0 ? 1 : -1;
      if (animating || inOpening(dir)) e.preventDefault();
    }, { passive: false });
    window.addEventListener("touchend", function (e) {
      if (touchY === null) return;
      var dy = touchY - e.changedTouches[0].clientY, dir = dy > 0 ? 1 : -1;
      touchY = null;
      if (Math.abs(dy) > 24 && !animating && inOpening(dir)) step(dir);
    }, { passive: true });
    window.addEventListener("keydown", function (e) {
      var k = e.key, dir = (k === "ArrowDown" || k === "PageDown" || (k === " " && !e.shiftKey)) ? 1
        : (k === "ArrowUp" || k === "PageUp" || (k === " " && e.shiftKey)) ? -1 : 0;
      if (!dir || /input|textarea|select/i.test((e.target.tagName || "")) || !inOpening(dir)) return;
      e.preventDefault(); if (!animating) step(dir);
    });
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var r = track.getBoundingClientRect(), span = track.offsetHeight - window.innerHeight;
      render(span > 0 ? clamp01(-r.top / span) : 1);
    });
  }

  if (track && frameEl && scene && island && notchEl && lid && mac && deck && edge && lidFront && lidBack && inner && !reduce) {
    window.addEventListener("scroll", onScroll, { passive: true });
    // scroll stops sit where the animation reaches each stage (see .hero-stop)
    var stops = track.querySelectorAll(".hero-stop");
    function placeStops() {
      var span = track.offsetHeight - window.innerHeight;
      stops.forEach(function (el) { el.style.top = Math.round(parseFloat(el.getAttribute("data-p")) * span) + "px"; });
    }
    placeStops();
    window.addEventListener("resize", function () { geo = null; placeStops(); onScroll(); });
    stepThroughOpening(stops);
    onScroll();
  } else {
    document.documentElement.classList.remove("scrub");
    running = wantRun;
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.__blob.visible = e.isIntersecting; });
    }, { rootMargin: "80px" });
    document.querySelectorAll("[data-plasmie]").forEach(function (h) { io.observe(h); });
  }

  if (reduce) { blobs.forEach(function (B) { frame(B, 0); }); return; }
  function loop(now) {
    var t = now / 1000;
    if (running && now - last > 2600) { last = now; show((idx + 1) % CYCLE.length); }
    blobs.forEach(function (B) { if (B.visible) frame(B, t); });
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

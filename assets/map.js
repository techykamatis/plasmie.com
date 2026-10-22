/* Plasmie's map, on the page. A port of the app's map (app/Sources/Map*.swift in the
   Plasmie repo): the same physics (MapLayout), drawing (MapRender), palette (MapPalette),
   space backdrop (MapSpace) and opening (MapIntro). The notes are made up and generated
   here from a fixed seed, so the map is the same on every visit.

   The section is pinned while you scroll through it:
     arriving      the opening plays: Plasmie swells with its arms open and the web bursts out
     next scroll   the web glides into the left half and the sentence fades in on the right
   The space backdrop fills the whole section; as the web moves, its far and near layers
   follow at different speeds (the app's parallax).
   Reduce Motion: no opening, no scroll move, no breathing or twinkle; the final layout. */
(function () {
  "use strict";
  var DATA = window.PLASMIE_SHAPES;
  var sec = document.getElementById("map"), pin = sec && sec.querySelector(".map-pin");
  var slot = document.getElementById("map-slot");
  var cv = document.getElementById("map-canvas"), host = document.getElementById("map-plasmie");
  var copy = document.getElementById("map-copy");
  if (!sec || !pin || !slot || !cv || !cv.getContext || !host || !DATA) return;
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var scrub = root.classList.contains("scrub");          // plasmie.js removes it when there's no scrubbing

  /* ---------- palette (Theme.swift PlasmieHues, MapPalette) ---------- */
  var HUE = {
    note: [0x6B7285, 0xA3AABA], ink: [0x2A2E3A, 0xDADDE4], ground: [0xE9E6F0, 0x0D0E1A],
    sparkle: [0xFFC94A, 0xFFC94A], sweat: [0x6EC5F0, 0x6EC5F0], leaf: [0x6CC18E, 0x6CC18E],
    eggshell: [0xFFF7EC, 0xFFF7EC], gold: [0xF2B83B, 0xF2B83B]
  };
  function rgbOf(h) { return [(h >> 16) & 255, (h >> 8) & 255, h & 255]; }
  function css(c, a) { return "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + (a == null ? 1 : a) + ")"; }
  function hue(name, dark) { return rgbOf(HUE[name][dark ? 1 : 0]); }
  function mixed(a, b, t, dark) {
    var x = hue(a, dark), y = hue(b, dark);
    return [x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t];
  }
  // kinds, in MapKind order: note, decision, gotcha, pattern, how-to, map
  var KIND_HUE = ["note", "sparkle", "sweat", "leaf", "ink", "note"];
  var MAP = 5;
  function kindFill(k, dark, fresh) {
    if (k === MAP) return mixed("note", "ground", 0.4, dark);
    return mixed(KIND_HUE[k], "ground", (dark ? 0.3 : 0.1) * (1 - fresh), dark);
  }
  function kindRim(k, dark) { return mixed(KIND_HUE[k], "ink", dark ? 0.15 : 0.45, dark); }
  function glows(k) { return k === 1 || k === 2 || k === 3; }

  /* ---------- motion curves (Motion.swift) ---------- */
  function spring(t, response, damping) {
    if (t <= 0) return 0;
    var w0 = 2 * Math.PI / response, wd = w0 * Math.sqrt(Math.max(1 - damping * damping, 0.0001));
    return 1 - Math.exp(-damping * w0 * t) * (Math.cos(wd * t) + damping * w0 / wd * Math.sin(wd * t));
  }
  function glide(p) {                                   // cubic-bezier(.16, 1, .3, 1)
    if (p <= 0) return 0; if (p >= 1) return 1;
    var lo = 0, hi = 1, t = p;
    for (var i = 0; i < 24; i++) {
      t = (lo + hi) / 2;
      var u = 1 - t, x = 3 * u * u * t * 0.16 + 3 * u * t * t * 0.3 + t * t * t;
      if (x < p) lo = t; else hi = t;
    }
    var v = 1 - t;
    return 3 * v * v * t + 3 * v * t * t + t * t * t;
  }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

  /* ---------- seeded randomness ---------- */
  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- what the made-up notes say (hover a note to read its card) ----------
     Twelve everyday work topics. Each map (hub) is a topic; each note gets a title from
     its kind's patterns and one of the topic's subjects, a date, tags and a short excerpt. */
  var TOPIC_DATA = [
    ["Release process", "releases", ["release checklist", "version tags", "the changelog", "build signing", "staged rollout", "rollback plan"]],
    ["Search", "search", ["the query parser", "result ranking", "index rebuilds", "synonyms", "typo tolerance", "result snippets"]],
    ["Onboarding", "onboarding", ["first-run setup", "the welcome email", "the sample project", "empty states", "the setup wizard", "team invites"]],
    ["Billing", "billing", ["invoices", "proration", "tax rates", "card retries", "refunds", "plan changes"]],
    ["Mobile app", "mobile", ["push notifications", "offline sync", "deep links", "app review", "dark mode", "crash reports"]],
    ["Data pipeline", "data", ["the nightly import", "schema changes", "the backfill job", "the dedupe step", "data retention", "CSV export"]],
    ["Design system", "design", ["colour tokens", "button styles", "the spacing scale", "the icon set", "form fields", "focus rings"]],
    ["Infrastructure", "infra", ["database backups", "the cache layer", "rate limits", "log retention", "the staging database", "TLS certificates"]],
    ["Hiring", "hiring", ["the interview loop", "the take-home task", "role scorecards", "the offer process", "referrals"]],
    ["Customer support", "support", ["triage rules", "reply templates", "the escalation path", "response targets", "bug reports"]],
    ["Performance", "perf", ["page load time", "image sizes", "query timeouts", "memory use", "bundle size"]],
    ["Accessibility", "a11y", ["screen reader labels", "keyboard navigation", "contrast checks", "reduced motion", "captions"]]
  ];
  var KIND_NAME = ["note", "decision", "gotcha", "pattern", "how-to", "map"];
  var TITLES = [
    ["{S}", "Notes on {s}", "Weekly sync: {s}", "Open questions about {s}", "{S}: what we know", "Ideas for {s}", "{S} review notes", "Retro: {s}"],
    ["Decision: simplify {s}", "Why we changed {s}", "Decision: keep {s} as is", "Chose a new approach to {s}", "Dropped the old {s}"],
    ["Gotcha: {s} times out under load", "Gotcha: {s} fails silently", "Gotcha: {s} caches stale values", "Gotcha: {s} after a deploy"],
    ["Pattern: small changes to {s}", "Checklist for {s}", "Pattern: pair on {s}", "Pattern: write down why for {s}"],
    ["How to update {s}", "How to test {s}", "How to roll back {s}"]
  ];
  var EXCERPTS = [
    "Short notes from the weekly sync: open questions, who's on what, and what to check next week.",
    "We picked the simpler option: fewer moving parts and easy to undo. Revisit after the next release.",
    "Looks fine locally, then fails on staging. Clearing the cache first fixes it; the steps are in the how-to.",
    "This worked three times now. Keep the change small, write down why, and link the ticket.",
    "1. Read the checklist. 2. Try it on staging first. 3. Note what changed in the log.",
    "Everything about this topic in one place: decisions, gotchas, patterns and how-tos, linked."
  ];
  function describe(nodes) {
    var R = rng(7), used = {}, today = new Date();
    var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    function cap(x) { return x.charAt(0).toUpperCase() + x.slice(1); }
    nodes.forEach(function (n) {
      var T = TOPIC_DATA[n.topic], title;
      if (n.kind === MAP) title = T[0];
      else for (var tries = 0; tries < 40; tries++) {
        var subj = T[2][Math.floor(R() * T[2].length)], pats = TITLES[n.kind];
        title = pats[Math.floor(R() * pats.length)].replace("{S}", cap(subj)).replace("{s}", subj);
        if (!used[title]) break;
        title += " (" + (tries + 2) + ")";
        if (!used[title]) break;
      }
      used[title] = 1;
      n.title = title;
      n.type = KIND_NAME[n.kind];
      var d = new Date(today.getTime() - n.age * 864e5);
      n.date = d.getDate() + " " + MONTHS[d.getMonth()];
      n.tags = n.kind === MAP ? [T[1], "map"] : [T[1]].concat(R() < 0.4 ? [KIND_NAME[n.kind]] : []);
      n.excerpt = n.kind === MAP ? EXCERPTS[5] : EXCERPTS[n.kind];
    });
  }

  /* ---------- a made-up vault (MapData) ---------- */
  function makeGraph() {
    var R = rng(20261022), nodes = [], edges = [], sug = [], seen = {};
    var TOPICS = 12, N = 420;
    function link(list, a, b) {
      if (a === b) return false;
      var k = a < b ? a + "-" + b : b + "-" + a;
      if (seen[k]) return false;
      seen[k] = 1; list.push([a, b]); return true;
    }
    for (var m = 0; m < TOPICS; m++) nodes.push({ kind: MAP, topic: m });
    for (var i = TOPICS; i < N; i++) {
      var r = R(), kind = r < 0.58 ? 0 : r < 0.72 ? 1 : r < 0.84 ? 2 : r < 0.94 ? 3 : 4;
      nodes.push({ kind: kind, topic: Math.floor(Math.pow(R(), 1.3) * TOPICS) });
    }
    nodes.forEach(function (n, id) {
      n.id = id; n.seed = R();
      var age = n.age = 400 * Math.pow(R(), 1.3);       // days since filed
      n.fresh = 1 - Math.min(age / 180, 1);
      n.level = Math.min(Math.floor(n.fresh * 4), 3);
    });
    var byTopic = [];
    for (m = 0; m < TOPICS; m++) byTopic.push([]);
    nodes.forEach(function (n) { if (n.kind !== MAP) byTopic[n.topic].push(n.id); });
    var loners = 5;                                      // a few unlinked notes: Plasmie reaches them directly
    byTopic.forEach(function (ids, t) {
      ids.forEach(function (id, j) {
        if (id >= N - loners) return;
        if (R() < 0.72) link(edges, t, id);              // the map lists it
        var extra = R() < 0.5 ? 1 : R() < 0.6 ? 2 : 3;
        for (var e = 0; e < extra; e++) link(edges, id, ids[Math.floor(R() * ids.length)]);
        if (R() < 0.3) link(edges, id, Math.floor(TOPICS + R() * (N - TOPICS - loners)));   // across topics: one web, not islands
        if (R() < 0.08) link(edges, id, Math.floor(R() * TOPICS));
        if (j % 17 === 5 && R() < 0.8) link(sug, id, ids[Math.floor(R() * ids.length)]);
      });
    });
    for (m = 0; m < TOPICS; m++) { link(edges, m, (m + 1) % TOPICS); if (R() < 0.5) link(edges, m, (m + 5) % TOPICS); }
    var nb = nodes.map(function () { return []; });
    edges.forEach(function (e) { nb[e[0]].push(e[1]); nb[e[1]].push(e[0]); });
    nodes.forEach(function (n, id) {
      n.links = nb[id].length;
      n.radius = n.kind === MAP ? Math.min(5.5 + 0.08 * Math.sqrt(n.links), 6.5) : Math.min(2 + 0.35 * Math.sqrt(n.links), 5);
    });
    var reach = nb.map(function (l) { return l.slice(); });
    sug.forEach(function (e) { reach[e[0]].push(e[1]); reach[e[1]].push(e[0]); });
    var anchors = pickAnchors(nodes, reach), home = hops(nodes.length, anchors, reach);
    describe(nodes);
    return { nodes: nodes, edges: edges, suggested: sug, neighbours: nb, anchors: anchors, depth: home.depth, next: home.next };
  }

  /* maps first, topped up with the most-linked notes, then one note per island (MapGraph.pickAnchors) */
  function pickAnchors(nodes, nb) {
    var picked = nodes.filter(function (n) { return n.kind === MAP; }).map(function (n) { return n.id; });
    var byLinks = nodes.slice().sort(function (a, b) { return b.links - a.links || a.id - b.id; });
    if (picked.length < 8) byLinks.filter(function (n) { return n.kind !== MAP; }).slice(0, 8 - picked.length).forEach(function (n) { picked.push(n.id); });
    var seen = {}, stack = picked.slice(), r = 0;
    picked.forEach(function (i) { seen[i] = 1; });
    for (;;) {
      while (stack.length) { var i = stack.pop(); nb[i].forEach(function (j) { if (!seen[j]) { seen[j] = 1; stack.push(j); } }); }
      while (r < byLinks.length && seen[byLinks[r].id]) r++;
      if (r >= byLinks.length) break;
      picked.push(byLinks[r].id); seen[byLinks[r].id] = 1; stack = [byLinks[r].id];
    }
    return picked.sort(function (a, b) { return a - b; });
  }

  /* breadth-first from Plasmie: each note's distance home and its first step back */
  function hops(n, anchors, nb) {
    var depth = new Array(n).fill(1e9), next = new Array(n).fill(-1), q = [], h = 0;
    anchors.forEach(function (a) { depth[a] = 1; q.push(a); });
    while (h < q.length) {
      var i = q[h++];
      nb[i].forEach(function (j) { if (depth[j] > depth[i] + 1) { depth[j] = depth[i] + 1; next[j] = i; q.push(j); } });
    }
    return { depth: depth, next: next };
  }

  /* ---------- the physics (MapLayout), run to rest before the first frame ---------- */
  var PLASMIE_R = 40;
  function layout(g) {
    var n = g.nodes.length, x = new Float64Array(n), y = new Float64Array(n), vx = new Float64Array(n), vy = new Float64Array(n);
    var rad = g.nodes.map(function (d) { return d.radius; }), mass = rad.map(function (r) { return 0.6 + r / 10; });
    var all = g.edges.concat(g.suggested), real = g.edges.length, deg = new Array(n).fill(0);
    all.forEach(function (e) { deg[e[0]]++; deg[e[1]]++; });
    deg = deg.map(function (d) { return Math.max(d, 1); });
    var len = all.map(function (e, k) { return (k < real ? 18 : 26) + rad[e[0]] + rad[e[1]]; });
    var K = all.map(function (e, k) { return (k < real ? 1 : 0.35) / Math.min(deg[e[0]], deg[e[1]]); });
    var bias = all.map(function (e) { return deg[e[0]] / (deg[e[0]] + deg[e[1]]); });
    var order = g.nodes.map(function (d) { return d.id; }).sort(function (a, b) {
      return (g.depth[a] - g.depth[b]) || (g.nodes[a].seed - g.nodes[b].seed);
    });
    order.forEach(function (i, k) {                      // a golden-angle disc, anchors inside
      var rr = PLASMIE_R + 30 + 14 * Math.sqrt(k), a = k * 2.399963 + g.nodes[i].seed * 0.6;
      x[i] = rr * Math.cos(a); y[i] = rr * Math.sin(a);
    });
    var alpha = 1, alphaMin = 0.003, decay = 1 - Math.pow(alphaMin, 1 / 300), keep = 1 - 0.42;
    var anchorLen = PLASMIE_R + 90, keepOut = PLASMIE_R + 34, i, j;
    for (var tick = 0; tick < 300 && alpha >= alphaMin; tick++) {
      alpha += (0 - alpha) * decay;
      for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) {   // repulsion (charge -46); exact, it's a small vault
        var dx = x[j] - x[i], dy = y[j] - y[i], d2 = Math.max(dx * dx + dy * dy, 9), f = -46 * alpha / d2;
        vx[i] += dx * f * mass[j]; vy[i] += dy * f * mass[j];
        vx[j] -= dx * f * mass[i]; vy[j] -= dy * f * mass[i];
      }
      all.forEach(function (e, k) {
        var a = e[0], b = e[1], ex = x[b] + vx[b] - x[a] - vx[a], ey = y[b] + vy[b] - y[a] - vy[a];
        var l = Math.sqrt(ex * ex + ey * ey); if (l < 1e-6) { ex = 1e-3; ey = 0; l = 1e-3; }
        var s = (l - len[k]) / l * alpha * K[k];
        ex *= s; ey *= s;
        vx[b] -= ex * bias[k]; vy[b] -= ey * bias[k]; vx[a] += ex * (1 - bias[k]); vy[a] += ey * (1 - bias[k]);
      });
      g.anchors.forEach(function (a) {
        var l = Math.max(Math.sqrt(x[a] * x[a] + y[a] * y[a]), 1e-3), s = (l - anchorLen - rad[a]) / l * alpha * 0.12;
        vx[a] -= x[a] * s; vy[a] -= y[a] * s;
      });
      for (i = 0; i < n; i++) {
        vx[i] -= x[i] * 0.035 * alpha; vy[i] -= y[i] * 0.035 * alpha;
        var d = Math.max(Math.sqrt(x[i] * x[i] + y[i] * y[i]), 1e-3), mn = keepOut + rad[i];
        if (d < mn) { var p = (mn - d) / d * 0.5; vx[i] += x[i] * p; vy[i] += y[i] * p; }
      }
      for (i = 0; i < n; i++) { vx[i] *= keep; vy[i] *= keep; x[i] += vx[i]; y[i] += vy[i]; }
      for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) {   // collision
        var cx = x[j] - x[i], cy = y[j] - y[i], mm = rad[i] + rad[j] + 2.5, c2 = cx * cx + cy * cy;
        if (c2 >= mm * mm) continue;
        var cd = Math.max(Math.sqrt(c2), 1e-3), push = (mm - cd) / cd * 0.5;
        x[i] -= cx * push; y[i] -= cy * push; x[j] += cx * push; y[j] += cy * push;
      }
    }
    return { x: x, y: y };
  }

  /* ---------- the space backdrop (MapSpace), rendered once per appearance and size ---------- */
  function canvas(w, h) { var c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  function radial(ctx, x, y, r, stops) {
    if (r <= 0) return;
    var gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); });
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill();
  }
  function bokeh(ctx, x, y, r, c, a) {
    radial(ctx, x, y, r, [[0, css(c, a * 0.55)], [0.7, css(c, a * 0.7)], [0.86, css(c, a * 0.5)], [1, css(c, 0)]]);
  }
  function hexes(list) { return list.map(rgbOf); }
  var OTHER = { d: hexes([0xB7A4F5, 0x8EA2FF, 0xFFB38F, 0x7FE0D6, 0xD9A3F0, 0xFFD3A0, 0xC8D8FF]),
                l: hexes([0x7E6CC9, 0x5E78D6, 0xE08A5E, 0x3FA894, 0xA86FC4, 0xD99A4A, 0x6F8FC9]) };
  var BOKEH = { d: hexes([0x8EA2FF, 0xB7A4F5, 0x6EC5F0, 0xC8D8FF, 0xFFD3A0, 0x7FE0D6]),
                l: hexes([0xFFFFFF, 0xFFFFFF, 0xFFFFFF, 0xC9C3EE, 0xFBD3BE, 0xBFE0F2]) };
  var LAYERS = [{ id: 0, tile: 1180, res: 0.5, depth: 0.05 }, { id: 1, tile: 1420, res: 1, depth: 0.13 }, { id: 2, tile: 1660, res: 0.5, depth: 0.28 }];

  function bodyPath(state) {                           // a Plasmie body on its 100-unit canvas (plasmie.js curve)
    var p = DATA.shapes[state], n = p.length, d = new Path2D();
    d.moveTo(p[0][0], p[0][1]);
    for (var i = 0; i < n; i++) {
      var a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n], e = p[(i + 2) % n];
      d.bezierCurveTo(b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6, c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6, c[0], c[1]);
    }
    d.closePath();
    return d;
  }

  function renderTile(L, dark) {
    var t = L.tile, c = canvas(t * L.res, t * L.res), ctx = c.getContext("2d"), R = rng(0x51A50000 + L.id * 0x1F3D5B79);
    ctx.scale(L.res, L.res);
    var hues = BOKEH[dark ? "d" : "l"], glints = [];
    function wrapped(x, y, r, draw) {
      for (var ox = -t; ox <= t; ox += t) for (var oy = -t; oy <= t; oy += t) {
        var px = x + ox, py = y + oy;
        if (px + r < 0 || px - r > t || py + r < 0 || py - r > t) continue;
        draw(px, py);
      }
    }
    var i, x, y, r, col, a;
    if (L.id === 0) {                                  // many small, dim discs: the deep field
      for (i = 0; i < 70; i++) {
        x = R() * t; y = R() * t; r = 3 + 11 * Math.pow(R(), 1.6); col = hues[Math.floor(R() * hues.length)];
        a = dark ? 0.07 + 0.13 * R() : 0.16 + 0.2 * R();
        wrapped(x, y, r, function (px, py) { bokeh(ctx, px, py, r, col, a); });
      }
    } else if (L.id === 2) {                           // a few big, faint discs drifting past the lens
      for (i = 0; i < 9; i++) {
        x = R() * t; y = R() * t; r = 28 + 56 * R(); col = hues[Math.floor(R() * hues.length)];
        a = dark ? 0.05 + 0.04 * R() : 0.14 + 0.12 * R();
        wrapped(x, y, r, function (px, py) { bokeh(ctx, px, py, r, col, a); });
      }
    } else {                                           // pinpoints, and the far-away Plasmies
      var star = rgbOf(dark ? 0xEEF0FF : 0x7A72B0);
      for (i = 0; i < (dark ? 110 : 55); i++) {
        x = R() * t; y = R() * t; r = 0.7 + 1.6 * Math.pow(R(), 2.5); a = dark ? 0.25 + 0.5 * R() : 0.15 + 0.2 * R();
        wrapped(x, y, r * 2, function (px, py) { radial(ctx, px, py, r * 2, [[0, css(star, a)], [0.35, css(star, a * 0.6)], [1, css(star, 0)]]); });
        if (i % 9 === 0) glints.push({ x: x, y: y, size: 6 + 10 * r, phase: R(), period: 2.4 + 1.8 * R(), rest: a * 0.55 });
      }
      drawOthers(ctx, t, L.res, dark, R);
    }
    return { img: c, glints: glints };
  }

  /* other Plasmies, far away: body silhouettes at star scale, blurred, never pink */
  function drawOthers(ctx, t, res, dark, R) {
    var poses = ["idle", "idle", "idle", "hi", "success", "ask", "tada"], hues = OTHER[dark ? "d" : "l"];
    var placed = 0, tries = 0;
    while (placed < 13 && tries < 200) {
      tries++;
      var x = R() * t, y = R() * t;
      if (Math.hypot(x - t / 2, y - t / 2) < 170) continue;
      var size = 6 + 18 * Math.pow(R(), 1.8), pose = poses[Math.floor(R() * poses.length)];
      var col = hues[Math.floor(R() * hues.length)], a = (dark ? 0.5 : 0.4) + (dark ? 0.35 : 0.3) * R();
      var blur = (0.35 + 0.035 * size) * res, path = bodyPath(pose);
      placed++;
      for (var ox = -t; ox <= t; ox += t) for (var oy = -t; oy <= t; oy += t) {
        var cx = x + ox, cy = y + oy, rr = size * 1.8;
        if (cx + rr < 0 || cx - rr > t || cy + rr < 0 || cy - rr > t) continue;
        radial(ctx, cx, cy, size * 1.6, [[0, css(col, a * 0.32)], [0.5, css(col, a * 0.12)], [1, css(col, 0)]]);
        // the body drawn off the tile; only its blurred, coloured shadow lands
        var away = t + 400;
        ctx.save();
        ctx.shadowColor = css(col, a); ctx.shadowBlur = blur * 2; ctx.shadowOffsetX = away * res;
        ctx.translate(cx - size / 2 - away, cy - size / 2);
        ctx.scale(size / 100, size / 100);
        ctx.fillStyle = "#000"; ctx.fill(path);
        ctx.restore();
      }
    }
  }

  var skyCache = {};
  function tiles(dark) {
    var k = dark ? "d" : "l";
    if (!skyCache[k]) skyCache[k] = LAYERS.map(function (L) { return renderTile(L, dark); });
    return skyCache[k];
  }
  /* the nebula wash, rendered once per size and appearance (the tile layers move, so they're drawn per frame) */
  var nebImg = null, nebKey = "";
  function nebula(w, h, dark) {
    var key = w + "x" + h + (dark ? "d" : "l");
    if (nebKey === key) return nebImg;
    var c = canvas(w / 2, h / 2), ctx = c.getContext("2d");              // smooth gradients need few pixels
    ctx.scale(0.5, 0.5);
    var top = rgbOf(dark ? 0x0A0B17 : 0xE4E5F4), bot = rgbOf(dark ? 0x100E1F : 0xF4ECE8);
    var lg = ctx.createLinearGradient(0, 0, 0, h); lg.addColorStop(0, css(top)); lg.addColorStop(1, css(bot));
    ctx.fillStyle = lg; ctx.fillRect(0, 0, w, h);
    var clouds = dark ? [[0.2, 0.28, 0.62, 0x34337E, 0.30], [0.84, 0.78, 0.56, 0x4E2A66, 0.22], [0.72, 0.12, 0.4, 0x1B5068, 0.16]]
                      : [[0.2, 0.3, 0.6, 0xD6D2F2, 0.45], [0.82, 0.86, 0.6, 0xF8D6C2, 0.5], [0.76, 0.12, 0.42, 0xD3E7F5, 0.4]];
    clouds.forEach(function (q) { var col = rgbOf(q[3]);
      radial(ctx, w * q[0], h * q[1], Math.max(w, h) * q[2], [[0, css(col, q[4])], [0.55, css(col, q[4] * 0.4)], [1, css(col, 0)]]); });
    nebImg = c; nebKey = key;
    return c;
  }
  var glintSprite = {};
  function sprite(dark) {
    var k = dark ? "d" : "l";
    if (glintSprite[k]) return glintSprite[k];
    var c = canvas(48, 48), col = rgbOf(dark ? 0xF4F1FF : 0x6F63B8);
    radial(c.getContext("2d"), 24, 24, 24, [[0, css(col, 0.9)], [0.18, css(col, 0.45)], [0.5, css(col, 0.08)], [1, css(col, 0)]]);
    return (glintSprite[k] = c);
  }

  /* ---------- the scene ---------- */
  var G = makeGraph(), Lay = layout(G);

  // how far the web reaches from Plasmie on each axis (MapScene.fitCamera)
  var reachX = PLASMIE_R, reachY = PLASMIE_R;
  G.nodes.forEach(function (n, i) {
    reachX = Math.max(reachX, Math.abs(Lay.x[i]) + n.radius); reachY = Math.max(reachY, Math.abs(Lay.y[i]) + n.radius);
  });
  function fitZoom(w, h) { return Math.min(Math.max(Math.min(w / (2 * reachX), h / (2 * reachY)) * 0.88, 0.2), 2); }

  function halfWidth(n) { return Math.min(0.22 + 0.03 * Math.sqrt(n.links), 0.5); }
  function control(a, b) {                             // a vein's bend, same either way round
    var p = Math.min(a, b), q = Math.max(a, b);
    var px = p < 0 ? 0 : Lay.x[p], py = p < 0 ? 0 : Lay.y[p], qx = Lay.x[q], qy = Lay.y[q];
    var side = (p < 0 ? G.nodes[q].seed : (G.nodes[p].seed + G.nodes[q].seed) / 2) < 0.5 ? -1 : 1;
    var bend = (p < 0 ? 0.16 : 0.11) * side;
    return [(px + qx) / 2 - (qy - py) * bend, (py + qy) / 2 + (qx - px) * bend];
  }
  function addVein(path, ax, ay, c, bx, by, w0, w1) {   // a tapered vein, as one closed shape
    function normal(ux, uy, vx, vy) { var dx = vx - ux, dy = vy - uy, l = Math.max(Math.hypot(dx, dy), 1e-6); return [-dy / l, dx / l]; }
    var n0 = normal(ax, ay, c[0], c[1]), n1 = normal(c[0], c[1], bx, by), nm = normal(ax, ay, bx, by), wm = (w0 + w1) / 2;
    path.moveTo(ax + n0[0] * w0, ay + n0[1] * w0);
    path.quadraticCurveTo(c[0] + nm[0] * wm, c[1] + nm[1] * wm, bx + n1[0] * w1, by + n1[1] * w1);
    path.lineTo(bx - n1[0] * w1, by - n1[1] * w1);
    path.quadraticCurveTo(c[0] - nm[0] * wm, c[1] - nm[1] * wm, ax - n0[0] * w0, ay - n0[1] * w0);
    path.closePath();
  }

  // veins don't move, so their shapes are built once per size (their width follows the zoom, as in the app)
  var veins, homeVeins, dashes, veinZoom = 0;
  function buildVeins(zoom) {
    if (Math.abs(zoom - veinZoom) < 1e-3) return;
    veinZoom = zoom;
    var kz = Math.pow(zoom, -0.4), floorW = 0.22 / zoom;
    veins = new Path2D(); homeVeins = new Path2D(); dashes = new Path2D();
    G.edges.forEach(function (e) {
      var a = e[0], b = e[1];
      addVein(veins, Lay.x[a], Lay.y[a], control(a, b), Lay.x[b], Lay.y[b],
        Math.max(halfWidth(G.nodes[a]) * kz, floorW), Math.max(halfWidth(G.nodes[b]) * kz, floorW));
    });
    G.anchors.forEach(function (a) {
      addVein(homeVeins, 0, 0, control(-1, a), Lay.x[a], Lay.y[a], Math.max(1.8 * kz, floorW), Math.max(halfWidth(G.nodes[a]) * kz, floorW));
    });
    G.suggested.forEach(function (e) {
      var c = control(e[0], e[1]);
      dashes.moveTo(Lay.x[e[0]], Lay.y[e[0]]); dashes.quadraticCurveTo(c[0], c[1], Lay.x[e[1]], Lay.y[e[1]]);
    });
  }

  /* ---------- the opening (MapIntro): Plasmie swells with its arms already open, then the web bursts out ---------- */
  var HOLD = 0.75, BURST = 1.6, WAVE = 0.75, PACKED = 0.02, START_SPIN = -1.2, TADA_UNTIL = 0.9;
  var LOADING = 96, introAt = reduce ? -1e9 : null;    // null: waiting for the visitor to arrive
  function pose(now) {
    if (introAt === null) return { spread: PACKED, spin: START_SPIN, swell: 0, snap: 0, wave: null, tada: false };
    var t = (now - introAt) / 1000 - HOLD;
    if (t >= BURST) return null;
    if (t <= 0) return { spread: PACKED, spin: START_SPIN, swell: spring(t + HOLD, 0.5, 0.8), snap: 0, wave: null, tada: true };
    var out = spring(t, 0.9, 0.72);
    return { spread: PACKED + (1 - PACKED) * out, spin: START_SPIN * (1 - glide(t / 1.1)), swell: 1,
             snap: glide(t / 0.38), wave: t < WAVE ? t / WAVE : null, tada: t < TADA_UNTIL };
  }
  function plasmieSize(p, cam) {
    var normal = Math.min(Math.max(72 * cam.zoom, 48), 132);
    if (!p) return normal;
    var hugeS = Math.min(0.55 * Math.min(VW, VH), 420), huge = LOADING + (hugeS - LOADING) * p.swell;
    return huge + (normal - huge) * p.snap;
  }

  /* ---------- drawing (MapRender) ---------- */
  var ctx = cv.getContext("2d"), dpr = 1, VW = 1, VH = 1;
  var pulses = [], nextPulse = 0, PER_VEIN = 0.55;
  function isDark() { return getComputedStyle(root).getPropertyValue("--map-scheme").trim() === "dark"; }

  // cam: where Plasmie sits on screen (cx, cy) and the zoom; the sky follows the move from home (centre)
  function draw(now, cam) {
    var dark = isDark(), p = pose(now), t = now / 1000, lively = !reduce && !p;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(nebula(VW, VH, dark), 0, 0, VW, VH);
    drawSky(dark, cam, t);

    buildVeins(cam.zoom);
    var zoom = cam.zoom;
    ctx.save();
    ctx.translate(cam.cx, cam.cy); ctx.scale(zoom, zoom);
    if (p) { ctx.rotate(p.spin); ctx.scale(p.spread, p.spread); }
    var ink = hue("ink", dark), dim = p ? 0 : dimLevel(now), shown = focus != null ? focus : dim > 0.001 ? lastFocus : null;
    ctx.globalAlpha = 1 - 0.72 * dim;                   // everything, dimmed while a note is in focus
    ctx.setLineDash([3 / zoom, 3 / zoom]); ctx.lineWidth = 0.5 / zoom; ctx.lineCap = "round";
    ctx.strokeStyle = css(ink, dark ? 0.10 : 0.09); ctx.stroke(dashes);
    ctx.setLineDash([]);
    ctx.fillStyle = css(ink, dark ? 0.13 : 0.12); ctx.fill(veins);
    ctx.fillStyle = css(ink, dark ? 0.30 : 0.26); ctx.fill(homeVeins);
    drawFreshGlow(dark);
    drawBlobs(dark, lively ? 0.035 : 0, t, zoom, null, now);
    if (dim > 0.001 && shown != null) {                 // the note in focus and its links, lit
      var F = focusPaths(shown, zoom), set = {};
      set[shown] = 1; G.neighbours[shown].forEach(function (j) { set[j] = 1; });
      ctx.globalAlpha = dim;
      ctx.setLineDash([3 / zoom, 3 / zoom]); ctx.lineWidth = 0.9 / zoom;
      ctx.strokeStyle = css(ink, 0.5); ctx.stroke(F.dashes);
      ctx.setLineDash([]);
      ctx.save();                                       // the vein glow: the one lit effect
      ctx.shadowColor = css(hue("sparkle", dark), dark ? 0.45 : 0.6); ctx.shadowBlur = 6;
      ctx.fillStyle = css(hue("sparkle", dark), dark ? 0.45 : 0.6); ctx.fill(F.veins);
      ctx.restore();
      ctx.fillStyle = css(ink, 0.7); ctx.fill(F.veins);
      drawBlobs(dark, lively ? 0.035 : 0, t, zoom, set, now);
      ctx.globalAlpha = 1;
      ctx.restore();
      drawLabels(dark, cam, shown, set, dim, now);
    } else {
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    if (lively) drawPulses(now, dark, cam);
    if (p && p.wave != null) {                         // the burst's shockwave
      var e = glide(p.wave), r = plasmieSize(p, cam) / 2 + Math.hypot(VW, VH) / 2 * e;
      ctx.beginPath(); ctx.arc(cam.cx, cam.cy, r, 0, 2 * Math.PI);
      ctx.strokeStyle = css(hue("sparkle", dark), 0.55 * (1 - p.wave)); ctx.lineWidth = 1.5 + 2.5 * (1 - p.wave); ctx.stroke();
    }
    placePlasmie(p, cam);
    lastCam = cam;
  }

  /* the three tile layers, each shifted by its share of the web's move (MapSpace.placement) */
  function drawSky(dark, cam, t) {
    var T = tiles(dark), img = sprite(dark);
    var mx = cam.cx - VW / 2, my = cam.cy - VH / 2;
    LAYERS.forEach(function (L, li) {
      var d = L.tile, ox = VW / 2 + mx * L.depth - d / 2, oy = VH / 2 + my * L.depth - d / 2;
      ox -= Math.ceil(ox / d) * d; oy -= Math.ceil(oy / d) * d;
      for (var tx = ox; tx < VW; tx += d) for (var ty = oy; ty < VH; ty += d) {
        ctx.drawImage(T[li].img, tx, ty, d, d);
        if (li !== 1 || reduce) continue;
        // a few pinpoints breathe brighter and back
        ctx.save();
        if (dark) ctx.globalCompositeOperation = "lighter";
        T[1].glints.forEach(function (g) {
          var x = tx + g.x, y = ty + g.y;
          if (x < -g.size || x > VW + g.size || y < -g.size || y > VH + g.size) return;
          var wave = 0.5 + 0.5 * Math.sin(2 * Math.PI * (t / g.period + g.phase));
          ctx.globalAlpha = clamp01(g.rest * (1 + 1.1 * (wave - 0.35)));
          ctx.drawImage(img, x - g.size / 2, y - g.size / 2, g.size, g.size);
        });
        ctx.restore();
      }
    });
  }

  function drawFreshGlow(dark) {
    G.nodes.forEach(function (n, i) {
      if (n.level !== 3 || !glows(n.kind)) return;
      var r = n.radius * 1.7, soft = 5, c = kindFill(n.kind, dark, 1);
      radial(ctx, Lay.x[i], Lay.y[i], r + soft, [[0, css(c, 0.45)], [r / (r + soft), css(c, 0.2)], [1, css(c, 0)]]);
    });
  }

  function drawBlobs(dark, breath, t, zoom, only, now) {
    var fills = {}, rims = {}, rings = new Path2D(), sheens = new Path2D();
    G.nodes.forEach(function (n, i) {
      if (only && !only[i]) return;
      var b = breath * Math.sin(2 * Math.PI * (t / 2.6 + n.seed)), r = n.radius * grow(i, now), x = Lay.x[i], y = Lay.y[i];
      var rx = r * (1 + b), ry = r * (1 - b), key = n.kind * 4 + n.level;
      var fill = fills[key] = fills[key] || new Path2D();
      fill.moveTo(x + rx, y); fill.ellipse(x, y, rx, ry, 0, 0, 2 * Math.PI);
      var rim = rims[n.kind] = rims[n.kind] || new Path2D();
      rim.moveTo(x + rx, y); rim.ellipse(x, y, rx, ry, 0, 0, 2 * Math.PI);
      if (n.kind === MAP) { rings.moveTo(x + r + 1.6, y); rings.arc(x, y, r + 1.6, 0, 2 * Math.PI); }
      if (r * zoom >= 6) { sheens.moveTo(x, y - 0.44 * r); sheens.ellipse(x - 0.275 * r, y - 0.44 * r, 0.275 * r, 0.18 * r, 0, 0, 2 * Math.PI); }
    });
    ctx.lineWidth = Math.max(0.9, 0.7 / zoom); ctx.strokeStyle = css(hue("note", dark)); ctx.stroke(rings);
    for (var k = 0; k < 6; k++) {
      for (var f = 0; f < 4; f++) {
        var path = fills[k * 4 + f];
        if (path) { ctx.fillStyle = css(kindFill(k, dark, (f + 0.5) / 4)); ctx.fill(path); }
      }
      if (rims[k]) { ctx.lineWidth = Math.max(0.5, 0.5 / zoom); ctx.strokeStyle = css(kindRim(k, dark), 0.7); ctx.stroke(rims[k]); }
    }
    ctx.fillStyle = css(hue("eggshell", dark), dark ? 0.35 : 0.5); ctx.fill(sheens);
  }

  /* nutrient pulses: a faint gold bead running down the veins toward Plasmie */
  function drawPulses(now, dark, cam) {
    if (now > nextPulse && pulses.length < 4) {
      var hopsList = [Math.floor(Math.random() * G.nodes.length)];
      while (G.next[hopsList[hopsList.length - 1]] >= 0 && hopsList.length < 6) hopsList.push(G.next[hopsList[hopsList.length - 1]]);
      pulses.push({ hops: hopsList, at: now, dur: hopsList.length * PER_VEIN });
      nextPulse = now + 900 + 900 * Math.random();
    }
    pulses = pulses.filter(function (p) { return (now - p.at) / 1000 < p.dur; });
    var gold = hue("sparkle", dark), core = dark ? gold : mixed("gold", "ink", 0.15, dark);
    pulses.forEach(function (p) {
      var tt = (now - p.at) / 1000 / PER_VEIN, k = Math.min(Math.floor(tt), p.hops.length - 1), u = tt - k;
      var a = p.hops[k], b = k + 1 < p.hops.length ? p.hops[k + 1] : -1;
      var ax = Lay.x[a], ay = Lay.y[a], bx = b < 0 ? 0 : Lay.x[b], by = b < 0 ? 0 : Lay.y[b], c = control(a, b), v = 1 - u;
      var wx = v * v * ax + 2 * v * u * c[0] + u * u * bx, wy = v * v * ay + 2 * v * u * c[1] + u * u * by;
      var sx = cam.cx + wx * cam.zoom, sy = cam.cy + wy * cam.zoom;
      var fade = Math.min(tt / 0.3, 1) * Math.min((p.dur / PER_VEIN - tt) / 0.3, 1), r = 2.6 * Math.max(fade, 0.2);
      radial(ctx, sx, sy, r * 3, [[0, css(gold, dark ? 0.4 : 0.5)], [1, css(gold, 0)]]);
      ctx.fillStyle = css(core); ctx.beginPath(); ctx.arc(sx, sy, r, 0, 2 * Math.PI); ctx.fill();
    });
  }

  /* ---------- hover: a note grows, its links light up, the rest dims, a card shows it (MapScene focus) ---------- */
  var focus = null, prevFocus = null, lastFocus = null, focusAt = -1e9, focusFrom = 0, lastCam = null;
  function dimLevel(now) {
    var p = (now - focusAt) / 1000 / (reduce ? 0.15 : 0.42), e = reduce ? Math.min(p, 1) : glide(p);
    return focusFrom + ((focus == null ? 0 : 1) - focusFrom) * e;
  }
  function hoverFactor(i) { return Math.min(4, Math.max(12 / G.nodes[i].radius, 1.5)); }
  function grow(i, now) {
    if (i !== focus && i !== prevFocus) return 1;
    var t = (now - focusAt) / 1000, f = hoverFactor(i);
    if (i === focus) return 1 + (f - 1) * (reduce ? Math.min(t / 0.15, 1) : spring(t, 0.36, 0.58));
    var p = t / (reduce ? 0.15 : 0.42);
    return 1 + (f - 1) * (1 - (reduce ? Math.min(p, 1) : glide(p)));
  }
  function setFocus(i) {
    if (i === focus) return;
    var now = performance.now();
    focusFrom = dimLevel(now); prevFocus = focus; focus = i; focusAt = now;
    if (i != null) lastFocus = i;
    showCard(i);
    wake();
  }
  var focusCache = { id: null, zoom: 0 };
  function focusPaths(f, zoom) {                       // the veins and dashes touching one note
    if (focusCache.id === f && Math.abs(focusCache.zoom - zoom) < 1e-3) return focusCache;
    var kz = Math.pow(zoom, -0.4), floorW = 0.22 / zoom, v = new Path2D(), d = new Path2D();
    G.edges.forEach(function (e) {
      if (e[0] !== f && e[1] !== f) return;
      var a = e[0], b = e[1];
      addVein(v, Lay.x[a], Lay.y[a], control(a, b), Lay.x[b], Lay.y[b],
        Math.max(halfWidth(G.nodes[a]) * kz, floorW), Math.max(halfWidth(G.nodes[b]) * kz, floorW));
    });
    if (G.anchors.indexOf(f) >= 0) addVein(v, 0, 0, control(-1, f), Lay.x[f], Lay.y[f], Math.max(1.8 * kz, floorW), Math.max(halfWidth(G.nodes[f]) * kz, floorW));
    G.suggested.forEach(function (e) {
      if (e[0] !== f && e[1] !== f) return;
      var c = control(e[0], e[1]);
      d.moveTo(Lay.x[e[0]], Lay.y[e[0]]); d.quadraticCurveTo(c[0], c[1], Lay.x[e[1]], Lay.y[e[1]]);
    });
    focusCache = { id: f, zoom: zoom, veins: v, dashes: d };
    return focusCache;
  }
  /* titles under the note in focus and its biggest neighbours; bigger notes keep their label */
  function drawLabels(dark, cam, f, set, dim, now) {
    var ink = hue("ink", dark), taken = [];
    var near = Object.keys(set).map(Number).filter(function (i) { return i !== f; })
      .sort(function (a, b) { return G.nodes[b].radius - G.nodes[a].radius; }).slice(0, 24);
    ctx.save();
    ctx.globalAlpha = dim; ctx.textAlign = "center"; ctx.textBaseline = "top";
    [f].concat(near).forEach(function (i) {
      var n = G.nodes[i], isF = i === f, title = n.title.length > 32 ? n.title.slice(0, 31) + "…" : n.title;
      ctx.font = (isF ? "600 12px " : "11px ") + "-apple-system, BlinkMacSystemFont, system-ui, sans-serif";
      var x = cam.cx + Lay.x[i] * cam.zoom, y = cam.cy + Lay.y[i] * cam.zoom + n.radius * cam.zoom * (isF ? grow(i, now) : 1) + 4;
      var w = ctx.measureText(title).width, box = [x - w / 2 - 3, y - 1, x + w / 2 + 3, y + 15];
      if (!isF && taken.some(function (o) { return box[0] < o[2] && box[2] > o[0] && box[1] < o[3] && box[3] > o[1]; })) return;
      taken.push(box);
      ctx.fillStyle = css(ink, isF ? 0.92 : 0.78);
      ctx.fillText(title, x, y);
    });
    ctx.restore();
  }

  var card = document.createElement("div");
  card.className = "map-card"; card.setAttribute("aria-hidden", "true"); card.hidden = true;
  pin.appendChild(card);
  function showCard(i) {
    if (i == null) { card.hidden = true; return; }
    var n = G.nodes[i];
    card.replaceChildren();
    function add(tag, cls, text, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; (parent || card).appendChild(e); return e; }
    add("b", "map-card-title", n.title);
    var meta = add("div", "map-card-meta");
    var type = add("span", "map-card-type", null, meta);
    add("i", "map-swatch k" + n.kind, null, type); type.appendChild(document.createTextNode(n.type));
    add("span", null, n.date, meta);
    add("span", "map-card-links", n.links === 1 ? "1 link" : n.links + " links", meta);
    add("p", "map-card-text", n.excerpt);
    add("p", "map-card-tags", n.tags.map(function (t) { return "#" + t; }).join("  "));
    card.hidden = false;
  }
  function placeCard(px, py) {
    var w = card.offsetWidth || 290, h = card.offsetHeight || 150;
    var x = px + 18 + w > VW ? px - w - 14 : px + 18, y = py + 20 + h > VH ? Math.max(py - h - 10, 8) : py + 20;
    card.style.transform = "translate(" + Math.max(x, 8) + "px," + y + "px)";
  }
  /* the nearest note under the pointer, within a few pixels of its edge */
  function hit(px, py) {
    var cam = lastCam;
    if (!cam || pose(performance.now())) return null;
    if (Math.hypot(px - cam.cx, py - cam.cy) < plasmieSize(null, cam) * 0.45) return null;
    var best = null, bestD = 1e9;
    G.nodes.forEach(function (n, i) {
      var sx = cam.cx + Lay.x[i] * cam.zoom, sy = cam.cy + Lay.y[i] * cam.zoom;
      var d = Math.hypot(px - sx, py - sy) - Math.max(n.radius * cam.zoom * grow(i, performance.now()), 3);
      if (d < 6 && d < bestD) { bestD = d; best = i; }
    });
    return best;
  }
  function onPointer(e) {
    var r = pin.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    setFocus(hit(px, py));
    if (focus != null) placeCard(px, py);
  }
  pin.addEventListener("pointermove", onPointer);
  pin.addEventListener("pointerdown", onPointer);
  pin.addEventListener("pointerleave", function () { setFocus(null); });

  /* Plasmie is the site's own blob (plasmie.js), laid over the web's centre. Its host is the
     blob's viewBox at 1px per unit (112 x 120 from -6,-14), so the 100-unit canvas's centre
     (50,50) sits 56,64 into it (.map-plasmie's transform-origin). */
  var shownState = host.getAttribute("data-plasmie"), hovering = false, hoverAt = -1e9, lift = 0;
  function placePlasmie(p, cam) {
    // hovered, Plasmie leans in to a size where "ready to try?" can be read
    lift = reduce ? (hovering ? 1 : 0) : lift + ((hovering && !p ? 1 : 0) - lift) * 0.18;
    var size = plasmieSize(p, cam), big = Math.max(size, 124);
    host.style.transform = "translate(" + (cam.cx - 56).toFixed(1) + "px," + (cam.cy - 64).toFixed(1) + "px) scale(" + ((size + (big - size) * lift) / 100).toFixed(4) + ")";
    var want = p && p.tada ? "tada" : hovering ? "hi" : "idle";
    if (want !== shownState && window.Plasmie) { shownState = want; window.Plasmie.morph(host, want); }
  }
  host.addEventListener("pointerenter", function () { hovering = true; hoverAt = performance.now(); wake(); });
  host.addEventListener("pointerleave", function () { hovering = false; hoverAt = performance.now(); wake(); });
  // "ready to try?": a click takes you to Install (the header's Install link does the same for keyboards)
  host.addEventListener("click", function () { var i = document.getElementById("install"); if (i) i.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); });

  /* ---------- the section: pinned, two steps ---------- */
  var geo = null;
  function measure() {
    var pr = pin.getBoundingClientRect(), sr = slot.getBoundingClientRect();
    VW = Math.max(1, Math.round(pr.width)); VH = Math.max(1, Math.round(pr.height));
    var pad = Math.max(24, Math.min(64, VW * 0.05));
    geo = {
      intro: { cx: VW / 2, cy: VH / 2, zoom: fitZoom(VW - 2 * pad, VH - 2 * pad) },
      final: { cx: sr.left - pr.left + sr.width / 2, cy: sr.top - pr.top + sr.height / 2, zoom: fitZoom(sr.width, sr.height) }
    };
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var bw = Math.round(VW * dpr), bh = Math.round(VH * dpr);
    if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
  }
  function progress() {
    if (!scrub || reduce) return 1;
    var span = sec.offsetHeight - window.innerHeight;
    return span > 0 ? clamp01(-sec.getBoundingClientRect().top / span) : 1;
  }
  function inOut(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function camera() {
    if (!geo) measure();
    var k = progress(), e = inOut(k), a = geo.intro, b = geo.final;
    var c = clamp01((k - 0.45) / 0.55);
    copy.style.opacity = c.toFixed(3);
    copy.style.transform = "translateY(" + ((1 - glide(c)) * 18).toFixed(1) + "px)";
    // the opening plays once, when the section has arrived
    if (introAt === null && sec.getBoundingClientRect().top < window.innerHeight * 0.3) introAt = performance.now();
    return { cx: a.cx + (b.cx - a.cx) * e, cy: a.cy + (b.cy - a.cy) * e, zoom: a.zoom + (b.zoom - a.zoom) * e };
  }

  var visible = false, running = false;
  function loop(now) {
    running = false;
    if (!visible) return;
    draw(now, camera());
    if (!reduce || introAt === null || now - Math.max(focusAt, hoverAt) < 400) { running = true; requestAnimationFrame(loop); }
  }
  function wake() { if (!running) { running = true; requestAnimationFrame(loop); } }
  window.addEventListener("resize", function () { geo = null; wake(); });
  window.addEventListener("scroll", function () { if (focus != null) setFocus(null); wake(); }, { passive: true });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) wake(); }, { rootMargin: "120px" }).observe(sec);
  } else { visible = true; }
  // redraw when the theme changes, even under Reduce Motion
  new MutationObserver(wake).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", wake);
  if (reduce) { visible = true; wake(); }
})();

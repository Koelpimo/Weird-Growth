/**
 * LAB2 — Differential Line Growth (Patt Vira / CT116)
 * https://editor.p5js.org/pattvira/sketches/PlXmnaaHO
 *
 * Pro frame (pro geschlossener kontur):
 *   1. quadtree mit allen knoten füllen
 *   2. separation über nachbarn im radius separationDistance
 *   3. cohesion zu mittelpunkt der pfad-nachbarn
 *   4. insert() wenn kante > insertDistance
 */

function lab2Clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function lab2LimitVec(vx, vy, max) {
  const m = Math.hypot(vx, vy);
  if (m > max && m > 0) return [(vx / m) * max, (vy / m) * max];
  return [vx, vy];
}

function lab2MaxNodes(l2) {
  const v = l2?.nodeLimit ?? 0.2;
  return Math.round(2000 + v * 10000);
}

const lab2NodeLimitFmt = (v) => String(lab2MaxNodes({ nodeLimit: v }));

// start-knoten: grob (wenige) ↔ fein (viele) entlang der kontur
function lab2SeedSpacing(complexity) {
  return lab2Clamp(18 - complexity * 15, 3, 20);
}

// wachstums-schritt — gekoppelt an seed-spacing und split-slider
function lab2InsertDistance(split, seedSpacing) {
  return lab2Clamp(seedSpacing * (1.15 - split * 0.55), 2, 16);
}

function lab2StrokeWidth(stroke) {
  return lab2Clamp(0.5 + (stroke ?? 0.1) * 15, 0.5, 16);
}

const lab2StrokeFmt = (v) => `${Math.round(lab2StrokeWidth(v) * 10) / 10} px`;

function lab2ComputeParams(l2, w, h) {
  const complexity = l2.complexity ?? 0.11;
  const split = l2.split ?? 0.31;
  const maxNodes = lab2MaxNodes(l2);
  const seedSpacing = lab2SeedSpacing(complexity);
  const insertDistance = lab2InsertDistance(split, seedSpacing);
  return {
    maxNodes,
    seedSpacing,
    insertDistance,
    separationDistance: insertDistance * 2,
    margin: 4 + (1 - (l2.push ?? 0.5)) * 14,
    maxSpeed: 0.35 + (l2.attraction ?? 0.5) * 1.0,
    sepMaxForce: 0.35 + (l2.repulsion ?? 0.5) * 1.65,
    cohMaxForce: 0.35 + (l2.attraction ?? 0.5) * 1.65,
  };
}

/* ── quadtree (pattvira / coding train) ───────────────── */

class Lab2Rect {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  contains(point) {
    return (
      point.x >= this.x - this.w &&
      point.x <= this.x + this.w &&
      point.y >= this.y - this.h &&
      point.y <= this.y + this.h
    );
  }

  intersects(range) {
    const cx = lab2Clamp(range.x, this.x - this.w, this.x + this.w);
    const cy = lab2Clamp(range.y, this.y - this.h, this.y + this.h);
    const dx = range.x - cx;
    const dy = range.y - cy;
    return dx * dx + dy * dy <= range.r * range.r;
  }
}

class Lab2Circle {
  constructor(x, y, r) {
    this.x = x;
    this.y = y;
    this.r = r;
  }

  contains(point) {
    const dx = point.x - this.x;
    const dy = point.y - this.y;
    return dx * dx + dy * dy <= this.r * this.r;
  }
}

class Lab2Point {
  constructor(x, y, data) {
    this.x = x;
    this.y = y;
    this.data = data;
  }
}

class Lab2QuadTree {
  constructor(boundary, capacity) {
    this.boundary = boundary;
    this.capacity = capacity;
    this.points = [];
    this.divided = false;
    this.nw = null;
    this.ne = null;
    this.sw = null;
    this.se = null;
  }

  clear() {
    this.points = [];
    this.divided = false;
    this.nw = null;
    this.ne = null;
    this.sw = null;
    this.se = null;
  }

  subdivide() {
    const { x, y, w, h } = this.boundary;
    const hw = w * 0.5;
    const hh = h * 0.5;
    this.nw = new Lab2QuadTree(new Lab2Rect(x - hw, y - hh, hw, hh), this.capacity);
    this.ne = new Lab2QuadTree(new Lab2Rect(x + hw, y - hh, hw, hh), this.capacity);
    this.sw = new Lab2QuadTree(new Lab2Rect(x - hw, y + hh, hw, hh), this.capacity);
    this.se = new Lab2QuadTree(new Lab2Rect(x + hw, y + hh, hw, hh), this.capacity);
    this.divided = true;
  }

  insert(point) {
    if (!this.boundary.contains(point)) return false;
    if (this.points.length < this.capacity) {
      this.points.push(point);
      return true;
    }
    if (!this.divided) this.subdivide();
    return (
      this.nw.insert(point) ||
      this.ne.insert(point) ||
      this.sw.insert(point) ||
      this.se.insert(point)
    );
  }

  query(range, found) {
    if (!this.boundary.intersects(range)) return;
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      if (range.contains(p)) found.push(p);
    }
    if (!this.divided) return;
    this.nw.query(range, found);
    this.ne.query(range, found);
    this.sw.query(range, found);
    this.se.query(range, found);
  }
}

/* ── knoten-physik (pattvira steering) ─────────────────── */

function makeLab2Node(x, y, cfg) {
  return {
    x,
    y,
    seedX: x,
    seedY: y,
    vx: 0,
    vy: 0,
    ax: 0,
    ay: 0,
    maxSpeed: cfg.maxSpeed,
    sepMaxForce: cfg.sepMaxForce,
    cohMaxForce: cfg.cohMaxForce,
  };
}

function lab2SepWeight(node, other, lineNodes) {
  const idx = lineNodes.indexOf(node);
  const oidx = lineNodes.indexOf(other);
  if (idx < 0 || oidx < 0) return 1;
  const n = lineNodes.length;
  const diff = Math.abs(idx - oidx);
  const wrap = n - diff;
  if (diff <= 1 || wrap <= 1) return 0.75;
  return 1;
}

function lab2RingOfNode(line, node) {
  if (line.nodes.indexOf(node) >= 0) return line.nodes;
  if (line.holes) {
    for (let i = 0; i < line.holes.length; i++) {
      if (line.holes[i].indexOf(node) >= 0) return line.holes[i];
    }
  }
  return null;
}

function lab2RingNeighbors(lineNodes, idxA, idxB) {
  const n = lineNodes.length;
  const diff = Math.abs(idxA - idxB);
  return diff <= 1 || n - diff <= 1;
}

function lab2SeparationLegacy(node, neighbors, sepDist, lineNodes, line, nodeRef) {
  let sx = 0;
  let sy = 0;
  let total = 0;
  for (let i = 0; i < neighbors.length; i++) {
    const other = neighbors[i].data;
    if (other === node) continue;
    const otherRef = nodeRef.get(other);
    if (!otherRef) continue;

    if (otherRef.line === line && otherRef.lineNodes !== lineNodes) {
      let w = 2.1;
      const dx = node.x - other.x;
      const dy = node.y - other.y;
      const d = Math.max(Math.hypot(dx, dy), 0.75);
      if (d < sepDist) {
        sx += (dx / (d * d)) * w;
        sy += (dy / (d * d)) * w;
        total += w;
      }
      continue;
    }

    const dx = node.x - other.x;
    const dy = node.y - other.y;
    const d = Math.max(Math.hypot(dx, dy), 0.75);
    if (d < sepDist) {
      // andere buchstaben/konturen → nur über pushRingsApart (gedeckelt),
      // sonst doppelte abstoßung und eskalation.
      if (otherRef.line !== line) continue;
      const w = lab2SepWeight(node, other, lineNodes);
      sx += (dx / (d * d)) * w;
      sy += (dy / (d * d)) * w;
      total += w;
    }
  }
  if (total === 0) return { x: 0, y: 0 };
  sx /= total;
  sy /= total;
  const m = Math.hypot(sx, sy) || 1;
  sx = (sx / m) * node.maxSpeed;
  sy = (sy / m) * node.maxSpeed;
  let fx = sx - node.vx;
  let fy = sy - node.vy;
  [fx, fy] = lab2LimitVec(fx, fy, node.sepMaxForce);
  return { x: fx, y: fy };
}

// patt-vira: (sepDist - d) / d, gemittelt über nachbarn — rundes organisches wachstum.
// gleiche kontur: ring-nachbarn volle kraft, weiter entfernte ring-paare gedämpft
// (verhindert p-explosion ohne die optik zu zerstören).
function lab2Separation(node, neighbors, sepDist, lineNodes, line, nodeRef, legacy) {
  if (legacy) {
    return lab2SeparationLegacy(node, neighbors, sepDist, lineNodes, line, nodeRef);
  }

  let sx = 0;
  let sy = 0;
  let count = 0;
  const idx = lineNodes.indexOf(node);

  for (let i = 0; i < neighbors.length; i++) {
    const other = neighbors[i].data;
    if (other === node) continue;
    const otherRef = nodeRef.get(other);
    if (!otherRef) continue;

    const dx = node.x - other.x;
    const dy = node.y - other.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.5 || d >= sepDist) continue;

    let w = 1;
    if (otherRef.line === line && otherRef.lineNodes === lineNodes) {
      w = lab2SepWeight(node, other, lineNodes);
      if (!lab2RingNeighbors(lineNodes, idx, otherRef.idx)) w *= 0.45;
    } else if (otherRef.line === line && otherRef.lineNodes !== lineNodes) {
      w = 1.0;
    } else if (otherRef.line !== line) {
      w = 0.9;
    }

    const push = Math.min((sepDist - d) / d, 3.5);
    sx += (dx / d) * push * w;
    sy += (dy / d) * push * w;
    count++;
  }

  if (count === 0) return { x: 0, y: 0 };
  sx /= count;
  sy /= count;
  const m = Math.hypot(sx, sy) || 1;
  sx = (sx / m) * node.maxSpeed;
  sy = (sy / m) * node.maxSpeed;
  let fx = sx - node.vx;
  let fy = sy - node.vy;
  [fx, fy] = lab2LimitVec(fx, fy, node.sepMaxForce);
  return { x: fx, y: fy };
}

function lab2Cohesion(node, lineNodes) {
  const idx = lineNodes.indexOf(node);
  if (idx < 0) return { x: 0, y: 0 };
  const n = lineNodes.length;
  const prev = lineNodes[(idx - 1 + n) % n];
  const next = lineNodes[(idx + 1) % n];
  let sx = (prev.x + next.x) * 0.5;
  let sy = (prev.y + next.y) * 0.5;
  let dx = sx - node.x;
  let dy = sy - node.y;
  const m = Math.hypot(dx, dy) || 1;
  dx = (dx / m) * node.maxSpeed;
  dy = (dy / m) * node.maxSpeed;
  let fx = dx - node.vx;
  let fy = dy - node.vy;
  [fx, fy] = lab2LimitVec(fx, fy, node.cohMaxForce);
  return { x: fx, y: fy };
}

function lab2UpdateNode(node, lineNodes, neighbors, bounds, margin, factor, line, nodeRef, legacy) {
  const sep = lab2Separation(node, neighbors, bounds.sepDist, lineNodes, line, nodeRef, legacy);
  const coh = lab2Cohesion(node, lineNodes);
  node.ax = sep.x + coh.x;
  node.ay = sep.y + coh.y;

  node.vx += node.ax;
  node.vy += node.ay;
  [node.vx, node.vy] = lab2LimitVec(node.vx, node.vy, node.maxSpeed);
  node.vx *= 0.93;
  node.vy *= 0.93;
  node.x += node.vx * factor;
  node.y += node.vy * factor;
  node.ax = 0;
  node.ay = 0;

  const left = margin;
  const right = bounds.w - margin;
  const top = margin;
  const bottom = bounds.h - margin;
  if (node.x > right) {
    node.x = right;
    if (node.vx > 0) node.vx = 0;
  } else if (node.x < left) {
    node.x = left;
    if (node.vx < 0) node.vx = 0;
  }
  if (node.y > bottom) {
    node.y = bottom;
    if (node.vy > 0) node.vy = 0;
  } else if (node.y < top) {
    node.y = top;
    if (node.vy < 0) node.vy = 0;
  }
}

function lab2InsertLine(nodes, insertDistance, budget) {
  const cap = budget == null ? Infinity : budget;
  let added = 0;
  for (let i = 0; i < nodes.length; i++) {
    if (added >= cap) break;
    const a = nodes[i];
    const b = nodes[(i + 1) % nodes.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    if (d > insertDistance) {
      const midX = a.x + dx * 0.5;
      const midY = a.y + dy * 0.5;
      const insertIndex = (i + 1) % nodes.length;
      const child = makeLab2Node(midX, midY, {
        maxSpeed: a.maxSpeed,
        sepMaxForce: a.sepMaxForce,
        cohMaxForce: a.cohMaxForce,
      });
      // anker des neuen knotens = mitte der ursprungs-anker der eltern,
      // damit die struktur an der original-outline verankert bleibt.
      child.seedX = (a.seedX + b.seedX) * 0.5;
      child.seedY = (a.seedY + b.seedY) * 0.5;
      child.vx = (a.vx + b.vx) * 0.5;
      child.vy = (a.vy + b.vy) * 0.5;
      nodes.splice(insertIndex, 0, child);
      added++;
    }
  }
}

function lab2SnapHoleRings(lines) {
  for (let li = 0; li < lines.length; li++) {
    const holes = lines[li].holes;
    if (!holes) continue;
    for (let hi = 0; hi < holes.length; hi++) {
      const ring = holes[hi];
      for (let i = 0; i < ring.length; i++) {
        const n = ring[i];
        n.x = n.seedX;
        n.y = n.seedY;
        n.vx = 0;
        n.vy = 0;
      }
    }
  }
}

function lab2LineRings(line) {
  const rings = [line.nodes];
  if (line.holes) {
    for (let i = 0; i < line.holes.length; i++) rings.push(line.holes[i]);
  }
  return rings;
}

function lab2PushRingsApart(all, sepDist, opts) {
  const strength = opts && opts.strength != null ? opts.strength : 0.55;
  const maxStep = opts && opts.maxStep != null ? opts.maxStep : Infinity;
  const selfMul = opts && opts.selfMul != null ? opts.selfMul : 1.2;
  const minD = sepDist * 0.9;
  const minD2 = minD * minD;
  const cell = minD;
  const grid = new Map();

  for (let i = 0; i < all.length; i++) {
    const node = all[i].node;
    const key = (Math.floor(node.x / cell) + 512) * 4096 + Math.floor(node.y / cell) + 512;
    let arr = grid.get(key);
    if (!arr) grid.set(key, (arr = []));
    arr.push(i);
  }

  const neighborKeys = [
    0, 1, -1, 4096, -4096, 4097, 4095, -4097, -4095,
  ];

  function pushPair(refA, refB) {
    if (refA.lineNodes === refB.lineNodes) return;
    const holeA = refA.lineNodes !== refA.line.nodes;
    const holeB = refB.lineNodes !== refB.line.nodes;
    if (holeA && holeB) return;
    const nodeA = refA.node;
    const nodeB = refB.node;
    const dx = nodeB.x - nodeA.x;
    const dy = nodeB.y - nodeA.y;
    const d2 = dx * dx + dy * dy;
    if (d2 >= minD2 || d2 < 1e-8) return;
    const d = Math.sqrt(d2);
    let push = (minD - d) * strength;
    if (refA.line === refB.line) push *= selfMul;
    if (push > maxStep) push = maxStep;
    const ux = dx / d;
    const uy = dy / d;
    if (!holeA) {
      nodeA.x -= ux * push;
      nodeA.y -= uy * push;
    }
    if (!holeB) {
      nodeB.x += ux * push;
      nodeB.y += uy * push;
    }
  }

  for (const [key, indices] of grid) {
    for (let ai = 0; ai < indices.length; ai++) {
      for (let bi = ai + 1; bi < indices.length; bi++) {
        pushPair(all[indices[ai]], all[indices[bi]]);
      }
    }

    for (let nk = 0; nk < neighborKeys.length; nk++) {
      const nbr = grid.get(key + neighborKeys[nk]);
      if (!nbr) continue;
      for (let ai = 0; ai < indices.length; ai++) {
        for (let bi = 0; bi < nbr.length; bi++) {
          pushPair(all[indices[ai]], all[nbr[bi]]);
        }
      }
    }
  }
}

// hält die knotendichte stabil: zu kurze kanten werden zusammengeführt,
// damit die linie bei abstoßung nicht in immer mehr knoten "explodiert".
function lab2PruneShortEdges(nodes, minDist) {
  const minD2 = minDist * minDist;
  for (let i = nodes.length - 2; i >= 0; i--) {
    if (nodes.length <= 8) break;
    const a = nodes[i];
    const b = nodes[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx * dx + dy * dy < minD2) nodes.splice(i + 1, 1);
  }
}

// globale kollisionsvermeidung über ALLE linien: jeder knoten hält zu jedem
// nicht-direkt-benachbarten knoten einen mindestabstand. dadurch kreuzt sich
// keine linie selbst und keine andere — der "explosions"-look entsteht nicht,
// das wachstum bleibt aber unbegrenzt (kein anker an die ursprungsform).
function lab2RefsAdjacent(a, b) {
  if (a.lineNodes !== b.lineNodes) return false;
  const n = a.lineNodes.length;
  const d = Math.abs(a.idx - b.idx);
  return d <= 2 || n - d <= 2;
}

function lab2GlobalRelax(all, minD, maxStep) {
  const minD2 = minD * minD;
  const cell = minD;
  const grid = new Map();
  for (let i = 0; i < all.length; i++) {
    const nd = all[i].node;
    const key = (Math.floor(nd.x / cell) + 1024) * 8192 + Math.floor(nd.y / cell) + 1024;
    let arr = grid.get(key);
    if (!arr) grid.set(key, (arr = []));
    arr.push(i);
  }
  const neighborKeys = [0, 1, -1, 8192, -8192, 8193, 8191, -8193, -8191];

  function relax(ia, ib) {
    const A = all[ia];
    const B = all[ib];
    if (lab2RefsAdjacent(A, B)) return;
    const holeA = A.lineNodes !== A.line.nodes;
    const holeB = B.lineNodes !== B.line.nodes;
    if (holeA && holeB) return;
    const a = A.node;
    const b = B.node;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d2 = dx * dx + dy * dy;
    if (d2 >= minD2 || d2 < 1e-8) return;
    const d = Math.sqrt(d2);
    let push = (minD - d) * 0.5;
    if (push > maxStep) push = maxStep;
    const ux = dx / d;
    const uy = dy / d;
    // löcher (punzen) sind fix → nur den jeweils anderen knoten verschieben
    if (holeA) {
      b.x += ux * push * 2;
      b.y += uy * push * 2;
    } else if (holeB) {
      a.x -= ux * push * 2;
      a.y -= uy * push * 2;
    } else {
      a.x -= ux * push;
      a.y -= uy * push;
      b.x += ux * push;
      b.y += uy * push;
    }
  }

  for (const [key, indices] of grid) {
    for (let ai = 0; ai < indices.length; ai++) {
      for (let bi = ai + 1; bi < indices.length; bi++) relax(indices[ai], indices[bi]);
    }
    for (let nk = 0; nk < neighborKeys.length; nk++) {
      const nbr = grid.get(key + neighborKeys[nk]);
      if (!nbr) continue;
      for (let ai = 0; ai < indices.length; ai++) {
        for (let bi = 0; bi < nbr.length; bi++) relax(indices[ai], nbr[bi]);
      }
    }
  }
}

// drift-limit pro buchstabe relativ zur eigenen größe — hält das
// wachstum nahe der ursprungs-outline, damit nichts überschneidet.
function lab2LineDrift(nodes) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].x < minX) minX = nodes[i].x;
    if (nodes[i].y < minY) minY = nodes[i].y;
    if (nodes[i].x > maxX) maxX = nodes[i].x;
    if (nodes[i].y > maxY) maxY = nodes[i].y;
  }
  const maxDim = Math.max(maxX - minX, maxY - minY);
  return lab2Clamp(maxDim * 0.13, 3, 90);
}

function contoursToLab2Lines(contours, cfg) {
  const lines = [];
  const isCompound = typeof isCompoundContour === "function" ? isCompoundContour : () => false;
  for (let i = 0; i < contours.length; i++) {
    const c = contours[i];
    if (isCompound(c)) {
      const nodes = c.outer.map((pt) => makeLab2Node(pt.x, pt.y, cfg));
      lines.push({
        id: i,
        nodes,
        drift: lab2LineDrift(nodes),
        holes: (c.holes || []).map((hole) =>
          hole.map((pt) => makeLab2Node(pt.x, pt.y, cfg))
        ),
      });
    } else if (c && c.length >= 2) {
      const nodes = c.map((pt) => makeLab2Node(pt.x, pt.y, cfg));
      lines.push({
        id: i,
        nodes,
        drift: lab2LineDrift(nodes),
      });
    }
  }
  return lines;
}

/* ── mode ─────────────────────────────────────────────── */

const Lab2GrowthMode = {
  desc:
    "Differential line growth (Patt Vira) — knoten an schrift-outline / gezeichneter linie, separation + cohesion, wachstum durch insert.",

  fmtA: (v) => `${Math.round(v * 100)}%`,
  fmtB: (v) => `${Math.round(v * 100)}%`,
  fmtC: (v) => `${Math.round(lab2InsertDistance(v, lab2SeedSpacing(0.11)))} px`,
  fmtD: (v) => `${Math.round(10 + v * 90)}`,

  create(p, helpers) {
    const { state, buildLab2Contours, clamp } = helpers;
    const w = p.width;
    const h = p.height;

    function lab2Cfg() {
      return lab2ComputeParams(state.lab2, w, h);
    }

    function syncNodeParams(cfg) {
      for (let li = 0; li < lines.length; li++) {
        const rings = lab2LineRings(lines[li]);
        for (let ri = 0; ri < rings.length; ri++) {
          const nodes = rings[ri];
          for (let i = 0; i < nodes.length; i++) {
            nodes[i].maxSpeed = cfg.maxSpeed;
            nodes[i].sepMaxForce = cfg.sepMaxForce;
            nodes[i].cohMaxForce = cfg.cohMaxForce;
          }
        }
      }
    }

    let cfg = lab2Cfg();
    let lines = contoursToLab2Lines(buildLab2Contours(w, h), cfg);
    const boundary = new Lab2Rect(w * 0.5, h * 0.5, w * 0.5, h * 0.5);
    const quadtree = new Lab2QuadTree(boundary, 10);
    let insertStopped = false;

    function totalNodes() {
      let n = 0;
      for (let i = 0; i < lines.length; i++) {
        const rings = lab2LineRings(lines[i]);
        for (let ri = 0; ri < rings.length; ri++) n += rings[ri].length;
      }
      return n;
    }

    function step() {
      cfg = lab2Cfg();
      syncNodeParams(cfg);
      const legacy = !!(state.lab2 && state.lab2.legacy);
      const factor = clamp(state.speed, 0.2, 8);
      const bounds = { w, h, sepDist: cfg.separationDistance };

      quadtree.clear();
      const all = [];
      const nodeRef = new Map();
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        const rings = lab2LineRings(line);
        for (let ri = 0; ri < rings.length; ri++) {
          const nodes = rings[ri];
          for (let i = 0; i < nodes.length; i++) {
            const nd = nodes[i];
            const ref = { node: nd, lineNodes: nodes, line, idx: i };
            all.push(ref);
            nodeRef.set(nd, ref);
            quadtree.insert(new Lab2Point(nd.x, nd.y, nd));
          }
        }
      }

      for (let a = 0; a < all.length; a++) {
        const { node, lineNodes, line } = all[a];
        if (lineNodes !== line.nodes) continue;
        const neighbors = [];
        quadtree.query(
          new Lab2Circle(node.x, node.y, cfg.separationDistance),
          neighbors
        );
        lab2UpdateNode(node, lineNodes, neighbors, bounds, cfg.margin, factor, line, nodeRef, legacy);
      }

      const envStep = cfg.insertDistance * 0.28;
      if (legacy) {
        // klassik: umgebungs-abstoßung nur hier, gedeckelt
        lab2PushRingsApart(all, cfg.separationDistance, {
          strength: 0.4,
          maxStep: envStep,
          selfMul: 1.1,
        });
      } else {
        lab2PushRingsApart(all, cfg.separationDistance, {
          strength: 0.35,
          maxStep: envStep,
          selfMul: 1.0,
        });
      }
      lab2SnapHoleRings(lines);

      // version 1 (differential growth): kurze kanten zusammenführen, damit die
      // node-dichte im gleichgewicht bleibt und nicht monoton bis zum limit wächst
      // (verhindert "zu viele striche" + performance-einbruch).
      if (!legacy) {
        const mergeDist = cfg.insertDistance * 0.5;
        for (let li = 0; li < lines.length; li++) {
          lab2PruneShortEdges(lines[li].nodes, mergeDist);
        }
      }

      const total = totalNodes();
      if (total >= cfg.maxNodes) {
        insertStopped = true;
      } else {
        let insertDist = cfg.insertDistance;
        const ratio = total / cfg.maxNodes;
        if (ratio > 0.8) insertDist *= 1 + (ratio - 0.8) * 6;
        // pro frame nur begrenzt viele nodes einfügen — kein plötzlicher schub,
        // der die szene in einem frame vervielfacht.
        const budget = ratio > 0.55
          ? Math.max(1, Math.floor((1 - ratio) * 24))
          : Math.max(8, Math.floor(total * 0.12) + 8);
        for (let li = 0; li < lines.length; li++) {
          lab2InsertLine(lines[li].nodes, insertDist, budget);
        }
      }

    }

    return {
      update() {
        if (totalNodes() === 0) return;
        step();
      },

      draw() {
        p.background(255);
        drawLab2(p, lines, state.lab2.showNodes, lab2StrokeWidth(state.lab2.stroke));
      },

      appendContours(contours) {
        const added = contoursToLab2Lines(contours, lab2Cfg());
        for (let i = 0; i < added.length; i++) lines.push(added[i]);
        insertStopped = false;
      },

      // alles vom canvas entfernen (notfall-/stabilitäts-löschung)
      clearAll() {
        lines = [];
        insertStopped = true;
      },

      nodeCount() {
        return totalNodes();
      },

      getLines() {
        return lines.map((l) => {
          const out = {
            nodes: l.nodes.map((n) => ({ x: n.x, y: n.y })),
          };
          if (l.holes?.length) {
            out.holes = l.holes.map((ring) =>
              ring.map((n) => ({ x: n.x, y: n.y }))
            );
          }
          return out;
        });
      },

      get strokeW() {
        return lab2StrokeWidth(state.lab2.stroke);
      },
    };
  },
};

function drawLab2Compound(p, outer, holes) {
  p.beginShape();
  for (let i = 0; i < outer.length; i++) p.vertex(outer[i].x, outer[i].y);
  for (let hi = 0; hi < holes.length; hi++) {
    const hole = holes[hi];
    if (!hole || hole.length < 2) continue;
    p.beginContour();
    for (let i = hole.length - 1; i >= 0; i--) p.vertex(hole[i].x, hole[i].y);
    p.endContour();
  }
  p.endShape(p.CLOSE);
}

function drawLab2(p, lines, showNodes, strokeW) {
  p.stroke(15);
  p.strokeWeight(strokeW ?? 2);
  p.noFill();
  p.strokeCap(p.ROUND);
  p.strokeJoin(p.ROUND);

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    if (line.holes?.length) {
      drawLab2Compound(p, line.nodes, line.holes);
    } else {
      const nodes = line.nodes;
      if (nodes.length < 2) continue;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        const b = nodes[(i + 1) % nodes.length];
        p.line(a.x, a.y, b.x, b.y);
      }
    }
  }

  if (!showNodes) return;
  p.noStroke();
  p.fill(220, 40, 40);
  for (let li = 0; li < lines.length; li++) {
    const rings = lab2LineRings(lines[li]);
    for (let ri = 0; ri < rings.length; ri++) {
      const nodes = rings[ri];
      const step = nodes.length > 800 ? 2 : 1;
      for (let i = 0; i < nodes.length; i += step) {
        p.circle(nodes[i].x, nodes[i].y, 5);
      }
    }
  }
}

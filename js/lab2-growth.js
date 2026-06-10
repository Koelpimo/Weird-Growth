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

function lab2MaxNodes() {
  return 4000;
}

// start-knoten: grob (wenige) ↔ fein (viele) entlang der kontur
function lab2SeedSpacing(complexity) {
  return lab2Clamp(18 - complexity * 15, 3, 20);
}

// wachstums-schritt — gekoppelt an seed-spacing und split-slider
function lab2InsertDistance(split, seedSpacing) {
  return lab2Clamp(seedSpacing * (1.15 - split * 0.55), 2, 16);
}

function lab2ComputeParams(l2, w, h) {
  const complexity = l2.complexity ?? 0.11;
  const split = l2.split ?? 0.31;
  const maxNodes = lab2MaxNodes(w, h);
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

function lab2Separation(node, neighbors, sepDist, lineNodes) {
  let sx = 0;
  let sy = 0;
  let total = 0;
  for (let i = 0; i < neighbors.length; i++) {
    const other = neighbors[i].data;
    if (other === node) continue;
    const dx = node.x - other.x;
    const dy = node.y - other.y;
    const d = Math.max(Math.hypot(dx, dy), 0.75);
    if (d < sepDist) {
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

function lab2UpdateNode(node, lineNodes, neighbors, bounds, margin, factor) {
  const sep = lab2Separation(node, neighbors, bounds.sepDist, lineNodes);
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
      child.vx = (a.vx + b.vx) * 0.5;
      child.vy = (a.vy + b.vy) * 0.5;
      nodes.splice(insertIndex, 0, child);
      added++;
    }
  }
}

function contoursToLab2Lines(contours, cfg) {
  return contours.map((pts) => ({
    nodes: pts.map((pt) => makeLab2Node(pt.x, pt.y, cfg)),
  }));
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
        const nodes = lines[li].nodes;
        for (let i = 0; i < nodes.length; i++) {
          nodes[i].maxSpeed = cfg.maxSpeed;
          nodes[i].sepMaxForce = cfg.sepMaxForce;
          nodes[i].cohMaxForce = cfg.cohMaxForce;
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
      for (let i = 0; i < lines.length; i++) n += lines[i].nodes.length;
      return n;
    }

    function step() {
      cfg = lab2Cfg();
      syncNodeParams(cfg);
      const factor = clamp(state.speed, 0.2, 5);
      const bounds = { w, h, sepDist: cfg.separationDistance };

      quadtree.clear();
      const all = [];
      for (let li = 0; li < lines.length; li++) {
        const nodes = lines[li].nodes;
        for (let i = 0; i < nodes.length; i++) {
          const nd = nodes[i];
          all.push({ node: nd, lineNodes: nodes });
          quadtree.insert(new Lab2Point(nd.x, nd.y, nd));
        }
      }

      for (let a = 0; a < all.length; a++) {
        const { node, lineNodes } = all[a];
        const neighbors = [];
        quadtree.query(
          new Lab2Circle(node.x, node.y, cfg.separationDistance),
          neighbors
        );
        lab2UpdateNode(node, lineNodes, neighbors, bounds, cfg.margin, factor);
      }

      const total = totalNodes();
      if (total >= cfg.maxNodes) {
        insertStopped = true;
      } else {
        let insertDist = cfg.insertDistance;
        const ratio = total / cfg.maxNodes;
        if (ratio > 0.8) insertDist *= 1 + (ratio - 0.8) * 6;
        const budget = ratio > 0.65 ? Math.max(1, Math.floor((1 - ratio) * 24)) : Infinity;
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
        drawLab2(p, lines, state.lab2.showNodes);
      },

      appendContours(contours) {
        const added = contoursToLab2Lines(contours, lab2Cfg());
        for (let i = 0; i < added.length; i++) lines.push(added[i]);
        insertStopped = false;
      },

      getLines() {
        return lines.map((l) => ({
          nodes: l.nodes.map((n) => ({ x: n.x, y: n.y })),
        }));
      },

      get strokeW() {
        return 2;
      },
    };
  },
};

function drawLab2(p, lines, showNodes) {
  p.stroke(15);
  p.strokeWeight(2);
  p.noFill();
  p.strokeCap(p.ROUND);
  p.strokeJoin(p.ROUND);

  for (let li = 0; li < lines.length; li++) {
    const nodes = lines[li].nodes;
    if (nodes.length < 2) continue;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      const b = nodes[(i + 1) % nodes.length];
      p.line(a.x, a.y, b.x, b.y);
    }
  }

  if (!showNodes) return;
  p.noStroke();
  p.fill(220, 40, 40);
  for (let li = 0; li < lines.length; li++) {
    const nodes = lines[li].nodes;
    const step = nodes.length > 800 ? 2 : 1;
    for (let i = 0; i < nodes.length; i += step) {
      p.circle(nodes[i].x, nodes[i].y, 5);
    }
  }
}

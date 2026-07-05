/**
 * 3D Differential Growth + Depth of Field (inconvergent/weird)
 * Interaktiv: auf die leinwand klicken → knoten im raum setzen → graph wächst.
 */

function diff3Clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function diff3LimitVec3(vx, vy, vz, max) {
  const m = Math.hypot(vx, vy, vz);
  if (m > max && m > 0) return [(vx / m) * max, (vy / m) * max, (vz / m) * max];
  return [vx, vy, vz];
}

function diff3Vec3Sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function diff3Vec3Dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function diff3Vec3Norm(v) {
  const m = Math.hypot(v.x, v.y, v.z);
  if (m < 1e-8) return null;
  return { x: v.x / m, y: v.y / m, z: v.z / m };
}

function diff3Vec3Cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function diff3Vec3Add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function diff3Vec3Scale(v, s) {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function diff3Lerp3(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

function diff3RandInSphere(r) {
  if (r <= 0) return { x: 0, y: 0, z: 0 };
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const rr = r * Math.cbrt(Math.random());
  return {
    x: rr * Math.sin(phi) * Math.cos(theta),
    y: rr * Math.sin(phi) * Math.sin(theta),
    z: rr * Math.cos(phi),
  };
}

function diff3ComputeParams(d3, w, h) {
  const l2 = {
    complexity: d3.complexity ?? 0.11,
    split: d3.split ?? 0.31,
    nodeLimit: d3.nodeLimit ?? 0.2,
    attraction: d3.attraction ?? 0.5,
    repulsion: d3.repulsion ?? 0.5,
    push: 0.5,
  };
  const base = lab2ComputeParams(l2, w, h);
  const depth = d3.depth ?? 0.45;
  const link = d3.link ?? 0.45;
  return {
    ...base,
    depthForce: 0.06 + depth * 0.42,
    zDamp: 0.9 + (1 - depth) * 0.06,
    linkDist: 28 + link * 120,
    relNeighRad: base.separationDistance * (1.6 + link * 0.8),
    dofBlur: 0.35 + (d3.dofBlur ?? 0.5) * 3.8,
    dofExp: 0.85 + (d3.dofExp ?? 0.5) * 1.8,
    dofSamples: 0.5 + (d3.dofSamples ?? 0.5) * 1.2,
    dofFocus: d3.dofFocus ?? 0.5,
    tumble: (d3.tumble ?? 0.35) * 0.0035,
    splatAlpha: 0.055 + (d3.exposure ?? 0.5) * 0.18,
    maxSplatsPerFrame: 14000,
    seedZJitter: 2 + depth * 10,
  };
}

const diff3DepthFmt = (v) => `${Math.round(v * 100)}%`;
const diff3LinkFmt = (v) => `${Math.round(28 + v * 120)} px`;
const diff3DofBlurFmt = (v) => `${Math.round(0.35 + v * 3.8)} px`;
const diff3DofFocusFmt = (v) => `${Math.round(v * 100)}%`;
const diff3TumbleFmt = (v) => `${Math.round(v * 100)}%`;
const diff3ExposureFmt = (v) => `${Math.round(v * 100)}%`;

/* ── orthographic camera ──────────────────────────────── */

class Diff3Ortho {
  constructor(cam, look, up, xy, s) {
    this.cam = { ...cam };
    this.look = { ...look };
    this.up = up;
    this.xy = { x: xy.x, y: xy.y };
    this.s = s;
    this.uRaw = { x: 1, y: 0, z: 0 };
    this.vRaw = { x: 0, y: -1, z: 0 };
    this._rebuild();
  }

  _rebuild() {
    const vpn = diff3Vec3Norm(diff3Vec3Sub(this.cam, this.look));
    if (!vpn) {
      this.vpn = { x: 0, y: 0, z: -1 };
      this.uRaw = { x: 1, y: 0, z: 0 };
      this.vRaw = { x: 0, y: -1, z: 0 };
      this.su = diff3Vec3Scale(this.uRaw, this.s);
      this.sv = diff3Vec3Scale(this.vRaw, this.s);
      return;
    }
    this.vpn = vpn;
    const up = this.up;
    const upProj = diff3Vec3Scale(vpn, diff3Vec3Dot(up, vpn));
    let vRaw = diff3Vec3Norm({
      x: -(up.x - upProj.x),
      y: -(up.y - upProj.y),
      z: -(up.z - upProj.z),
    });
    if (!vRaw) vRaw = diff3Vec3Norm(diff3Vec3Cross({ x: 1, y: 0, z: 0 }, vpn)) || { x: 0, y: -1, z: 0 };
    let uRaw = diff3Vec3Norm(diff3Vec3Cross(vRaw, vpn));
    if (!uRaw) uRaw = { x: 1, y: 0, z: 0 };
    this.uRaw = uRaw;
    this.vRaw = vRaw;
    this.su = diff3Vec3Scale(uRaw, this.s);
    this.sv = diff3Vec3Scale(vRaw, this.s);
  }

  planeDistance(pt) {
    return diff3Vec3Dot(diff3Vec3Sub(pt, this.cam), this.vpn);
  }

  project(pt) {
    const rel = diff3Vec3Sub(pt, this.cam);
    return {
      x: this.xy.x + diff3Vec3Dot(rel, this.su),
      y: this.xy.y + diff3Vec3Dot(rel, this.sv),
      d: this.planeDistance(pt),
    };
  }

  unproject(sx, sy, depth) {
    const d = depth ?? 0;
    const ux = (sx - this.xy.x) / this.s;
    const vy = (sy - this.xy.y) / this.s;
    return diff3Vec3Add(
      diff3Vec3Add(this.cam, diff3Vec3Scale(this.vpn, d)),
      diff3Vec3Add(diff3Vec3Scale(this.uRaw, ux), diff3Vec3Scale(this.vRaw, vy))
    );
  }

  setCam(cam) {
    this.cam = { ...cam };
    this._rebuild();
  }

  setLook(look) {
    this.look = { ...look };
    this._rebuild();
  }
}

/* ── 3D graph ─────────────────────────────────────────── */

function makeDiff3Node(x, y, z, cfg) {
  return {
    x,
    y,
    z,
    seedX: x,
    seedY: y,
    seedZ: z,
    vx: 0,
    vy: 0,
    vz: 0,
    maxSpeed: cfg.maxSpeed,
    sepMaxForce: cfg.sepMaxForce,
    cohMaxForce: cfg.cohMaxForce,
  };
}

function diff3EdgeKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function diff3ParseEdgeKey(key) {
  const p = key.split("|");
  return [parseInt(p[0], 10), parseInt(p[1], 10)];
}

function diff3BuildAdj(edges) {
  const adj = new Map();
  for (const key of edges) {
    const [a, b] = diff3ParseEdgeKey(key);
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a).push(b);
    adj.get(b).push(a);
  }
  return adj;
}

function diff3HashKey(x, y, z, cell) {
  const ix = Math.floor(x / cell) + 512;
  const iy = Math.floor(y / cell) + 512;
  const iz = Math.floor(z / cell) + 512;
  return ix * 4096 * 4096 + iy * 4096 + iz;
}

const DIFF3_NEIGHBOR3 = (() => {
  const keys = [];
  for (let dz = -1; dz <= 1; dz++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        keys.push(dx * 4096 * 4096 + dy * 4096 + dz);
      }
    }
  }
  return keys;
})();

function diff3QueryGrid(grid, cell, node) {
  const out = [];
  const cx = Math.floor(node.x / cell) + 512;
  const cy = Math.floor(node.y / cell) + 512;
  const cz = Math.floor(node.z / cell) + 512;
  const base = cx * 4096 * 4096 + cy * 4096 + cz;
  for (let i = 0; i < DIFF3_NEIGHBOR3.length; i++) {
    const arr = grid.get(base + DIFF3_NEIGHBOR3[i]);
    if (!arr) continue;
    for (let j = 0; j < arr.length; j++) out.push(arr[j]);
  }
  return out;
}

function diff3IsRelNeigh(nodes, u, v, near) {
  const du = Math.hypot(nodes[u].x - nodes[v].x, nodes[u].y - nodes[v].y, nodes[u].z - nodes[v].z);
  let c = 0;
  for (let i = 0; i < near.length; i++) {
    const w = near[i];
    if (w === u || w === v) continue;
    const dw = Math.max(
      Math.hypot(nodes[u].x - nodes[w].x, nodes[u].y - nodes[w].y, nodes[u].z - nodes[w].z),
      Math.hypot(nodes[v].x - nodes[w].x, nodes[v].y - nodes[w].y, nodes[v].z - nodes[w].z)
    );
    if (dw <= du + 1e-4) c++;
    if (c > 1) return false;
  }
  return true;
}

function diff3ConnectRelNeigh(nodes, edges, newIdx, rad) {
  const near = [];
  for (let i = 0; i < nodes.length; i++) {
    if (i === newIdx) continue;
    const d = Math.hypot(
      nodes[i].x - nodes[newIdx].x,
      nodes[i].y - nodes[newIdx].y,
      nodes[i].z - nodes[newIdx].z
    );
    if (d <= rad) near.push(i);
  }
  for (let i = 0; i < near.length; i++) {
    const u = near[i];
    if (u >= newIdx) continue;
    if (diff3IsRelNeigh(nodes, u, newIdx, near)) {
      edges.add(diff3EdgeKey(u, newIdx));
    }
  }
}

function diff3ConnectNewNode(nodes, edges, newIdx, cfg) {
  if (newIdx <= 0) return;
  edges.add(diff3EdgeKey(newIdx - 1, newIdx));
  for (let i = 0; i < newIdx; i++) {
    const na = nodes[i];
    const nb = nodes[newIdx];
    const d = Math.hypot(nb.x - na.x, nb.y - na.y, nb.z - na.z);
    if (d <= cfg.linkDist) edges.add(diff3EdgeKey(i, newIdx));
  }
  diff3ConnectRelNeigh(nodes, edges, newIdx, cfg.relNeighRad);
}

function diff3Separation(node, neighborIdx, nodes, sepDist) {
  let sx = 0;
  let sy = 0;
  let sz = 0;
  let count = 0;
  for (let i = 0; i < neighborIdx.length; i++) {
    const other = nodes[neighborIdx[i]];
    const dx = node.x - other.x;
    const dy = node.y - other.y;
    const dz = node.z - other.z;
    const d = Math.hypot(dx, dy, dz);
    if (d < 0.5 || d >= sepDist) continue;
    const push = Math.min((sepDist - d) / d, 3.5);
    sx += (dx / d) * push;
    sy += (dy / d) * push;
    sz += (dz / d) * push;
    count++;
  }
  if (count === 0) return { x: 0, y: 0, z: 0 };
  sx /= count;
  sy /= count;
  sz /= count;
  const m = Math.hypot(sx, sy, sz) || 1;
  sx = (sx / m) * node.maxSpeed;
  sy = (sy / m) * node.maxSpeed;
  sz = (sz / m) * node.maxSpeed;
  let fx = sx - node.vx;
  let fy = sy - node.vy;
  let fz = sz - node.vz;
  [fx, fy, fz] = diff3LimitVec3(fx, fy, fz, node.sepMaxForce);
  return { x: fx, y: fy, z: fz };
}

function diff3GraphCohesion(node, adjList, nodes) {
  if (!adjList || adjList.length === 0) return { x: 0, y: 0, z: 0 };
  let tx = 0;
  let ty = 0;
  let tz = 0;
  for (let i = 0; i < adjList.length; i++) {
    const o = nodes[adjList[i]];
    tx += o.x;
    ty += o.y;
    tz += o.z;
  }
  tx /= adjList.length;
  ty /= adjList.length;
  tz /= adjList.length;
  let dx = tx - node.x;
  let dy = ty - node.y;
  let dz = tz - node.z;
  const m = Math.hypot(dx, dy, dz) || 1;
  dx = (dx / m) * node.maxSpeed;
  dy = (dy / m) * node.maxSpeed;
  dz = (dz / m) * node.maxSpeed;
  let fx = dx - node.vx;
  let fy = dy - node.vy;
  let fz = dz - node.vz;
  [fx, fy, fz] = diff3LimitVec3(fx, fy, fz, node.cohMaxForce);
  return { x: fx, y: fy, z: fz };
}

function diff3SplitEdges(nodes, edges, insertDist, budget, cfg) {
  const cap = budget == null ? Infinity : budget;
  let added = 0;
  const list = Array.from(edges);
  for (let ei = 0; ei < list.length; ei++) {
    if (added >= cap) break;
    const [a, b] = diff3ParseEdgeKey(list[ei]);
    if (a >= nodes.length || b >= nodes.length) continue;
    const na = nodes[a];
    const nb = nodes[b];
    const dx = nb.x - na.x;
    const dy = nb.y - na.y;
    const dz = nb.z - na.z;
    const d = Math.hypot(dx, dy, dz);
    if (d <= insertDist) continue;
    const mid = makeDiff3Node(na.x + dx * 0.5, na.y + dy * 0.5, na.z + dz * 0.5, cfg);
    mid.seedX = (na.seedX + nb.seedX) * 0.5;
    mid.seedY = (na.seedY + nb.seedY) * 0.5;
    mid.seedZ = (na.seedZ + nb.seedZ) * 0.5;
    const m = nodes.length;
    nodes.push(mid);
    edges.delete(list[ei]);
    edges.add(diff3EdgeKey(a, m));
    edges.add(diff3EdgeKey(m, b));
    added++;
  }
}

function diff3SceneBounds(nodes) {
  if (!nodes.length) {
    return { cx: 0, cy: 0, cz: 0, span: 120 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.z < minZ) minZ = n.z;
    if (n.x > maxX) maxX = n.x;
    if (n.y > maxY) maxY = n.y;
    if (n.z > maxZ) maxZ = n.z;
  }
  const cx = (minX + maxX) * 0.5;
  const cy = (minY + maxY) * 0.5;
  const cz = (minZ + maxZ) * 0.5;
  const span = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 80);
  return { cx, cy, cz, span };
}

function diff3SerializeGraph(nodes, edges) {
  return {
    nodes: nodes.map((n) => ({ x: n.x, y: n.y, z: n.z })),
    edges: Array.from(edges),
  };
}

function diff3LoadGraph(data, cfg) {
  const nodes = (data?.nodes || []).map((p) => makeDiff3Node(p.x, p.y, p.z, cfg));
  const edges = new Set(data?.edges || []);
  if (nodes.length > 1 && edges.size === 0) {
    for (let i = 1; i < nodes.length; i++) diff3ConnectNewNode(nodes, edges, i, cfg);
  }
  return { nodes, edges };
}

/* ── rendering ──────────────────────────────────────────── */

function diff3DrawGraph(p, nodes, edges, cam, showNodes, strokeW) {
  const sw = strokeW ?? 2;
  p.stroke(15);
  p.strokeWeight(sw);
  p.noFill();
  p.strokeCap(p.ROUND);
  p.strokeJoin(p.ROUND);
  for (const key of edges) {
    const [a, b] = diff3ParseEdgeKey(key);
    if (a >= nodes.length || b >= nodes.length) continue;
    const pa = cam.project(nodes[a]);
    const pb = cam.project(nodes[b]);
    if (Number.isFinite(pa.x) && Number.isFinite(pb.x)) {
      p.line(pa.x, pa.y, pb.x, pb.y);
    }
  }
  if (!showNodes) return;
  p.noStroke();
  p.fill(15);
  for (let i = 0; i < nodes.length; i++) {
    const pr = cam.project(nodes[i]);
    if (Number.isFinite(pr.x)) p.circle(pr.x, pr.y, 5);
  }
}

/* ── mode ─────────────────────────────────────────────── */

const Diff3GrowthMode = {
  desc:
    "3D differential growth — klicken setzt knoten, linien verbinden das netz. schwarz-weiß, ohne dof-rauschen.",

  fmtA: diff3DofFocusFmt,
  fmtB: diff3DofBlurFmt,
  fmtC: diff3DepthFmt,

  create(p, helpers) {
    const { state, clamp } = helpers;
    const w = p.width;
    const h = p.height;
    let t = 0;
    let focus = { x: w * 0.5, y: h * 0.5, z: 0 };

    function cfg() {
      return diff3ComputeParams(state.diff3d, w, h);
    }

    let c = cfg();
    let graph = diff3LoadGraph(state.diff3d.graph, c);
    let { nodes, edges } = graph;
    let cam = new Diff3Ortho(
      { x: w * 0.5, y: h * 0.35, z: 280 },
      { x: w * 0.5, y: h * 0.5, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: w * 0.5, y: h * 0.5 },
      1
    );

    function syncNodeParams(nc) {
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].maxSpeed = nc.maxSpeed;
        nodes[i].sepMaxForce = nc.sepMaxForce;
        nodes[i].cohMaxForce = nc.cohMaxForce;
      }
    }

    function persistGraph() {
      state.diff3d.graph = diff3SerializeGraph(nodes, edges);
    }

    function updateCamera(nc) {
      const b = diff3SceneBounds(nodes);
      const cx = nodes.length ? b.cx : focus.x;
      const cy = nodes.length ? b.cy : focus.y;
      const cz = nodes.length ? b.cz : focus.z;
      const span = nodes.length ? b.span : 120;
      const yaw = t * nc.tumble * 50 + 0.55;
      const pitch = 0.32 + Math.sin(t * nc.tumble * 20) * 0.1;
      const dist = span * 1.45;
      cam.setCam({
        x: cx + dist * Math.cos(pitch) * Math.sin(yaw),
        y: cy + dist * Math.cos(pitch) * Math.cos(yaw),
        z: cz + dist * Math.sin(pitch),
      });
      cam.setLook({ x: cx, y: cy, z: cz });
      cam.xy = { x: w * 0.5, y: h * 0.5 };
      cam.s = Math.min(w, h) / (span * 1.05);
      cam._rebuild();
      return { cx, cy, cz, span };
    }

    function addNodeAtScreen(sx, sy) {
      c = cfg();
      updateCamera(c);
      const depth = cam.planeDistance(focus);
      const pt = cam.unproject(sx, sy, depth);
      const jitter = c.seedZJitter;
      pt.z += (Math.random() - 0.5) * jitter;
      const node = makeDiff3Node(pt.x, pt.y, pt.z, c);
      node.seedX = pt.x;
      node.seedY = pt.y;
      node.seedZ = pt.z;
      const idx = nodes.length;
      nodes.push(node);

      if (nodes.length > 1) {
        diff3ConnectNewNode(nodes, edges, idx, c);
      }

      persistGraph();
      return idx;
    }

    function step() {
      if (nodes.length === 0) return;
      c = cfg();
      syncNodeParams(c);
      const factor = clamp(state.speed, 0.2, 8);
      const adj = diff3BuildAdj(edges);
      const cell = c.separationDistance * 0.85;
      const grid = new Map();

      for (let i = 0; i < nodes.length; i++) {
        const key = diff3HashKey(nodes[i].x, nodes[i].y, nodes[i].z, cell);
        let arr = grid.get(key);
        if (!arr) grid.set(key, (arr = []));
        arr.push(i);
      }

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const near = diff3QueryGrid(grid, cell, node);
        const sep = diff3Separation(node, near, nodes, c.separationDistance);
        const coh = diff3GraphCohesion(node, adj.get(i), nodes);
        node.vx += sep.x + coh.x;
        node.vy += sep.y + coh.y;
        node.vz += sep.z + coh.z;
        [node.vx, node.vy, node.vz] = diff3LimitVec3(node.vx, node.vy, node.vz, node.maxSpeed);
        node.vx *= 0.92;
        node.vy *= 0.92;
        node.vz *= c.zDamp;
        node.x += node.vx * factor;
        node.y += node.vy * factor;
        node.z += node.vz * factor;
        if (!Number.isFinite(node.x)) {
          node.x = node.seedX;
          node.y = node.seedY;
          node.z = node.seedZ;
          node.vx = node.vy = node.vz = 0;
        }
      }

      if (nodes.length < c.maxNodes) {
        const ratio = nodes.length / c.maxNodes;
        let insertDist = c.insertDistance;
        if (ratio > 0.8) insertDist *= 1 + (ratio - 0.8) * 5;
        const budget = ratio > 0.65 ? Math.max(1, Math.floor((1 - ratio) * 24)) : Infinity;
        diff3SplitEdges(nodes, edges, insertDist, budget, c);
      }
    }

    return {
      update() {
        if (nodes.length === 0) return;
        t += 1;
        step();
        if (t % 12 === 0) persistGraph();
      },

      draw() {
        const nc = cfg();
        updateCamera(nc);
        p.background(255);

        if (nodes.length === 0) {
          p.fill(120);
          p.noStroke();
          p.textAlign(p.CENTER, p.CENTER);
          p.textSize(15);
          p.text("klicken um knoten zu setzen", w * 0.5, h * 0.5 - 12);
          p.textSize(12);
          p.fill(160);
          p.text("mehrere klicks bauen ein wachsendes 3D-netz", w * 0.5, h * 0.5 + 14);
          return;
        }

        diff3DrawGraph(p, nodes, edges, cam, !!state.diff3d.showNodes, 2);
      },

      addNodeAtScreen(sx, sy) {
        return addNodeAtScreen(sx, sy);
      },

      clearGraph() {
        nodes.length = 0;
        edges.clear();
        state.diff3d.graph = null;
      },

      getLines() {
        updateCamera(cfg());
        const out = [];
        for (const key of edges) {
          const [a, b] = diff3ParseEdgeKey(key);
          if (a >= nodes.length || b >= nodes.length) continue;
          const pa = cam.project(nodes[a]);
          const pb = cam.project(nodes[b]);
          out.push({
            nodes: [
              { x: pa.x, y: pa.y },
              { x: pb.x, y: pb.y },
            ],
          });
        }
        return out;
      },

      get strokeW() {
        return 1.5;
      },

      totalNodes() {
        return nodes.length;
      },
    };
  },
};

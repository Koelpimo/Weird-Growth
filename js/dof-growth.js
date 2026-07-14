/**
 * 3D Web — differential growth auf einer rotierenden kugel.
 * klick setzt knoten auf der kugeloberfläche; abstoßung + cohesion + kanten-
 * unterteilung wie bei differential growth. die kugel dreht sich langsam.
 */

const dofDepthFmt = (v) => `${Math.round(v * 100)}%`;
const dofLinkFmt = (v) => {
  const insertArc = 12;
  return `${Math.round(insertArc * (1.8 + v * 2.2))} px`;
};
const dofTumbleFmt = (v) => `${Math.round(v * 100)}%`;

function dofSphereRadius(w, h) {
  return Math.min(w, h) * 0.36;
}

function dofSphereCenter(w, h) {
  return { x: w * 0.5, y: h * 0.5, z: 0 };
}

function dofProjectToSphere(px, py, pz, center, radius) {
  const dx = px - center.x;
  const dy = py - center.y;
  const dz = pz - center.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  return {
    x: center.x + (dx / len) * radius,
    y: center.y + (dy / len) * radius,
    z: center.z + (dz / len) * radius,
  };
}

function dofSphereNormal(node, center) {
  const nx = node.x - center.x;
  const ny = node.y - center.y;
  const nz = node.z - center.z;
  const len = Math.hypot(nx, ny, nz) || 1;
  return { x: nx / len, y: ny / len, z: nz / len };
}

function dofTangentForce(fx, fy, fz, normal) {
  const dot = fx * normal.x + fy * normal.y + fz * normal.z;
  return {
    x: fx - dot * normal.x,
    y: fy - dot * normal.y,
    z: fz - dot * normal.z,
  };
}

function dofArcDistance(a, b, center, radius) {
  const na = dofSphereNormal(a, center);
  const nb = dofSphereNormal(b, center);
  const dot = diff3Clamp(na.x * nb.x + na.y * nb.y + na.z * nb.z, -1, 1);
  return Math.acos(dot) * radius;
}

function dofChordDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function dofMidOnSphere(a, b, center, radius) {
  return dofProjectToSphere(
    (a.x + b.x) * 0.5,
    (a.y + b.y) * 0.5,
    (a.z + b.z) * 0.5,
    center,
    radius
  );
}

function dofRotateVec(v, rotY, rotX) {
  let x = v.x;
  let y = v.y;
  let z = v.z;
  const cy = Math.cos(rotY);
  const sy = Math.sin(rotY);
  let nx = x * cy - z * sy;
  let nz = x * sy + z * cy;
  x = nx;
  z = nz;
  const cx = Math.cos(rotX);
  const sx = Math.sin(rotX);
  const ny = y * cx - z * sx;
  nz = y * sx + z * cx;
  return { x, y: ny, z: nz };
}

function dofRotateAboutCenter(pt, center, rotY, rotX) {
  const local = { x: pt.x - center.x, y: pt.y - center.y, z: pt.z - center.z };
  const r = dofRotateVec(local, rotY, rotX);
  return { x: center.x + r.x, y: center.y + r.y, z: center.z + r.z };
}

function dofPickOnSphere(cam, sx, sy, center, radius) {
  const dLook = cam.planeDistance(center);
  const span = radius * 4;
  const p0 = cam.unproject(sx, sy, dLook - span);
  const p1 = cam.unproject(sx, sy, dLook + span);
  const rdx = p1.x - p0.x;
  const rdy = p1.y - p0.y;
  const rdz = p1.z - p0.z;
  const rlen = Math.hypot(rdx, rdy, rdz) || 1;
  const ux = rdx / rlen;
  const uy = rdy / rlen;
  const uz = rdz / rlen;
  const ox = p0.x - center.x;
  const oy = p0.y - center.y;
  const oz = p0.z - center.z;
  const b = 2 * (ox * ux + oy * uy + oz * uz);
  const c = ox * ox + oy * oy + oz * oz - radius * radius;
  const disc = b * b - 4 * c;
  if (disc < 0) {
    return dofProjectToSphere(center.x, center.y, center.z + radius, center, radius);
  }
  const s = Math.sqrt(disc);
  let t = (-b - s) * 0.5;
  if (t < 0) t = (-b + s) * 0.5;
  if (t < 0) return dofProjectToSphere(center.x, center.y, center.z + radius, center, radius);
  return dofProjectToSphere(
    p0.x + ux * t,
    p0.y + uy * t,
    p0.z + uz * t,
    center,
    radius
  );
}

function dofDrawSphereGuide(p, cam, center, radius) {
  const segments = 88;
  const vpn = diff3Vec3Norm(cam.vpn || { x: 0, y: 0, z: -1 });
  let axisU = diff3Vec3Cross(vpn, { x: 0, y: 1, z: 0 });
  if (Math.hypot(axisU.x, axisU.y, axisU.z) < 1e-4) {
    axisU = diff3Vec3Cross(vpn, { x: 1, y: 0, z: 0 });
  }
  axisU = diff3Vec3Norm(axisU) || { x: 1, y: 0, z: 0 };
  const axisV = diff3Vec3Norm(diff3Vec3Cross(vpn, axisU)) || { x: 0, y: 1, z: 0 };

  p.noFill();
  p.strokeWeight(1);

  function drawRing(ringCenter, ringU, ringV, ringR, frontOnly) {
    let prev = null;
    let prevOk = false;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const cu = Math.cos(a);
      const cv = Math.sin(a);
      const pt = {
        x: ringCenter.x + (ringU.x * cu + ringV.x * cv) * ringR,
        y: ringCenter.y + (ringU.y * cu + ringV.y * cv) * ringR,
        z: ringCenter.z + (ringU.z * cu + ringV.z * cv) * ringR,
      };
      const facing = (pt.x - center.x) * vpn.x
        + (pt.y - center.y) * vpn.y
        + (pt.z - center.z) * vpn.z <= radius * 0.04;
      const pr = cam.project(pt);
      const ok = Number.isFinite(pr.x) && Number.isFinite(pr.y) && (!frontOnly || facing);
      if (ok && prevOk && prev) p.line(prev.x, prev.y, pr.x, pr.y);
      prev = ok ? pr : null;
      prevOk = ok;
    }
  }

  // nur die sichtbare außenkontur — ein einzelner kreis
  p.stroke(190);
  drawRing(center, axisU, axisV, radius, false);
}

function dofSnapNodesToSphere(nodes, center, radius) {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const p = dofProjectToSphere(n.x, n.y, n.z, center, radius);
    n.x = p.x;
    n.y = p.y;
    n.z = p.z;
    n.seedX = p.x;
    n.seedY = p.y;
    n.seedZ = p.z;
  }
}

function dofComputeParams(dof, w, h, speed) {
  const split = dof.split ?? 0.31;
  const complexity = dof.complexity ?? 0.11;
  const seedSpacing = lab2SeedSpacing(complexity);
  const insertArc = diff3Clamp(seedSpacing * (1.15 - split * 0.55), 4, 22);
  const center = dofSphereCenter(w, h);
  const radius = dofSphereRadius(w, h);
  const maxNodes = lab2MaxNodes(dof);
  const tempo = diff3Clamp(speed ?? 4, 0.2, 8);
  return {
    maxNodes,
    insertDistance: insertArc,
    separationDistance: insertArc * 2,
    sphereRadius: radius,
    sphereCenter: center,
    maxSpeed: 0.35 + (dof.attraction ?? 0.5) * 1.0,
    sepMaxForce: 0.35 + (dof.repulsion ?? 0.5) * 1.65,
    cohMaxForce: 0.35 + (dof.attraction ?? 0.5) * 1.65,
    linkDist: insertArc * (1.8 + (dof.link ?? 0.4) * 2.2),
    relNeighRad: insertArc * (2.5 + (dof.link ?? 0.4) * 2.5),
    tumbleY: (dof.tumble ?? 0.4) * 0.014,
    tumbleX: (dof.tumble ?? 0.4) * 0.005,
    splitBudgetMax: Math.max(1, Math.min(16, Math.round(tempo * 3))),
    splitEvery: tempo < 1 ? 2 : 1,
    zDamp: 1,
    seedZJitter: 0,
  };
}

function dofSeparationOnSphere(node, neighborIdx, nodes, sepDist, center, radius) {
  let sx = 0;
  let sy = 0;
  let sz = 0;
  let count = 0;
  const normal = dofSphereNormal(node, center);

  for (let i = 0; i < neighborIdx.length; i++) {
    const other = nodes[neighborIdx[i]];
    const arc = dofArcDistance(node, other, center, radius);
    if (arc < 0.4 || arc >= sepDist) continue;
    const dx = node.x - other.x;
    const dy = node.y - other.y;
    const dz = node.z - other.z;
    const chord = Math.hypot(dx, dy, dz) || 0.5;
    const push = Math.min((sepDist - arc) / chord, 3.5);
    sx += (dx / chord) * push;
    sy += (dy / chord) * push;
    sz += (dz / chord) * push;
    count++;
  }

  if (count === 0) return { x: 0, y: 0, z: 0 };
  sx /= count;
  sy /= count;
  sz /= count;
  const tan = dofTangentForce(sx, sy, sz, normal);
  const m = Math.hypot(tan.x, tan.y, tan.z) || 1;
  const tx = (tan.x / m) * node.maxSpeed;
  const ty = (tan.y / m) * node.maxSpeed;
  const tz = (tan.z / m) * node.maxSpeed;
  let fx = tx - node.vx;
  let fy = ty - node.vy;
  let fz = tz - node.vz;
  [fx, fy, fz] = diff3LimitVec3(fx, fy, fz, node.sepMaxForce);
  return { x: fx, y: fy, z: fz };
}

function dofCohesionOnSphere(node, adjList, nodes, center) {
  if (!adjList || adjList.length === 0) return { x: 0, y: 0, z: 0 };
  const normal = dofSphereNormal(node, center);
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
  const tan = dofTangentForce(dx, dy, dz, normal);
  const m = Math.hypot(tan.x, tan.y, tan.z) || 1;
  dx = (tan.x / m) * node.maxSpeed;
  dy = (tan.y / m) * node.maxSpeed;
  dz = (tan.z / m) * node.maxSpeed;
  let fx = dx - node.vx;
  let fy = dy - node.vy;
  let fz = dz - node.vz;
  [fx, fy, fz] = diff3LimitVec3(fx, fy, fz, node.cohMaxForce);
  return { x: fx, y: fy, z: fz };
}

function dofSplitEdgesOnSphere(nodes, edges, insertDist, budget, cfg) {
  const cap = budget == null ? Infinity : budget;
  const center = cfg.sphereCenter;
  const radius = cfg.sphereRadius;
  let added = 0;
  const list = Array.from(edges);
  for (let ei = 0; ei < list.length; ei++) {
    if (added >= cap) break;
    const [a, b] = diff3ParseEdgeKey(list[ei]);
    if (a >= nodes.length || b >= nodes.length) continue;
    const na = nodes[a];
    const nb = nodes[b];
    const arc = dofArcDistance(na, nb, center, radius);
    if (arc <= insertDist) continue;
    const mid = dofMidOnSphere(na, nb, center, radius);
    const child = makeDiff3Node(mid.x, mid.y, mid.z, cfg);
    child.seedX = mid.x;
    child.seedY = mid.y;
    child.seedZ = mid.z;
    const m = nodes.length;
    nodes.push(child);
    edges.delete(list[ei]);
    edges.add(diff3EdgeKey(a, m));
    edges.add(diff3EdgeKey(m, b));
    added++;
  }
}

function dofConnectOnSphere(nodes, edges, newIdx, cfg) {
  if (newIdx <= 0) return;
  const center = cfg.sphereCenter;
  const radius = cfg.sphereRadius;
  edges.add(diff3EdgeKey(newIdx - 1, newIdx));
  for (let i = 0; i < newIdx; i++) {
    const arc = dofArcDistance(nodes[i], nodes[newIdx], center, radius);
    if (arc <= cfg.linkDist) edges.add(diff3EdgeKey(i, newIdx));
  }
  diff3ConnectRelNeigh(nodes, edges, newIdx, cfg.relNeighRad);
}

const DofGrowthMode = {
  desc:
    "3D Web — differential growth auf einer rotierenden kugel. klick setzt knoten, das netz wächst organisch über abstoßung und kanten-unterteilung.",

  fmtA: dofLinkFmt,
  fmtB: dofTumbleFmt,
  fmtC: dofDepthFmt,

  create(p, helpers) {
    const { state, clamp } = helpers;
    let t = 0;

    function cfg() {
      return dofComputeParams(state.dof, p.width, p.height, state.speed);
    }

    let c = cfg();
    let graph = diff3LoadGraph(state.dof.graph, c);
    let { nodes, edges } = graph;
    dofSnapNodesToSphere(nodes, c.sphereCenter, c.sphereRadius);

    let cam = new Diff3Ortho(
      { x: p.width * 0.5, y: p.height * 0.35, z: 280 },
      { x: p.width * 0.5, y: p.height * 0.5, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: p.width * 0.5, y: p.height * 0.5 },
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
      state.dof.graph = diff3SerializeGraph(nodes, edges);
    }

    function updateCamera(nc) {
      const center = nc.sphereCenter;
      const R = nc.sphereRadius;
      cam.setCam({ x: center.x, y: center.y, z: R * 2.85 });
      cam.setLook({ x: center.x, y: center.y, z: center.z });
      cam.xy = { x: p.width * 0.5, y: p.height * 0.5 };
      cam.s = Math.min(p.width, p.height) / (R * 2.15);
      cam._rebuild();
    }

    function rotateSphere(nc) {
      const center = nc.sphereCenter;
      const rotY = nc.tumbleY;
      const rotX = nc.tumbleX;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const p = dofRotateAboutCenter(n, center, rotY, rotX);
        n.x = p.x;
        n.y = p.y;
        n.z = p.z;
        const v = dofRotateVec({ x: n.vx, y: n.vy, z: n.vz }, rotY, rotX);
        n.vx = v.x;
        n.vy = v.y;
        n.vz = v.z;
        const s = dofRotateAboutCenter({ x: n.seedX, y: n.seedY, z: n.seedZ }, center, rotY, rotX);
        n.seedX = s.x;
        n.seedY = s.y;
        n.seedZ = s.z;
      }
    }

    function addNodeAtScreen(sx, sy) {
      c = cfg();
      updateCamera(c);
      const pt = dofPickOnSphere(cam, sx, sy, c.sphereCenter, c.sphereRadius);
      const node = makeDiff3Node(pt.x, pt.y, pt.z, c);
      node.seedX = pt.x;
      node.seedY = pt.y;
      node.seedZ = pt.z;
      const idx = nodes.length;
      nodes.push(node);
      if (nodes.length > 1) dofConnectOnSphere(nodes, edges, idx, c);
      persistGraph();
      return idx;
    }

    function step() {
      if (nodes.length === 0) return;
      c = cfg();
      syncNodeParams(c);
      const factor = clamp(state.speed, 0.2, 8);
      const center = c.sphereCenter;
      const radius = c.sphereRadius;
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
        const sep = dofSeparationOnSphere(node, near, nodes, c.separationDistance, center, radius);
        const coh = dofCohesionOnSphere(node, adj.get(i), nodes, center);
        node.vx += sep.x + coh.x;
        node.vy += sep.y + coh.y;
        node.vz += sep.z + coh.z;
        [node.vx, node.vy, node.vz] = diff3LimitVec3(node.vx, node.vy, node.vz, node.maxSpeed);
        node.vx *= 0.92;
        node.vy *= 0.92;
        node.vz *= 0.92;

        const normal = dofSphereNormal(node, center);
        const tan = dofTangentForce(node.vx, node.vy, node.vz, normal);
        node.vx = tan.x;
        node.vy = tan.y;
        node.vz = tan.z;

        node.x += node.vx * factor;
        node.y += node.vy * factor;
        node.z += node.vz * factor;

        const snapped = dofProjectToSphere(node.x, node.y, node.z, center, radius);
        node.x = snapped.x;
        node.y = snapped.y;
        node.z = snapped.z;

        if (!Number.isFinite(node.x)) {
          node.x = node.seedX;
          node.y = node.seedY;
          node.z = node.seedZ;
          node.vx = node.vy = node.vz = 0;
        }
      }

      if (t % c.splitEvery === 0 && nodes.length < c.maxNodes) {
        const ratio = nodes.length / c.maxNodes;
        let insertDist = c.insertDistance;
        if (ratio > 0.8) insertDist *= 1 + (ratio - 0.8) * 6;
        let budget = c.splitBudgetMax;
        if (ratio > 0.65) budget = Math.min(budget, Math.max(2, Math.floor((1 - ratio) * 20)));
        dofSplitEdgesOnSphere(nodes, edges, insertDist, budget, c);
      }

      rotateSphere(c);
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

        dofDrawSphereGuide(p, cam, nc.sphereCenter, nc.sphereRadius);

        if (nodes.length === 0) {
          p.fill(120);
          p.noStroke();
          p.textAlign(p.CENTER, p.CENTER);
          p.textSize(15);
          p.text("klicken um knoten auf der kugel zu setzen", p.width * 0.5, p.height * 0.5 - 12);
          p.textSize(12);
          p.fill(160);
          p.text("mehrere klicks → differential growth auf der rotierenden sphäre", p.width * 0.5, p.height * 0.5 + 14);
          return;
        }

        const showNodes = !!state.dof.showNodes || nodes.length < 4;
        diff3DrawGraph(p, nodes, edges, cam, showNodes, lab2StrokeWidth(state.dof.stroke));
      },

      addNodeAtScreen(sx, sy) {
        return addNodeAtScreen(sx, sy);
      },

      clearGraph() {
        nodes.length = 0;
        edges.clear();
        state.dof.graph = null;
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
        return lab2StrokeWidth(state.dof.stroke);
      },

      totalNodes() {
        return nodes.length;
      },
    };
  },
};

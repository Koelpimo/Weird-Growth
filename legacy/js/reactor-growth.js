/**
 * REACTOR — typereactor.xyz Physik (path.js / node.js)
 */

const REACTOR_SUBDIVIDE_FACTOR = 1.05;
const REACTOR_MAX_INSERT_PER_EDGE = 2;
const REACTOR_MAX_GROWTH_SPLITS = 4;
const REACTOR_MAX_CONSERVATIVE_SPLITS = 3;

const ReactorGrowthMode = {
  desc:
    "Typereactor — Krümmungswachstum, Separation (1/d²), Fillet, Kantenteilung. Gefüllte Blobs mit ausgeschnittenen Löchern.",

  fmtA: (v) => `${Math.round(6 + v * 14)} px`,
  fmtB: (v) => `${Math.round(14 + v * 36)} px`,
  fmtC: (v) => `${Math.round(5 + v * 18)} px`,

  create(p, helpers) {
    const {
      state,
      clamp,
      growthParams,
      buildReactorContours,
      sanitizeReactorContours,
      classifyContoursAsHoles,
      contourCentroid,
      pointInPolygon,
    } = helpers;

    const w = p.width;
    const h = p.height;
    const bounds = { w, h };
    const maxTotalNodes = 3000;
    const gp0 = growthParams();
    const paths = buildReactorContours(w, h, gp0.maxEdge).map((c, pi) =>
      createReactorPath(c.pts, mapReactorParams(gp0, state), pi, c.isHole)
    );

    function totalNodes() {
      let n = 0;
      for (let i = 0; i < paths.length; i++) n += paths[i].nodes.length;
      return n;
    }

    function allNodes() {
      const out = [];
      for (let i = 0; i < paths.length; i++) {
        const nodes = paths[i].nodes;
        for (let j = 0; j < nodes.length; j++) out.push(nodes[j]);
      }
      return out;
    }

    return {
      update() {
        if (totalNodes() >= maxTotalNodes) return;
        const gp = growthParams();
        const speedMul = clamp(state.speed, 0.2, 3);
        const params = mapReactorParams(gp, state);

        for (let i = 0; i < paths.length; i++) syncReactorPathParams(paths[i], params);

        const nodes = allNodes();
        for (let i = 0; i < paths.length; i++) paths[i].computeForces(nodes, speedMul);
        for (let i = 0; i < paths.length; i++) paths[i].applyUpdates(speedMul);

        applyReactorAntiCollapse(paths, speedMul);
        clampReactorPathsToDisplay(paths, bounds, gp.strokeW);
      },

      draw() {
        p.background(255);
        drawReactorPaths(p, paths, { contourCentroid, pointInPolygon });
      },

      appendContours(contours) {
        const gp = growthParams();
        const safe = sanitizeReactorContours(classifyContoursAsHoles(contours), w, h);
        const params = mapReactorParams(gp, state);
        for (let i = 0; i < safe.length; i++) {
          paths.push(createReactorPath(safe[i].pts, params, paths.length, safe[i].isHole));
        }
      },

      getLines() {
        return paths.map((path) => ({
          nodes: path.nodes.map((n) => ({ x: n.pos.x, y: n.pos.y })),
        }));
      },

      get strokeW() {
        return growthParams().strokeW;
      },
    };
  },
};

function mapReactorParams(gp, state) {
  return {
    maxEdgeLength: gp.maxEdge,
    desiredSeparation: gp.clearance,
    separationForce: 0.75 + state.b * 0.85,
    concaveGrowth: 1.5,
    convexGrowth: -0.28,
    filletRadius: 0.4 + state.a * 0.28,
    filletIterations: 1,
    seedRetention: 0.14,
    blobOutward: 0.055,
  };
}

function syncReactorPathParams(path, params) {
  path.maxEdgeLength = params.maxEdgeLength;
  path.desiredSeparation = params.desiredSeparation;
  path.separationForce = params.separationForce;
  path.concaveGrowth = params.concaveGrowth;
  path.convexGrowth = params.convexGrowth;
  path.filletRadius = params.filletRadius;
  path.filletIterations = params.filletIterations;
  path.seedRetention = params.seedRetention;
  path.blobOutward = params.blobOutward;
}

function makeReactorNode(x, y, seedX, seedY, pathIndex) {
  return {
    pos: { x, y },
    seed: { x: seedX ?? x, y: seedY ?? y },
    vel: { x: 0, y: 0 },
    acc: { x: 0, y: 0 },
    maxSpeed: 0.8,
    maxForce: 2.0,
    pathIndex,
  };
}

function createReactorPath(contourPts, params, pathIndex, isHole = false) {
  let seedCx = 0;
  let seedCy = 0;
  for (let i = 0; i < contourPts.length; i++) {
    seedCx += contourPts[i].x;
    seedCy += contourPts[i].y;
  }
  seedCx /= contourPts.length;
  seedCy /= contourPts.length;

  const path = {
    pathIndex,
    isHole: !!isHole,
    seedCx,
    seedCy,
    nodes: contourPts.map((pt) => makeReactorNode(pt.x, pt.y, pt.x, pt.y, pathIndex)),
    maxEdgeLength: params.maxEdgeLength,
    desiredSeparation: params.desiredSeparation,
    separationForce: params.separationForce,
    concaveGrowth: params.concaveGrowth,
    convexGrowth: params.convexGrowth,
    filletRadius: params.filletRadius,
    filletIterations: params.filletIterations,
    seedRetention: params.seedRetention,
    blobOutward: params.blobOutward,
  };

  path.computeForces = function computeForces(allNodes, speedMul) {
    this.applyCurvatureGrowth(speedMul);
    this.applyBlobOutward(speedMul);
    this.applySeparation(allNodes);
    this.applySeedTangentRetention(this.seedRetention);
  };

  path.applyCurvatureGrowth = function applyCurvatureGrowth(speedMul) {
    const convexMul = speedMul < 1 ? Math.max(0.08, speedMul * 0.35) : 1;
    const nodes = this.nodes;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const prev = nodes[(i - 1 + nodes.length) % nodes.length];
      const next = nodes[(i + 1) % nodes.length];
      const v1x = node.pos.x - prev.pos.x;
      const v1y = node.pos.y - prev.pos.y;
      const v2x = next.pos.x - node.pos.x;
      const v2y = next.pos.y - node.pos.y;
      const mag1 = Math.hypot(v1x, v1y);
      const mag2 = Math.hypot(v2x, v2y);
      if (mag1 <= 0 || mag2 <= 0) continue;
      const cross = (v1x / mag1) * (v2y / mag2) - (v1y / mag1) * (v2x / mag2);
      const avgDirX = v1x / mag1 + v2x / mag2;
      const avgDirY = v1y / mag1 + v2y / mag2;
      const avgMag = Math.hypot(avgDirX, avgDirY);
      if (avgMag === 0) continue;
      const nx = -avgDirY / avgMag;
      const ny = avgDirX / avgMag;
      const growthAmount = cross > 0
        ? this.concaveGrowth * Math.abs(cross)
        : this.convexGrowth * Math.abs(cross) * convexMul;
      reactorApplyForce(node, { x: nx * growthAmount * 0.1, y: ny * growthAmount * 0.1 });
    }
  };

  path.applyBlobOutward = function applyBlobOutward(speedMul) {
    const nodes = this.nodes;
    if (nodes.length < 3) return;
    const slowBoost = speedMul < 1 ? 1.35 + (1 - speedMul) * 0.9 : 1;
    const grow = this.blobOutward * slowBoost;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      let dx = node.seed.x - this.seedCx;
      let dy = node.seed.y - this.seedCy;
      const m = Math.hypot(dx, dy) || 1;
      reactorApplyForce(node, { x: (dx / m) * grow, y: (dy / m) * grow });
    }
  };

  path.applySeparation = function applySeparation(allNodes) {
    for (let ni = 0; ni < this.nodes.length; ni++) {
      const node = this.nodes[ni];
      let steerX = 0;
      let steerY = 0;
      let count = 0;
      for (let oi = 0; oi < allNodes.length; oi++) {
        const other = allNodes[oi];
        if (other === node || other.pathIndex === node.pathIndex) continue;
        const dx = node.pos.x - other.pos.x;
        const dy = node.pos.y - other.pos.y;
        const d = Math.hypot(dx, dy);
        if (d > 0 && d < this.desiredSeparation) {
          steerX += dx / (d * d);
          steerY += dy / (d * d);
          count++;
        }
      }
      if (count === 0) continue;
      steerX /= count;
      steerY /= count;
      const mag = Math.hypot(steerX, steerY);
      if (mag === 0) continue;
      steerX = (steerX / mag) * node.maxSpeed - node.vel.x;
      steerY = (steerY / mag) * node.maxSpeed - node.vel.y;
      const steerMag = Math.hypot(steerX, steerY);
      if (steerMag > node.maxForce) {
        steerX = (steerX / steerMag) * node.maxForce;
        steerY = (steerY / steerMag) * node.maxForce;
      }
      steerX *= this.separationForce;
      steerY *= this.separationForce;
      reactorApplyForce(node, { x: steerX, y: steerY });
    }
  };

  path.applySeedTangentRetention = function applySeedTangentRetention(strength) {
    if (!strength) return;
    const nodes = this.nodes;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      let sdx = node.seed.x - this.seedCx;
      let sdy = node.seed.y - this.seedCy;
      const sm = Math.hypot(sdx, sdy);
      if (sm < 0.5) continue;
      const ux = sdx / sm;
      const uy = sdy / sm;
      let dx = node.pos.x - node.seed.x;
      let dy = node.pos.y - node.seed.y;
      const radial = dx * ux + dy * uy;
      const tangX = dx - ux * radial;
      const tangY = dy - uy * radial;
      const td = Math.hypot(tangX, tangY);
      if (td < 0.4) continue;
      const pull = Math.min(strength * td, node.maxForce * 0.35);
      reactorApplyForce(node, { x: -(tangX / td) * pull, y: -(tangY / td) * pull });
    }
  };

  path.applyUpdates = function applyUpdates(speedMul) {
    for (let i = 0; i < this.nodes.length; i++) reactorIntegrateNode(this.nodes[i], speedMul);
    this.applyFillet(speedMul);
    this.growth(REACTOR_MAX_GROWTH_SPLITS);
    this.splitLongEdgesConservative(REACTOR_MAX_CONSERVATIVE_SPLITS);
  };

  path.applyFillet = function applyFillet(speedMul) {
    if (!this.filletRadius || !this.filletIterations) return;
    const speedScale = speedMul < 1 ? 0.15 + 0.85 * speedMul : 1;
    for (let k = 0; k < this.filletIterations; k++) {
      const newPos = [];
      const nodes = this.nodes;
      for (let i = 0; i < nodes.length; i++) {
        const prev = nodes[(i - 1 + nodes.length) % nodes.length];
        const curr = nodes[i];
        const next = nodes[(i + 1) % nodes.length];
        const r = this.filletRadius * speedScale;
        newPos.push({
          x: curr.pos.x * (1 - r) + (prev.pos.x + next.pos.x) * 0.5 * r,
          y: curr.pos.y * (1 - r) + (prev.pos.y + next.pos.y) * 0.5 * r,
        });
      }
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].pos.x = newPos[i].x;
        nodes[i].pos.y = newPos[i].y;
      }
    }
  };

  path.growth = function growth(budget) {
    let left = budget;
    for (let i = this.nodes.length - 1; i >= 0 && left > 0; i--) {
      const curr = this.nodes[i];
      const next = this.nodes[(i + 1) % this.nodes.length];
      const d = Math.hypot(next.pos.x - curr.pos.x, next.pos.y - curr.pos.y);
      if (d > this.maxEdgeLength) {
        this.nodes.splice(i + 1, 0, makeReactorNode(
          (curr.pos.x + next.pos.x) * 0.5,
          (curr.pos.y + next.pos.y) * 0.5,
          (curr.seed.x + next.seed.x) * 0.5,
          (curr.seed.y + next.seed.y) * 0.5,
          this.pathIndex
        ));
        left--;
      }
    }
  };

  path.splitLongEdgesConservative = function splitLongEdgesConservative(budget) {
    if (!this.nodes || this.nodes.length < 2 || budget <= 0) return;
    const maxEdge = Math.max(1e-6, this.maxEdgeLength);
    const threshold = maxEdge * REACTOR_SUBDIVIDE_FACTOR;
    let left = budget;
    const newNodes = [];
    const N = this.nodes.length;

    for (let i = 0; i < N; i++) {
      const a = this.nodes[i];
      const b = this.nodes[(i + 1) % N];
      newNodes.push(a);
      const dx = b.pos.x - a.pos.x;
      const dy = b.pos.y - a.pos.y;
      const L = Math.hypot(dx, dy);
      if (L > threshold && left > 0) {
        const needed = Math.min(
          REACTOR_MAX_INSERT_PER_EDGE,
          Math.ceil(L / maxEdge) - 1,
          left
        );
        for (let k = 1; k <= needed; k++) {
          const t = k / (needed + 1);
          newNodes.push(makeReactorNode(
            a.pos.x + dx * t,
            a.pos.y + dy * t,
            a.seed.x + (b.seed.x - a.seed.x) * t,
            a.seed.y + (b.seed.y - a.seed.y) * t,
            this.pathIndex
          ));
        }
        left -= needed;
      }
    }
    this.nodes = newNodes;
  };

  return path;
}

function reactorApplyForce(node, force) {
  node.acc.x += force.x;
  node.acc.y += force.y;
}

function reactorIntegrateNode(node, speedMul) {
  node.vel.x += node.acc.x;
  node.vel.y += node.acc.y;
  const speed = Math.hypot(node.vel.x, node.vel.y);
  if (speed > node.maxSpeed) {
    node.vel.x = (node.vel.x / speed) * node.maxSpeed;
    node.vel.y = (node.vel.y / speed) * node.maxSpeed;
  }
  node.pos.x += node.vel.x * speedMul;
  node.pos.y += node.vel.y * speedMul;
  node.acc.x = 0;
  node.acc.y = 0;
}

function applyReactorAntiCollapse(paths, speedMul) {
  const slow = speedMul < 1;
  const bias = slow ? 0.012 + (1 - speedMul) * 0.038 : 0.014;
  const minFactor = slow ? 0.975 : 0.94;

  for (let pi = 0; pi < paths.length; pi++) {
    const path = paths[pi];
    const nodes = path.nodes;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      let sdx = node.seed.x - path.seedCx;
      let sdy = node.seed.y - path.seedCy;
      const sm = Math.hypot(sdx, sdy);
      if (sm < 0.5) continue;
      const ux = sdx / sm;
      const uy = sdy / sm;
      const curR = (node.pos.x - path.seedCx) * ux + (node.pos.y - path.seedCy) * uy;
      const minR = sm * minFactor;
      if (curR < minR) {
        node.pos.x = path.seedCx + ux * minR;
        node.pos.y = path.seedCy + uy * minR;
      }
      node.pos.x += ux * bias;
      node.pos.y += uy * bias;
    }
  }
}

function clampReactorPathsToDisplay(paths, bounds, strokeW) {
  const pad = strokeW * 0.5 + 2;
  for (let pi = 0; pi < paths.length; pi++) {
    const nodes = paths[pi].nodes;
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].pos.x = nodes[i].pos.x < pad ? pad : nodes[i].pos.x > bounds.w - pad ? bounds.w - pad : nodes[i].pos.x;
      nodes[i].pos.y = nodes[i].pos.y < pad ? pad : nodes[i].pos.y > bounds.h - pad ? bounds.h - pad : nodes[i].pos.y;
    }
  }
}

function appendReactorBezierPath(ctx, nodes) {
  const len = nodes.length;
  if (len < 3) {
    ctx.moveTo(nodes[0].pos.x, nodes[0].pos.y);
    for (let i = 1; i < len; i++) ctx.lineTo(nodes[i].pos.x, nodes[i].pos.y);
    ctx.closePath();
    return;
  }
  const pStart = nodes[0].pos;
  ctx.moveTo(pStart.x, pStart.y);
  const t = 0.5;
  for (let i = 0; i < len; i++) {
    const p0 = nodes[(i - 1 + len) % len].pos;
    const p1 = nodes[i].pos;
    const p2 = nodes[(i + 1) % len].pos;
    const p3 = nodes[(i + 2) % len].pos;
    const cp1x = p1.x + ((p2.x - p0.x) / 6) * t;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * t;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * t;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * t;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
  ctx.closePath();
}

function drawReactorPaths(p, paths, geo) {
  const ctx = p.drawingContext;
  p.fill(10, 10, 10, 245);
  p.noStroke();

  const outers = paths.filter((path) => !path.isHole);
  const holes = paths.filter((path) => path.isHole);

  for (let oi = 0; oi < outers.length; oi++) {
    const outer = outers[oi];
    const nodes = outer.nodes;
    if (nodes.length < 3) continue;

    const outerPts = nodes.map((nd) => ({ x: nd.pos.x, y: nd.pos.y }));
    const innerHoles = holes.filter((hole) => {
      const hc = geo.contourCentroid(hole.nodes.map((nd) => nd.pos));
      return geo.pointInPolygon(hc.x, hc.y, outerPts);
    });

    ctx.beginPath();
    appendReactorBezierPath(ctx, nodes);
    for (let hi = 0; hi < innerHoles.length; hi++) {
      const hn = innerHoles[hi].nodes;
      if (hn.length < 3) continue;
      appendReactorBezierPath(ctx, hn.slice().reverse());
    }
    ctx.fill("evenodd");
  }
}

/**
 * MOLD — port von slime-mould (jacarooney / T0OLS)
 * vorbild: tools/slime-mould.html
 * + text/zeichnung als start-kontur (leicht sichtbar + leichtes pheromon)
 */

const MOLD_CELL = 4;
const MOLD_DISSIPATION = 0.3;
const MOLD_FADE = 10;
const MOLD_BASE_AREA = 400 * 400;
const MOLD_BASE_AGENTS = 2500;

function moldClamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function moldContourSpacing(detail) {
  return 3 + (1 - (detail ?? 0.55)) * 11;
}

function moldAgentCount(w, h, density) {
  const base = Math.round((MOLD_BASE_AGENTS * w * h) / MOLD_BASE_AREA);
  return Math.round(base * (0.75 + (density ?? 0.45) * 0.55));
}

function moldParams(m, w, h) {
  const density = m?.density ?? 0.45;
  const decay = m?.decay ?? 0.4;
  const sense = m?.sense ?? 0.5;
  const flow = m?.flow ?? 0.5;
  const spread = m?.spread ?? 0.7;
  return {
    density,
    dissipation: MOLD_DISSIPATION - decay * 0.06,
    fade: Math.round(MOLD_FADE + decay * 4),
    senseLength: 14 + sense * 12,
    maxSpeed: 1.4 + flow * 0.8,
    maxForce: 1.6 + flow * 0.8,
    sliminess: 70 + density * 60,
    size: 1.4 + density * 0.8,
    agentCount: moldAgentCount(w, h, density),
    contourSpacing: moldContourSpacing(m?.detail ?? 0.55),
    contourAlpha: Math.round(28 + (1 - spread) * 40),
    anchorTrail: 18 + density * 40 * (1 - spread * 0.65),
    stroke: 42,
  };
}

/* —— kontur aus seed —— */

function moldResample(pts, spacing) {
  if (!pts || pts.length < 2) return pts || [];
  const closed = pts.length > 2
    && Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) < spacing * 1.5;
  const segs = closed ? pts.length : pts.length - 1;
  const out = [];
  for (let i = 0; i < segs; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(len / spacing));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  if (!closed && pts.length) out.push(pts[pts.length - 1]);
  return out;
}

function moldPrepareContours(contours, spacing) {
  const out = [];
  for (let i = 0; i < contours.length; i++) {
    const c = contours[i];
    if (c && c.outer) {
      const outer = moldResample(c.outer, spacing);
      if (outer.length < 2) continue;
      const holes = [];
      for (let hi = 0; hi < (c.holes || []).length; hi++) {
        const hole = moldResample(c.holes[hi], spacing);
        if (hole.length >= 2) holes.push(hole);
      }
      out.push(holes.length ? { outer, holes } : outer);
    } else {
      const pts = moldResample(c, spacing);
      if (pts.length >= 2) out.push(pts);
    }
  }
  return out;
}

function moldContourRings(c) {
  if (c && c.outer) return [c.outer].concat(c.holes || []);
  return c && c.length >= 2 ? [c] : [];
}

function moldContourClosed(pts) {
  return pts.length > 2
    && Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) < 5;
}

function moldDrawCompoundStroke(p, outer, holes, alpha) {
  if (!outer || outer.length < 2) return;
  p.noFill();
  p.stroke(168, 164, 158, alpha);
  p.strokeWeight(1);
  p.strokeCap(p.ROUND);
  p.strokeJoin(p.ROUND);
  p.beginShape();
  for (let i = 0; i < outer.length; i++) p.vertex(outer[i].x, outer[i].y);
  for (let hi = 0; hi < holes.length; hi++) {
    const hole = holes[hi];
    if (hole.length < 2) continue;
    p.beginContour();
    for (let i = hole.length - 1; i >= 0; i--) p.vertex(hole[i].x, hole[i].y);
    p.endContour();
  }
  p.endShape(p.CLOSE);
}

function moldDrawGhostContour(p, contours, alpha) {
  if (!contours.length || alpha < 4) return;
  for (let ci = 0; ci < contours.length; ci++) {
    const c = contours[ci];
    if (c && c.outer) {
      moldDrawCompoundStroke(p, c.outer, c.holes || [], alpha);
    } else if (c && c.length >= 2) {
      p.noFill();
      p.stroke(168, 164, 158, alpha);
      p.strokeWeight(1);
      p.strokeCap(p.ROUND);
      p.strokeJoin(p.ROUND);
      p.beginShape();
      for (let i = 0; i < c.length; i++) p.vertex(c[i].x, c[i].y);
      if (moldContourClosed(c)) p.endShape(p.CLOSE);
      else p.endShape();
    }
  }
}

/* —— trail grid (wie original) —— */

function moldTrailIdx(colsX, x, y) {
  return colsX * y + x;
}

function moldSyncGrid(w, h) {
  const colsX = Math.max(1, Math.floor(w / MOLD_CELL));
  const colsY = Math.max(1, Math.floor(h / MOLD_CELL));
  return { colsX, colsY, trails: new Float32Array(colsX * colsY) };
}

function moldSample(grid, px, py, w, h) {
  const stimX = Math.floor(((w + px) % w) / MOLD_CELL);
  const stimY = Math.floor(((h + py) % h) / MOLD_CELL);
  return grid.trails[moldTrailIdx(grid.colsX, stimX % grid.colsX, stimY % grid.colsY)] || 0;
}

function moldLeaveTrail(grid, px, py, amount) {
  const tx = Math.floor(px / MOLD_CELL);
  const ty = Math.floor(py / MOLD_CELL);
  const idx = moldTrailIdx(
    grid.colsX,
    ((tx % grid.colsX) + grid.colsX) % grid.colsX,
    ((ty % grid.colsY) + grid.colsY) % grid.colsY
  );
  grid.trails[idx] += amount;
}

function moldDepositContour(grid, contours, amount) {
  for (let ci = 0; ci < contours.length; ci++) {
    const rings = moldContourRings(contours[ci]);
    for (let ri = 0; ri < rings.length; ri++) {
      const pts = rings[ri];
      if (pts.length < 2) continue;
      const closed = moldContourClosed(pts);
      const segs = closed ? pts.length : pts.length - 1;
      for (let i = 0; i < segs; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        moldLeaveTrail(grid, a.x, a.y, amount);
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const steps = Math.max(1, Math.ceil(len / MOLD_CELL));
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          moldLeaveTrail(grid, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, amount * 0.55);
        }
      }
    }
  }
}

/* —— agent (1:1 logik wie Agent-Klasse im original) —— */

function moldRotate(vx, vy, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: vx * c - vy * s, y: vx * s + vy * c };
}

function moldCreateAgent(x, y, prm) {
  return {
    x,
    y,
    vx: Math.random() * 2 - 1,
    vy: Math.random() * 2 - 1,
    ax: 0,
    ay: 0,
    size: prm.size,
    sliminess: prm.sliminess,
    senseLength: prm.senseLength,
    senseAngle: Math.PI / 8,
    maxSpeed: prm.maxSpeed,
    maxForce: prm.maxForce,
  };
}

function moldSpawnOnContour(agents, contours, count, prm) {
  const pool = [];
  for (let i = 0; i < contours.length; i++) {
    const rings = moldContourRings(contours[i]);
    for (let r = 0; r < rings.length; r++) {
      if (rings[r].length) pool.push(rings[r]);
    }
  }
  if (!pool.length) return;
  for (let i = 0; i < count; i++) {
    const pts = pool[Math.floor(Math.random() * pool.length)];
    const pt = pts[Math.floor(Math.random() * pts.length)];
    agents.push(moldCreateAgent(
      pt.x + (Math.random() - 0.5) * 2,
      pt.y + (Math.random() - 0.5) * 2,
      prm
    ));
  }
}

function moldAgentUpdate(a) {
  a.vx += a.ax;
  a.vy += a.ay;
  const speed = Math.hypot(a.vx, a.vy);
  if (speed > a.maxSpeed) {
    const scale = a.maxSpeed / speed;
    a.vx *= scale;
    a.vy *= scale;
  }
  a.x += a.vx;
  a.y += a.vy;
}

function moldAgentWarp(a, w, h) {
  if (a.x > w) a.x = 0;
  else if (a.x < 0) a.x = w;
  if (a.y > h) a.y = 0;
  else if (a.y < 0) a.y = h;
}

function moldAgentSteer(a, grid, w, h) {
  const speed = Math.hypot(a.vx, a.vy) || 1;
  const fwd = { x: (a.vx / speed) * a.senseLength, y: (a.vy / speed) * a.senseLength };
  const left = moldRotate(fwd.x, fwd.y, -a.senseAngle);
  const right = moldRotate(fwd.x, fwd.y, a.senseAngle);

  const F = moldSample(grid, a.x + fwd.x, a.y + fwd.y, w, h);
  const L = moldSample(grid, a.x + left.x, a.y + left.y, w, h);
  const R = moldSample(grid, a.x + right.x, a.y + right.y, w, h);

  let desired = null;
  if (L > R && L > F) desired = moldRotate(a.vx, a.vy, -a.senseAngle);
  else if (R > L && R > F) desired = moldRotate(a.vx, a.vy, a.senseAngle);
  else if (L === R && L > F) {
    const dir = Math.random() < 0.5 ? -1 : 1;
    desired = moldRotate(a.vx, a.vy, a.senseAngle * dir);
  }

  if (desired) {
    const dSpeed = Math.hypot(desired.x, desired.y) || 1;
    desired.x = (desired.x / dSpeed) * a.maxSpeed;
    desired.y = (desired.y / dSpeed) * a.maxSpeed;
    desired.x -= a.vx;
    desired.y -= a.vy;
    const dMag = Math.hypot(desired.x, desired.y);
    if (dMag > a.maxForce) {
      desired.x = (desired.x / dMag) * a.maxForce;
      desired.y = (desired.y / dMag) * a.maxForce;
    }
    a.ax = desired.x;
    a.ay = desired.y;
  }
}

function moldAgentPoint(a, p, color) {
  p.stroke(color);
  p.strokeWeight(a.size);
  p.point(a.x, a.y);
}

const MoldGrowthMode = {
  desc: "Mold — slime-mould wie im original; start-form bleibt leicht sichtbar.",

  fmtA: (v) => `${Math.round(75 + v * 55)}%`,
  fmtB: (v) => `${Math.round(24 + v * 40)}%`,
  fmtC: (v) => `${Math.round(14 + v * 12)} px`,

  create(p, helpers) {
    const { state, clamp, buildMoldContours } = helpers;
    const w = p.width;
    const h = p.height;

    let prm = moldParams(state.mold, w, h);
    let contours = moldPrepareContours(buildMoldContours(w, h), prm.contourSpacing);
    let grid = moldSyncGrid(w, h);
    let agents = [];

    function reset() {
      prm = moldParams(state.mold, w, h);
      contours = moldPrepareContours(buildMoldContours(w, h), prm.contourSpacing);
      grid = moldSyncGrid(w, h);
      agents = [];
      moldSpawnOnContour(agents, contours, prm.agentCount, prm);
      moldDepositContour(grid, contours, prm.anchorTrail * 1.5);
    }

    reset();

    function frameStep() {
      for (let i = 0; i < grid.trails.length; i++) {
        grid.trails[i] *= prm.dissipation;
      }
      moldDepositContour(grid, contours, prm.anchorTrail * 0.1);

      for (let i = 0; i < agents.length; i++) {
        const a = agents[i];
        moldAgentUpdate(a);
        moldAgentWarp(a, w, h);
        moldLeaveTrail(grid, a.x, a.y, a.sliminess);
        moldAgentSteer(a, grid, w, h);
      }
    }

    return {
      update() {
        if (!contours.length) return;
        prm = moldParams(state.mold, w, h);
        const loops = Math.max(1, Math.round(clamp(state.speed, 0.2, 5)));
        for (let f = 0; f < loops; f++) frameStep();
      },

      draw() {
        p.background(255, prm.fade);
        moldDrawGhostContour(p, contours, prm.contourAlpha);
        for (let i = 0; i < agents.length; i++) {
          moldAgentPoint(agents[i], p, prm.stroke);
        }
      },

      appendContours(raw) {
        const added = moldPrepareContours(raw, moldParams(state.mold, w, h).contourSpacing);
        for (let i = 0; i < added.length; i++) contours.push(added[i]);
        moldDepositContour(grid, added, prm.anchorTrail);
        moldSpawnOnContour(agents, added, 80, prm);
      },

      rebuildContours() {
        reset();
      },

      getLines() {
        return contours.map((c) => {
          if (c && c.outer) {
            return {
              nodes: c.outer.map((pt) => ({ x: pt.x, y: pt.y })),
              holes: (c.holes || []).map((hole) => ({
                nodes: hole.map((pt) => ({ x: pt.x, y: pt.y })),
              })),
            };
          }
          return { nodes: c.map((pt) => ({ x: pt.x, y: pt.y })) };
        });
      },

      get strokeW() {
        return prm.size;
      },
    };
  },
};

const moldDensityFmt = MoldGrowthMode.fmtA;
const moldDecayFmt = (v) => `${Math.round(24 + v * 40)}%`;
const moldSenseFmt = MoldGrowthMode.fmtC;
const moldFlowFmt = (v) => `${Math.round(140 + v * 80)}%`;
const moldDetailFmt = (v) => `${Math.round(3 + (1 - v) * 11)} px`;
const moldSpreadFmt = (v) => `${Math.round(68 - v * 42)}%`;

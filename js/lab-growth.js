function labClamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * LAB — ganz simples wachstum zum rumprobieren
 *
 * ★ stepLab()  → physik (nur 1 schritt: nach außen wachsen)
 * ★ drawLab()  → look
 * ★ LAB        → geschwindigkeit & teilung
 */

const LabGrowthMode = {
  desc: "Lab — langsam nach außen wachsen. Code in js/lab-growth.js.",

  fmtA: (v) => `${Math.round(6 + v * 14)} px`,
  fmtB: (v) => `${Math.round(14 + v * 36)} px`,
  fmtC: (v) => `${Math.round(5 + v * 18)} px`,

  LAB: {
    grow: 0.12,
    splitEvery: 28,
    splitMul: 2.2,
    maxNodes: 480,
    maxSplits: 10,
    showDots: false,
  },

  create(p, helpers) {
    const { state, buildGrowthLines, contoursToGrowthLines, growthParams, clamp, makeGrowthNode, drawG, sanitizeContours } = helpers;
    const w = p.width;
    const h = p.height;
    const lines = buildGrowthLines(w, h);
    let frame = 0;
    const self = this;

    function totalNodes() {
      let n = 0;
      for (const l of lines) n += l.nodes.length;
      return n;
    }

    return {
      update() {
        if (totalNodes() >= self.LAB.maxNodes) return;

        const gp = growthParams();
        const speed = clamp(state.speed, 0.1, 3);
        const pad = gp.strokeW * 0.5 + 4;

        stepLab(lines, {
          grow: self.LAB.grow * speed,
          spacing: gp.clearance,
          pad,
          w,
          h,
        });

        frame++;
        if (frame % self.LAB.splitEvery === 0) {
          const splitAt = gp.maxEdge * self.LAB.splitMul;
          splitLongEdges(lines, splitAt, makeGrowthNode, totalNodes, self.LAB.maxNodes, self.LAB.maxSplits);
        }
      },

      draw() {
        p.background(255);
        drawLab(p, lines, growthParams().strokeW, self.LAB.showDots);
      },

      appendContours(contours) {
        const safe = sanitizeContours(contours, w, h);
        const added = contoursToGrowthLines(safe);
        for (let i = 0; i < added.length; i++) lines.push(added[i]);
      },

      getLines() {
        return lines.map((l) => ({
          nodes: l.nodes.map((n) => ({ x: n.x, y: n.y })),
        }));
      },

      get strokeW() {
        return growthParams().strokeW;
      },
    };
  },
};

function labLineBbox(nodes) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  }
  return { minX, minY, maxX, maxY };
}

function labBboxesOverlap(a, b, gap) {
  return !(
    a.maxX + gap < b.minX || b.maxX + gap < a.minX ||
    a.maxY + gap < b.minY || b.maxY + gap < a.minY
  );
}

// ── physik: nur nach außen ────────────────────────────────────

function stepLab(lines, cfg) {
  const { grow, spacing, pad, w, h } = cfg;

  for (let li = 0; li < lines.length; li++) {
    const nodes = lines[li].nodes;
    if (nodes.length < 3) continue;

    let cx = 0;
    let cy = 0;
    for (const n of nodes) {
      cx += n.x;
      cy += n.y;
    }
    cx /= nodes.length;
    cy /= nodes.length;

    for (const n of nodes) {
      let dx = n.x - cx;
      let dy = n.y - cy;
      const d = Math.hypot(dx, dy) || 1;
      n.x += (dx / d) * grow;
      n.y += (dy / d) * grow;
    }
  }

  const bboxes = lines.map((l) => labLineBbox(l.nodes));

  for (let li = 0; li < lines.length; li++) {
    const nodesA = lines[li].nodes;
    for (let i = 0; i < nodesA.length; i++) {
      for (let lj = li; lj < lines.length; lj++) {
        if (!labBboxesOverlap(bboxes[li], bboxes[lj], spacing)) continue;
        const nodesB = lines[lj].nodes;
        const jStart = lj === li ? i + 2 : 0;
        for (let j = jStart; j < nodesB.length; j++) {
          if (lj === li) {
            const wrap = nodesA.length - Math.abs(i - j);
            if (Math.abs(i - j) <= 2 || wrap <= 2) continue;
          }

          const a = nodesA[i];
          const b = nodesB[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d > 0 && d < spacing) {
            const cross = li !== lj;
            const push = ((spacing - d) / d) * (cross ? 0.55 : 0.35);
            dx *= push;
            dy *= push;
            a.x += dx;
            a.y += dy;
            b.x -= dx;
            b.y -= dy;
          }
        }
      }
    }
  }

  for (let li = 0; li < lines.length; li++) {
    for (const n of lines[li].nodes) {
      n.x = labClamp(n.x, pad, w - pad);
      n.y = labClamp(n.y, pad, h - pad);
    }
  }
}

function splitLongEdges(lines, splitAt, makeNode, totalNodes, maxNodes, budget) {
  let left = budget;
  for (let li = 0; li < lines.length && left > 0; li++) {
    const nodes = lines[li].nodes;
    const next = [];

    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      const b = nodes[(i + 1) % nodes.length];
      next.push(a);

      const d = Math.hypot(b.x - a.x, b.y - a.y);
      if (d > splitAt && left > 0 && totalNodes() + next.length < maxNodes) {
        next.push(makeNode((a.x + b.x) * 0.5, (a.y + b.y) * 0.5));
        left--;
      }
    }

    lines[li].nodes = next;
  }
}

// ── zeichnen ──────────────────────────────────────────────────

function drawLab(p, lines, strokeW, showDots) {
  p.noFill();
  p.stroke(15);
  p.strokeWeight(strokeW);
  p.strokeCap(p.ROUND);
  p.strokeJoin(p.ROUND);

  for (const l of lines) {
    if (l.nodes.length < 2) continue;
    p.beginShape();
    for (const n of l.nodes) p.vertex(n.x, n.y);
    p.endShape(p.CLOSE);
  }

  if (!showDots) return;

  p.noStroke();
  p.fill(255);
  for (const l of lines) {
    for (const n of l.nodes) p.circle(n.x, n.y, 3);
  }
}

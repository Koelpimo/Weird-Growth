/* weird growth — generative typografie-tool.
   Eingabe (Text oder Zeichnung) wird zu einer Maske; daraus wachsen
   verschiedene generative Ansätze. Aktuell: Adern (differential line growth). */

const host = document.getElementById("canvas-host");

const els = {
  inputTabs: Array.from(document.querySelectorAll(".mode-tab")),
  growthModes: Array.from(document.querySelectorAll(".growth-mode:not(:disabled)")),
  textField: document.getElementById("seed-text"),
  sizer: document.getElementById("seed-sizer"),
  desc: document.getElementById("mode-desc"),
  play: document.getElementById("btn-play"),
  reset: document.getElementById("btn-reset"),
  save: document.getElementById("btn-save"),
  svg: document.getElementById("btn-svg"),
  clear: document.getElementById("btn-clear"),
  brush: document.getElementById("param-brush"),
  brushVal: document.getElementById("val-brush"),
  speed: document.getElementById("param-speed"),
  speedVal: document.getElementById("val-speed"),
  a: document.getElementById("param-a"),
  aVal: document.getElementById("val-a"),
  b: document.getElementById("param-b"),
  bVal: document.getElementById("val-b"),
  c: document.getElementById("param-c"),
  cVal: document.getElementById("val-c"),
  reactorFont: document.getElementById("param-reactor-font"),
  reactorFontUrl: document.getElementById("param-reactor-font-url"),
  l2Attraction: document.getElementById("param-l2-attraction"),
  l2AttractionVal: document.getElementById("val-l2-attraction"),
  l2Repulsion: document.getElementById("param-l2-repulsion"),
  l2RepulsionVal: document.getElementById("val-l2-repulsion"),
  l2Push: document.getElementById("param-l2-push"),
  l2PushVal: document.getElementById("val-l2-push"),
  l2Split: document.getElementById("param-l2-split"),
  l2SplitVal: document.getElementById("val-l2-split"),
  l2Complexity: document.getElementById("param-l2-complexity"),
  l2ComplexityVal: document.getElementById("val-l2-complexity"),
  l2Stroke: document.getElementById("param-l2-stroke"),
  l2StrokeVal: document.getElementById("val-l2-stroke"),
  l2MaxNodes: document.getElementById("val-l2-maxnodes"),
  l2NodeLimit: document.getElementById("param-l2-node-limit"),
  l2NodeLimitVal: document.getElementById("val-l2-node-limit"),
  l2Nodes: document.getElementById("btn-l2-nodes"),
  l2Legacy: document.getElementById("btn-l2-legacy"),
  labSplit: document.getElementById("param-lab-split"),
  labSplitVal: document.getElementById("val-lab-split"),
  d3Attraction: document.getElementById("param-d3-attraction"),
  d3AttractionVal: document.getElementById("val-d3-attraction"),
  d3Repulsion: document.getElementById("param-d3-repulsion"),
  d3RepulsionVal: document.getElementById("val-d3-repulsion"),
  d3Depth: document.getElementById("param-d3-depth"),
  d3DepthVal: document.getElementById("val-d3-depth"),
  d3Link: document.getElementById("param-d3-link"),
  d3LinkVal: document.getElementById("val-d3-link"),
  d3Complexity: document.getElementById("param-d3-complexity"),
  d3ComplexityVal: document.getElementById("val-d3-complexity"),
  d3Split: document.getElementById("param-d3-split"),
  d3SplitVal: document.getElementById("val-d3-split"),
  d3DofFocus: document.getElementById("param-d3-dof-focus"),
  d3DofFocusVal: document.getElementById("val-d3-dof-focus"),
  d3DofBlur: document.getElementById("param-d3-dof-blur"),
  d3DofBlurVal: document.getElementById("val-d3-dof-blur"),
  d3Exposure: document.getElementById("param-d3-exposure"),
  d3ExposureVal: document.getElementById("val-d3-exposure"),
  d3Tumble: document.getElementById("param-d3-tumble"),
  d3TumbleVal: document.getElementById("val-d3-tumble"),
  d3NodeLimit: document.getElementById("param-d3-node-limit"),
  d3NodeLimitVal: document.getElementById("val-d3-node-limit"),
  d3MaxNodes: document.getElementById("val-d3-maxnodes"),
  d3Nodes: document.getElementById("btn-d3-nodes"),
  dofLink: document.getElementById("param-dof-link"),
  dofLinkVal: document.getElementById("val-dof-link"),
  dofAttraction: document.getElementById("param-dof-attraction"),
  dofAttractionVal: document.getElementById("val-dof-attraction"),
  dofRepulsion: document.getElementById("param-dof-repulsion"),
  dofRepulsionVal: document.getElementById("val-dof-repulsion"),
  dofDepth: document.getElementById("param-dof-depth"),
  dofDepthVal: document.getElementById("val-dof-depth"),
  dofSplit: document.getElementById("param-dof-split"),
  dofSplitVal: document.getElementById("val-dof-split"),
  dofTumble: document.getElementById("param-dof-tumble"),
  dofTumbleVal: document.getElementById("val-dof-tumble"),
  dofNodeLimit: document.getElementById("param-dof-node-limit"),
  dofNodeLimitVal: document.getElementById("val-dof-node-limit"),
  dofMaxNodes: document.getElementById("val-dof-maxnodes"),
  dofNodes: document.getElementById("btn-dof-nodes"),
};

const state = {
  mode: "lab2",
  input: "text", // "text" | "draw"
  paused: false,
  speed: 1.5,
  a: 0.5, // liniendicke
  b: 0.5, // abstand
  c: 0.5, // teilung
  brush: 24,
  text: "TYPE HERE",
  reactorFont: "Helvetica Neue",
  reactorFontUrl: "",
  reactorFontWeight: "700",
  lab2: {
    stroke: 0.1, // ~2 px
    attraction: 0.5,
    repulsion: 0.5,
    push: 0.5,
    split: 0.31,
    complexity: 0.11, // ~20 start-knoten
    nodeLimit: 0.2, // ~4000 nodes
    showNodes: false,
    legacy: false, // alte "explosions"-version (linien überschneiden sich)
  },
  lab: {
    split: 0.5, // ~31 px teilungs-abstand
  },
  diff3d: {
    attraction: 0.5,
    repulsion: 0.5,
    depth: 0.45,
    link: 0.45,
    split: 0.31,
    complexity: 0.11,
    nodeLimit: 0.2,
    dofFocus: 0.5,
    dofBlur: 0.5,
    dofExp: 0.5,
    dofSamples: 0.5,
    exposure: 0.5,
    tumble: 0.35,
    graph: null,
    showNodes: false,
  },
  dof: {
    attraction: 0.5,
    repulsion: 0.5,
    depth: 0.45,
    link: 0.4,
    split: 0.31,
    complexity: 0.11,
    nodeLimit: 0.2,
    tumble: 0.4,
    graph: null,
    showNodes: false,
  },
};

const SCALE = 4; // raster der maske (px pro zelle)
const FONT_STACK = '"Helvetica Neue", Helvetica, Arial, sans-serif'; // identisch zum eingabefeld
const STORAGE_KEY_SPEED = "weirdgrowth-speed";

function loadSpeedFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SPEED);
    if (raw == null) return;
    const v = parseFloat(raw);
    if (Number.isFinite(v)) state.speed = clamp(v, 0.2, 5);
  } catch (err) {
    /* ignore */
  }
}

function saveSpeedToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY_SPEED, String(state.speed));
  } catch (err) {
    /* ignore */
  }
}

function syncSpeedUI() {
  if (!els.speed || !els.speedVal) return;
  els.speed.value = String(state.speed);
  els.speedVal.textContent = `${state.speed.toFixed(1)}×`;
}

const MODES = {
  reactor: {
    desc: ReactorGrowthMode.desc,
    fmtA: ReactorGrowthMode.fmtA,
    fmtB: ReactorGrowthMode.fmtB,
    fmtC: ReactorGrowthMode.fmtC,
  },
  lab: {
    desc: LabGrowthMode.desc,
    fmtA: LabGrowthMode.fmtA,
    fmtB: LabGrowthMode.fmtB,
    fmtC: LabGrowthMode.fmtC,
  },
  lab2: {
    desc: Lab2GrowthMode.desc,
    fmtA: Lab2GrowthMode.fmtA,
    fmtB: Lab2GrowthMode.fmtB,
    fmtC: Lab2GrowthMode.fmtC,
  },
  diff3d: {
    desc: Diff3GrowthMode.desc,
    fmtA: Diff3GrowthMode.fmtA,
    fmtB: Diff3GrowthMode.fmtB,
    fmtC: Diff3GrowthMode.fmtC,
  },
  dof: {
    desc: DofGrowthMode.desc,
    fmtA: DofGrowthMode.fmtA,
    fmtB: DofGrowthMode.fmtB,
    fmtC: DofGrowthMode.fmtC,
  },
};

const seed = { mw: 0, mh: 0, mask: null, maskScale: SCALE };

let drawG = null; // live-vorschau während des strichs
let drawSeedG = null; // unsichtbare kumulative seed-ebene (für reset/clear)
let drawStrokeBefore = null; // snapshot vor dem aktuellen strich
let drewThisStroke = false;
let isDrawingStroke = false;
let p5i = null;
let sim = null;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/* ============================================================
   SEED — text oder zeichnung → maske
   ============================================================ */

function seedTextSize(gfx, txt, w, h) {
  const tmp = document.createElement("canvas");
  const ctx = tmp.getContext("2d");
  if (!ctx) return Math.max(22, Math.min(h * 0.28, 200));
  const fam = state.mode === "reactor" ? state.reactorFont : "Helvetica Neue";
  const wt = state.mode === "reactor" ? state.reactorFontWeight : "700";
  return measureSeedFontSize(ctx, txt, w, h, fam, wt);
}

function drawSeedText(gfx, txt, w, h) {
  const layout = getGrowthLayout(w, h);
  const tmp = document.createElement("canvas");
  const ctx = tmp.getContext("2d");
  const fam = state.mode === "reactor" ? state.reactorFont : "Helvetica Neue";
  const wt = state.mode === "reactor" ? state.reactorFontWeight : "700";
  const line = ctx ? seedLineMetrics(ctx, txt, layout, fam, wt) : null;
  gfx.push();
  gfx.fill(0);
  gfx.noStroke();
  gfx.textFont(FONT_STACK);
  gfx.textAlign(gfx.CENTER, gfx.BASELINE);
  gfx.textStyle(gfx.BOLD);
  gfx.textSize(line ? line.fontSizePx : seedTextSize(gfx, txt, layout.measureW, layout.measureH));
  gfx.text(txt, w / 2, line ? line.worldBaselineY : layout.textCenterY);
  gfx.pop();
}

function refreshSeed(p) {
  const w = p.width;
  const h = p.height;

  const src = p.createGraphics(w, h);
  src.pixelDensity(1);
  src.clear(); // transparent — tinte wird über alpha erkannt

  if (state.input === "text") {
    // text wie getippt — klein- und großbuchstaben bleiben erhalten
    const txt = (state.text || "").trim().slice(0, 20);
    if (txt.length) drawSeedText(src, txt, w, h);
  } else if (drawSeedG) {
    src.image(drawSeedG, 0, 0);
  } else if (drawG) {
    src.image(drawG, 0, 0);
  }

  const drawOpts = state.input === "draw" ? drawExtractOpts() : null;
  const { mask, mw, mh } = maskFromGraphics(src, w, h, drawOpts);
  src.remove();

  seed.mw = mw;
  seed.mh = mh;
  seed.mask = mask;
  seed.maskScale = drawOpts?.scale ?? SCALE;
}

function dilateMask(mask, mw, mh, radius) {
  if (!radius || radius < 1) return mask;
  const out = new Uint8Array(mask.length);
  for (let gy = 0; gy < mh; gy++) {
    for (let gx = 0; gx < mw; gx++) {
      if (!mask[gy * mw + gx]) continue;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = gx + dx;
          const ny = gy + dy;
          if (nx >= 0 && nx < mw && ny >= 0 && ny < mh) out[ny * mw + nx] = 1;
        }
      }
    }
  }
  return out;
}

function maskFromGraphics(gfx, w, h, opts) {
  const scale = opts?.scale ?? SCALE;
  const alphaThreshold = opts?.alphaThreshold ?? 110;
  const scanCell = scale <= 2;

  gfx.loadPixels();
  const px = gfx.pixels;
  const d = typeof gfx.pixelDensity === "function" ? gfx.pixelDensity() : 1;
  const pw = Math.max(1, Math.floor(w * d));
  const ph = Math.max(1, Math.floor(h * d));
  const mw = Math.max(8, Math.floor(w / scale));
  const mh = Math.max(8, Math.floor(h / scale));
  const mask = new Uint8Array(mw * mh);

  for (let gy = 0; gy < mh; gy++) {
    const y0 = gy * scale;
    const y1 = Math.min(ph, y0 + scale);
    for (let gx = 0; gx < mw; gx++) {
      const x0 = gx * scale;
      const x1 = Math.min(pw, x0 + scale);
      let hit = false;
      if (scanCell) {
        for (let sy = y0; sy < y1 && !hit; sy++) {
          for (let sx = x0; sx < x1 && !hit; sx++) {
            if (px[(sy * pw + sx) * 4 + 3] > alphaThreshold) hit = true;
          }
        }
      } else {
        const sy = Math.min(ph - 1, (y0 + (scale >> 1)) * d);
        const sx = Math.min(pw - 1, (x0 + (scale >> 1)) * d);
        hit = px[(sy * pw + sx) * 4 + 3] > alphaThreshold;
      }
      if (hit) mask[gy * mw + gx] = 1;
    }
  }

  if (opts?.dilate) return { mask: dilateMask(mask, mw, mh, opts.dilate), mw, mh };
  return { mask, mw, mh };
}

function graphicsToMask(gfx, w, h, opts) {
  return maskFromGraphics(gfx, w, h, opts);
}

function drawExtractOpts() {
  const sw = drawPreviewStrokeW();
  const scale = sw <= 1.5 ? 1 : sw <= 8 ? 2 : SCALE;
  return {
    scale,
    minArea: 1,
    minBoundary: sw <= 8 ? 3 : 8,
    minContourPts: sw <= 8 ? 3 : 4,
    dilate: sw <= 1.5 ? 2 : sw <= 8 ? 1 : 0,
    alphaThreshold: sw <= 8 ? 32 : 110,
  };
}

function contoursFromGraphics(gfx, w, h, relaxed) {
  if (!gfx) return [];
  const opts = relaxed ? drawExtractOpts() : undefined;
  const { mask, mw, mh } = graphicsToMask(gfx, w, h, opts);
  const scale = opts?.scale ?? SCALE;
  const extractOpts = relaxed
    ? {
        minArea: opts.minArea,
        minBoundary: opts.minBoundary,
        minContourPts: opts.minContourPts,
      }
    : undefined;
  return extractContoursFromMask(mask, mw, mh, scale, extractOpts);
}

function extractNewDrawContours(beforeG, afterG, w, h) {
  const opts = drawExtractOpts();
  const after = graphicsToMask(afterG, w, h, opts);
  let beforeMask = null;
  if (beforeG) beforeMask = graphicsToMask(beforeG, w, h, opts).mask;
  const diff = new Uint8Array(after.mask.length);
  for (let i = 0; i < diff.length; i++) {
    diff[i] = after.mask[i] && (!beforeMask || !beforeMask[i]) ? 1 : 0;
  }
  return extractContoursFromMask(diff, after.mw, after.mh, opts.scale, {
    minArea: opts.minArea,
    minBoundary: opts.minBoundary,
    minContourPts: opts.minContourPts,
  });
}

function captureDrawStrokeBefore(p) {
  if (!drawG || !p) {
    drawStrokeBefore = null;
    return;
  }
  if (!drawStrokeBefore || drawStrokeBefore.width !== drawG.width || drawStrokeBefore.height !== drawG.height) {
    drawStrokeBefore = p.createGraphics(drawG.width, drawG.height);
    drawStrokeBefore.pixelDensity(1);
  }
  drawStrokeBefore.clear();
  drawStrokeBefore.image(drawG, 0, 0);
}

function mergeStrokeToDrawSeed(p) {
  if (!drawG || !p) return;
  if (!drawSeedG || drawSeedG.width !== drawG.width || drawSeedG.height !== drawG.height) {
    drawSeedG = p.createGraphics(drawG.width, drawG.height);
    drawSeedG.pixelDensity(1);
    drawSeedG.clear();
  }
  drawSeedG.image(drawG, 0, 0);
}

const GROWTH_MAX_SPLITS_PER_FRAME = 24;
const GROWTH_MAX_CONTOURS = 40;
const REACTOR_MAX_CONTOURS = 48;
const GROWTH_MAX_POINTS_PER_CONTOUR = 32;
const REACTOR_MAX_POINTS_PER_CONTOUR = 36;
const GROWTH_MAX_BBOX_FRAC = 0.82;

function clampContourPoints(pts, maxPts) {
  if (pts.length <= maxPts) return pts;
  const out = [];
  const step = pts.length / maxPts;
  for (let i = 0; i < maxPts; i++) out.push(pts[Math.floor(i * step)]);
  return out;
}

function contourBBoxMetrics(pts) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let j = 0; j < pts.length; j++) {
    if (pts[j].x < minX) minX = pts[j].x;
    if (pts[j].x > maxX) maxX = pts[j].x;
    if (pts[j].y < minY) minY = pts[j].y;
    if (pts[j].y > maxY) maxY = pts[j].y;
  }
  const bw = maxX - minX;
  const bh = maxY - minY;
  return { minX, minY, maxX, maxY, bw, bh, area: bw * bh };
}

function trimContourCandidates(candidates, maxCount) {
  if (candidates.length <= maxCount) return candidates;
  candidates.sort((a, b) => b.area - a.area);
  while (candidates.length > maxCount) candidates.pop();
  return candidates;
}

function sanitizeContourPts(pts, maxW, maxH, maxArea, minPts) {
  const need = minPts ?? 4;
  if (!pts || pts.length < need) return null;
  const m = contourBBoxMetrics(pts);
  if (m.bw > maxW || m.bh > maxH || m.area > maxArea) return null;
  return pts;
}

function sanitizeContourHolePts(pts, maxW, maxH, maxArea) {
  if (!pts || pts.length < 3) return null;
  const m = contourBBoxMetrics(pts);
  if (m.bw > maxW || m.bh > maxH || m.area > maxArea) return null;
  return pts;
}

function sanitizeContours(contours, w, h, opts) {
  if (!contours || !contours.length) return [];
  const maxW = w * GROWTH_MAX_BBOX_FRAC;
  const maxH = h * GROWTH_MAX_BBOX_FRAC;
  const maxArea = w * h * 0.42;
  const minPts = opts?.minPts ?? 4;
  const valid = [];

  for (let i = 0; i < contours.length; i++) {
    const entry = contours[i];
    if (isCompoundContour(entry)) {
      const outer = sanitizeContourPts(
        clampContourPoints(entry.outer, GROWTH_MAX_POINTS_PER_CONTOUR),
        maxW,
        maxH,
        maxArea,
        minPts
      );
      if (!outer) continue;
      const holes = [];
      for (let hi = 0; hi < (entry.holes || []).length; hi++) {
        const hole = sanitizeContourHolePts(
          clampContourPoints(entry.holes[hi], GROWTH_MAX_POINTS_PER_CONTOUR),
          maxW,
          maxH,
          maxArea
        );
        if (hole) holes.push(hole);
      }
      valid.push({ pts: outer, area: contourBBoxMetrics(outer).area, compound: { outer, holes } });
      continue;
    }
    const pts = sanitizeContourPts(entry, maxW, maxH, maxArea, minPts);
    if (!pts) continue;
    valid.push({ pts, area: contourBBoxMetrics(pts).area });
  }

  return trimContourCandidates(valid, GROWTH_MAX_CONTOURS).map((v) =>
    v.compound ? v.compound : clampContourPoints(v.pts, GROWTH_MAX_POINTS_PER_CONTOUR)
  );
}

function simHasGrowth() {
  if (!sim || !sim.getLines) return false;
  const lines = sim.getLines();
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].nodes && lines[i].nodes.length > 0) return true;
  }
  return false;
}

function commitDrawStroke(p) {
  if (!drawG || !p || state.input !== "draw") return;

  let contours = extractNewDrawContours(drawStrokeBefore, drawG, p.width, p.height);
  if (contours.length === 0) {
    contours = contoursFromGraphics(drawG, p.width, p.height, true);
  }
  mergeStrokeToDrawSeed(p);
  drawG.clear();

  if (contours.length === 0 && drawSeedG && !simHasGrowth()) {
    contours = contoursFromGraphics(drawSeedG, p.width, p.height, true);
  }
  contours = sanitizeContours(contours, p.width, p.height, { minPts: 3 });
  if (contours.length === 0) return;

  if (!simHasGrowth()) {
    rebuildSim();
    return;
  }

  if (sim.appendContours) {
    sim.appendContours(contours);
  } else {
    rebuildSim();
  }
}

/* ============================================================
   KONTUREN aus der maske extrahieren
   ============================================================ */

function subsampleChain(chain, maxPts) {
  if (chain.length <= maxPts) return chain;
  const out = [];
  const step = chain.length / maxPts;
  for (let i = 0; i < maxPts; i++) out.push(chain[Math.floor(i * step)]);
  return out;
}

function chainBoundaryPoints(pts, linkDist) {
  if (pts.length < 3) return pts.slice();
  const used = new Uint8Array(pts.length);
  let start = 0;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].x < pts[start].x || (pts[i].x === pts[start].x && pts[i].y < pts[start].y)) start = i;
  }
  const chain = [pts[start]];
  used[start] = 1;
  let cur = start;
  const maxLink = linkDist * linkDist;
  for (let k = 1; k < pts.length; k++) {
    let best = -1;
    let bestD = Infinity;
    const cx = pts[cur].x;
    const cy = pts[cur].y;
    for (let i = 0; i < pts.length; i++) {
      if (used[i]) continue;
      const dx = pts[i].x - cx;
      const dy = pts[i].y - cy;
      const d = dx * dx + dy * dy;
      if (d < bestD && d <= maxLink) {
        bestD = d;
        best = i;
      }
    }
    if (best < 0) break;
    used[best] = 1;
    chain.push(pts[best]);
    cur = best;
  }
  return chain;
}

function extractContoursFromMask(mask, mw, mh, scale, opts) {
  const labels = new Int32Array(mw * mh);
  const components = [];
  let label = 0;

  for (let gy = 0; gy < mh; gy++) {
    for (let gx = 0; gx < mw; gx++) {
      const idx = gy * mw + gx;
      if (!mask[idx] || labels[idx]) continue;
      label++;
      const pixels = [];
      const stack = [[gx, gy]];
      labels[idx] = label;
      while (stack.length) {
        const [cx, cy] = stack.pop();
        pixels.push([cx, cy]);
        const nbs = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
        for (let n = 0; n < 4; n++) {
          const nx = nbs[n][0];
          const ny = nbs[n][1];
          if (nx < 0 || nx >= mw || ny < 0 || ny >= mh) continue;
          const ni = ny * mw + nx;
          if (mask[ni] && !labels[ni]) {
            labels[ni] = label;
            stack.push([nx, ny]);
          }
        }
      }
      components.push(pixels);
    }
  }

  components.sort((a, b) => b.length - a.length);
  const relevant = components.slice(0, 36);
  const minArea = opts && opts.minArea != null
    ? opts.minArea
    : Math.max(6, mw * mh * 0.0008);
  const nodesPerContour = clamp(
    Math.floor(40 / Math.max(1, relevant.length)),
    8,
    GROWTH_MAX_POINTS_PER_CONTOUR
  );

  const contours = [];
  const linkDist = scale * 2.2;
  const minContourPts = opts && opts.minContourPts != null ? opts.minContourPts : 4;

  for (let c = 0; c < relevant.length; c++) {
    const comp = relevant[c];
    if (comp.length < minArea) continue;

    const compSet = new Set();
    for (let i = 0; i < comp.length; i++) compSet.add(comp[i][1] * mw + comp[i][0]);

    const boundary = [];
    for (let i = 0; i < comp.length; i++) {
      const gx = comp[i][0];
      const gy = comp[i][1];
      let edge = false;
      for (let dy = -1; dy <= 1 && !edge; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = gx + dx;
          const ny = gy + dy;
          if (nx < 0 || nx >= mw || ny < 0 || ny >= mh || !compSet.has(ny * mw + nx)) {
            edge = true;
            break;
          }
        }
      }
      if (edge) boundary.push({ x: (gx + 0.5) * scale, y: (gy + 0.5) * scale });
    }

    const minBoundary = opts && opts.minBoundary != null ? opts.minBoundary : 8;
    if (boundary.length < minBoundary) continue;
    const chained = chainBoundaryPoints(boundary, linkDist);
    const simplified = subsampleChain(chained, nodesPerContour);
    if (simplified.length >= minContourPts) contours.push(simplified);
  }
  return contours;
}

/* ============================================================
   REACTOR — typereactor text→kontur (canvas-font, moore-trace)
   ============================================================ */

const loadedReactorFonts = new Set();

async function loadReactorFont(family, url) {
  const trimmed = (url || "").trim();
  if (!trimmed) return true;
  const key = `${family}::${trimmed}`;
  if (loadedReactorFonts.has(key)) return true;
  try {
    const ff = new FontFace(family, `url(${trimmed})`);
    await ff.load();
    document.fonts.add(ff);
    loadedReactorFonts.add(key);
    return true;
  } catch (err) {
    console.warn("Reactor-Font konnte nicht geladen werden:", err);
    return false;
  }
}

function reactorFontCss(family, size, weight) {
  const fam = (family || "Helvetica Neue").trim();
  const quoted = fam.includes(" ") ? `"${fam}"` : fam;
  return `${weight || "700"} ${size}px ${quoted}, Helvetica, Arial, sans-serif`;
}

function seedGlyphCount(text) {
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c !== " " && c !== "\n" && c !== "\t") n++;
  }
  return Math.max(1, n);
}

// weniger buchstaben → größere schrift; einzelbuchstabe füllt den display (alle modi)
function measureSeedFontSize(ctx, text, w, h, family, weight) {
  const trimmed = (text || "").trim();
  if (!trimmed.length) return Math.max(24, Math.min(h * 0.5, w * 0.5));

  const chars = seedGlyphCount(trimmed);
  let size = Math.min(h * 0.8, w * 0.85);
  ctx.font = reactorFontCss(family, size, weight);
  const targetFrac = clamp(0.9 / Math.pow(chars, 0.32), 0.2, 0.9);
  const target = w * targetFrac;
  const tw = ctx.measureText(trimmed).width || 1;
  if (tw > target) size *= target / tw;
  ctx.font = reactorFontCss(family, size, weight);
  const glyph = measureReactorGlyph(ctx, trimmed, ctx.font);
  const vPad = Math.max(28, h * 0.1);
  const maxH = h - vPad * 2;
  if (glyph.height > maxH) size *= maxH / glyph.height;
  return Math.max(22, size);
}

function makeBinaryFromCanvas(ctx, w, h, threshold = 128) {
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  const bin = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      bin[y * w + x] = data[i + 3] > threshold ? 1 : 0;
    }
  }
  return bin;
}

function isBinaryBoundary(bin, w, h, x, y) {
  const idx = y * w + x;
  if (!bin[idx]) return false;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || !bin[ny * w + nx]) return true;
    }
  }
  return false;
}

function morphCloseBinary(bin, w, h) {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!bin[y * w + x]) continue;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h) out[ny * w + nx] = 1;
        }
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!out[i]) continue;
      let keep = false;
      for (let dy = -1; dy <= 1 && !keep; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || !bin[ny * w + nx]) {
            keep = true;
            break;
          }
        }
      }
      if (!keep) out[i] = 0;
    }
  }
  return out;
}

function measureReactorGlyph(ctx, text, font) {
  ctx.font = font;
  ctx.textBaseline = "alphabetic";
  const m = ctx.measureText(text);
  const pad = 6;
  const ascent = (m.actualBoundingBoxAscent || m.fontBoundingBoxAscent || 0) + pad;
  const descent = (m.actualBoundingBoxDescent || m.fontBoundingBoxDescent || 0) + pad;
  return {
    width: m.width || 0,
    ascent,
    descent,
    height: ascent + descent,
    centerOffset: (descent - ascent) * 0.5,
  };
}

// gemeinsame grundlinie für alle zeichen einer zeile
function seedLineMetrics(ctx, text, layout, family, weight) {
  const fontSizePx = measureSeedFontSize(
    ctx, text, layout.measureW, layout.measureH, family, weight
  );
  const font = reactorFontCss(family, fontSizePx, weight);
  ctx.font = font;
  const glyph = measureReactorGlyph(ctx, text, font);
  const pad = 16;
  const localBaselineY = pad + glyph.ascent;
  const textWidth = glyph.width || (text.length * fontSizePx * 0.6);
  const cellH = Math.max(32, Math.ceil(glyph.height + pad * 2));

  const lineCanvas = document.createElement("canvas");
  const lineCtx = lineCanvas.getContext("2d");
  let worldBaselineY = layout.textCenterY - glyph.centerOffset;
  if (lineCtx) {
    lineCanvas.width = Math.max(8, Math.ceil(textWidth + pad * 2));
    lineCanvas.height = cellH;
    lineCtx.font = font;
    lineCtx.textBaseline = "alphabetic";
    lineCtx.fillStyle = "#fff";
    lineCtx.fillText(text, pad, localBaselineY);
    let bin = makeBinaryFromCanvas(lineCtx, lineCanvas.width, cellH);
    bin = morphCloseBinary(bin, lineCanvas.width, cellH);
    const ink = bin ? measureInkBounds(bin, lineCanvas.width, cellH) : null;
    if (ink) {
      worldBaselineY = layout.textCenterY - (ink.cy - localBaselineY);
    }
  }

  return { font, fontSizePx, glyph, pad, localBaselineY, worldBaselineY, textWidth, cellH };
}

function traceContoursMoore(bin, w, h, mapToWorld) {
  const dirs = [
    { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: -1 }, { x: -1, y: -1 },
    { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 },
  ];
  const visited = new Uint8Array(w * h);
  const contours = [];
  const idx = (x, y) => y * w + x;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i0 = idx(x, y);
      if (bin[i0] === 0 || visited[i0]) continue;
      if (!isBinaryBoundary(bin, w, h, x, y)) continue;
      let cx = x;
      let cy = y;
      let backDir = 0;
      const contour = [];
      let guard = 0;
      let closed = false;
      do {
        contour.push(mapToWorld(cx, cy));
        visited[idx(cx, cy)] = 1;
        let found = false;
        for (let k = 0; k < 8; k++) {
          const di = (backDir + k) % 8;
          const nx = cx + dirs[di].x;
          const ny = cy + dirs[di].y;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (bin[idx(nx, ny)] === 1) {
            backDir = (di + 5) % 8;
            cx = nx;
            cy = ny;
            found = true;
            break;
          }
        }
        if (!found) break;
        if (++guard > 20000) break;
        if (cx === x && cy === y) closed = true;
      } while (!closed);
      if (!closed && contour.length >= 4) {
        const f = contour[0];
        const l = contour[contour.length - 1];
        if (Math.hypot(f.x - l.x, f.y - l.y) <= 2.5) closed = true;
      }
      if (closed && contour.length >= 4) contours.push(contour);
    }
  }
  return contours;
}

// text in der mitte — auf mobil in der sichtfläche über dem sheet
function getMobileSheetInset() {
  if (!window.matchMedia("(max-width: 760px)").matches) return 0;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--sheet-h").trim();
  if (raw.endsWith("px")) {
    const n = parseFloat(raw);
    if (n > 0) return n;
  }
  return window.innerHeight * 0.4;
}

function syncMobileSheetHeight() {
  const panel = document.querySelector(".side-panel");
  const mobile = window.matchMedia("(max-width: 760px)").matches;
  if (!mobile || !panel) {
    document.documentElement.style.removeProperty("--sheet-h");
    return;
  }
  document.documentElement.style.setProperty(
    "--sheet-h",
    `${Math.ceil(panel.getBoundingClientRect().height)}px`
  );
}

function getGrowthLayout(w, h) {
  const sheetH = getMobileSheetInset();
  const visibleH = Math.max(1, h - sheetH);
  return {
    w,
    h,
    sheetH,
    visibleH,
    measureW: w,
    measureH: sheetH > 0 ? visibleH : h,
    textCenterY: sheetH > 0 ? visibleH * 0.5 : h * 0.5,
  };
}

function measureInkBounds(bin, bw, bh) {
  let minX = bw;
  let minY = bh;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      if (!bin[y * bw + x]) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX) return null;
  return {
    minX,
    minY,
    maxX,
    maxY,
    cx: (minX + maxX) * 0.5,
    cy: (minY + maxY) * 0.5,
  };
}

function seedTextWorldMap(w, h, textWidth, glyph, margin, canvasCenterY, centerY) {
  const startX = (w - textWidth) * 0.5;
  const startY = centerY != null ? centerY : h * 0.5;
  return (px, py) => ({
    x: startX + (px - margin),
    y: startY + (py - canvasCenterY),
  });
}

function getReactorTextRect(el) {
  try {
    if (!el) return null;
    const textNode = Array.from(el.childNodes).find(
      (n) => n.nodeType === Node.TEXT_NODE && n.nodeValue.length > 0
    );
    if (textNode) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = range.getClientRects();
      if (rects && rects.length > 0) {
        for (let r = 0; r < rects.length; r++) {
          if (rects[r].width > 0 && rects[r].height > 0) {
            range.detach?.();
            return rects[r];
          }
        }
      }
      const r = range.getBoundingClientRect();
      range.detach?.();
      if (r && r.width > 0) return r;
    }
  } catch (err) {
    /* ignore */
  }
  return el.getBoundingClientRect();
}

function openContourRing(pts) {
  if (!pts || pts.length < 3) return pts ? pts.slice() : [];
  const out = pts.slice();
  const f = out[0];
  const l = out[out.length - 1];
  if (Math.hypot(f.x - l.x, f.y - l.y) < 1e-6) out.pop();
  return out;
}

function contourGap(pts) {
  if (!pts || pts.length < 2) return Infinity;
  const f = pts[0];
  const l = pts[pts.length - 1];
  return Math.hypot(f.x - l.x, f.y - l.y);
}

function normalizeClosedContour(pts) {
  const ring = openContourRing(pts);
  return ring.length >= 3 ? ring : null;
}

function processReactorContour(c, maxEdge) {
  if (!c || c.length < 3) return null;
  if (contourGap(c) > Math.max(3, maxEdge * 0.5)) return null;
  const targetSpacing = Math.max(1, Math.round(maxEdge * 0.85));
  let res = resampleContourTR(c, targetSpacing, 2000);
  const enforced = enforceMaxEdgeLengthTR(res, maxEdge);
  const pruned = removeCollinearTR(enforced, 6, 0.6, targetSpacing);
  const final = normalizeClosedContour(pruned.length >= 3 ? pruned : enforced);
  return final && final.length >= 4 ? final : null;
}

function contourSignedArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a * 0.5;
}

function contourCentroid(pts) {
  let x = 0;
  let y = 0;
  for (let i = 0; i < pts.length; i++) {
    x += pts[i].x;
    y += pts[i].y;
  }
  const n = pts.length || 1;
  return { x: x / n, y: y / n };
}

function pointInPolygon(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x;
    const yi = pts[i].y;
    const xj = pts[j].x;
    const yj = pts[j].y;
    const intersect = ((yi > y) !== (yj > y))
      && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function classifyContoursAsHoles(ptsList) {
  const items = ptsList.map((pts) => {
    const ring = openContourRing(pts);
    const c = contourCentroid(ring);
    return {
      pts: ring,
      area: Math.abs(contourSignedArea(ring)),
      cx: c.x,
      cy: c.y,
      depth: 0,
    };
  });
  items.sort((a, b) => b.area - a.area);
  for (let i = 0; i < items.length; i++) {
    for (let j = 0; j < items.length; j++) {
      if (i === j || items[j].area <= items[i].area) continue;
      if (pointInPolygon(items[i].cx, items[i].cy, items[j].pts)) items[i].depth++;
    }
  }
  return items.map(({ pts, depth }) => ({ pts, isHole: depth % 2 === 1 }));
}

// lab2: nur äußerste kontur pro blob — keine doppel-linie (stroke innen/außen)
function lab2OuterContoursOnly(ptsList) {
  const entries = classifyContoursAsHoles(ptsList).filter((e) => !e.isHole);
  if (entries.length <= 1) return entries.map((e) => e.pts);

  const kept = [];
  for (let i = 0; i < entries.length; i++) {
    const a = entries[i];
    const areaA = Math.abs(contourSignedArea(a.pts));
    const cent = contourCentroid(a.pts);
    let nested = false;
    for (let j = 0; j < entries.length; j++) {
      if (i === j) continue;
      const areaB = Math.abs(contourSignedArea(entries[j].pts));
      if (areaB <= areaA) continue;
      if (pointInPolygon(cent.x, cent.y, entries[j].pts)) {
        nested = true;
        break;
      }
    }
    if (!nested) kept.push(a.pts);
  }
  return kept;
}

function distPointToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function distPointToContour(px, py, pts) {
  let minD = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const d = distPointToSegment(px, py, a.x, a.y, b.x, b.y);
    if (d < minD) minD = d;
  }
  return minD;
}

// hauptkontur + nur klar getrennte teile (i-tüpfel), keine innen-kante bei c/h
function lab2PickCharContours(outers, fontSizePx) {
  const minArea = (fontSizePx * 0.06) ** 2;
  const items = outers
    .map((pts) => ({
      pts,
      area: Math.abs(contourSignedArea(pts)),
      cent: contourCentroid(pts),
    }))
    .filter((it) => it.area >= minArea)
    .sort((a, b) => b.area - a.area);
  if (!items.length) return [];
  if (items.length === 1) return [items[0].pts];

  const main = items[0];
  const kept = [main.pts];
  const sepDist = Math.max(8, fontSizePx * 0.14);

  for (let i = 1; i < items.length; i++) {
    const c = items[i];
    if (pointInPolygon(c.cent.x, c.cent.y, main.pts)) continue;
    if (distPointToContour(c.cent.x, c.cent.y, main.pts) < sepDist) continue;
    const mb = contourBBoxMetrics(main.pts);
    const cb = contourBBoxMetrics(c.pts);
    const overlapW = Math.max(0, Math.min(mb.maxX, cb.maxX) - Math.max(mb.minX, cb.minX));
    const overlapH = Math.max(0, Math.min(mb.maxY, cb.maxY) - Math.max(mb.minY, cb.minY));
    const overlap = overlapW * overlapH;
    if (c.area < main.area * 0.55 && overlap > cb.bw * cb.bh * 0.35) continue;
    kept.push(c.pts);
  }
  return kept;
}

function lab2DedupeTracedRings(ptsList) {
  if (ptsList.length <= 1) return ptsList;
  const parts = lab2ContourParts(ptsList);
  const keep = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    let dup = false;
    for (let k = 0; k < keep.length; k++) {
      const m = keep[k];
      const ratio = p.area / (m.area || 1);
      if (ratio < 0.7 || ratio > 1.42) continue;
      const dist = Math.hypot(p.cent.x - m.cent.x, p.cent.y - m.cent.y);
      const overlap = lab2BboxOverlap(p.bbox, m.bbox);
      const minBox = Math.min(p.bbox.bw * p.bbox.bh, m.bbox.bw * m.bbox.bh);
      if (dist < 8 || (minBox > 0 && overlap > minBox * 0.62)) {
        dup = true;
        break;
      }
    }
    if (!dup) keep.push(p);
  }
  return keep.map((p) => p.pts);
}

// pro buchstabe: genau eine glyph-form { outer, holes[] } (+ getrennte teile wie i-tüpfel)
function lab2ContourParts(ptsList) {
  return ptsList
    .map((pts) => ({
      pts,
      area: Math.abs(contourSignedArea(pts)),
      cent: contourCentroid(pts),
      bbox: contourBBoxMetrics(pts),
    }))
    .filter((p) => p.area > 0)
    .sort((a, b) => b.area - a.area);
}

function lab2BboxOverlap(a, b) {
  const overlapW = Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX));
  const overlapH = Math.max(0, Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY));
  return overlapW * overlapH;
}

function processLab2SmallContour(c, maxEdge) {
  if (!c || c.length < 3) return null;
  if (contourGap(c) > Math.max(4, maxEdge * 0.65)) return null;
  const spacing = Math.max(1.5, maxEdge * 0.42);
  const res = resampleContourTR(c, spacing, 800);
  const final = normalizeClosedContour(res);
  return final && final.length >= 3 ? final : null;
}

function lab2CullDuplicateParts(parts) {
  const kept = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    let dup = false;
    for (let k = 0; k < kept.length; k++) {
      const m = kept[k];
      const areaRatio = p.area / (m.area || 1);
      if (areaRatio < 0.3 || areaRatio > 3.3) continue;
      if (Math.hypot(p.cent.x - m.cent.x, p.cent.y - m.cent.y) < 6) {
        dup = true;
        break;
      }
      const minArea = Math.min(p.bbox.bw * p.bbox.bh, m.bbox.bw * m.bbox.bh);
      if (minArea > 0 && lab2BboxOverlap(p.bbox, m.bbox) > minArea * 0.78) {
        dup = true;
        break;
      }
    }
    if (!dup) kept.push(p);
  }
  return kept;
}

function lab2DedupeHoleContours(holes) {
  const out = [];
  for (let i = 0; i < holes.length; i++) {
    const h = holes[i];
    const c = contourCentroid(h);
    let dup = false;
    for (let j = 0; j < out.length; j++) {
      const ec = contourCentroid(out[j]);
      if (Math.hypot(c.x - ec.x, c.y - ec.y) < 4) {
        dup = true;
        break;
      }
    }
    if (!dup) out.push(h);
  }
  return out;
}

function processLab2HoleContour(c, maxEdge) {
  if (!c || c.length < 3) return null;
  const spacing = Math.max(2, maxEdge * 0.48);
  const res = resampleContourTR(openContourRing(c), spacing, 500);
  const pruned = removeCollinearTR(res, 5, 0.45, spacing);
  const final = normalizeClosedContour(pruned.length >= 3 ? pruned : res);
  return final && final.length >= 3 ? final : null;
}

function lab2PickBestHoles(outer, holes) {
  if (!holes || holes.length <= 1) return holes || [];
  const ranked = holes
    .map((pts) => ({
      pts,
      area: Math.abs(contourSignedArea(pts)),
      cent: contourCentroid(pts),
    }))
    .filter((h) => pointInPolygon(h.cent.x, h.cent.y, outer))
    .sort((a, b) => b.area - a.area);
  if (!ranked.length) return [holes[0]];
  const keep = [ranked[0].pts];
  for (let i = 1; i < ranked.length; i++) {
    if (ranked[i].area < ranked[0].area * 0.18) continue;
    if (Math.hypot(ranked[i].cent.x - ranked[0].cent.x, ranked[i].cent.y - ranked[0].cent.y) > 14) {
      keep.push(ranked[i].pts);
      if (keep.length >= 2) break;
    }
  }
  return keep;
}

function lab2SmoothCompoundGlyph(glyph, maxEdge) {
  if (!isCompoundContour(glyph)) return glyph;
  const holes = (glyph.holes || [])
    .map((h) => processLab2HoleContour(h, maxEdge) || h);
  const best = lab2PickBestHoles(glyph.outer, lab2DedupeHoleContours(holes));
  return best.length ? { outer: glyph.outer, holes: best } : glyph.outer;
}

function lab2CharExpectsCounter(ch) {
  return /[0-9OoQqDdRrPpBbAa]/.test(ch);
}

function traceLab2CharContours(charCtx, charCanvas, ch, cw, cellH, line, mapBase) {
  function traceAt(raster) {
    const rw = Math.max(16, Math.ceil(cw * raster));
    const rh = Math.max(16, Math.ceil(cellH * raster));
    charCanvas.width = rw;
    charCanvas.height = rh;
    charCtx.setTransform(1, 0, 0, 1, 0, 0);
    charCtx.clearRect(0, 0, rw, rh);
    charCtx.scale(raster, raster);
    charCtx.font = line.font;
    charCtx.textBaseline = "alphabetic";
    charCtx.textAlign = "left";
    charCtx.fillStyle = "#fff";
    charCtx.fillText(ch, line.pad, line.localBaselineY);

    const bin = makeBinaryFromCanvas(
      charCtx,
      rw,
      rh,
      lab2CharExpectsCounter(ch) ? 148 : 128
    );
    const mapToWorld = (px, py) => mapBase(px / raster, py / raster);
    return traceContoursMoore(bin, rw, rh, mapToWorld);
  }

  let raw = traceAt(3);
  if (raw.length < 2 && lab2CharExpectsCounter(ch)) {
    const hi = traceAt(5);
    if (hi.length > raw.length) raw = hi;
  }
  charCtx.setTransform(1, 0, 0, 1, 0, 0);
  return raw;
}

function lab2GlyphEntryFromPts(pts) {
  const ring = openContourRing(pts);
  return {
    pts: ring,
    area: Math.abs(contourSignedArea(ring)),
    cent: contourCentroid(ring),
    bbox: contourBBoxMetrics(ring),
  };
}

function lab2AssignHolesToOuter(main, holeEntries, used) {
  const holes = [];
  const maxHoleArea = main.area * 0.97;
  for (let j = 0; j < holeEntries.length; j++) {
    if (used[j]) continue;
    const h = holeEntries[j];
    if (h.area >= maxHoleArea) continue;
    const inPoly = pointInPolygon(h.cent.x, h.cent.y, main.pts);
    const inBox = h.cent.x >= main.bbox.minX && h.cent.x <= main.bbox.maxX
      && h.cent.y >= main.bbox.minY && h.cent.y <= main.bbox.maxY;
    if (!inPoly && !inBox) continue;
    if (!inPoly && h.area > main.area * 0.6) continue;
    holes.push(h.pts);
    used[j] = 1;
  }
  return holes;
}

function lab2GlyphsFromTraced(ptsList, fontSizePx) {
  if (!ptsList.length) return [];
  const classified = classifyContoursAsHoles(ptsList);
  const minGlyphArea = (fontSizePx * 0.05) ** 2;
  const minHoleArea = (fontSizePx * 0.004) ** 2;

  const outerEntries = [];
  const holeEntries = [];
  for (let i = 0; i < classified.length; i++) {
    const e = lab2GlyphEntryFromPts(classified[i].pts);
    if (e.area < minHoleArea) continue;
    if (classified[i].isHole) holeEntries.push(e);
    else if (e.area >= minGlyphArea) outerEntries.push(e);
  }

  if (!outerEntries.length && classified.length) {
    const largest = lab2GlyphEntryFromPts(classified[0].pts);
    if (largest.area >= minGlyphArea) outerEntries.push(largest);
  }

  outerEntries.sort((a, b) => b.area - a.area);
  const used = new Uint8Array(holeEntries.length);
  const glyphs = [];

  for (let i = 0; i < outerEntries.length; i++) {
    const main = outerEntries[i];
    const holes = lab2AssignHolesToOuter(main, holeEntries, used);
    const uniqueHoles = lab2DedupeHoleContours(holes);
    glyphs.push(uniqueHoles.length ? { outer: main.pts, holes: uniqueHoles } : main.pts);
  }

  if (glyphs.length && outerEntries.length) {
    const extra = [];
    for (let j = 0; j < holeEntries.length; j++) {
      if (used[j]) continue;
      if (pointInPolygon(holeEntries[j].cent.x, holeEntries[j].cent.y, outerEntries[0].pts)) {
        extra.push(holeEntries[j].pts);
        used[j] = 1;
      }
    }
    if (extra.length) {
      const g = lab2UnpackGlyph(glyphs[0]);
      const holes = lab2DedupeHoleContours(g.holes.concat(extra));
      glyphs[0] = holes.length ? { outer: g.outer, holes } : g.outer;
    }
  }

  return glyphs;
}

function lab2UnpackGlyph(g) {
  if (isCompoundContour(g)) {
    return {
      outer: g.outer,
      holes: g.holes ? g.holes.slice() : [],
      area: Math.abs(contourSignedArea(g.outer)),
    };
  }
  return { outer: g, holes: [], area: Math.abs(contourSignedArea(g)) };
}

// pro zeichen: eine hauptform (+ punzen), doppel-außenkonturen entfernen, i-tüpfel extra
function lab2ConsolidateCharGlyphs(glyphs, fontSizePx) {
  if (!glyphs || !glyphs.length) return glyphs;
  if (glyphs.length === 1) {
    const g = lab2UnpackGlyph(glyphs[0]);
    const holes = lab2DedupeHoleContours(g.holes);
    return holes.length ? [{ outer: g.outer, holes }] : [g.outer];
  }
  const parts = glyphs.map(lab2UnpackGlyph).sort((a, b) => b.area - a.area);
  const used = new Uint8Array(parts.length);
  const result = [];

  for (let i = 0; i < parts.length; i++) {
    if (used[i]) continue;
    const main = parts[i];
    used[i] = 1;

    for (let j = i + 1; j < parts.length; j++) {
      if (used[j]) continue;
      const p = parts[j];
      const cent = contourCentroid(p.outer);
      const pBox = contourBBoxMetrics(p.outer);
      const dist = distPointToContour(cent.x, cent.y, main.outer);
      const overlap = lab2BboxOverlap(contourBBoxMetrics(main.outer), pBox);
      const areaRatio = p.area / (main.area || 1);

      if (pointInPolygon(cent.x, cent.y, main.outer) && p.area < main.area * 0.97) {
        main.holes.push(p.outer, ...p.holes);
        used[j] = 1;
        continue;
      }

      if (
        dist < 5
        || (areaRatio > 0.5 && areaRatio < 1.85 && overlap > pBox.bw * pBox.bh * 0.42)
      ) {
        main.holes.push(...p.holes);
        used[j] = 1;
      }
    }

    const holes = lab2DedupeHoleContours(main.holes);
    result.push(holes.length ? { outer: main.outer, holes } : main.outer);
  }

  for (let j = 0; j < parts.length; j++) {
    if (used[j]) continue;
    const p = parts[j];
    const holes = lab2DedupeHoleContours(p.holes);
    result.push(holes.length ? { outer: p.outer, holes } : p.outer);
  }

  return result;
}

function isCompoundContour(c) {
  return !!(c && c.outer && Array.isArray(c.outer));
}

function contourRings(c) {
  if (isCompoundContour(c)) return [c.outer].concat(c.holes || []);
  return c && c.length >= 2 ? [c] : [];
}

function sanitizeReactorContours(contours, w, h) {
  if (!contours || !contours.length) return [];
  const maxW = w * GROWTH_MAX_BBOX_FRAC;
  const maxH = h * GROWTH_MAX_BBOX_FRAC;
  const maxArea = w * h * 0.42;
  const valid = [];

  for (let i = 0; i < contours.length; i++) {
    const entry = contours[i];
    const pts = entry.pts || entry;
    if (!pts || pts.length < 4) continue;
    const m = contourBBoxMetrics(pts);
    if (m.bw > maxW || m.bh > maxH || m.area > maxArea) continue;
    valid.push({
      pts,
      area: m.area,
      isHole: !!entry.isHole,
    });
  }

  return trimContourCandidates(valid, REACTOR_MAX_CONTOURS).map((v) => ({
    pts: clampContourPoints(v.pts, REACTOR_MAX_POINTS_PER_CONTOUR),
    isHole: v.isHole,
  }));
}

function resampleContourTR(contour, spacing, maxPoints) {
  const pts = openContourRing(contour);
  if (pts.length < 3) return pts;
  const nPts = pts.length;
  const segLens = [];
  let total = 0;
  for (let i = 0; i < nPts; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % nPts];
    const L = Math.hypot(b.x - a.x, b.y - a.y);
    segLens.push(L);
    total += L;
  }
  if (total === 0) return [pts[0]];
  const n = Math.min(Math.max(4, Math.ceil(total / Math.max(1, spacing))), maxPoints);
  const out = [];
  let segIndex = 0;
  let acc = 0;
  for (let k = 0; k < n; k++) {
    const t = (k / n) * total;
    while (segIndex < segLens.length && acc + segLens[segIndex] < t) {
      acc += segLens[segIndex++];
    }
    if (segIndex >= segLens.length) segIndex = segLens.length - 1;
    const a = pts[segIndex];
    const b = pts[(segIndex + 1) % nPts];
    const segL = segLens[segIndex] || 1e-6;
    const localT = Math.max(0, Math.min(1, (t - acc) / segL));
    out.push({ x: a.x + (b.x - a.x) * localT, y: a.y + (b.y - a.y) * localT });
  }
  return out;
}

function enforceMaxEdgeLengthTR(contour, maxEdge) {
  const pts = openContourRing(contour);
  if (pts.length < 3 || !isFinite(maxEdge) || maxEdge <= 0) return pts;
  const n = pts.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    out.push({ x: a.x, y: a.y });
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const L = Math.hypot(dx, dy);
    if (L > maxEdge) {
      const parts = Math.ceil(L / maxEdge);
      for (let k = 1; k < parts; k++) {
        const t = k / parts;
        out.push({ x: a.x + dx * t, y: a.y + dy * t });
      }
    }
  }
  return out;
}

function removeCollinearTR(pts, angleThresholdDeg, minDist, targetSpacing) {
  const ring = openContourRing(pts);
  if (ring.length < 3) return ring;
  const n = ring.length;
  const keep = new Array(n).fill(true);
  const cosThresh = Math.cos((angleThresholdDeg * Math.PI) / 180);
  const keepThreshold = Math.max(minDist, targetSpacing * 0.75);
  for (let i = 0; i < n; i++) {
    const a = ring[(i - 1 + n) % n];
    const b = ring[i];
    const c = ring[(i + 1) % n];
    const dx1 = b.x - a.x;
    const dy1 = b.y - a.y;
    const dx2 = c.x - b.x;
    const dy2 = c.y - b.y;
    const L1 = Math.hypot(dx1, dy1);
    const L2 = Math.hypot(dx2, dy2);
    if (L1 < minDist || L2 < minDist) continue;
    const dot = (dx1 / L1) * (dx2 / L2) + (dy1 / L1) * (dy2 / L2);
    if (dot >= cosThresh && L1 < keepThreshold && L2 < keepThreshold) keep[i] = false;
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    if (keep[i]) out.push(ring[i]);
  }
  return out.length >= 3 ? out : ring;
}

function generateReactorTextContours(text, w, h, family, weight, maxEdge) {
  const tmp = document.createElement("canvas");
  const ctx = tmp.getContext("2d");
  if (!ctx || !text.length) return [];

  const layout = getGrowthLayout(w, h);
  const line = seedLineMetrics(ctx, text, layout, family, weight);
  const textWidth = line.glyph.width || (text.length * line.fontSizePx * 0.6);

  const margin = line.pad;
  const logicalW = Math.max(2, Math.ceil(textWidth + margin * 2));
  const logicalH = Math.max(2, Math.ceil(line.glyph.height + margin * 2));
  tmp.width = logicalW;
  tmp.height = logicalH;

  ctx.clearRect(0, 0, logicalW, logicalH);
  ctx.font = line.font;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#fff";
  ctx.fillText(text, margin, line.localBaselineY);

  let bin = makeBinaryFromCanvas(ctx, logicalW, logicalH);
  bin = morphCloseBinary(bin, logicalW, logicalH);
  bin = morphCloseBinary(bin, logicalW, logicalH);
  if (!bin) return [];

  const startX = (w - textWidth) * 0.5;
  const mapToWorld = (px, py) => ({
    x: startX + (px - margin),
    y: line.worldBaselineY + (py - line.localBaselineY),
  });

  const raw = traceContoursMoore(bin, logicalW, logicalH, mapToWorld);
  const ptsList = [];

  for (let i = 0; i < raw.length; i++) {
    const final = processReactorContour(raw[i], maxEdge);
    if (final) ptsList.push(final);
  }

  const cy = layout.textCenterY;
  if (!ptsList.length) {
    return classifyContoursAsHoles([[
      { x: w / 2 - 40, y: cy - 20 },
      { x: w / 2 + 40, y: cy - 20 },
      { x: w / 2 + 40, y: cy + 20 },
      { x: w / 2 - 40, y: cy + 20 },
    ]]);
  }

  return classifyContoursAsHoles(ptsList);
}

// lab2: pro zeichen alle äußeren konturen (z. b. i-tüpfel + stamm, ö-punkte)
function generateLab2TextContours(text, w, h, family, weight, maxEdge) {
  const charCanvas = document.createElement("canvas");
  const charCtx = charCanvas.getContext("2d");
  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  if (!charCtx || !measureCtx || !text.length) return [];

  const layout = getGrowthLayout(w, h);
  const line = seedLineMetrics(measureCtx, text, layout, family, weight);
  const textWidth = line.textWidth;
  const cellH = line.cellH;
  const startX = (w - textWidth) * 0.5;

  measureCtx.font = line.font;

  const contours = [];
  let penX = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const chW = measureCtx.measureText(ch).width;
    if (ch === " " || ch === "\n" || ch === "\t") {
      penX += chW || line.fontSizePx * 0.28;
      continue;
    }

    const cw = Math.max(12, Math.ceil(chW + line.pad * 2));
    const mapBase = (lx, ly) => ({
      x: startX + penX + (lx - line.pad),
      y: line.worldBaselineY + (ly - line.localBaselineY),
    });

    const raw = traceLab2CharContours(charCtx, charCanvas, ch, cw, cellH, line, mapBase);
    const ptsList = [];
    for (let r = 0; r < raw.length; r++) {
      let final = processReactorContour(raw[r], maxEdge);
      if (!final) final = processLab2SmallContour(raw[r], maxEdge);
      if (final) ptsList.push(final);
    }

    const picked = lab2ConsolidateCharGlyphs(
      lab2GlyphsFromTraced(lab2DedupeTracedRings(ptsList), line.fontSizePx),
      line.fontSizePx
    ).map((g) => lab2SmoothCompoundGlyph(g, maxEdge));
    for (let o = 0; o < picked.length; o++) contours.push(picked[o]);

    penX += chW;
  }

  return contours;
}

function buildReactorContours(w, h, maxEdge) {
  if (state.input === "text") {
    const txt = (state.text || "").trim().slice(0, 20);
    if (!txt.length) return [];
    return sanitizeReactorContours(
      generateReactorTextContours(
        txt,
        w,
        h,
        state.reactorFont,
        state.reactorFontWeight,
        maxEdge
      ),
      w,
      h
    );
  }

  return sanitizeReactorContours(
    classifyContoursAsHoles(extractContoursFromMask(seed.mask, seed.mw, seed.mh, SCALE)),
    w,
    h
  );
}

/* ============================================================
   ADERN — differential line growth
   ============================================================ */

function makeGrowthNode(x, y, seedX, seedY) {
  return {
    x,
    y,
    seedX: seedX ?? x,
    seedY: seedY ?? y,
    vx: (Math.random() - 0.5) * 0.12,
    vy: (Math.random() - 0.5) * 0.12,
    maxSpeed: 0.85,
    maxForce: 1.6,
  };
}

function limitVec(vx, vy, max) {
  const m = Math.hypot(vx, vy);
  if (m > max && m > 0) return [(vx / m) * max, (vy / m) * max];
  return [vx, vy];
}

function clampLinesToDisplay(lines, bounds, strokeW) {
  const pad = strokeW * 0.5 + 2;
  for (let li = 0; li < lines.length; li++) {
    const nodes = lines[li].nodes;
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].x = clamp(nodes[i].x, pad, bounds.w - pad);
      nodes[i].y = clamp(nodes[i].y, pad, bounds.h - pad);
    }
  }
}

function edgeRepulsionForce(node, bounds, pad, margin) {
  let fx = 0;
  let fy = 0;
  const left = pad + margin;
  const right = bounds.w - pad - margin;
  const top = pad + margin;
  const bottom = bounds.h - pad - margin;
  if (node.x < left) fx += (left - node.x) * 0.1;
  if (node.x > right) fx -= (node.x - right) * 0.1;
  if (node.y < top) fy += (top - node.y) * 0.1;
  if (node.y > bottom) fy -= (node.y - bottom) * 0.1;
  return [fx, fy];
}

function orient(ax, ay, bx, by, cx, cy) {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  const o1 = orient(ax, ay, bx, by, cx, cy);
  const o2 = orient(ax, ay, bx, by, dx, dy);
  const o3 = orient(cx, cy, dx, dy, ax, ay);
  const o4 = orient(cx, cy, dx, dy, bx, by);
  if (o1 === 0 && o2 === 0 && o3 === 0 && o4 === 0) return false;
  return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0);
}

function lineBBox(nodes) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].x < minX) minX = nodes[i].x;
    if (nodes[i].x > maxX) maxX = nodes[i].x;
    if (nodes[i].y < minY) minY = nodes[i].y;
    if (nodes[i].y > maxY) maxY = nodes[i].y;
  }
  return { minX, minY, maxX, maxY };
}

function resolveCrossings(lines, clearance) {
  // sanft entwirren: kleine schübe über mehrere frames statt großer sprünge,
  // die das liniennetz ins chaos kippen lassen
  const push = Math.min(clearance * 0.35, 4);
  const boxes = lines.map((l) => lineBBox(l.nodes));

  for (let la = 0; la < lines.length; la++) {
    const nodesA = lines[la].nodes;
    const nA = nodesA.length;
    for (let lb = la; lb < lines.length; lb++) {
      // bounding-box-schnelltest zwischen verschiedenen konturen
      if (lb !== la) {
        const a = boxes[la];
        const b = boxes[lb];
        if (
          a.maxX + clearance < b.minX || b.maxX + clearance < a.minX ||
          a.maxY + clearance < b.minY || b.maxY + clearance < a.minY
        ) continue;
      }
      const nodesB = lines[lb].nodes;
      const nB = nodesB.length;
      for (let i = 0; i < nA; i++) {
        const i2 = (i + 1) % nA;
        const ax = nodesA[i].x;
        const ay = nodesA[i].y;
        const bx = nodesA[i2].x;
        const by = nodesA[i2].y;
        const jStart = lb === la ? i + 2 : 0;
        for (let j = jStart; j < nB; j++) {
          if (lb === la && j === nA - 1) continue;
          const j2 = (j + 1) % nB;
          if (lb === la && (j === i || j2 === i || j === i2 || j2 === i2)) continue;
          const cx = nodesB[j].x;
          const cy = nodesB[j].y;
          const dx = nodesB[j2].x;
          const dy = nodesB[j2].y;
          if (!segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy)) continue;
          let nx = bx - ax + dy - cy;
          let ny = by - ay - (dx - cx);
          const nm = Math.hypot(nx, ny) || 1;
          nx /= nm;
          ny /= nm;
          nodesA[i].x -= nx * push;
          nodesA[i].y -= ny * push;
          nodesA[i2].x -= nx * push;
          nodesA[i2].y -= ny * push;
          nodesB[j].x += nx * push;
          nodesB[j].y += ny * push;
          nodesB[j2].x += nx * push;
          nodesB[j2].y += ny * push;
        }
      }
    }
  }
}

function applyOutwardBias(lines, strength) {
  // wachstum entlang der gespeicherten ausgangsrichtung — form bleibt lesbar
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const nodes = line.nodes;
    const ln = nodes.length;
    if (ln < 3) continue;
    const cx = line.seedCx;
    const cy = line.seedCy;
    for (let i = 0; i < ln; i++) {
      let dx = nodes[i].seedX - cx;
      let dy = nodes[i].seedY - cy;
      const m = Math.hypot(dx, dy) || 1;
      nodes[i].vx += (dx / m) * strength;
      nodes[i].vy += (dy / m) * strength;
    }
  }
}

function applyShapeMemoryLines(lines, strength) {
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const nodes = line.nodes;
    if (nodes.length < 3 || line.seedCx == null) continue;

    let avgCur = 0;
    let avgSeed = 0;
    for (let i = 0; i < nodes.length; i++) {
      avgCur += Math.hypot(nodes[i].x - line.seedCx, nodes[i].y - line.seedCy);
      avgSeed += Math.hypot(nodes[i].seedX - line.seedCx, nodes[i].seedY - line.seedCy);
    }
    const scale = avgCur / (avgSeed || 1);

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const sx = n.seedX - line.seedCx;
      const sy = n.seedY - line.seedCy;
      const sm = Math.hypot(sx, sy) || 1;
      const rdx = sx / sm;
      const rdy = sy / sm;
      const targetX = line.seedCx + sx * scale;
      const targetY = line.seedCy + sy * scale;
      let dx = targetX - n.x;
      let dy = targetY - n.y;
      const radial = dx * rdx + dy * rdy;
      dx -= rdx * radial;
      dy -= rdy * radial;
      n.vx += dx * strength;
      n.vy += dy * strength;
    }
  }
}

function differentiateAllLines(lines, clearance, cohesionRatio, factor, bounds, strokeW) {
  const entries = [];
  for (let li = 0; li < lines.length; li++) {
    const nodes = lines[li].nodes;
    for (let ni = 0; ni < nodes.length; ni++) entries.push({ node: nodes[ni], nodes, li, ni });
  }
  const n = entries.length;
  if (n < 3) return;

  const sepX = new Float32Array(n);
  const sepY = new Float32Array(n);
  const influenceR = clearance * 2.4;
  const influenceR2 = influenceR * influenceR;
  const pad = strokeW * 0.5 + 2;
  const margin = 30;

  // spatial grid statt O(n²) — nur nachbarzellen vergleichen
  const cell = influenceR;
  const grid = new Map();
  for (let i = 0; i < n; i++) {
    const key = (Math.floor(entries[i].node.x / cell) + 512) * 4096 + Math.floor(entries[i].node.y / cell) + 512;
    let arr = grid.get(key);
    if (!arr) grid.set(key, (arr = []));
    arr.push(i);
  }

  for (let i = 0; i < n; i++) {
    const ei = entries[i];
    const gx = Math.floor(ei.node.x / cell);
    const gy = Math.floor(ei.node.y / cell);
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const arr = grid.get((gx + ox + 512) * 4096 + gy + oy + 512);
        if (!arr) continue;
        for (let k = 0; k < arr.length; k++) {
          const j = arr[k];
          if (j <= i) continue;
          const ej = entries[j];

          // direkte nachbarn derselben kontur nicht abstoßen
          if (ei.li === ej.li) {
            const diff = Math.abs(ei.ni - ej.ni);
            const wrap = ei.nodes.length - diff;
            if (diff <= 2 || wrap <= 2) continue;
          }

          let dx = ei.node.x - ej.node.x;
          let dy = ei.node.y - ej.node.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 0.25) {
            dx = Math.random() - 0.5;
            dy = Math.random() - 0.5;
            d2 = dx * dx + dy * dy;
          }
          if (d2 >= influenceR2) continue;

          const d = Math.sqrt(d2);
          let f;
          const crossContour = ei.li !== ej.li;
          if (d < clearance) {
            f = ((clearance - d) / d) * (crossContour ? 4.2 : 3.2);
          } else {
            f = ((influenceR - d) / (influenceR * d)) * (crossContour ? 1.5 : 1.1);
          }
          sepX[i] += dx * f;
          sepY[i] += dy * f;
          sepX[j] -= dx * f;
          sepY[j] -= dy * f;
        }
      }
    }
  }

  for (let i = 0; i < n; i++) {
    const node = entries[i].node;
    const nodes = entries[i].nodes;
    const ni = entries[i].ni;
    const ln = nodes.length;

    const prev = nodes[(ni - 1 + ln) % ln];
    const next = nodes[(ni + 1) % ln];
    const mx = (prev.x + next.x) * 0.5;
    const my = (prev.y + next.y) * 0.5;
    let dx = mx - node.x;
    let dy = my - node.y;
    const dm = Math.hypot(dx, dy) || 1;
    dx = (dx / dm) * node.maxSpeed * 0.55;
    dy = (dy / dm) * node.maxSpeed * 0.55;
    let cx = dx - node.vx;
    let cy = dy - node.vy;
    [cx, cy] = limitVec(cx, cy, node.maxForce * 0.7);

    let sx = sepX[i];
    let sy = sepY[i];
    const sm = Math.hypot(sx, sy);
    if (sm > 0) {
      sx = (sx / sm) * node.maxSpeed * 2.1;
      sy = (sy / sm) * node.maxSpeed * 2.1;
      [sx, sy] = limitVec(sx, sy, node.maxForce * 2.4);
    }

    let fx = sx + cx * cohesionRatio;
    let fy = sy + cy * cohesionRatio;
    if (bounds) {
      const [efx, efy] = edgeRepulsionForce(node, bounds, pad, margin);
      fx += efx;
      fy += efy;
    }
    node.vx += fx;
    node.vy += fy;
    [node.vx, node.vy] = limitVec(node.vx, node.vy, node.maxSpeed);
    // factor skaliert die bewegung pro frame → flüssig UND langsam
    node.x += node.vx * factor;
    node.y += node.vy * factor;
    if (bounds) {
      node.x = clamp(node.x, pad, bounds.w - pad);
      node.y = clamp(node.y, pad, bounds.h - pad);
    }
  }

  applyOutwardBias(lines, 0.09 * factor);
}

function growLine(nodes, maxEdge, makeNode = makeGrowthNode, budget = GROWTH_MAX_SPLITS_PER_FRAME) {
  let left = budget;
  const n = nodes.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(nodes[i]);
    if (left <= 0) continue;
    const j = (i + 1) % n;
    const dx = nodes[j].x - nodes[i].x;
    const dy = nodes[j].y - nodes[i].y;
    if (Math.hypot(dx, dy) > maxEdge) {
      out.push(makeNode(
        (nodes[i].x + nodes[j].x) * 0.5,
        (nodes[i].y + nodes[j].y) * 0.5,
        (nodes[i].seedX + nodes[j].seedX) * 0.5,
        (nodes[i].seedY + nodes[j].seedY) * 0.5
      ));
      left--;
    }
  }
  return out;
}

function contoursToGrowthLines(contours) {
  return contours.map((pts) => {
    const nodes = pts.map((pt) => makeGrowthNode(pt.x, pt.y));
    let seedCx = 0;
    let seedCy = 0;
    for (let i = 0; i < nodes.length; i++) {
      seedCx += nodes[i].seedX;
      seedCy += nodes[i].seedY;
    }
    return {
      nodes,
      seedCx: seedCx / nodes.length,
      seedCy: seedCy / nodes.length,
    };
  });
}

// gemeinsame kontur-initialisierung — ändert weder physik noch darstellung
function buildGrowthLines(w, h) {
  const maskScale = seed.maskScale ?? SCALE;
  const drawOpts = state.input === "draw" ? drawExtractOpts() : null;
  const extractOpts = drawOpts
    ? {
        minArea: drawOpts.minArea,
        minBoundary: drawOpts.minBoundary,
        minContourPts: drawOpts.minContourPts,
      }
    : undefined;
  const contours = sanitizeContours(
    extractContoursFromMask(seed.mask, seed.mw, seed.mh, maskScale, extractOpts),
    w,
    h,
    drawOpts ? { minPts: 3 } : undefined
  );
  return contoursToGrowthLines(contours);
}

// lab2 (differential growth): nodes an der schrift-outline (text) bzw. entlang
// der gezeichneten linie (draw). text nutzt die hochauflösende canvas-outline.
function buildLab2Contours(w, h) {
  const paramsState =
    state.mode === "diff3d" ? state.diff3d || {} : state.lab2 || {};
  const prm =
    state.mode === "diff3d" && typeof diff3ComputeParams === "function"
      ? diff3ComputeParams(paramsState, w, h)
      : typeof lab2ComputeParams === "function"
        ? lab2ComputeParams(paramsState, w, h)
        : { seedSpacing: 5 };
  const seedSpacing = prm.seedSpacing;
  let contours;
  if (state.input === "text") {
    const txt = (state.text || "").trim().slice(0, 20);
    if (!txt.length) return [];
    contours = generateLab2TextContours(
      txt,
      w,
      h,
      state.reactorFont || "Helvetica Neue",
      state.reactorFontWeight || "700",
      seedSpacing
    );
  } else {
    const maskScale = seed.maskScale ?? SCALE;
    const drawOpts = state.input === "draw" ? drawExtractOpts() : null;
    const extractOpts = drawOpts
      ? {
          minArea: drawOpts.minArea,
          minBoundary: drawOpts.minBoundary,
          minContourPts: drawOpts.minContourPts,
        }
      : undefined;
    contours = extractContoursFromMask(seed.mask, seed.mw, seed.mh, maskScale, extractOpts).map((pts) => {
      const resampled = processReactorContour(pts, seedSpacing);
      return resampled || pts;
    });
  }
  return sanitizeContours(
    contours,
    w,
    h,
    state.input === "draw" ? { minPts: 3 } : undefined
  );
}

function countSimNodes() {
  if (!sim || !sim.getLines) return 0;
  const lines = sim.getLines();
  let n = 0;
  for (let i = 0; i < lines.length; i++) {
    const nodes = lines[i].nodes;
    if (nodes) n += nodes.length;
    const holes = lines[i].holes;
    if (holes) {
      for (let hi = 0; hi < holes.length; hi++) {
        if (holes[hi]) n += holes[hi].length;
      }
    }
  }
  return n;
}

function refreshDiff3MaxNodesLabel() {
  if (!els.d3MaxNodes) return;
  const max = typeof lab2MaxNodes === "function" ? lab2MaxNodes(state.diff3d) : 4000;
  const cur = sim && typeof sim.totalNodes === "function" ? sim.totalNodes() : 0;
  els.d3MaxNodes.textContent = `${cur} / ${max}`;
}

function refreshDofMaxNodesLabel() {
  if (!els.dofMaxNodes) return;
  const max = typeof lab2MaxNodes === "function" ? lab2MaxNodes(state.dof) : 4000;
  const cur = state.mode === "dof" && sim && typeof sim.totalNodes === "function" ? sim.totalNodes() : 0;
  els.dofMaxNodes.textContent = `${cur} / ${max}`;
}

function refreshLab2MaxNodesLabel() {
  if (!els.l2MaxNodes) return;
  const max = typeof lab2MaxNodes === "function" ? lab2MaxNodes(state.lab2) : 4000;
  const cur = state.mode === "lab2" ? countSimNodes() : 0;
  els.l2MaxNodes.textContent = `${cur} / ${max}`;
}

function growthParams() {
  const strokeW = 6 + state.a * 14;
  const clearance = strokeW * 1.6 + 14 + state.b * 36;
  const maxEdge = clamp(8 + state.c * 22, clearance * 0.35, clearance * 1.05);
  return { strokeW, clearance, maxEdge, cohesion: 0.55 };
}

function drawPreviewStrokeW() {
  if (state.mode === "lab2" && typeof lab2StrokeWidth === "function") {
    return lab2StrokeWidth(state.lab2.stroke);
  }
  // reactor / lab: pinsel-dicke steuert die zeichen-vorschau
  return state.brush;
}

const reactorHelpers = () => ({
  state,
  clamp,
  growthParams,
  buildReactorContours,
  sanitizeReactorContours,
  classifyContoursAsHoles,
  contourCentroid,
  pointInPolygon,
});

const labHelpers = () => ({
  state,
  buildGrowthLines,
  buildLab2Contours,
  contoursToGrowthLines,
  growthParams,
  clamp,
  makeGrowthNode,
  drawG,
  sanitizeContours,
});

const diff3Helpers = () => ({
  state,
  clamp,
});

const FACTORIES = {
  reactor: (p) => ReactorGrowthMode.create(p, reactorHelpers()),
  lab: (p) => LabGrowthMode.create(p, labHelpers()),
  lab2: (p) => Lab2GrowthMode.create(p, labHelpers()),
  diff3d: (p) => Diff3GrowthMode.create(p, diff3Helpers()),
  dof: (p) => DofGrowthMode.create(p, diff3Helpers()),
};

function isNodeMode(modeKey) {
  return modeKey === "diff3d" || modeKey === "dof";
}

/* ============================================================
   ORCHESTRIERUNG
   ============================================================ */

async function rebuildSim() {
  if (!p5i) return;
  if (state.input === "text" && !isNodeMode(state.mode)) updateInputFontSize();
  refreshLab2MaxNodesLabel();
  refreshDiff3MaxNodesLabel();
  refreshDofMaxNodesLabel();
  if (!isNodeMode(state.mode)) refreshSeed(p5i);
  if (state.mode === "reactor" && state.reactorFontUrl.trim()) {
    await loadReactorFont(state.reactorFont, state.reactorFontUrl);
  }
  const factory = FACTORIES[state.mode];
  sim = factory ? factory(p5i) : null;
}

function setMode(modeKey) {
  if (!FACTORIES[modeKey]) return;
  state.mode = modeKey;
  document.body.dataset.mode = modeKey;
  if (MODES[modeKey] && els.desc) els.desc.textContent = MODES[modeKey].desc;
  els.growthModes.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.mode === modeKey));
  document.body.classList.toggle("mode-reactor", modeKey === "reactor");
  document.body.classList.toggle("mode-lab", modeKey === "lab" || modeKey === "lab2" || modeKey === "diff3d" || modeKey === "dof");
  document.body.classList.toggle("mode-lab2", modeKey === "lab2");
  document.body.classList.toggle("mode-diff3d", modeKey === "diff3d");
  document.body.classList.toggle("mode-dof", modeKey === "dof");
  refreshParamLabels();
  updateInputFontSize();
  rebuildSim();
}

function setInput(inputKey) {
  state.input = inputKey;
  els.inputTabs.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.input === inputKey));
  document.body.classList.toggle("is-text", inputKey === "text");
  document.body.classList.toggle("is-draw", inputKey === "draw");
  if (inputKey === "text" && els.textField) els.textField.focus();
  rebuildSim();
}

function setPaused(paused) {
  state.paused = paused;
  if (els.play) els.play.textContent = paused ? "play" : "pause";
}

function exportSVG() {
  if (!sim || !sim.getLines || !p5i) return;
  const lines = sim.getLines();
  const w = p5i.width;
  const h = p5i.height;

  let paths = "";
  for (let i = 0; i < lines.length; i++) {
    const nodes = lines[i].nodes;
    if (!nodes || nodes.length < 2) continue;
    let d = `M ${nodes[0].x.toFixed(1)} ${nodes[0].y.toFixed(1)}`;
    for (let j = 1; j < nodes.length; j++) {
      d += ` L ${nodes[j].x.toFixed(1)} ${nodes[j].y.toFixed(1)}`;
    }
    d += " Z";
    const holes = lines[i].holes;
    if (holes) {
      for (let hi = 0; hi < holes.length; hi++) {
        const ring = holes[hi];
        if (!ring || ring.length < 2) continue;
        d += ` M ${ring[0].x.toFixed(1)} ${ring[0].y.toFixed(1)}`;
        for (let j = 1; j < ring.length; j++) {
          d += ` L ${ring[j].x.toFixed(1)} ${ring[j].y.toFixed(1)}`;
        }
        d += " Z";
      }
    }
    const evenodd = holes?.length ? ' fill-rule="evenodd"' : "";
    paths += `<path d="${d}"${evenodd} fill="none" stroke="#0a0a0a" stroke-width="${sim.strokeW.toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>\n`;
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n<rect width="${w}" height="${h}" fill="#ffffff"/>\n${paths}</svg>`;

  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `weirdgrowth-${Date.now()}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ============================================================
   P5 SKETCH
   ============================================================ */

function getStageRect() {
  syncMobileSheetHeight();
  const stage = document.querySelector(".stage");
  if (!stage) return { width: window.innerWidth, height: window.innerHeight };
  const rect = stage.getBoundingClientRect();
  return {
    width: Math.max(1, Math.floor(rect.width)),
    height: Math.max(1, Math.floor(rect.height)),
  };
}

/* blockiert leinwand-input, wenn man panel oder topbar bedient */
let blockCanvasPointer = false;

const UI_POINTER_ZONES = [".side-panel", ".topbar"];

function pointerClientPos(p) {
  if (!p.canvas) return { x: -1, y: -1 };
  const rect = p.canvas.getBoundingClientRect();
  return { x: rect.left + p.mouseX, y: rect.top + p.mouseY };
}

function pointerOverUI(p) {
  const { x, y } = pointerClientPos(p);
  for (let i = 0; i < UI_POINTER_ZONES.length; i++) {
    const el = document.querySelector(UI_POINTER_ZONES[i]);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
  }
  return false;
}

function canvasInputBlocked(p) {
  return blockCanvasPointer || pointerOverUI(p);
}

function bindCanvasPointerGuards() {
  const release = () => {
    blockCanvasPointer = false;
  };
  const block = () => {
    blockCanvasPointer = true;
  };

  for (let i = 0; i < UI_POINTER_ZONES.length; i++) {
    const el = document.querySelector(UI_POINTER_ZONES[i]);
    if (!el) continue;
    el.addEventListener("pointerdown", block);
    el.addEventListener("pointerdown", (e) => e.stopPropagation());
  }
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);
}

/* ============================================================
   LIQUID-GLASS-PANEL — webgl-shader mit chromatic aberration
   (glass-core, exakt wie das drop-up bei inkdrops)
   ============================================================ */

const UI_GLASS_STYLE = typeof GLASS_STYLE !== "undefined"
  ? {
      ...GLASS_STYLE,
      tintR: 1,
      tintG: 1,
      tintB: 1,
      distortion: 0,
      blur: 2.5,
      chromaticAberration: 1.45,
      shadowIntensity: 0,
      shadowBlur: 0,
    }
  : null;

const UI_GLASS_RADIUS = 22;

function createGlassSurface(el, glCanvas) {
  if (!el || !glCanvas || !UI_GLASS_STYLE || typeof createGlassRenderer !== "function") {
    return null;
  }

  let renderer = null;
  let failed = false;
  let texCanvas = null;

  return {
    render(srcCanvas) {
      if (failed || !srcCanvas) return;
      const cssW = el.clientWidth;
      const cssH = el.clientHeight;
      if (cssW < 8 || cssH < 8) return;

      if (!renderer) {
        renderer = createGlassRenderer(glCanvas);
        if (!renderer) {
          failed = true; // css-backdrop-filter bleibt als fallback sichtbar
          return;
        }
      }

      const rect = el.getBoundingClientRect();
      const scaleX = srcCanvas.width / (srcCanvas.clientWidth || 1);
      const scaleY = srcCanvas.height / (srcCanvas.clientHeight || 1);
      const sx = Math.max(0, Math.floor(rect.left * scaleX));
      const sy = Math.max(0, Math.floor(rect.top * scaleY));
      const sw = Math.max(1, Math.floor(rect.width * scaleX));
      const sh = Math.max(1, Math.floor(rect.height * scaleY));

      if (!texCanvas) texCanvas = document.createElement("canvas");
      if (texCanvas.width !== sw) texCanvas.width = sw;
      if (texCanvas.height !== sh) texCanvas.height = sh;
      const ctx = texCanvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, sw, sh);
      ctx.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

      renderer.resizeCss(cssW, cssH);
      renderer.setTexture(texCanvas);
      renderer.draw({
        mouseCssX: cssW / 2,
        mouseCssY: cssH / 2,
        width: cssW * 0.5,
        height: cssH * 0.5,
        shape: "rectangle",
        cornerRadius: UI_GLASS_RADIUS,
        style: UI_GLASS_STYLE,
        glassMode: 0,
        seamless: true,
        imageAspectOverride: sw / Math.max(1, sh),
      });
    },
  };
}

const glassSurfaces = [
  createGlassSurface(
    document.querySelector(".side-panel"),
    document.getElementById("panel-glass-canvas")
  ),
  createGlassSurface(
    document.querySelector(".input-modes"),
    document.getElementById("topbar-glass-canvas")
  ),
].filter(Boolean);

const sketch = (p) => {
  p5i = p;

  p.setup = () => {
    const rect = getStageRect();
    p.createCanvas(rect.width, rect.height).parent(host);
    // native auflösung (retina) → gestochen scharfe linien wie bei svg
    p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
    drawG = p.createGraphics(p.width, p.height);
    drawG.pixelDensity(1);
    drawG.clear();
    drawSeedG = p.createGraphics(p.width, p.height);
    drawSeedG.pixelDensity(1);
    drawSeedG.clear();
    rebuildSim();
  };

  p.draw = () => {
    if (!state.paused && sim && sim.update) sim.update();
    if (sim && sim.draw) sim.draw();
    if (state.mode === "lab2") refreshLab2MaxNodesLabel();
    if (state.mode === "diff3d") refreshDiff3MaxNodesLabel();
    // tinte nur sichtbar während des malens — danach nur wachstum
    if (state.input === "draw" && isDrawingStroke && drawG) {
      p.image(drawG, 0, 0);
    }
    for (let i = 0; i < glassSurfaces.length; i++) {
      glassSurfaces[i].render(p.drawingContext.canvas);
    }
  };

  p.windowResized = () => {
    updateInputFontSize();
    const rect = getStageRect();
    p.resizeCanvas(rect.width, rect.height);
    const oldDraw = drawG;
    const oldSeed = drawSeedG;
    drawG = p.createGraphics(p.width, p.height);
    drawG.pixelDensity(1);
    drawG.clear();
    drawSeedG = p.createGraphics(p.width, p.height);
    drawSeedG.pixelDensity(1);
    drawSeedG.clear();
    if (oldSeed) {
      drawSeedG.image(oldSeed, 0, 0);
      oldSeed.remove();
    }
    if (oldDraw) oldDraw.remove();
    drawStrokeBefore = null;
    rebuildSim();
  };

  function paintAt() {
    if (state.input !== "draw" || !drawG) return false;
    if (canvasInputBlocked(p)) return false;
    if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) return false;
    drawG.stroke(10);
    const sw = drawPreviewStrokeW();
    drawG.strokeWeight(sw);
    drawG.strokeCap(p.ROUND);
    drawG.line(p.pmouseX, p.pmouseY, p.mouseX, p.mouseY);
    if (Math.hypot(p.mouseX - p.pmouseX, p.mouseY - p.pmouseY) < 0.5) {
      drawG.noStroke();
      drawG.fill(10);
      drawG.circle(p.mouseX, p.mouseY, sw);
      drawG.noFill();
      drawG.stroke(10);
    }
    return true;
  }

  p.mousePressed = () => {
    if (canvasInputBlocked(p)) return;
    if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) return;
    if (isNodeMode(state.mode)) {
      if (sim && sim.addNodeAtScreen) {
        sim.addNodeAtScreen(p.mouseX, p.mouseY);
        refreshDiff3MaxNodesLabel();
        refreshDofMaxNodesLabel();
      }
      return;
    }
    if (state.input === "draw") {
      isDrawingStroke = true;
      captureDrawStrokeBefore(p);
      drewThisStroke = paintAt();
    } else {
      rebuildSim(); // klick im text-modus = neu wachsen
      if (els.textField) els.textField.focus();
    }
  };

  p.mouseDragged = () => {
    if (canvasInputBlocked(p)) return;
    if (state.input === "draw" && paintAt()) drewThisStroke = true;
  };

  p.mouseReleased = () => {
    if (state.input === "draw") {
      if (drewThisStroke) commitDrawStroke(p);
      drewThisStroke = false;
      isDrawingStroke = false;
      blockCanvasPointer = false;
      return;
    }
    if (canvasInputBlocked(p)) return;
  };
};

/* ============================================================
   UI-VERDRAHTUNG
   ============================================================ */

function updateInputFontSize() {
  if (!els.textField || !els.sizer) return;
  syncMobileSheetHeight();
  const stage = getStageRect();
  const layout = getGrowthLayout(stage.width, stage.height);
  const txt = els.textField.value || els.textField.placeholder || " ";

  const tmp = document.createElement("canvas");
  const ctx = tmp.getContext("2d");
  const fam = state.mode === "reactor" ? state.reactorFont : "Helvetica Neue";
  const wt = state.mode === "reactor" ? state.reactorFontWeight : "700";
  const size = ctx
    ? measureSeedFontSize(
      ctx, txt.trim() || "A", layout.measureW, layout.measureH, fam, wt
    )
    : Math.min(layout.measureH * 0.5, layout.measureW * 0.5);

  els.sizer.textContent = txt;

  els.textField.style.fontSize = `${size}px`;
  els.sizer.style.fontSize = `${size}px`;
  if (state.mode === "reactor") {
    const fam = state.reactorFont.includes(" ") ? `"${state.reactorFont}"` : state.reactorFont;
    const fontCss = `${state.reactorFontWeight} ${size}px ${fam}, Helvetica, Arial, sans-serif`;
    els.sizer.style.fontFamily = fontCss;
    els.textField.style.fontFamily = fontCss;
    els.textField.style.fontWeight = state.reactorFontWeight;
  } else {
    els.sizer.style.fontFamily = "";
    els.textField.style.fontFamily = "";
    els.textField.style.fontWeight = "700";
  }
  const w = els.sizer.offsetWidth;
  els.textField.style.width = `${Math.min(w + 6, stage.width * 0.95)}px`;
}

bindCanvasPointerGuards();

els.inputTabs.forEach((btn) => btn.addEventListener("click", () => setInput(btn.dataset.input)));
els.growthModes.forEach((btn) => btn.addEventListener("click", () => setMode(btn.dataset.mode)));

if (els.textField) {
  els.textField.addEventListener("input", () => {
    state.text = els.textField.value;
    updateInputFontSize();
    if (state.input === "text") rebuildSim();
  });
  els.textField.addEventListener("keydown", (e) => e.stopPropagation());
}

els.brush.addEventListener("input", () => {
  state.brush = parseInt(els.brush.value, 10);
  els.brushVal.textContent = String(state.brush);
});

els.clear.addEventListener("click", () => {
  if (drawG) drawG.clear();
  if (drawSeedG) drawSeedG.clear();
  drawStrokeBefore = null;
  drewThisStroke = false;
  isDrawingStroke = false;
  rebuildSim();
});

els.speed.addEventListener("input", () => {
  state.speed = parseFloat(els.speed.value);
  syncSpeedUI();
  saveSpeedToStorage();
});

function refreshParamLabels() {
  if (!MODES[state.mode]) return;
  els.aVal.textContent = MODES[state.mode].fmtA(state.a);
  els.bVal.textContent = MODES[state.mode].fmtB(state.b);
  els.cVal.textContent = MODES[state.mode].fmtC(state.c);
}

function bindParam(input, valEl, key, fmtKey) {
  input.addEventListener("input", () => {
    state[key] = parseFloat(input.value);
    valEl.textContent = MODES[state.mode][fmtKey](state[key]);
  });
}

bindParam(els.a, els.aVal, "a", "fmtA");
bindParam(els.b, els.bVal, "b", "fmtB");
bindParam(els.c, els.cVal, "c", "fmtC");

if (els.reactorFont) {
  els.reactorFont.value = state.reactorFont;
  els.reactorFont.addEventListener("input", () => {
    state.reactorFont = els.reactorFont.value.trim() || "Helvetica Neue";
    updateInputFontSize();
    if (state.mode === "reactor") rebuildSim();
  });
}
if (els.reactorFontUrl) {
  els.reactorFontUrl.value = state.reactorFontUrl;
  els.reactorFontUrl.addEventListener("change", async () => {
    state.reactorFontUrl = els.reactorFontUrl.value.trim();
    if (state.mode === "reactor") await rebuildSim();
  });
}

/* lab2 — differential growth: komplexität + teilungs-abstand bauen neu auf */
function bindLab2Param(input, valEl, key, fmt, rebuildOnChange) {
  if (!input || !valEl) return;
  input.value = String(state.lab2[key]);
  valEl.textContent = fmt(state.lab2[key]);
  input.addEventListener("input", () => {
    state.lab2[key] = parseFloat(input.value);
    valEl.textContent = fmt(state.lab2[key]);
    if (key === "split" || key === "complexity") {
      if (els.l2SplitVal && key === "complexity") {
        els.l2SplitVal.textContent = lab2SplitFmt(state.lab2.split);
      }
      if (els.l2ComplexityVal && key === "split") {
        els.l2ComplexityVal.textContent = lab2ComplexityFmt(state.lab2.complexity);
      }
    }
    if (rebuildOnChange && state.mode === "lab2") rebuildSim();
  });
}

const pct = (v) => `${Math.round(v * 100)}%`;
const lab2ComplexityFmt = (v) => `~${Math.round(10 + v * 90)}`;
const lab2SplitFmt = (v) => {
  const stage = getStageRect();
  const prm = typeof lab2ComputeParams === "function"
    ? lab2ComputeParams({ ...state.lab2, split: v }, stage.width || 800, stage.height || 600)
    : { insertDistance: 5 };
  return `${Math.round(prm.insertDistance)} px`;
};

bindLab2Param(els.l2Stroke, els.l2StrokeVal, "stroke", lab2StrokeFmt, false);
bindLab2Param(els.l2Attraction, els.l2AttractionVal, "attraction", pct, false);
bindLab2Param(els.l2Repulsion, els.l2RepulsionVal, "repulsion", pct, false);
bindLab2Param(els.l2Push, els.l2PushVal, "push", pct, false);
bindLab2Param(els.l2Complexity, els.l2ComplexityVal, "complexity", lab2ComplexityFmt, true);
bindLab2Param(els.l2Split, els.l2SplitVal, "split", lab2SplitFmt, true);
bindLab2Param(els.l2NodeLimit, els.l2NodeLimitVal, "nodeLimit", lab2NodeLimitFmt, false);
els.l2NodeLimit?.addEventListener("input", () => refreshLab2MaxNodesLabel());
refreshLab2MaxNodesLabel();

const diff3ComplexityFmt = (v) => `~${Math.round(10 + v * 90)}`;
const diff3SplitFmt = (v) => {
  const stage = getStageRect();
  const prm = typeof diff3ComputeParams === "function"
    ? diff3ComputeParams({ ...state.diff3d, split: v }, stage.width || 800, stage.height || 600)
    : { insertDistance: 5 };
  return `${Math.round(prm.insertDistance)} px`;
};

function bindDiff3Param(input, valEl, key, fmt, rebuildOnChange) {
  if (!input || !valEl) return;
  input.value = String(state.diff3d[key]);
  valEl.textContent = fmt(state.diff3d[key]);
  input.addEventListener("input", () => {
    state.diff3d[key] = parseFloat(input.value);
    valEl.textContent = fmt(state.diff3d[key]);
    if (key === "split" || key === "complexity") {
      if (els.d3SplitVal && key === "complexity") {
        els.d3SplitVal.textContent = diff3SplitFmt(state.diff3d.split);
      }
      if (els.d3ComplexityVal && key === "split") {
        els.d3ComplexityVal.textContent = diff3ComplexityFmt(state.diff3d.complexity);
      }
    }
    if (rebuildOnChange && state.mode === "diff3d") rebuildSim();
  });
}

bindDiff3Param(els.d3Attraction, els.d3AttractionVal, "attraction", pct, false);
bindDiff3Param(els.d3Repulsion, els.d3RepulsionVal, "repulsion", pct, false);
bindDiff3Param(els.d3Depth, els.d3DepthVal, "depth", diff3DepthFmt, false);
bindDiff3Param(els.d3Link, els.d3LinkVal, "link", diff3LinkFmt, false);
bindDiff3Param(els.d3Complexity, els.d3ComplexityVal, "complexity", diff3ComplexityFmt, false);
bindDiff3Param(els.d3Split, els.d3SplitVal, "split", diff3SplitFmt, false);
bindDiff3Param(els.d3DofFocus, els.d3DofFocusVal, "dofFocus", diff3DofFocusFmt, false);
bindDiff3Param(els.d3DofBlur, els.d3DofBlurVal, "dofBlur", diff3DofBlurFmt, false);
bindDiff3Param(els.d3Exposure, els.d3ExposureVal, "exposure", diff3ExposureFmt, false);
bindDiff3Param(els.d3Tumble, els.d3TumbleVal, "tumble", diff3TumbleFmt, false);
bindDiff3Param(els.d3NodeLimit, els.d3NodeLimitVal, "nodeLimit", lab2NodeLimitFmt, false);

const dofSplitFmt = (v) => {
  const stage = getStageRect();
  const prm = typeof dofComputeParams === "function"
    ? dofComputeParams({ ...state.dof, split: v }, stage.width || 800, stage.height || 600)
    : { insertDistance: 5 };
  return `${Math.round(prm.insertDistance)} px`;
};

function bindDofParam(input, valEl, key, fmt) {
  if (!input || !valEl) return;
  input.value = String(state.dof[key]);
  valEl.textContent = fmt(state.dof[key]);
  input.addEventListener("input", () => {
    state.dof[key] = parseFloat(input.value);
    valEl.textContent = fmt(state.dof[key]);
    if (key === "nodeLimit") refreshDofMaxNodesLabel();
  });
}

bindDofParam(els.dofLink, els.dofLinkVal, "link", dofLinkFmt);
bindDofParam(els.dofAttraction, els.dofAttractionVal, "attraction", pct);
bindDofParam(els.dofRepulsion, els.dofRepulsionVal, "repulsion", pct);
bindDofParam(els.dofSplit, els.dofSplitVal, "split", dofSplitFmt);
bindDofParam(els.dofTumble, els.dofTumbleVal, "tumble", dofTumbleFmt);
bindDofParam(els.dofNodeLimit, els.dofNodeLimitVal, "nodeLimit", lab2NodeLimitFmt);

function refreshDofNodesLabel() {
  if (els.dofNodes) els.dofNodes.textContent = `nodes: ${state.dof.showNodes ? "an" : "aus"}`;
}
if (els.dofNodes) {
  els.dofNodes.addEventListener("click", () => {
    state.dof.showNodes = !state.dof.showNodes;
    refreshDofNodesLabel();
  });
  refreshDofNodesLabel();
}

function bindLabSplit() {
  if (!els.labSplit || !els.labSplitVal) return;
  const fmt = typeof labSplitFmt === "function" ? labSplitFmt : (v) => `${Math.round(v * 100)}%`;
  els.labSplit.value = String(state.lab.split);
  els.labSplitVal.textContent = fmt(state.lab.split);
  els.labSplit.addEventListener("input", () => {
    state.lab.split = parseFloat(els.labSplit.value);
    els.labSplitVal.textContent = fmt(state.lab.split);
  });
}
bindLabSplit();

function refreshLab2NodesLabel() {
  if (els.l2Nodes) els.l2Nodes.textContent = `nodes: ${state.lab2.showNodes ? "an" : "aus"}`;
}
if (els.l2Nodes) {
  els.l2Nodes.addEventListener("click", () => {
    state.lab2.showNodes = !state.lab2.showNodes;
    refreshLab2NodesLabel();
  });
  refreshLab2NodesLabel();
}

function refreshDiff3NodesLabel() {
  if (els.d3Nodes) els.d3Nodes.textContent = `nodes: ${state.diff3d.showNodes ? "an" : "aus"}`;
}
if (els.d3Nodes) {
  els.d3Nodes.addEventListener("click", () => {
    state.diff3d.showNodes = !state.diff3d.showNodes;
    refreshDiff3NodesLabel();
  });
  refreshDiff3NodesLabel();
}

function refreshLab2LegacyLabel() {
  if (!els.l2Legacy) return;
  els.l2Legacy.classList.toggle("is-active", state.lab2.legacy);
  els.l2Legacy.textContent = state.lab2.legacy
    ? "klassik aktiv"
    : "klassik (explosion)";
}

els.play.addEventListener("click", () => setPaused(!state.paused));
els.reset.addEventListener("click", () => {
  if (state.mode === "diff3d") {
    state.diff3d.graph = null;
    if (sim && sim.clearGraph) sim.clearGraph();
    else rebuildSim();
    refreshDiff3MaxNodesLabel();
    return;
  }
  if (state.mode === "dof") {
    state.dof.graph = null;
    if (sim && sim.clearGraph) sim.clearGraph();
    else rebuildSim();
    refreshDofMaxNodesLabel();
    return;
  }
  rebuildSim();
});
if (els.l2Legacy) {
  els.l2Legacy.addEventListener("click", () => {
    state.lab2.legacy = !state.lab2.legacy;
    refreshLab2LegacyLabel();
    rebuildSim();
  });
  refreshLab2LegacyLabel();
}
const MODE_FILE_NAMES = {
  lab2: "differential-growth",
  diff3d: "3d-growth",
  dof: "3d-web",
  lab: "lab",
  reactor: "reactor",
};

els.save.addEventListener("click", () => {
  const name = MODE_FILE_NAMES[state.mode] || state.mode;
  if (p5i) p5i.saveCanvas(`weirdgrowth-${name}-${Date.now()}`, "png");
});
els.svg.addEventListener("click", exportSVG);

window.addEventListener("keydown", (e) => {
  if (e.target.matches("input, button, textarea, select")) return;
  if (e.key === " ") {
    e.preventDefault();
    setPaused(!state.paused);
  }
});

/* mobil: sheet-höhe bei layout-änderungen nachziehen */
let lastSyncedSheetH = -1;
function onMobileSheetLayoutChange() {
  syncMobileSheetHeight();
  const sheetH = getMobileSheetInset();
  updateInputFontSize();
  if (Math.abs(sheetH - lastSyncedSheetH) < 2) return;
  lastSyncedSheetH = sheetH;
  if (p5i && state.input === "text") rebuildSim();
}

const sidePanelEl = document.querySelector(".side-panel");
if (sidePanelEl && typeof ResizeObserver !== "undefined") {
  new ResizeObserver(onMobileSheetLayoutChange).observe(sidePanelEl);
}
window.addEventListener("resize", onMobileSheetLayoutChange);
onMobileSheetLayoutChange();

/* init */
loadSpeedFromStorage();
syncSpeedUI();
els.aVal.textContent = MODES[state.mode].fmtA(state.a);
els.bVal.textContent = MODES[state.mode].fmtB(state.b);
els.cVal.textContent = MODES[state.mode].fmtC(state.c);
els.brushVal.textContent = String(state.brush);
updateInputFontSize();
if (els.textField) {
  els.textField.focus();
  els.textField.select();
}
new p5(sketch);

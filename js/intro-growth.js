/**
 * Intro — differential growth aus keim-form. wächst weiter, dann fährt
 * das intro nach oben weg (kein überblenden).
 */
const IntroGrowth = (function () {
  const SIZE = 340;

  const mockState = {
    speed: 3.4,
    lab2: {
      stroke: 0.09,
      attraction: 0.06,
      repulsion: 0.94,
      push: 0.22,
      split: 0.34,
      complexity: 0.13,
      nodeLimit: 0.2,
      showNodes: false,
      legacy: false,
    },
  };

  const GROW_STEPS = 3;
  const TRANSITION_FRAME = 72;

  let p5Inst = null;
  let sim = null;
  let seedOutline = null;
  let frames = 0;
  let phase = "idle";
  let onReady = null;
  let readyFired = false;

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function densifyRing(pts, target) {
    if (pts.length >= target) return pts.slice();
    const out = [];
    const n = pts.length;
    for (let i = 0; i < target; i++) {
      const t = (i / target) * n;
      const idx = Math.floor(t) % n;
      const next = (idx + 1) % n;
      const f = t - Math.floor(t);
      const a = pts[idx];
      const b = pts[next];
      out.push({
        x: a.x + (b.x - a.x) * f,
        y: a.y + (b.y - a.y) * f,
      });
    }
    return out;
  }

  function seedContours(w, h) {
    const cx = w * 0.5;
    const cy = h * 0.5;
    const s = Math.min(w, h) * 0.18;
    const raw = [
      { x: cx + s * 0.06, y: cy + s * 1.08 },
      { x: cx - s * 0.42, y: cy + s * 0.78 },
      { x: cx - s * 0.98, y: cy + s * 0.22 },
      { x: cx - s * 0.88, y: cy - s * 0.38 },
      { x: cx - s * 0.42, y: cy - s * 0.92 },
      { x: cx + s * 0.18, y: cy - s * 1.06 },
      { x: cx + s * 0.72, y: cy - s * 0.82 },
      { x: cx + s * 1.08, y: cy - s * 0.28 },
      { x: cx + s * 0.96, y: cy + s * 0.32 },
      { x: cx + s * 0.58, y: cy + s * 0.72 },
      { x: cx + s * 0.24, y: cy + s * 0.98 },
    ];
    return [densifyRing(raw, 50)];
  }

  function fireReady() {
    if (readyFired) return;
    readyFired = true;
    if (onReady) onReady();
  }

  function destroySketch() {
    if (p5Inst) {
      p5Inst.remove();
      p5Inst = null;
    }
    sim = null;
    seedOutline = null;
  }

  function start(readyCb) {
    onReady = readyCb;
    phase = "grow";
    frames = 0;
    readyFired = false;

    const host = document.getElementById("intro-canvas-host");
    if (!host || typeof Lab2GrowthMode === "undefined") {
      fireReady();
      return;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      phase = "done";
      fireReady();
      return;
    }

    destroySketch();

    const sketch = (p) => {
      p5Inst = p;
      p.setup = () => {
        const c = p.createCanvas(SIZE, SIZE);
        c.parent(host);
        p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
        p.noLoop();
        seedOutline = seedContours(p.width, p.height);
        sim = Lab2GrowthMode.create(p, {
          state: mockState,
          clamp,
          buildLab2Contours: () => seedOutline,
        });
        p.loop();
      };

      p.draw = () => {
        if (phase !== "grow" || !sim) return;
        p.clear();

        if (frames === 0 && seedOutline) {
          p.push();
          p.noFill();
          p.stroke(0);
          p.strokeWeight(2.2);
          for (let i = 0; i < seedOutline.length; i++) {
            const ring = seedOutline[i];
            if (!ring || ring.length < 2) continue;
            p.beginShape();
            for (let j = 0; j < ring.length; j++) p.vertex(ring[j].x, ring[j].y);
            p.endShape(p.CLOSE);
          }
          p.pop();
          frames++;
          return;
        }

        for (let i = 0; i < GROW_STEPS; i++) sim.update();
        sim.draw();
        frames++;

        // objekt wächst weiter — nach kurzer zeit den übergang anstoßen
        if (frames >= TRANSITION_FRAME) fireReady();
      };
    };

    new p5(sketch);
  }

  function skip() {
    fireReady();
  }

  function teardown() {
    phase = "done";
    destroySketch();
  }

  return { start, skip, teardown };
})();

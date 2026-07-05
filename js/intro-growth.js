/**
 * Intro — differential growth aus keim-form, zoom rein während es weiter wächst.
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
  const FLY_START_FRAME = 66;
  const FLY_FRAMES = 84;

  let p5Inst = null;
  let sim = null;
  let seedOutline = null;
  let frames = 0;
  let phase = "idle";
  let onFlyStart = null;
  let onFlyComplete = null;
  let flyPhase = false;
  let flyFrame = 0;
  let flyStarted = false;
  let flyDone = false;
  let currentPd = 0;

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

  function targetZoom() {
    const margin = 3.2;
    return (Math.max(window.innerWidth, window.innerHeight) / SIZE) * margin;
  }

  function flyEase(t) {
    return t * t * (3 - 2 * t);
  }

  function applyDisplayZoom(p, zoom) {
    const host = document.getElementById("intro-canvas-host");
    const base = host && host.clientWidth > 0 ? host.clientWidth : SIZE;
    const dpr = window.devicePixelRatio || 1;
    const pd = Math.min(16, Math.max(2, Math.ceil(zoom * dpr)));
    if (pd !== currentPd) {
      p.pixelDensity(pd);
      currentPd = pd;
    }
    const c = p.canvas;
    c.style.width = `${base}px`;
    c.style.height = `${base}px`;
    if (zoom <= 1.001) {
      c.style.transform = "";
    } else {
      c.style.transform = `scale(${zoom})`;
    }
    c.style.transformOrigin = "center center";
  }

  function beginFly() {
    if (flyStarted) return;
    flyStarted = true;
    flyPhase = true;
    if (onFlyStart) onFlyStart();
  }

  function finishFly() {
    if (flyDone) return;
    flyDone = true;
    if (onFlyComplete) onFlyComplete();
  }

  function destroySketch() {
    if (p5Inst) {
      p5Inst.remove();
      p5Inst = null;
    }
    sim = null;
    seedOutline = null;
    currentPd = 0;
  }

  function start(flyStartCb, flyCompleteCb) {
    onFlyStart = flyStartCb;
    onFlyComplete = flyCompleteCb;
    phase = "grow";
    frames = 0;
    flyPhase = false;
    flyFrame = 0;
    flyStarted = false;
    flyDone = false;

    const host = document.getElementById("intro-canvas-host");
    if (!host || typeof Lab2GrowthMode === "undefined") {
      if (onFlyStart) onFlyStart();
      finishFly();
      return;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      phase = "done";
      if (onFlyStart) onFlyStart();
      finishFly();
      return;
    }

    destroySketch();

    const sketch = (p) => {
      p5Inst = p;
      p.setup = () => {
        const c = p.createCanvas(SIZE, SIZE);
        c.parent(host);
        p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
        currentPd = p.pixelDensity();
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
          applyDisplayZoom(p, 1);
          return;
        }

        if (!flyPhase && frames >= FLY_START_FRAME) beginFly();

        let zoom = 1;
        if (flyPhase) {
          flyFrame++;
          const t = Math.min(1, flyFrame / FLY_FRAMES);
          zoom = 1 + (targetZoom() - 1) * flyEase(t);
          if (t >= 1) finishFly();
        }

        applyDisplayZoom(p, zoom);

        for (let i = 0; i < GROW_STEPS; i++) sim.update();
        sim.draw();
        frames++;
      };
    };

    new p5(sketch);
  }

  function skip() {
    beginFly();
    flyPhase = true;
    flyFrame = FLY_FRAMES;
    if (p5Inst && sim && phase === "grow") {
      const zoom = targetZoom();
      applyDisplayZoom(p5Inst, zoom);
      p5Inst.clear();
      for (let i = 0; i < GROW_STEPS; i++) sim.update();
      sim.draw();
    }
    finishFly();
  }

  function teardown() {
    phase = "done";
    destroySketch();
  }

  return { start, skip, teardown };
})();

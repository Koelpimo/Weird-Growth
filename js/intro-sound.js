/**
 * Intro — durchgehender kratzig-metallischer wachstums-sound.
 */
const IntroSound = (function () {
  let ctx = null;
  let master = null;
  let voices = [];
  let bedGain = null;
  let bedFilter = null;
  let rubFilter = null;
  let metalFilter = null;
  let modLfo = null;
  let modGain = null;
  let running = false;

  function ensureCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    return ctx;
  }

  function makeNoiseLoop(c, seconds) {
    const len = Math.floor(c.sampleRate * seconds);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.82 + white * 0.18;
      data[i] = last;
    }
    return buf;
  }

  function track(node) {
    voices.push(node);
    return node;
  }

  function stopVoices() {
    const t = ctx ? ctx.currentTime : 0;
    for (let i = 0; i < voices.length; i++) {
      try {
        const n = voices[i];
        if (n.stop) n.stop(t + 0.02);
        if (n.disconnect) n.disconnect();
      } catch (err) {
        /* ignore */
      }
    }
    voices = [];
    bedGain = null;
    bedFilter = null;
    rubFilter = null;
    metalFilter = null;
    modLfo = null;
    modGain = null;
  }

  async function unlock() {
    const c = ensureCtx();
    if (!c) return false;
    if (c.state === "suspended") {
      try {
        await c.resume();
      } catch (err) {
        return false;
      }
    }
    return c.state === "running";
  }

  async function start() {
    if (running) return true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    const c = ensureCtx();
    if (!c) return false;
    if (!(await unlock())) return false;

    stopVoices();
    const t = c.currentTime;

    bedFilter = track(c.createBiquadFilter());
    bedFilter.type = "bandpass";
    bedFilter.frequency.value = 3400;
    bedFilter.Q.value = 1.8;

    rubFilter = track(c.createBiquadFilter());
    rubFilter.type = "bandpass";
    rubFilter.frequency.value = 920;
    rubFilter.Q.value = 2.6;

    metalFilter = track(c.createBiquadFilter());
    metalFilter.type = "bandpass";
    metalFilter.frequency.value = 2100;
    metalFilter.Q.value = 5.5;

    bedGain = track(c.createGain());
    bedGain.gain.value = 0.07;

    modGain = track(c.createGain());
    modGain.gain.value = 0.045;

    modLfo = track(c.createOscillator());
    modLfo.type = "square";
    modLfo.frequency.value = 16;

    const scratch = track(c.createBufferSource());
    scratch.buffer = makeNoiseLoop(c, 1.6);
    scratch.loop = true;

    const rub = track(c.createBufferSource());
    rub.buffer = makeNoiseLoop(c, 2.1);
    rub.loop = true;

    const rubGain = track(c.createGain());
    rubGain.gain.value = 0.055;

    const metalOsc = track(c.createOscillator());
    metalOsc.type = "square";
    metalOsc.frequency.value = 186;

    const metalGain = track(c.createGain());
    metalGain.gain.value = 0.028;

    const subOsc = track(c.createOscillator());
    subOsc.type = "triangle";
    subOsc.frequency.value = 88;

    const subGain = track(c.createGain());
    subGain.gain.value = 0.04;

    const flutter = track(c.createOscillator());
    flutter.type = "sine";
    flutter.frequency.value = 4.2;
    const flutterGain = track(c.createGain());
    flutterGain.gain.value = 18;
    flutter.connect(flutterGain);
    flutterGain.connect(bedFilter.frequency);

    scratch.connect(bedFilter);
    bedFilter.connect(bedGain);
    bedGain.connect(master);

    rub.connect(rubFilter);
    rubFilter.connect(rubGain);
    rubGain.connect(master);

    metalOsc.connect(metalFilter);
    metalFilter.connect(metalGain);
    metalGain.connect(master);

    subOsc.connect(subGain);
    subGain.connect(master);

    modLfo.connect(modGain);
    modGain.connect(bedGain.gain);
    modGain.connect(rubGain.gain);

    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(0.0001, t);
    master.gain.exponentialRampToValueAtTime(0.62, t + 0.07);

    scratch.start(t);
    rub.start(t);
    metalOsc.start(t);
    subOsc.start(t);
    modLfo.start(t);
    flutter.start(t);

    running = true;
    return true;
  }

  function setGrowth(progress) {
    if (!running || !ctx) return;
    const p = Math.max(0, Math.min(1, progress));
    const t = ctx.currentTime;
    if (bedFilter) bedFilter.frequency.setTargetAtTime(3000 + p * 2600, t, 0.09);
    if (rubFilter) rubFilter.frequency.setTargetAtTime(780 + p * 520, t, 0.1);
    if (metalFilter) metalFilter.frequency.setTargetAtTime(1700 + p * 2400, t, 0.08);
    if (bedGain) bedGain.gain.setTargetAtTime(0.06 + p * 0.1, t, 0.08);
    if (modGain) modGain.gain.setTargetAtTime(0.035 + p * 0.04, t, 0.1);
  }

  function stop(fadeMs = 200) {
    running = false;
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setTargetAtTime(0.0001, t, fadeMs / 1000);
    window.setTimeout(stopVoices, fadeMs + 60);
  }

  return { start, stop, setGrowth, unlock };
})();

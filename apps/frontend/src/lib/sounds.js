// Web Audio sound synthesis — snappy, mechanical, not water-droppy.
// Uses noise bursts + filtered resonance for percussive character.

let _ctx = null;

function getCtx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_ctx.state === "suspended") _ctx.resume();
  return _ctx;
}

function noise(ctx, duration) {
  const len = Math.floor(ctx.sampleRate * duration);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
}

// ── Panel open — quick "shwip": filtered noise burst + rising tone ─────────────
export function playPanelOpen() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // High-passed noise "sh" attack
    const n = noise(ctx, 0.045);
    const hpf = ctx.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = 2800;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.18, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    n.connect(hpf); hpf.connect(ng); ng.connect(ctx.destination);
    n.start(now); n.stop(now + 0.06);

    // Rising triangle "wip" tone
    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.connect(og); og.connect(ctx.destination);
    osc.type = "triangle";
    osc.frequency.setValueAtTime(500, now + 0.005);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.1);
    og.gain.setValueAtTime(0, now);
    og.gain.linearRampToValueAtTime(0.12, now + 0.015);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.start(now); osc.stop(now + 0.14);
  } catch (_) {}
}

// ── Node land — magnetic snap: sharp click + low body thud ────────────────────
export function playNodeLand() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Ultra-short click transient
    const click = noise(ctx, 0.007);
    const cf = ctx.createBiquadFilter();
    cf.type = "bandpass"; cf.frequency.value = 900; cf.Q.value = 0.4;
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.55, now);
    cg.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
    click.connect(cf); cf.connect(cg); cg.connect(ctx.destination);
    click.start(now); click.stop(now + 0.015);

    // Low body resonance
    const body = ctx.createOscillator();
    const bg = ctx.createGain();
    body.connect(bg); bg.connect(ctx.destination);
    body.type = "sine";
    body.frequency.setValueAtTime(170, now);
    body.frequency.exponentialRampToValueAtTime(75, now + 0.07);
    bg.gain.setValueAtTime(0.28, now);
    bg.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    body.start(now); body.stop(now + 0.11);

    // Faint high tick for crispness
    const tick = ctx.createOscillator();
    const tg = ctx.createGain();
    tick.connect(tg); tg.connect(ctx.destination);
    tick.type = "square";
    tick.frequency.value = 2200;
    tg.gain.setValueAtTime(0.04, now);
    tg.gain.exponentialRampToValueAtTime(0.001, now + 0.018);
    tick.start(now); tick.stop(now + 0.02);
  } catch (_) {}
}

// ── Connect — two-note magnetic "dink dink" ───────────────────────────────────
export function playConnect() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    [[0, 660], [0.075, 990]].forEach(([delay, freq]) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.09, now + delay);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);
      osc.start(now + delay); osc.stop(now + delay + 0.14);
    });
  } catch (_) {}
}

// ── Delete — fast downward crunch ─────────────────────────────────────────────
export function playDelete() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const n = noise(ctx, 0.025);
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass"; lpf.frequency.value = 600;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.22, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    n.connect(lpf); lpf.connect(ng); ng.connect(ctx.destination);
    n.start(now); n.stop(now + 0.045);

    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.connect(og); og.connect(ctx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.09);
    og.gain.setValueAtTime(0.1, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.start(now); osc.stop(now + 0.11);
  } catch (_) {}
}

// ── Run start — punchy mechanical "chunk-chunk-chunk" ─────────────────────────
export function playRunStart() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    [0, 0.07, 0.14].forEach((delay, i) => {
      const freq = [440, 554, 659][i];

      const click = noise(ctx, 0.006);
      const cf = ctx.createBiquadFilter();
      cf.type = "bandpass"; cf.frequency.value = 1200; cf.Q.value = 0.6;
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(0.25, now + delay);
      cg.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.01);
      click.connect(cf); cf.connect(cg); cg.connect(ctx.destination);
      click.start(now + delay); click.stop(now + delay + 0.012);

      const osc = ctx.createOscillator();
      const og = ctx.createGain();
      osc.connect(og); og.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.value = freq;
      og.gain.setValueAtTime(0.1, now + delay);
      og.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.16);
      osc.start(now + delay); osc.stop(now + delay + 0.18);
    });
  } catch (_) {}
}

// ── Success — warm bright chord with shimmer ──────────────────────────────────
export function playSuccess() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Staggered chord: C5, E5, G5
    [[0, 523], [0.05, 659], [0.1, 784]].forEach(([delay, freq]) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, now + delay);
      g.gain.linearRampToValueAtTime(0.09, now + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.45);
      osc.start(now + delay); osc.stop(now + delay + 0.5);
    });

    // Shimmer click on top
    const click = noise(ctx, 0.006);
    const cf = ctx.createBiquadFilter();
    cf.type = "highpass"; cf.frequency.value = 4000;
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.12, now + 0.1);
    cg.gain.exponentialRampToValueAtTime(0.001, now + 0.115);
    click.connect(cf); cf.connect(cg); cg.connect(ctx.destination);
    click.start(now + 0.1); click.stop(now + 0.12);
  } catch (_) {}
}

// ── Error — low thud + dissonant buzz ─────────────────────────────────────────
export function playError() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Impact thud
    const thud = ctx.createOscillator();
    const tg = ctx.createGain();
    thud.connect(tg); tg.connect(ctx.destination);
    thud.type = "sine";
    thud.frequency.setValueAtTime(130, now);
    thud.frequency.exponentialRampToValueAtTime(55, now + 0.12);
    tg.gain.setValueAtTime(0.3, now);
    tg.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    thud.start(now); thud.stop(now + 0.16);

    // Short dissonant buzz
    const buzz = ctx.createOscillator();
    const bg = ctx.createGain();
    buzz.connect(bg); bg.connect(ctx.destination);
    buzz.type = "sawtooth";
    buzz.frequency.value = 145;
    bg.gain.setValueAtTime(0.08, now + 0.03);
    bg.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    buzz.start(now + 0.03); buzz.stop(now + 0.2);
  } catch (_) {}
}

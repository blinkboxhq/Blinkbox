// Web Audio API sound synthesis — no asset files needed.
// All sounds are programmatically generated, short, and tasteful.

let _ctx = null;

function getCtx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  // Resume if suspended (browser requires gesture before audio)
  if (_ctx.state === "suspended") _ctx.resume();
  return _ctx;
}

// ── Panel open — soft ascending chime (two sine tones, quick fade) ────────────
export function playPanelOpen() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.09);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.start(now);
    osc.stop(now + 0.2);
  } catch (_) {}
}

// ── Node land — satisfying soft "thock" (low sine decay, like placing a tile) ─
export function playNodeLand() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Body thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.07);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.start(now);
    osc.stop(now + 0.14);

    // Tiny high-freq tick on top for crispness
    const tick = ctx.createOscillator();
    const tickGain = ctx.createGain();
    tick.connect(tickGain);
    tickGain.connect(ctx.destination);

    tick.type = "triangle";
    tick.frequency.setValueAtTime(1800, now);
    tickGain.gain.setValueAtTime(0.06, now);
    tickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    tick.start(now);
    tick.stop(now + 0.05);
  } catch (_) {}
}

// ── Connection made — quick ascending two-note pling ─────────────────────────
export function playConnect() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    [0, 0.07].forEach((delay, i) => {
      const freq = i === 0 ? 520 : 780;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0.08, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.13);

      osc.start(now + delay);
      osc.stop(now + delay + 0.15);
    });
  } catch (_) {}
}

// ── Delete — short low descending tone ───────────────────────────────────────
export function playDelete() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.1);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch (_) {}
}

// ── Run start — ascending three-note fanfare ─────────────────────────────────
export function playRunStart() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    [0, 0.08, 0.16].forEach((delay, i) => {
      const freqs = [440, 550, 660];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freqs[i], now + delay);

      gain.gain.setValueAtTime(0.09, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.18);

      osc.start(now + delay);
      osc.stop(now + delay + 0.2);
    });
  } catch (_) {}
}

// ── Run success — bright major chord ─────────────────────────────────────────
export function playSuccess() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.start(now);
      osc.stop(now + 0.45);
    });
  } catch (_) {}
}

// ── Run error — low dissonant tone ───────────────────────────────────────────
export function playError() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, now);
    osc.connect(filter);
    filter.connect(gain);
    osc.disconnect(gain); // reroute through filter

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.start(now);
    osc.stop(now + 0.28);
  } catch (_) {}
}

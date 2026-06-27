import { useEffect } from 'react';

const SELECTOR =
  '.bb-glow-border, .bb-card, .bb-panel, .bb-btn-ghost, .bb-input, .bb-nav-item, .bb-hbtn, .bb-edge-right, .bb-edge-left, .bb-edge-bottom';
const RANGE = 200;

export default function useGlowBorder() {
  useEffect(() => {
    let raf = 0;
    let pending = null;
    let nodes = [];
    let rectsStale = true;

    const refresh = () => {
      nodes = Array.from(document.querySelectorAll(SELECTOR));
      rectsStale = false;
    };

    const apply = () => {
      raf = 0;
      const e = pending;
      if (!e) return;
      if (rectsStale) refresh();
      const { clientX: x, clientY: y } = e;

      for (const el of nodes) {
        const r = el.getBoundingClientRect();
        if (!r.width) continue;
        const cx = Math.max(r.left, Math.min(x, r.right));
        const cy = Math.max(r.top, Math.min(y, r.bottom));
        const d = Math.hypot(x - cx, y - cy);
        const intensity = d >= RANGE ? 0 : 1 - d / RANGE;
        el.style.setProperty('--gi', intensity.toFixed(3));
        if (intensity > 0) {
          el.style.setProperty('--gx', `${x - r.left}px`);
          el.style.setProperty('--gy', `${y - r.top}px`);
        }
      }
    };

    const move = (e) => {
      pending = e;
      if (!raf) raf = requestAnimationFrame(apply);
    };

    const invalidate = () => { rectsStale = true; };

    refresh();
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('scroll', invalidate, { passive: true, capture: true });
    window.addEventListener('resize', invalidate, { passive: true });
    const mo = new MutationObserver(invalidate);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('scroll', invalidate, { capture: true });
      window.removeEventListener('resize', invalidate);
      mo.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
}

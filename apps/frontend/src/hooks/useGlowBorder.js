import { useEffect } from 'react';

export default function useGlowBorder() {
  useEffect(() => {
    let raf = 0;
    let pending = null;

    const apply = () => {
      raf = 0;
      const e = pending;
      if (!e) return;
      const el = e.target.closest?.(
        '.bb-glow-border, .bb-card, .bb-panel, .bb-btn-ghost, .bb-input, .bb-liquid'
      );
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--gx', `${e.clientX - r.left}px`);
      el.style.setProperty('--gy', `${e.clientY - r.top}px`);
    };

    const move = (e) => {
      pending = e;
      if (!raf) raf = requestAnimationFrame(apply);
    };

    window.addEventListener('pointermove', move, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
}
